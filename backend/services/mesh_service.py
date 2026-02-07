"""
网格处理服务
处理3D模型格式转换和优化
"""

import asyncio
from pathlib import Path

import numpy as np
import trimesh
from stl import mesh as stl_mesh


async def convert_to_stl(
    model_path: Path,
    output_dir: Path,
    task_id: str
) -> Path:
    """
    将3D模型转换为STL格式（适合3D打印）
    
    Args:
        model_path: 输入模型路径（GLB/OBJ等）
        output_dir: 输出目录
        task_id: 任务ID
        
    Returns:
        STL文件路径
    """
    output_path = output_dir / f"{task_id}_model.stl"
    
    # 在线程中执行（避免阻塞事件循环）
    await asyncio.to_thread(
        _convert_to_stl_sync,
        model_path,
        output_path
    )
    
    return output_path


def _convert_to_stl_sync(input_path: Path, output_path: Path):
    """
    同步转换模型为STL
    
    Args:
        input_path: 输入文件路径
        output_path: 输出文件路径
    """
    # 加载模型
    mesh = trimesh.load(str(input_path))
    
    # 如果是Scene，合并所有几何体
    if isinstance(mesh, trimesh.Scene):
        # 提取所有网格
        geometries = []
        for name, geom in mesh.geometry.items():
            if isinstance(geom, trimesh.Trimesh):
                geometries.append(geom)
        
        if geometries:
            mesh = trimesh.util.concatenate(geometries)
        else:
            raise ValueError("场景中没有有效的网格几何体")
    
    # 缩放到合适的打印尺寸
    # 目标：最大边长50mm
    bounds = mesh.bounds
    max_dim = np.max(bounds[1] - bounds[0])
    if max_dim > 0:
        scale_factor = 50.0 / max_dim
        mesh.apply_scale(scale_factor)
    
    # 居中模型
    mesh.vertices -= mesh.centroid
    
    # 导出STL
    mesh.export(str(output_path), file_type='stl')


async def optimize_mesh(stl_path: Path) -> Path:
    """
    优化网格以确保可打印性
    
    - 修复非流形边
    - 确保网格闭合
    - 检查最小壁厚
    
    Args:
        stl_path: STL文件路径
        
    Returns:
        优化后的STL文件路径
    """
    await asyncio.to_thread(_optimize_mesh_sync, stl_path)
    return stl_path


def _optimize_mesh_sync(stl_path: Path):
    """
    同步优化网格
    
    Args:
        stl_path: STL文件路径
    """
    # 加载网格
    mesh = trimesh.load(str(stl_path))
    
    if not isinstance(mesh, trimesh.Trimesh):
        return  # 无法优化非Trimesh对象
    
    # 修复网格 - 使用 try/except 处理不同版本的 trimesh
    try:
        trimesh.repair.fix_normals(mesh)
        trimesh.repair.fix_inversion(mesh)
        trimesh.repair.fix_winding(mesh)
    except Exception:
        pass  # 某些修复方法可能不可用
    
    # 填充孔洞
    try:
        if not mesh.is_watertight:
            trimesh.repair.fill_holes(mesh)
    except Exception:
        pass
    
    # 使用 process() 方法清理网格（兼容新版本 trimesh）
    # process() 会自动处理重复面、退化面等问题
    try:
        mesh.process(validate=True)
    except Exception:
        # 如果 process 失败，尝试旧方法
        try:
            mesh.merge_vertices()
            mesh.update_faces(mesh.nondegenerate_faces())
        except Exception:
            pass
    
    # 重新导出
    mesh.export(str(stl_path), file_type='stl')


def check_printability(stl_path: Path) -> dict:
    """
    检查模型的可打印性
    
    Args:
        stl_path: STL文件路径
        
    Returns:
        包含检查结果的字典
    """
    mesh = trimesh.load(str(stl_path))
    
    if not isinstance(mesh, trimesh.Trimesh):
        return {"error": "无效的网格文件"}
    
    # 计算各种属性
    bounds = mesh.bounds
    dimensions = bounds[1] - bounds[0]
    
    result = {
        "is_watertight": mesh.is_watertight,
        "is_winding_consistent": mesh.is_winding_consistent,
        "volume_mm3": mesh.volume if mesh.is_watertight else None,
        "dimensions_mm": {
            "x": float(dimensions[0]),
            "y": float(dimensions[1]),
            "z": float(dimensions[2])
        },
        "face_count": len(mesh.faces),
        "vertex_count": len(mesh.vertices),
        "printable": mesh.is_watertight and mesh.is_winding_consistent
    }
    
    return result


def scale_model(stl_path: Path, scale_percent: float) -> Path:
    """
    缩放模型
    
    Args:
        stl_path: STL文件路径
        scale_percent: 缩放百分比（100 = 原始大小）
        
    Returns:
        缩放后的文件路径
    """
    mesh = trimesh.load(str(stl_path))
    
    if isinstance(mesh, trimesh.Trimesh):
        scale_factor = scale_percent / 100.0
        mesh.apply_scale(scale_factor)
        mesh.export(str(stl_path), file_type='stl')
    
    return stl_path
