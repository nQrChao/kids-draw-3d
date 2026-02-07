import { useState, useCallback } from 'react'
import { KonvaCanvas, SkiaCanvas, TldrawCanvas, CANVAS_ENGINES } from './components/canvas'
import Model3DViewer from './components/Model3DViewer'
import ToolBar from './components/ToolBar'
import { generate3DModel, downloadSTL } from './api/generate3d'

function App() {
    // 画布引擎
    const [canvasEngine, setCanvasEngine] = useState('konva')

    // 画板状态
    const [brushColor, setBrushColor] = useState('#FF6B6B')
    const [brushSize, setBrushSize] = useState(12)
    const [tool, setTool] = useState('brush')
    const [canvasRef, setCanvasRef] = useState(null)

    // 进阶工具状态
    const [selectedSticker, setSelectedSticker] = useState('smile')
    const [selectedStamp, setSelectedStamp] = useState('circle')
    const [symmetryMode, setSymmetryMode] = useState('none')

    // 3D模型状态
    const [modelUrl, setModelUrl] = useState(null)
    const [stlUrl, setStlUrl] = useState(null)
    const [taskId, setTaskId] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState(null)

    // 手机端3D预览弹窗状态
    const [showMobileViewer, setShowMobileViewer] = useState(false)

    // 清除画布
    const handleClear = useCallback(() => {
        if (canvasRef) {
            canvasRef.clear()
        }
        setModelUrl(null)
        setError(null)
    }, [canvasRef])

    // 撤销
    const handleUndo = useCallback(() => {
        if (canvasRef) {
            canvasRef.undo()
        }
    }, [canvasRef])

    // 重做
    const handleRedo = useCallback(() => {
        if (canvasRef && canvasRef.redo) {
            canvasRef.redo()
        }
    }, [canvasRef])

    // 导入图片
    const handleImportImage = useCallback((dataUrl) => {
        if (canvasRef && canvasRef.importImage) {
            canvasRef.importImage(dataUrl)
        }
    }, [canvasRef])

    // 加载模板
    const handleLoadTemplate = useCallback((templateId) => {
        if (canvasRef && canvasRef.addTemplate) {
            canvasRef.addTemplate(templateId)
        }
    }, [canvasRef])


    // 生成3D模型
    const handleGenerate = useCallback(async () => {
        if (!canvasRef) return

        setIsGenerating(true)
        setError(null)

        try {
            const imageData = await canvasRef.toDataURL()
            if (!imageData) {
                throw new Error('无法获取画布图像')
            }
            const result = await generate3DModel(imageData)
            setModelUrl(result.modelUrl)
            setStlUrl(result.stlUrl)
            setTaskId(result.taskId)

            // 在手机端自动打开3D预览弹窗
            if (window.innerWidth <= 768) {
                setShowMobileViewer(true)
            }
        } catch (err) {
            console.error('生成3D模型失败:', err)
            setError(err.message || '生成失败，请重试')
        } finally {
            setIsGenerating(false)
        }
    }, [canvasRef])

    // 下载GLB模型
    const handleDownload = useCallback(async () => {
        if (!modelUrl) return

        try {
            // 使用fetch下载以避免跨域问题
            const response = await fetch(modelUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = url
            link.download = `my-3d-model-${taskId || 'model'}.glb`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error('下载失败:', err)
            // 降级方案：直接打开链接
            window.open(modelUrl, '_blank')
        }
    }, [modelUrl, taskId])

    // 下载STL模型（用于3D打印）
    const handleDownloadSTL = useCallback(async () => {
        if (!taskId) return

        try {
            await downloadSTL(taskId)
        } catch (err) {
            console.error('下载STL失败:', err)
            setError('下载STL失败: ' + err.message)
        }
    }, [taskId])

    // 渲染对应的画布组件
    const renderCanvas = () => {
        const props = {
            brushColor,
            brushSize,
            tool,
            onCanvasReady: setCanvasRef
        }

        // Konva特有的进阶功能
        const konvaProps = {
            ...props,
            selectedSticker,
            selectedStamp,
            symmetryMode,
        }

        switch (canvasEngine) {
            case 'skia':
                return <SkiaCanvas {...props} />
            case 'tldraw':
                return <TldrawCanvas {...props} />
            case 'konva':
            default:
                return <KonvaCanvas {...konvaProps} />
        }
    }

    return (
        <div className="app-container">
            {/* 头部 */}
            <header className="app-header">
                <h1 className="app-title">🍋 檬萌的3D绘画小屋 🏠</h1>
                <p className="app-subtitle">画出你的想象，变成真实的3D模型！</p>
            </header>

            {/* 主内容区 */}
            <main className="main-content">
                {/* 左侧：画板 */}
                <section className="panel drawing-panel">
                    <h2 className="panel-title">
                        <span className="panel-title-icon">🖌️</span>
                        画板
                    </h2>

                    {/* 画布引擎切换器 */}
                    <div className="engine-switcher">
                        <span className="engine-label">🔧 绘画引擎：</span>
                        <div className="engine-buttons">
                            {Object.values(CANVAS_ENGINES).map((engine) => (
                                <button
                                    key={engine.id}
                                    className={`engine-btn ${canvasEngine === engine.id ? 'active' : ''}`}
                                    onClick={() => setCanvasEngine(engine.id)}
                                    title={engine.description}
                                >
                                    <span className="engine-icon">{engine.icon}</span>
                                    <span className="engine-name">{engine.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <ToolBar
                        brushColor={brushColor}
                        onColorChange={setBrushColor}
                        brushSize={brushSize}
                        onSizeChange={setBrushSize}
                        tool={tool}
                        onToolChange={setTool}
                        selectedSticker={selectedSticker}
                        onStickerChange={setSelectedSticker}
                        selectedStamp={selectedStamp}
                        onStampChange={setSelectedStamp}
                        symmetryMode={symmetryMode}
                        onSymmetryChange={setSymmetryMode}
                        onClear={handleClear}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onImportImage={handleImportImage}
                        onLoadTemplate={handleLoadTemplate}
                        canRedo={canvasRef?.canRedo}
                    />

                    <div className="canvas-container">
                        {renderCanvas()}
                    </div>

                    <div className="actions">
                        <button
                            className="btn btn-primary btn-generate"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? '🔮 正在施展魔法...' : '✨ 生成3D模型'}
                        </button>
                    </div>
                </section>

                {/* 右侧：3D预览 */}
                <section className="panel preview-panel">
                    <h2 className="panel-title">
                        <span className="panel-title-icon">🎲</span>
                        3D预览
                    </h2>

                    <div className="viewer-container">
                        <Model3DViewer
                            modelUrl={modelUrl}
                            isLoading={isGenerating}
                        />
                    </div>

                    {modelUrl && (
                        <div className="actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleDownload}
                            >
                                📥 下载模型 (GLB)
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleDownloadSTL}
                                disabled={!taskId}
                            >
                                🖨️ 下载STL打印
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="toast" style={{ borderColor: 'var(--rainbow-red)' }}>
                            ❌ {error}
                        </div>
                    )}
                </section>
            </main>

            {/* 手机端3D预览弹窗 */}
            {showMobileViewer && modelUrl && (
                <div className="mobile-viewer-modal">
                    <div className="mobile-viewer-header">
                        <h3>🎲 3D模型预览</h3>
                        <button
                            className="mobile-viewer-close"
                            onClick={() => setShowMobileViewer(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="mobile-viewer-content">
                        <Model3DViewer
                            modelUrl={modelUrl}
                            isLoading={false}
                        />
                    </div>
                    <div className="mobile-viewer-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleDownload}
                        >
                            📥 下载GLB
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleDownloadSTL}
                            disabled={!taskId}
                        >
                            🖨️ 下载STL
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => setShowMobileViewer(false)}
                        >
                            继续绘画
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
