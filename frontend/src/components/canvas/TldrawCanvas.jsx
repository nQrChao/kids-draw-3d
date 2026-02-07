import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Tldraw 绘画画板组件 - 完整版
 * 特点：无限画布、专业绘图工具、类Figma体验
 * 显示 Tldraw 自带的专业工具栏
 */
function TldrawCanvas({ brushColor, brushSize, tool = 'brush', onCanvasReady }) {
    const containerRef = useRef(null)
    const editorRef = useRef(null)
    const [TldrawComponent, setTldrawComponent] = useState(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState(null)

    // 动态加载 tldraw
    useEffect(() => {
        let mounted = true

        const loadTldraw = async () => {
            try {
                const tldrawModule = await import('@tldraw/tldraw')
                if (!mounted) return

                // 动态导入CSS
                const link = document.createElement('link')
                link.rel = 'stylesheet'
                link.href = 'https://unpkg.com/@tldraw/tldraw@2/tldraw.css'
                link.id = 'tldraw-css'
                if (!document.getElementById('tldraw-css')) {
                    document.head.appendChild(link)
                }

                setTldrawComponent(() => tldrawModule.Tldraw)
                setIsLoaded(true)
            } catch (err) {
                console.error('Tldraw 加载失败:', err)
                setError('Tldraw 加载失败')
            }
        }

        loadTldraw()
        return () => { mounted = false }
    }, [])

    // 暴露API
    useEffect(() => {
        if (onCanvasReady) {
            const api = {
                toDataURL: async () => {
                    if (!editorRef.current) return null
                    try {
                        const editor = editorRef.current
                        const shapes = editor.getCurrentPageShapes()
                        if (shapes.length === 0) {
                            const canvas = document.createElement('canvas')
                            canvas.width = 512
                            canvas.height = 512
                            const ctx = canvas.getContext('2d')
                            ctx.fillStyle = 'white'
                            ctx.fillRect(0, 0, 512, 512)
                            return canvas.toDataURL('image/png')
                        }

                        const svgElement = await editor.getSvgElement(shapes)
                        if (svgElement) {
                            const canvas = document.createElement('canvas')
                            canvas.width = 512
                            canvas.height = 512
                            const ctx = canvas.getContext('2d')
                            ctx.fillStyle = 'white'
                            ctx.fillRect(0, 0, 512, 512)

                            const svgData = new XMLSerializer().serializeToString(svgElement.svg)
                            const img = new Image()
                            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))

                            return new Promise((resolve) => {
                                img.onload = () => {
                                    ctx.drawImage(img, 0, 0, 512, 512)
                                    resolve(canvas.toDataURL('image/png'))
                                }
                                img.onerror = () => {
                                    resolve(canvas.toDataURL('image/png'))
                                }
                            })
                        }
                        return null
                    } catch (err) {
                        console.error('Tldraw 导出失败:', err)
                        return null
                    }
                },
                clear: () => {
                    if (editorRef.current) {
                        const editor = editorRef.current
                        const shapes = editor.getCurrentPageShapes()
                        if (shapes.length > 0) {
                            editor.deleteShapes(shapes.map(s => s.id))
                        }
                    }
                },
                undo: () => {
                    if (editorRef.current) {
                        editorRef.current.undo()
                    }
                },
                redo: () => {
                    if (editorRef.current) {
                        editorRef.current.redo()
                    }
                },
                get _objects() {
                    return { length: editorRef.current?.getCurrentPageShapes().length || 0 }
                },
                get canRedo() {
                    return editorRef.current?.canRedo || false
                },
                backgroundColor: 'white',
                renderAll: () => { }
            }
            onCanvasReady(api)
        }
    }, [onCanvasReady, isLoaded])

    // 当工具改变时映射到 tldraw 工具
    useEffect(() => {
        if (editorRef.current) {
            const editor = editorRef.current
            // 映射工具到 tldraw 内置工具
            const toolMap = {
                'brush': 'draw',
                'eraser': 'eraser',
                'select': 'select',
                'line': 'line',
                'arrow': 'arrow',
                'rect': 'geo',  // geo 工具支持多种几何图形
                'circle': 'geo',
                'triangle': 'geo',
                'star': 'geo',
                'text': 'text',
                'highlighter': 'highlight',
            }

            const tldrawTool = toolMap[tool] || 'draw'

            try {
                editor.setCurrentTool(tldrawTool)

                // 如果是几何图形工具，设置对应的形状
                if (['rect', 'circle', 'triangle', 'star'].includes(tool)) {
                    const geoMap = {
                        'rect': 'rectangle',
                        'circle': 'ellipse',
                        'triangle': 'triangle',
                        'star': 'star',
                    }
                    editor.setStyleForNextShapes('geo', geoMap[tool])
                }
            } catch (err) {
                // 某些工具可能不存在，忽略错误
                console.warn('Tool mapping failed:', err)
            }
        }
    }, [tool])

    // 当颜色/大小改变时更新
    useEffect(() => {
        if (editorRef.current) {
            const editor = editorRef.current
            try {
                // Tldraw 使用预定义的颜色名称
                const colorMap = {
                    '#FF6B6B': 'red',
                    '#FFA94D': 'orange',
                    '#FFE066': 'yellow',
                    '#69DB7C': 'green',
                    '#4DABF7': 'blue',
                    '#DA77F2': 'violet',
                    '#F783AC': 'light-red',
                    '#A0522D': 'brown',
                    '#2C2C2C': 'black',
                    '#FFFFFF': 'white',
                }
                const tldrawColor = colorMap[brushColor] || 'black'
                editor.setStyleForNextShapes('color', tldrawColor)

                // 设置大小
                const sizeMap = brushSize > 20 ? 'xl' : brushSize > 10 ? 'l' : brushSize > 5 ? 'm' : 's'
                editor.setStyleForNextShapes('size', sizeMap)
            } catch (err) {
                console.warn('Style setting failed:', err)
            }
        }
    }, [brushColor, brushSize])

    if (error) {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'white', borderRadius: '12px', color: '#666'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    if (!isLoaded || !TldrawComponent) {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'white', borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" />
                    <p style={{ marginTop: '10px', color: '#666' }}>正在加载 Tldraw 画板...</p>
                </div>
            </div>
        )
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <TldrawComponent
                onMount={(editor) => {
                    editorRef.current = editor
                    // 默认使用画笔工具
                    editor.setCurrentTool('draw')
                }}
                // 显示 Tldraw 自带的专业工具栏
                hideUi={false}
                // 自定义配置
                persistenceKey="kids-draw-3d"
            />
            {/* 提示信息 */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                pointerEvents: 'none',
                zIndex: 1000,
            }}>
                💡 Tldraw 有自己的专业工具栏，请使用上方蓝色工具栏
            </div>
        </div>
    )
}

export default TldrawCanvas
