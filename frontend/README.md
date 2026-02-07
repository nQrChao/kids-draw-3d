# 画画变3D - 儿童创意工坊

让孩子通过画画创造可3D打印的模型！🎨✨

## 快速开始

### 1. 启动后端服务

```powershell
cd D:\kids-draw-3d-backend
pip install -r requirements.txt
python main.py
```

后端将在 http://localhost:8000 启动

### 2. 启动前端应用

```powershell
cd D:\kids-draw-3d-frontend
npm install
npm run dev
```

前端将在 http://localhost:5173 启动

### 3. 开始创作

1. 打开浏览器访问 http://localhost:5173
2. 在画板上画出你的作品
3. 点击"生成3D模型"按钮
4. 等待魔法发生！✨
5. 下载STL文件进行3D打印

## 技术栈

- **前端**: React + Vite + Fabric.js + Three.js
- **后端**: Python FastAPI
- **AI**: TripoSR (Hugging Face免费API)
- **3D处理**: Trimesh + numpy-stl

## 项目结构

```
D:\kids-draw-3d-frontend\    # 前端
D:\kids-draw-3d-backend\     # 后端
```
