import { useState, useRef, useEffect, useCallback } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text } from 'react-konva'

/**
 * 绘画画板组件 - 使用 react-konva
 * 支持：自由绘画、橡皮擦、形状工具、撤销
 */
function DrawingCanvas({ brushColor, brushSize, tool = 'brush', onCanvasReady }) {
    const containerRef = useRef(null)
    const stageRef = useRef(null)
    const [dimensions, setDimensions] = useState({ width: 600, height: 500 })
    const [lines, setLines] = useState([])
    const [isDrawing, setIsDrawing] = useState(false)

    // 调整画布尺寸
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current
                setDimensions({
                    width: clientWidth || 600,
                    height: clientHeight || 500
                })
            }
        }

        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])

    // 暴露画布API给父组件
    useEffect(() => {
        if (onCanvasReady && stageRef.current) {
            const api = {
                // 获取画布图像数据
                toDataURL: (options = {}) => {
                    const stage = stageRef.current
                    if (!stage) return null
                    return stage.toDataURL({
                        mimeType: 'image/png',
                        quality: 1,
                        pixelRatio: 2, // 高清导出
                        ...options
                    })
                },
                // 清除画布
                clear: () => {
                    setLines([])
                },
                // 撤销
                undo: () => {
                    setLines(prev => prev.slice(0, -1))
                },
                // 获取线条数量
                get _objects() {
                    return { length: lines.length }
                },
                // 背景色（保持兼容）
                backgroundColor: 'white',
                // 渲染（保持兼容）
                renderAll: () => { }
            }
            onCanvasReady(api)
        }
    }, [onCanvasReady, lines.length])

    // 开始绘画
    const handleMouseDown = useCallback((e) => {
        setIsDrawing(true)
        const pos = e.target.getStage().getPointerPosition()

        const newLine = {
            tool: tool,
            points: [pos.x, pos.y],
            stroke: tool === 'eraser' ? 'white' : brushColor,
            strokeWidth: tool === 'eraser' ? brushSize * 2 : brushSize,
            lineCap: 'round',
            lineJoin: 'round',
            globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over'
        }

        setLines(prev => [...prev, newLine])
    }, [brushColor, brushSize, tool])

    // 绘画中
    const handleMouseMove = useCallback((e) => {
        if (!isDrawing) return

        const stage = e.target.getStage()
        const point = stage.getPointerPosition()

        setLines(prev => {
            const lastLine = prev[prev.length - 1]
            if (!lastLine) return prev

            const newPoints = [...lastLine.points, point.x, point.y]
            const newLine = { ...lastLine, points: newPoints }

            return [...prev.slice(0, -1), newLine]
        })
    }, [isDrawing])

    // 结束绘画
    const handleMouseUp = useCallback(() => {
        setIsDrawing(false)
    }, [])

    // 触控支持
    const handleTouchStart = useCallback((e) => {
        e.evt.preventDefault()
        handleMouseDown(e)
    }, [handleMouseDown])

    const handleTouchMove = useCallback((e) => {
        e.evt.preventDefault()
        handleMouseMove(e)
    }, [handleMouseMove])

    const handleTouchEnd = useCallback((e) => {
        e.evt.preventDefault()
        handleMouseUp()
    }, [handleMouseUp])

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                touchAction: 'none',
                cursor: tool === 'eraser' ? 'crosshair' : 'default',
                borderRadius: '12px',
                overflow: 'hidden'
            }}
        >
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ backgroundColor: 'white' }}
            >
                <Layer>
                    {/* 背景 */}
                    <Rect
                        x={0}
                        y={0}
                        width={dimensions.width}
                        height={dimensions.height}
                        fill="white"
                    />

                    {/* 绘制所有线条 */}
                    {lines.map((line, i) => (
                        <Line
                            key={i}
                            points={line.points}
                            stroke={line.stroke}
                            strokeWidth={line.strokeWidth}
                            tension={0.5}
                            lineCap={line.lineCap}
                            lineJoin={line.lineJoin}
                            globalCompositeOperation={
                                line.tool === 'eraser' ? 'destination-out' : 'source-over'
                            }
                        />
                    ))}
                </Layer>
            </Stage>

            {/* 画笔预览光标 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#fff'
                }}
            >
                <div
                    style={{
                        width: Math.min(brushSize, 30),
                        height: Math.min(brushSize, 30),
                        borderRadius: '50%',
                        backgroundColor: tool === 'eraser' ? '#ccc' : brushColor,
                        border: '2px solid white'
                    }}
                />
                <span>{tool === 'eraser' ? '橡皮擦' : '画笔'}</span>
            </div>
        </div>
    )
}

export default DrawingCanvas
