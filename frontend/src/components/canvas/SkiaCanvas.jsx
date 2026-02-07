import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * CanvasKit (Google Skia) 绘画画板组件 - 完整版
 * 特点：Google技术、GPU加速、专业级渲染
 * 支持：画笔、橡皮擦、直线、矩形、圆形、三角形、星形
 */

// 彩虹色序列
const RAINBOW_COLORS = ['#FF6B6B', '#FFA94D', '#FFE066', '#69DB7C', '#4DABF7', '#DA77F2', '#F783AC']

function SkiaCanvas({ brushColor, brushSize, tool = 'brush', onCanvasReady }) {
    const containerRef = useRef(null)
    const canvasRef = useRef(null)
    const ckRef = useRef(null)
    const surfaceRef = useRef(null)
    const elementsRef = useRef([])  // 存储所有绘制元素
    const historyRef = useRef([])   // 重做历史
    const currentElementRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [startPos, setStartPos] = useState(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState(null)
    const [dimensions, setDimensions] = useState({ width: 600, height: 500 })
    const [rainbowIndex, setRainbowIndex] = useState(0)

    // 加载 CanvasKit
    useEffect(() => {
        let mounted = true

        const loadCanvasKit = async () => {
            try {
                const CanvasKitInit = (await import('canvaskit-wasm')).default
                const ck = await CanvasKitInit({
                    locateFile: (file) => `https://unpkg.com/canvaskit-wasm@0.39.1/bin/${file}`
                })

                if (!mounted) return
                ckRef.current = ck
                setIsLoaded(true)
            } catch (err) {
                console.error('CanvasKit 加载失败:', err)
                setError('CanvasKit 加载失败，请检查网络连接')
            }
        }

        loadCanvasKit()
        return () => { mounted = false }
    }, [])

    // 初始化画布
    useEffect(() => {
        if (!isLoaded || !canvasRef.current || !ckRef.current) return

        const ck = ckRef.current
        const canvas = canvasRef.current
        const container = containerRef.current

        const width = container.clientWidth || 600
        const height = container.clientHeight || 500
        canvas.width = width
        canvas.height = height
        setDimensions({ width, height })

        const surface = ck.MakeCanvasSurface(canvas)
        if (!surface) {
            setError('无法创建 Skia Surface（可能需要 WebGL 支持）')
            return
        }

        surfaceRef.current = surface
        redraw()

        return () => {
            surface.delete()
        }
    }, [isLoaded])

    // 重绘画布
    const redraw = useCallback(() => {
        if (!surfaceRef.current || !ckRef.current) return

        const ck = ckRef.current
        const surface = surfaceRef.current
        const skCanvas = surface.getCanvas()

        // 清空为白色
        skCanvas.clear(ck.WHITE)

        // 绘制所有元素
        elementsRef.current.forEach(element => {
            drawElement(ck, skCanvas, element)
        })

        surface.flush()
    }, [])

    // 绘制单个元素
    const drawElement = (ck, skCanvas, element) => {
        const paint = new ck.Paint()
        paint.setAntiAlias(true)

        // 获取颜色
        let color = element.color
        if (element.tool === 'eraser') {
            color = '#FFFFFF'
        } else if (element.tool === 'rainbow' && element.rainbowColors) {
            // 彩虹画笔使用渐变
            color = element.rainbowColors[0] || element.color
        }

        paint.setColor(ck.parseColorString(color))
        paint.setStrokeWidth(element.strokeWidth)
        paint.setStrokeCap(ck.StrokeCap.Round)
        paint.setStrokeJoin(ck.StrokeJoin.Round)

        switch (element.type) {
            case 'path':
                paint.setStyle(ck.PaintStyle.Stroke)
                const path = new ck.Path()
                const points = element.points
                if (points.length >= 2) {
                    path.moveTo(points[0], points[1])
                    for (let i = 2; i < points.length; i += 2) {
                        path.lineTo(points[i], points[i + 1])
                    }
                }
                skCanvas.drawPath(path, paint)
                path.delete()
                break

            case 'line':
                paint.setStyle(ck.PaintStyle.Stroke)
                skCanvas.drawLine(element.x1, element.y1, element.x2, element.y2, paint)
                break

            case 'rect':
                paint.setStyle(element.fill ? ck.PaintStyle.Fill : ck.PaintStyle.Stroke)
                skCanvas.drawRect(ck.XYWHRect(element.x, element.y, element.width, element.height), paint)
                break

            case 'circle':
                paint.setStyle(element.fill ? ck.PaintStyle.Fill : ck.PaintStyle.Stroke)
                skCanvas.drawOval(ck.XYWHRect(
                    element.x - element.radiusX,
                    element.y - element.radiusY,
                    element.radiusX * 2,
                    element.radiusY * 2
                ), paint)
                break

            case 'triangle':
                paint.setStyle(element.fill ? ck.PaintStyle.Fill : ck.PaintStyle.Stroke)
                const triPath = new ck.Path()
                triPath.moveTo(element.x, element.y - element.radius)
                triPath.lineTo(element.x + element.radius * 0.866, element.y + element.radius * 0.5)
                triPath.lineTo(element.x - element.radius * 0.866, element.y + element.radius * 0.5)
                triPath.close()
                skCanvas.drawPath(triPath, paint)
                triPath.delete()
                break

            case 'star':
                paint.setStyle(element.fill ? ck.PaintStyle.Fill : ck.PaintStyle.Stroke)
                const starPath = new ck.Path()
                const cx = element.x
                const cy = element.y
                const outerR = element.outerRadius
                const innerR = element.innerRadius
                const numPoints = element.numPoints || 5

                for (let i = 0; i < numPoints * 2; i++) {
                    const angle = (i * Math.PI / numPoints) - Math.PI / 2
                    const r = i % 2 === 0 ? outerR : innerR
                    const px = cx + r * Math.cos(angle)
                    const py = cy + r * Math.sin(angle)
                    if (i === 0) {
                        starPath.moveTo(px, py)
                    } else {
                        starPath.lineTo(px, py)
                    }
                }
                starPath.close()
                skCanvas.drawPath(starPath, paint)
                starPath.delete()
                break

            case 'fill':
                paint.setStyle(ck.PaintStyle.Fill)
                skCanvas.drawRect(ck.XYWHRect(0, 0, dimensions.width, dimensions.height), paint)
                break

            case 'gradient':
                // 彩虹渐变填充
                const gradPaint = new ck.Paint()
                const shader = ck.Shader.MakeLinearGradient(
                    [0, 0],
                    [dimensions.width, 0],
                    [
                        ck.parseColorString('#FF6B6B'),
                        ck.parseColorString('#FFA94D'),
                        ck.parseColorString('#FFE066'),
                        ck.parseColorString('#69DB7C'),
                        ck.parseColorString('#4DABF7'),
                        ck.parseColorString('#DA77F2'),
                        ck.parseColorString('#F783AC'),
                    ],
                    [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
                    ck.TileMode.Clamp
                )
                gradPaint.setShader(shader)
                skCanvas.drawRect(ck.XYWHRect(0, 0, dimensions.width, dimensions.height), gradPaint)
                shader.delete()
                gradPaint.delete()
                break

            case 'spray':
                paint.setStyle(ck.PaintStyle.Fill)
                element.points.forEach(p => {
                    skCanvas.drawCircle(p.x, p.y, element.size, paint)
                })
                break
        }

        paint.delete()
    }

    // 暴露API
    useEffect(() => {
        if (onCanvasReady) {
            const api = {
                toDataURL: () => canvasRef.current?.toDataURL('image/png'),
                clear: () => {
                    elementsRef.current = []
                    historyRef.current = []
                    redraw()
                },
                undo: () => {
                    if (elementsRef.current.length > 0) {
                        const last = elementsRef.current[elementsRef.current.length - 1]
                        historyRef.current.push(last)
                        elementsRef.current = elementsRef.current.slice(0, -1)
                        redraw()
                    }
                },
                redo: () => {
                    if (historyRef.current.length > 0) {
                        const last = historyRef.current.pop()
                        elementsRef.current.push(last)
                        redraw()
                    }
                },
                get _objects() { return { length: elementsRef.current.length } },
                get canRedo() { return historyRef.current.length > 0 },
                backgroundColor: 'white',
                renderAll: () => redraw()
            }
            onCanvasReady(api)
        }
    }, [onCanvasReady, redraw])

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        return { x: clientX - rect.left, y: clientY - rect.top }
    }

    // 生成喷枪点
    const generateSprayPoints = (x, y, radius, density = 20) => {
        const points = []
        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2
            const r = Math.random() * radius
            points.push({
                x: x + r * Math.cos(angle),
                y: y + r * Math.sin(angle)
            })
        }
        return points
    }

    const handleStart = useCallback((e) => {
        e.preventDefault()
        const pos = getPos(e)
        setIsDrawing(true)
        setStartPos(pos)
        historyRef.current = [] // 清空重做历史

        if (tool === 'brush' || tool === 'eraser' || tool === 'highlighter' || tool === 'rainbow') {
            currentElementRef.current = {
                type: 'path',
                tool,
                color: brushColor,
                strokeWidth: tool === 'eraser' ? brushSize * 2 : brushSize,
                points: [pos.x, pos.y],
                rainbowColors: tool === 'rainbow' ? [RAINBOW_COLORS[rainbowIndex]] : null,
            }
        } else if (tool === 'spray') {
            currentElementRef.current = {
                type: 'spray',
                tool,
                color: brushColor,
                size: 2,
                points: generateSprayPoints(pos.x, pos.y, brushSize * 2),
            }
        } else if (tool === 'fill') {
            elementsRef.current.push({
                type: 'fill',
                color: brushColor,
            })
            redraw()
        } else if (tool === 'gradient') {
            elementsRef.current.push({
                type: 'gradient',
            })
            redraw()
        }
    }, [brushColor, brushSize, tool, rainbowIndex, redraw])

    const handleMove = useCallback((e) => {
        if (!isDrawing || !startPos) return
        e.preventDefault()
        const pos = getPos(e)

        if (tool === 'brush' || tool === 'eraser' || tool === 'highlighter') {
            if (currentElementRef.current) {
                currentElementRef.current.points.push(pos.x, pos.y)
                // 临时显示
                const temp = [...elementsRef.current, currentElementRef.current]
                const orig = elementsRef.current
                elementsRef.current = temp
                redraw()
                elementsRef.current = orig
            }
        } else if (tool === 'rainbow') {
            if (currentElementRef.current) {
                const newIndex = (rainbowIndex + 1) % RAINBOW_COLORS.length
                setRainbowIndex(newIndex)
                currentElementRef.current.points.push(pos.x, pos.y)
                currentElementRef.current.rainbowColors.push(RAINBOW_COLORS[newIndex])
                const temp = [...elementsRef.current, currentElementRef.current]
                const orig = elementsRef.current
                elementsRef.current = temp
                redraw()
                elementsRef.current = orig
            }
        } else if (tool === 'spray') {
            if (currentElementRef.current) {
                const newPoints = generateSprayPoints(pos.x, pos.y, brushSize * 2, 10)
                currentElementRef.current.points.push(...newPoints)
                const temp = [...elementsRef.current, currentElementRef.current]
                const orig = elementsRef.current
                elementsRef.current = temp
                redraw()
                elementsRef.current = orig
            }
        } else if (['line', 'arrow', 'rect', 'circle', 'triangle', 'star', 'heart'].includes(tool)) {
            // 形状工具 - 预览
            const width = pos.x - startPos.x
            const height = pos.y - startPos.y
            const radius = Math.sqrt(width * width + height * height) / 2

            let shape = null
            switch (tool) {
                case 'line':
                case 'arrow':
                    shape = {
                        type: 'line',
                        tool,
                        color: brushColor,
                        strokeWidth: brushSize,
                        x1: startPos.x,
                        y1: startPos.y,
                        x2: pos.x,
                        y2: pos.y,
                    }
                    break
                case 'rect':
                    shape = {
                        type: 'rect',
                        tool,
                        color: brushColor,
                        strokeWidth: brushSize,
                        x: Math.min(startPos.x, pos.x),
                        y: Math.min(startPos.y, pos.y),
                        width: Math.abs(width),
                        height: Math.abs(height),
                    }
                    break
                case 'circle':
                    shape = {
                        type: 'circle',
                        tool,
                        color: brushColor,
                        strokeWidth: brushSize,
                        x: startPos.x + width / 2,
                        y: startPos.y + height / 2,
                        radiusX: Math.abs(width) / 2,
                        radiusY: Math.abs(height) / 2,
                    }
                    break
                case 'triangle':
                    shape = {
                        type: 'triangle',
                        tool,
                        color: brushColor,
                        strokeWidth: brushSize,
                        x: startPos.x + width / 2,
                        y: startPos.y + height / 2,
                        radius: radius,
                    }
                    break
                case 'star':
                    shape = {
                        type: 'star',
                        tool,
                        color: brushColor,
                        strokeWidth: brushSize,
                        x: startPos.x + width / 2,
                        y: startPos.y + height / 2,
                        outerRadius: radius,
                        innerRadius: radius * 0.4,
                        numPoints: 5,
                    }
                    break
            }

            if (shape) {
                currentElementRef.current = shape
                const temp = [...elementsRef.current, shape]
                const orig = elementsRef.current
                elementsRef.current = temp
                redraw()
                elementsRef.current = orig
            }
        }
    }, [isDrawing, startPos, tool, brushColor, brushSize, redraw, rainbowIndex])

    const handleEnd = useCallback(() => {
        if (currentElementRef.current) {
            elementsRef.current.push(currentElementRef.current)
            currentElementRef.current = null
        }
        setIsDrawing(false)
        setStartPos(null)
        redraw()
    }, [redraw])

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

    if (!isLoaded) {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'white', borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" />
                    <p style={{ marginTop: '10px', color: '#666' }}>正在加载 Google Skia 引擎...</p>
                </div>
            </div>
        )
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '12px',
                    cursor: tool === 'eraser' ? 'crosshair' : 'default'
                }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            />
        </div>
    )
}

export default SkiaCanvas
