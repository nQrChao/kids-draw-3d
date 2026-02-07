"""
儿童绘画转3D打印模型 - 后端服务
使用 FastAPI + TripoSR (Hugging Face) 实现图像转3D
"""

import os
import uuid
import base64
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from services.ai_service import generate_3d_from_image
from services.mesh_service import convert_to_stl, optimize_mesh

# 创建输出目录
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# 存储限制配置（5GB = 5 * 1024 * 1024 * 1024 字节）
MAX_STORAGE_SIZE = 5 * 1024 * 1024 * 1024  # 5GB


def get_directory_size(directory: Path) -> int:
    """计算目录总大小（字节）"""
    total_size = 0
    for file_path in directory.rglob("*"):
        if file_path.is_file():
            total_size += file_path.stat().st_size
    return total_size


def cleanup_old_files(directory: Path, max_size: int):
    """
    清理旧文件，保持目录大小在限制以内
    按修改时间排序，删除最旧的文件
    """
    # 获取所有文件及其修改时间
    files = []
    for file_path in directory.rglob("*"):
        if file_path.is_file():
            files.append({
                "path": file_path,
                "mtime": file_path.stat().st_mtime,
                "size": file_path.stat().st_size
            })
    
    # 按修改时间排序（最旧的在前）
    files.sort(key=lambda x: x["mtime"])
    
    # 计算当前总大小
    current_size = sum(f["size"] for f in files)
    
    # 删除旧文件直到低于限制
    deleted_count = 0
    while current_size > max_size and files:
        oldest = files.pop(0)
        try:
            oldest["path"].unlink()
            current_size -= oldest["size"]
            deleted_count += 1
            print(f"🗑️ 已删除旧文件: {oldest['path'].name}")
        except Exception as e:
            print(f"⚠️ 删除文件失败: {oldest['path'].name} - {e}")
    
    if deleted_count > 0:
        print(f"📦 清理完成: 删除了 {deleted_count} 个文件，当前大小: {current_size / (1024*1024*1024):.2f} GB")



# 创建 FastAPI 应用
app = FastAPI(
    title="画画变3D API",
    description="将儿童绘画转换为可3D打印的模型",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（用于模型下载）
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


class GenerateRequest(BaseModel):
    """生成请求模型"""
    image: str  # Base64编码的图像数据


class GenerateResponse(BaseModel):
    """生成响应模型"""
    task_id: str
    model_url: str
    stl_url: str
    message: str


@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "画画变3D API 服务运行中 🎨"}


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_3d(request: GenerateRequest):
    """
    接收绘画图像，生成3D模型
    
    Args:
        request: 包含Base64编码图像的请求
        
    Returns:
        包含模型下载URL的响应
    """
    try:
        # 生成前检查并清理存储空间
        cleanup_old_files(OUTPUT_DIR, MAX_STORAGE_SIZE)
        
        # 生成唯一任务ID
        task_id = str(uuid.uuid4())[:8]
        
        # 解码Base64图像
        image_data = request.image
        if image_data.startswith('data:image'):
            # 移除Data URL前缀
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # 保存原始图像（用于调试）
        image_path = OUTPUT_DIR / f"{task_id}_input.png"
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        
        # 调用AI服务生成3D模型
        model_path = await generate_3d_from_image(
            image_bytes=image_bytes,
            output_dir=OUTPUT_DIR,
            task_id=task_id
        )
        
        # 转换为STL格式（用于3D打印）
        stl_path = await convert_to_stl(
            model_path=model_path,
            output_dir=OUTPUT_DIR,
            task_id=task_id
        )
        
        # 优化模型（确保可打印）
        await optimize_mesh(stl_path)
        
        # 返回下载URL
        model_url = f"/outputs/{model_path.name}"
        stl_url = f"/outputs/{stl_path.name}"
        
        return GenerateResponse(
            task_id=task_id,
            model_url=model_url,
            stl_url=stl_url,
            message="3D模型生成成功！✨"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成失败: {str(e)}"
        )


@app.get("/api/download/{task_id}")
async def download_stl(task_id: str):
    """
    下载STL文件
    
    Args:
        task_id: 任务ID
        
    Returns:
        STL文件
    """
    stl_path = OUTPUT_DIR / f"{task_id}_model.stl"
    
    if not stl_path.exists():
        raise HTTPException(
            status_code=404,
            detail="模型文件不存在"
        )
    
    return FileResponse(
        path=stl_path,
        filename=f"my-3d-model-{task_id}.stl",
        media_type="application/octet-stream"
    )


@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    """
    查询任务状态
    
    Args:
        task_id: 任务ID
        
    Returns:
        任务状态
    """
    model_path = OUTPUT_DIR / f"{task_id}_model.glb"
    stl_path = OUTPUT_DIR / f"{task_id}_model.stl"
    
    if stl_path.exists():
        return {"status": "completed", "message": "模型已生成"}
    elif model_path.exists():
        return {"status": "processing", "message": "正在转换格式..."}
    else:
        return {"status": "pending", "message": "等待处理..."}


if __name__ == "__main__":
    import uvicorn
    print("🚀 启动 画画变3D API 服务...")
    print("📡 API文档: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
