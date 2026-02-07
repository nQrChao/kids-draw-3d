"""
AI服务模块
调用 TripoSR (Hugging Face Spaces) 将图像转换为3D模型
"""

import asyncio
import tempfile
from pathlib import Path
from io import BytesIO

from PIL import Image
from gradio_client import Client, handle_file


# TripoSR Hugging Face Space URL
TRIPOSR_SPACE = "stabilityai/TripoSR"


async def generate_3d_from_image(
    image_bytes: bytes,
    output_dir: Path,
    task_id: str
) -> Path:
    """
    使用 TripoSR 将图像转换为3D模型
    
    Args:
        image_bytes: 图像的字节数据
        output_dir: 输出目录
        task_id: 任务ID
        
    Returns:
        生成的3D模型文件路径
    """
    # 处理图像
    image = Image.open(BytesIO(image_bytes))
    
    # 确保是RGB模式
    if image.mode == 'RGBA':
        # 创建白色背景
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3])
        image = background
    elif image.mode != 'RGB':
        image = image.convert('RGB')
    
    # === 图像增强预处理（提高3D生成质量） ===
    from PIL import ImageEnhance, ImageFilter
    
    # 1. 调整图像尺寸到最佳分辨率（TripoSR推荐512x512）
    target_size = 512
    width, height = image.size
    if width != height:
        # 创建正方形画布，居中放置
        max_side = max(width, height)
        square_img = Image.new('RGB', (max_side, max_side), (255, 255, 255))
        offset = ((max_side - width) // 2, (max_side - height) // 2)
        square_img.paste(image, offset)
        image = square_img
    
    # 缩放到目标尺寸
    if image.size[0] != target_size:
        image = image.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    # 2. 增强对比度（使线条更清晰）
    contrast_enhancer = ImageEnhance.Contrast(image)
    image = contrast_enhancer.enhance(1.3)  # 增加30%对比度
    
    # 3. 锐化图像（使边缘更清晰）
    image = image.filter(ImageFilter.SHARPEN)
    
    # 4. 轻微去噪（平滑处理）
    image = image.filter(ImageFilter.SMOOTH_MORE)
    
    # 保存临时文件
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        image.save(tmp.name, 'PNG', quality=100)
        temp_path = tmp.name
    
    try:
        # 使用 gradio_client 调用 TripoSR
        # 这里使用同步客户端，但在异步函数中运行
        result = await asyncio.to_thread(_call_triposr, temp_path)
        
        # 复制结果到输出目录
        output_path = output_dir / f"{task_id}_model.glb"
        
        # 结果可能是文件路径或URL
        if isinstance(result, str):
            if result.startswith('http'):
                # 如果是URL，下载文件
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.get(result)
                    with open(output_path, 'wb') as f:
                        f.write(response.content)
            else:
                # 如果是本地路径，复制文件
                import shutil
                shutil.copy(result, output_path)
        else:
            # 如果result是元组（某些版本的gradio返回）
            model_file = result[0] if isinstance(result, tuple) else result
            import shutil
            shutil.copy(model_file, output_path)
        
        return output_path
        
    finally:
        # 清理临时文件
        Path(temp_path).unlink(missing_ok=True)


def _call_triposr(image_path: str):
    """
    同步调用 TripoSR API
    
    Args:
        image_path: 图像文件路径
        
    Returns:
        生成的3D模型文件路径
    """
    try:
        # 连接到 Hugging Face Space
        client = Client(TRIPOSR_SPACE)
        
        # 调用预测API
        # TripoSR接口: 输入图像 -> 输出3D模型
        # 参数说明:
        # - 图像文件
        # - 是否移除背景 (True 可以得到更干净的模型)
        # - 前景比例 (0.85 保留更多细节)
        # - 网格分辨率 (512 提供更高质量，但需要更长时间)
        result = client.predict(
            handle_file(image_path),  # 输入图像
            True,   # 移除背景
            0.85,   # 前景比例 (增加以保留更多细节)
            512,    # 网格分辨率 (增加以提高质量)
            api_name="/run"
        )
        
        return result
        
    except Exception as e:
        print(f"TripoSR API 调用失败: {e}")
        # 如果API失败，尝试使用备用方案
        return _fallback_generate(image_path)


def _fallback_generate(image_path: str) -> str:
    """
    备用生成方案：使用轮廓挤出法生成简单3D模型
    当TripoSR不可用时使用
    
    Args:
        image_path: 图像文件路径
        
    Returns:
        生成的3D模型文件路径
    """
    import numpy as np
    import trimesh
    from PIL import Image
    
    # 加载图像
    image = Image.open(image_path).convert('L')  # 转灰度
    
    # 简单的轮廓挤出
    # 将图像转为高度图，然后生成网格
    img_array = np.array(image)
    
    # 归一化到0-1
    img_array = img_array.astype(float) / 255.0
    
    # 反转（黑色变高，白色变低）
    height_map = 1 - img_array
    
    # 生成简单的浮雕网格
    vertices = []
    faces = []
    
    h, w = height_map.shape
    scale = 0.1
    max_height = 10  # 最大高度（mm）
    
    # 创建顶点
    for y in range(h):
        for x in range(w):
            # 底部顶点
            vertices.append([x * scale, y * scale, 0])
            # 顶部顶点
            z = height_map[y, x] * max_height
            vertices.append([x * scale, y * scale, z])
    
    # 创建面（简化版本 - 只创建顶面）
    for y in range(h - 1):
        for x in range(w - 1):
            idx = (y * w + x) * 2
            # 顶面四边形拆成两个三角形
            faces.append([idx + 1, idx + 3, idx + 2 * w + 1])
            faces.append([idx + 3, idx + 2 * w + 3, idx + 2 * w + 1])
    
    vertices = np.array(vertices)
    faces = np.array(faces)
    
    # 创建mesh
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    
    # 保存临时文件
    output_path = image_path.replace('.png', '_fallback.glb')
    mesh.export(output_path)
    
    return output_path
