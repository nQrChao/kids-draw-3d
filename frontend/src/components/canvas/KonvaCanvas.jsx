import { useState, useRef, useEffect, useCallback } from 'react'
import { Stage, Layer, Line, Rect, Circle, RegularPolygon, Star, Arrow, Text, Image as KonvaImage, Transformer, Group } from 'react-konva'

/**
 * React-Konva 绘画画板组件 - 儿童进阶版
 * 新增：贴纸、图案画笔、对称画笔、魔法彩虹画笔、印章、简笔画模板
 */

// 预设贴纸（emoji表情）
const STICKERS = [
    { id: 'smile', emoji: '😊', name: '微笑' },
    { id: 'heart', emoji: '❤️', name: '爱心' },
    { id: 'star', emoji: '⭐', name: '星星' },
    { id: 'sun', emoji: '☀️', name: '太阳' },
    { id: 'moon', emoji: '🌙', name: '月亮' },
    { id: 'rainbow', emoji: '🌈', name: '彩虹' },
    { id: 'flower', emoji: '🌸', name: '花朵' },
    { id: 'tree', emoji: '🌳', name: '树木' },
    { id: 'cat', emoji: '🐱', name: '猫咪' },
    { id: 'dog', emoji: '🐶', name: '狗狗' },
    { id: 'butterfly', emoji: '🦋', name: '蝴蝶' },
    { id: 'rocket', emoji: '🚀', name: '火箭' },
    { id: 'unicorn', emoji: '🦄', name: '独角兽' },
    { id: 'crown', emoji: '👑', name: '皇冠' },
    { id: 'magic', emoji: '✨', name: '魔法' },
]

// 印章形状
const STAMPS = [
    { id: 'circle', name: '圆形', shape: 'circle' },
    { id: 'star5', name: '五角星', shape: 'star', points: 5 },
    { id: 'star6', name: '六角星', shape: 'star', points: 6 },
    { id: 'triangle', name: '三角形', shape: 'polygon', sides: 3 },
    { id: 'square', name: '正方形', shape: 'polygon', sides: 4 },
    { id: 'pentagon', name: '五边形', shape: 'polygon', sides: 5 },
    { id: 'hexagon', name: '六边形', shape: 'polygon', sides: 6 },
    { id: 'heart', name: '心形', shape: 'heart' },
]

// 简笔画模板
const TEMPLATES = [
    { id: 'house', name: '房子', icon: '🏠' },
    { id: 'tree', name: '树', icon: '🌲' },
    { id: 'car', name: '汽车', icon: '🚗' },
    { id: 'fish', name: '鱼', icon: '🐟' },
    { id: 'bird', name: '小鸟', icon: '🐦' },
    { id: 'flower', name: '花朵', icon: '🌻' },
]

// 彩虹色序列
const RAINBOW_COLORS = ['#FF6B6B', '#FFA94D', '#FFE066', '#69DB7C', '#4DABF7', '#DA77F2', '#F783AC']

function KonvaCanvas({
    brushColor,
    brushSize,
    tool = 'brush',
    selectedSticker = null,
    selectedStamp = null,
    symmetryMode = 'none',  // 'none', 'horizontal', 'vertical', 'quad'
    onCanvasReady
}) {
    const containerRef = useRef(null)
    const stageRef = useRef(null)
    const transformerRef = useRef(null)
    const [dimensions, setDimensions] = useState({ width: 600, height: 500 })
    const [elements, setElements] = useState([])
    const [history, setHistory] = useState([])
    const [isDrawing, setIsDrawing] = useState(false)
    const [startPos, setStartPos] = useState(null)
    const [selectedId, setSelectedId] = useState(null)
    const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: '' })
    const [rainbowIndex, setRainbowIndex] = useState(0)
    const [patternPoints, setPatternPoints] = useState([])

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

    // 更新Transformer
    useEffect(() => {
        if (transformerRef.current && stageRef.current) {
            const stage = stageRef.current
            const tr = transformerRef.current

            if (selectedId && tool === 'select') {
                const selectedNode = stage.findOne('#' + selectedId)
                if (selectedNode) {
                    tr.nodes([selectedNode])
                    tr.getLayer().batchDraw()
                    return
                }
            }
            tr.nodes([])
        }
    }, [selectedId, tool, elements])

    // 暴露画布API
    useEffect(() => {
        if (onCanvasReady && stageRef.current) {
            const api = {
                toDataURL: () => stageRef.current?.toDataURL({ mimeType: 'image/png', pixelRatio: 2 }),
                clear: () => {
                    setElements([])
                    setHistory([])
                    setSelectedId(null)
                },
                undo: () => {
                    if (elements.length > 0) {
                        const lastElement = elements[elements.length - 1]
                        setHistory(prev => [...prev, lastElement])
                        setElements(prev => prev.slice(0, -1))
                    }
                },
                redo: () => {
                    if (history.length > 0) {
                        const lastHistory = history[history.length - 1]
                        setElements(prev => [...prev, lastHistory])
                        setHistory(prev => prev.slice(0, -1))
                    }
                },
                importImage: (dataUrl) => {
                    const img = new window.Image()
                    img.onload = () => {
                        setElements(prev => [...prev, {
                            id: 'img-' + Date.now(),
                            type: 'image',
                            x: 50,
                            y: 50,
                            image: img,
                            width: Math.min(img.width, dimensions.width - 100),
                            height: Math.min(img.height, dimensions.height - 100),
                            draggable: true,
                        }])
                    }
                    img.src = dataUrl
                },
                addTemplate: (templateId) => {
                    loadTemplate(templateId)
                },
                get _objects() { return { length: elements.length } },
                get canRedo() { return history.length > 0 },
                backgroundColor: 'white',
                renderAll: () => { }
            }
            onCanvasReady(api)
        }
    }, [onCanvasReady, elements.length, history.length, dimensions])

    // 获取指针位置
    const getPos = (e) => {
        const stage = e.target.getStage()
        return stage.getPointerPosition()
    }

    // 生成心形路径点
    const generateHeartPoints = (cx, cy, size) => {
        const points = []
        for (let t = 0; t <= Math.PI * 2; t += 0.1) {
            const x = cx + size * 16 * Math.pow(Math.sin(t), 3) / 16
            const y = cy - size * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16
            points.push(x, y)
        }
        return points
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

    // 获取对称点
    const getSymmetryPoints = (x, y) => {
        const cx = dimensions.width / 2
        const cy = dimensions.height / 2
        const points = [[x, y]]

        if (symmetryMode === 'horizontal' || symmetryMode === 'quad') {
            points.push([dimensions.width - x, y])
        }
        if (symmetryMode === 'vertical' || symmetryMode === 'quad') {
            points.push([x, dimensions.height - y])
        }
        if (symmetryMode === 'quad') {
            points.push([dimensions.width - x, dimensions.height - y])
        }

        return points
    }

    // 加载简笔画模板
    const loadTemplate = (templateId) => {
        const template = TEMPLATES.find(t => t.id === templateId)
        if (!template) return

        // 创建一个简化的模板轮廓
        const cx = dimensions.width / 2
        const cy = dimensions.height / 2
        let templateElements = []

        switch (templateId) {
            case 'house':
                templateElements = [
                    { type: 'rect', x: cx - 60, y: cy, width: 120, height: 100, stroke: '#888', strokeWidth: 2 },
                    { type: 'simpleLine', points: [cx - 80, cy, cx, cy - 60, cx + 80, cy], stroke: '#888', strokeWidth: 2 },
                    { type: 'rect', x: cx - 20, y: cy + 40, width: 40, height: 60, stroke: '#888', strokeWidth: 2 },
                ]
                break
            case 'tree':
                templateElements = [
                    { type: 'rect', x: cx - 15, y: cy + 20, width: 30, height: 80, stroke: '#888', strokeWidth: 2 },
                    { type: 'polygon', x: cx, y: cy - 40, sides: 3, radius: 80, stroke: '#888', strokeWidth: 2 },
                ]
                break
            case 'car':
                templateElements = [
                    { type: 'rect', x: cx - 80, y: cy - 20, width: 160, height: 50, stroke: '#888', strokeWidth: 2 },
                    { type: 'rect', x: cx - 50, y: cy - 50, width: 80, height: 30, stroke: '#888', strokeWidth: 2 },
                    { type: 'circle', x: cx - 50, y: cy + 30, radiusX: 20, radiusY: 20, stroke: '#888', strokeWidth: 2 },
                    { type: 'circle', x: cx + 50, y: cy + 30, radiusX: 20, radiusY: 20, stroke: '#888', strokeWidth: 2 },
                ]
                break
            case 'fish':
                templateElements = [
                    { type: 'circle', x: cx, y: cy, radiusX: 60, radiusY: 40, stroke: '#888', strokeWidth: 2 },
                    { type: 'polygon', x: cx + 80, y: cy, sides: 3, radius: 30, stroke: '#888', strokeWidth: 2, rotation: 90 },
                ]
                break
            case 'flower':
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2
                    templateElements.push({
                        type: 'circle',
                        x: cx + Math.cos(angle) * 40,
                        y: cy + Math.sin(angle) * 40,
                        radiusX: 25,
                        radiusY: 25,
                        stroke: '#888',
                        strokeWidth: 2
                    })
                }
                templateElements.push({
                    type: 'circle', x: cx, y: cy, radiusX: 20, radiusY: 20, stroke: '#888', strokeWidth: 2
                })
                break
            default:
                break
        }

        templateElements.forEach((el, i) => {
            setElements(prev => [...prev, { ...el, id: `template-${templateId}-${i}-${Date.now()}` }])
        })
    }

    // 开始绘制
    const handleMouseDown = useCallback((e) => {
        const pos = getPos(e)

        // 选择工具
        if (tool === 'select') {
            const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background'
            if (clickedOnEmpty) {
                setSelectedId(null)
            }
            return
        }

        // 文字工具
        if (tool === 'text') {
            setTextInput({ visible: true, x: pos.x, y: pos.y, value: '' })
            return
        }

        // 贴纸工具
        if (tool === 'sticker' && selectedSticker) {
            const sticker = STICKERS.find(s => s.id === selectedSticker)
            if (sticker) {
                setElements(prev => [...prev, {
                    id: 'sticker-' + Date.now(),
                    type: 'text',
                    x: pos.x - 20,
                    y: pos.y - 20,
                    text: sticker.emoji,
                    fontSize: brushSize * 4,
                    draggable: true,
                }])
            }
            return
        }

        // 印章工具
        if (tool === 'stamp' && selectedStamp) {
            const stamp = STAMPS.find(s => s.id === selectedStamp)
            if (stamp) {
                const stampElement = {
                    id: 'stamp-' + Date.now(),
                    x: pos.x,
                    y: pos.y,
                    fill: brushColor,
                    stroke: brushColor,
                    strokeWidth: 2,
                    draggable: true,
                }

                if (stamp.shape === 'circle') {
                    stampElement.type = 'circle'
                    stampElement.radiusX = brushSize * 2
                    stampElement.radiusY = brushSize * 2
                } else if (stamp.shape === 'star') {
                    stampElement.type = 'star'
                    stampElement.numPoints = stamp.points
                    stampElement.innerRadius = brushSize
                    stampElement.outerRadius = brushSize * 2
                } else if (stamp.shape === 'polygon') {
                    stampElement.type = 'polygon'
                    stampElement.sides = stamp.sides
                    stampElement.radius = brushSize * 2
                } else if (stamp.shape === 'heart') {
                    stampElement.type = 'heart'
                    stampElement.points = generateHeartPoints(pos.x, pos.y, brushSize)
                    stampElement.closed = true
                }

                setElements(prev => [...prev, stampElement])
            }
            return
        }

        setIsDrawing(true)
        setStartPos(pos)
        setHistory([])

        const id = tool + '-' + Date.now()

        // 画笔类工具
        if (tool === 'brush' || tool === 'eraser' || tool === 'highlighter') {
            const symmetryPoints = getSymmetryPoints(pos.x, pos.y)

            symmetryPoints.forEach((sp, i) => {
                setElements(prev => [...prev, {
                    id: id + (i > 0 ? `-sym-${i}` : ''),
                    type: 'line',
                    tool,
                    points: [sp[0], sp[1]],
                    stroke: tool === 'eraser' ? 'white' : brushColor,
                    strokeWidth: tool === 'eraser' ? brushSize * 2 : brushSize,
                    opacity: tool === 'highlighter' ? 0.4 : 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                }])
            })
        } else if (tool === 'rainbow') {
            // 彩虹画笔
            setElements(prev => [...prev, {
                id,
                type: 'line',
                tool: 'rainbow',
                points: [pos.x, pos.y],
                strokeWidth: brushSize,
                rainbowColors: [RAINBOW_COLORS[rainbowIndex]],
                lineCap: 'round',
                lineJoin: 'round',
            }])
        } else if (tool === 'pattern') {
            // 图案画笔 - 沿路径绘制图案
            setPatternPoints([{ x: pos.x, y: pos.y }])
        } else if (tool === 'spray') {
            const sprayPoints = generateSprayPoints(pos.x, pos.y, brushSize * 2)
            setElements(prev => [...prev, {
                id,
                type: 'spray',
                points: sprayPoints,
                color: brushColor,
                size: 2,
            }])
        } else if (tool === 'fill') {
            setElements(prev => [...prev, {
                id,
                type: 'rect',
                x: 0, y: 0,
                width: dimensions.width,
                height: dimensions.height,
                fill: brushColor,
            }])
        } else if (tool === 'gradient') {
            setElements(prev => [...prev, {
                id,
                type: 'gradient',
                x: 0, y: 0,
                width: dimensions.width,
                height: dimensions.height,
            }])
        }
    }, [brushColor, brushSize, tool, dimensions, selectedSticker, selectedStamp, symmetryMode, rainbowIndex])

    // 绘制中
    const handleMouseMove = useCallback((e) => {
        if (!isDrawing || !startPos) return
        const pos = getPos(e)

        if (tool === 'brush' || tool === 'eraser' || tool === 'highlighter') {
            const symmetryPoints = getSymmetryPoints(pos.x, pos.y)
            const numSymmetry = symmetryPoints.length

            setElements(prev => {
                const newElements = [...prev]
                // 更新最后 numSymmetry 个元素
                for (let i = 0; i < numSymmetry; i++) {
                    const idx = prev.length - numSymmetry + i
                    if (newElements[idx] && newElements[idx].type === 'line') {
                        newElements[idx] = {
                            ...newElements[idx],
                            points: [...newElements[idx].points, symmetryPoints[i][0], symmetryPoints[i][1]]
                        }
                    }
                }
                return newElements
            })
        } else if (tool === 'rainbow') {
            // 彩虹画笔 - 颜色渐变
            const newColorIndex = (rainbowIndex + 1) % RAINBOW_COLORS.length
            setRainbowIndex(newColorIndex)

            setElements(prev => {
                const last = prev[prev.length - 1]
                if (!last || last.tool !== 'rainbow') return prev
                return [...prev.slice(0, -1), {
                    ...last,
                    points: [...last.points, pos.x, pos.y],
                    rainbowColors: [...(last.rainbowColors || []), RAINBOW_COLORS[newColorIndex]]
                }]
            })
        } else if (tool === 'pattern') {
            // 图案画笔 - 每隔一定距离添加图案
            const lastPoint = patternPoints[patternPoints.length - 1]
            const dist = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2))

            if (dist > brushSize * 3) {
                setPatternPoints(prev => [...prev, { x: pos.x, y: pos.y }])
                // 添加图案（小花朵）
                setElements(prev => [...prev, {
                    id: 'pattern-' + Date.now(),
                    type: 'patternShape',
                    x: pos.x,
                    y: pos.y,
                    size: brushSize,
                    color: brushColor,
                }])
            }
        } else if (tool === 'spray') {
            const sprayPoints = generateSprayPoints(pos.x, pos.y, brushSize * 2, 10)
            setElements(prev => {
                const last = prev[prev.length - 1]
                if (!last || last.type !== 'spray') return prev
                return [...prev.slice(0, -1), {
                    ...last,
                    points: [...last.points, ...sprayPoints]
                }]
            })
        } else if (['line', 'arrow', 'rect', 'circle', 'triangle', 'star', 'heart'].includes(tool)) {
            const width = pos.x - startPos.x
            const height = pos.y - startPos.y
            const radius = Math.sqrt(width * width + height * height) / 2
            const id = tool + '-temp'

            setElements(prev => {
                const filtered = prev.filter(el => el.id !== id)
                let newShape

                if (tool === 'line') {
                    newShape = {
                        id,
                        type: 'simpleLine',
                        points: [startPos.x, startPos.y, pos.x, pos.y],
                        stroke: brushColor,
                        strokeWidth: brushSize,
                    }
                } else if (tool === 'arrow') {
                    newShape = {
                        id,
                        type: 'arrow',
                        points: [startPos.x, startPos.y, pos.x, pos.y],
                        stroke: brushColor,
                        strokeWidth: brushSize,
                        pointerLength: brushSize * 2,
                        pointerWidth: brushSize * 2,
                    }
                } else if (tool === 'rect') {
                    newShape = {
                        id,
                        type: 'rect',
                        x: Math.min(startPos.x, pos.x),
                        y: Math.min(startPos.y, pos.y),
                        width: Math.abs(width),
                        height: Math.abs(height),
                        stroke: brushColor,
                        strokeWidth: brushSize,
                    }
                } else if (tool === 'circle') {
                    newShape = {
                        id,
                        type: 'circle',
                        x: startPos.x + width / 2,
                        y: startPos.y + height / 2,
                        radiusX: Math.abs(width) / 2,
                        radiusY: Math.abs(height) / 2,
                        stroke: brushColor,
                        strokeWidth: brushSize,
                    }
                } else if (tool === 'triangle') {
                    newShape = {
                        id,
                        type: 'polygon',
                        x: startPos.x + width / 2,
                        y: startPos.y + height / 2,
                        sides: 3,
                        radius: radius,
                        stroke: brushColor,
                        strokeWidth: brushSize,
                    }
                } else if (tool === 'star') {
                    newShape = {
                        id,
                        type: 'star',
                        x: startPos.x + width / 2,
                        y: startPos.y + height / 2,
                        numPoints: 5,
                        innerRadius: radius * 0.4,
                        outerRadius: radius,
                        stroke: brushColor,
                        strokeWidth: brushSize,
                    }
                } else if (tool === 'heart') {
                    newShape = {
                        id,
                        type: 'heart',
                        points: generateHeartPoints(startPos.x + width / 2, startPos.y + height / 2, radius / 2),
                        stroke: brushColor,
                        strokeWidth: brushSize,
                        closed: true,
                    }
                }

                return [...filtered, newShape]
            })
        }
    }, [isDrawing, startPos, tool, brushColor, brushSize, symmetryMode, rainbowIndex, patternPoints])

    // 结束绘制
    const handleMouseUp = useCallback(() => {
        if (isDrawing) {
            setElements(prev => prev.map(el =>
                el.id?.endsWith('-temp')
                    ? { ...el, id: el.id.replace('-temp', '-' + Date.now()), draggable: tool === 'select' }
                    : el
            ))
        }
        setIsDrawing(false)
        setStartPos(null)
        setPatternPoints([])
    }, [isDrawing, tool])

    // 处理文字输入
    const handleTextSubmit = () => {
        if (textInput.value.trim()) {
            setElements(prev => [...prev, {
                id: 'text-' + Date.now(),
                type: 'text',
                x: textInput.x,
                y: textInput.y,
                text: textInput.value,
                fontSize: brushSize * 2,
                fill: brushColor,
                draggable: true,
            }])
        }
        setTextInput({ visible: false, x: 0, y: 0, value: '' })
    }

    // 处理元素选择
    const handleElementClick = (e, id) => {
        if (tool === 'select') {
            e.cancelBubble = true
            setSelectedId(id)
        }
    }

    // 处理元素拖拽结束
    const handleDragEnd = (e, id) => {
        const node = e.target
        setElements(prev => prev.map(el =>
            el.id === id ? { ...el, x: node.x(), y: node.y() } : el
        ))
    }

    // 渲染小花朵图案
    const renderPatternShape = (el, i) => {
        const petals = []
        for (let j = 0; j < 5; j++) {
            const angle = (j / 5) * Math.PI * 2
            petals.push(
                <Circle
                    key={`${i}-petal-${j}`}
                    x={el.x + Math.cos(angle) * el.size}
                    y={el.y + Math.sin(angle) * el.size}
                    radius={el.size * 0.6}
                    fill={el.color}
                />
            )
        }
        return (
            <Group key={i}>
                {petals}
                <Circle x={el.x} y={el.y} radius={el.size * 0.4} fill="#FFE066" />
            </Group>
        )
    }

    // 渲染彩虹线条
    const renderRainbowLine = (el, i) => {
        if (!el.points || el.points.length < 4) return null

        const segments = []
        for (let j = 0; j < el.points.length - 2; j += 2) {
            const colorIdx = Math.floor((j / 2) % RAINBOW_COLORS.length)
            segments.push(
                <Line
                    key={`${i}-seg-${j}`}
                    points={[el.points[j], el.points[j + 1], el.points[j + 2], el.points[j + 3]]}
                    stroke={RAINBOW_COLORS[colorIdx]}
                    strokeWidth={el.strokeWidth}
                    lineCap="round"
                    lineJoin="round"
                />
            )
        }
        return <Group key={i}>{segments}</Group>
    }

    // 渲染元素
    const renderElement = (el, i) => {
        const commonProps = {
            key: i,
            id: el.id,
            draggable: tool === 'select',
            onClick: (e) => handleElementClick(e, el.id),
            onTap: (e) => handleElementClick(e, el.id),
            onDragEnd: (e) => handleDragEnd(e, el.id),
        }

        switch (el.type) {
            case 'line':
                if (el.tool === 'rainbow') {
                    return renderRainbowLine(el, i)
                }
                return (
                    <Line
                        {...commonProps}
                        points={el.points}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        opacity={el.opacity || 1}
                        tension={0.5}
                        lineCap={el.lineCap}
                        lineJoin={el.lineJoin}
                        globalCompositeOperation={el.tool === 'eraser' ? 'destination-out' : 'source-over'}
                    />
                )
            case 'simpleLine':
                return (
                    <Line
                        {...commonProps}
                        points={el.points}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        lineCap="round"
                    />
                )
            case 'arrow':
                return (
                    <Arrow
                        {...commonProps}
                        points={el.points}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        pointerLength={el.pointerLength}
                        pointerWidth={el.pointerWidth}
                        fill={el.stroke}
                    />
                )
            case 'rect':
                return (
                    <Rect
                        {...commonProps}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        fill={el.fill}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                    />
                )
            case 'circle':
                return (
                    <Circle
                        {...commonProps}
                        x={el.x}
                        y={el.y}
                        radius={el.radiusX}
                        scaleY={(el.radiusY || el.radiusX) / el.radiusX}
                        fill={el.fill}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                    />
                )
            case 'polygon':
                return (
                    <RegularPolygon
                        {...commonProps}
                        x={el.x}
                        y={el.y}
                        sides={el.sides}
                        radius={el.radius}
                        fill={el.fill}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        rotation={el.rotation || 0}
                    />
                )
            case 'star':
                return (
                    <Star
                        {...commonProps}
                        x={el.x}
                        y={el.y}
                        numPoints={el.numPoints}
                        innerRadius={el.innerRadius}
                        outerRadius={el.outerRadius}
                        fill={el.fill}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                    />
                )
            case 'heart':
                return (
                    <Line
                        {...commonProps}
                        points={el.points}
                        stroke={el.stroke}
                        strokeWidth={el.strokeWidth}
                        fill={el.fill}
                        closed={el.closed}
                        tension={0.3}
                    />
                )
            case 'spray':
                return el.points.map((p, j) => (
                    <Circle
                        key={`${i}-${j}`}
                        x={p.x}
                        y={p.y}
                        radius={el.size}
                        fill={el.color}
                    />
                ))
            case 'text':
                return (
                    <Text
                        {...commonProps}
                        x={el.x}
                        y={el.y}
                        text={el.text}
                        fontSize={el.fontSize}
                        fill={el.fill}
                        fontFamily="Nunito, sans-serif"
                    />
                )
            case 'image':
                return (
                    <KonvaImage
                        {...commonProps}
                        x={el.x}
                        y={el.y}
                        image={el.image}
                        width={el.width}
                        height={el.height}
                    />
                )
            case 'gradient':
                return (
                    <Rect
                        key={i}
                        x={0}
                        y={0}
                        width={el.width}
                        height={el.height}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: el.width, y: 0 }}
                        fillLinearGradientColorStops={[
                            0, '#FF6B6B',
                            0.17, '#FFA94D',
                            0.33, '#FFE066',
                            0.5, '#69DB7C',
                            0.67, '#4DABF7',
                            0.83, '#DA77F2',
                            1, '#F783AC'
                        ]}
                    />
                )
            case 'patternShape':
                return renderPatternShape(el, i)
            default:
                return null
        }
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none', position: 'relative' }}>
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={(e) => { e.evt.preventDefault(); handleMouseDown(e) }}
                onTouchMove={(e) => { e.evt.preventDefault(); handleMouseMove(e) }}
                onTouchEnd={(e) => { e.evt.preventDefault(); handleMouseUp() }}
                style={{ backgroundColor: 'white', borderRadius: '12px' }}
            >
                <Layer>
                    <Rect name="background" x={0} y={0} width={dimensions.width} height={dimensions.height} fill="white" />

                    {/* 对称参考线 */}
                    {symmetryMode !== 'none' && (
                        <>
                            {(symmetryMode === 'horizontal' || symmetryMode === 'quad') && (
                                <Line
                                    points={[dimensions.width / 2, 0, dimensions.width / 2, dimensions.height]}
                                    stroke="#ddd"
                                    strokeWidth={1}
                                    dash={[5, 5]}
                                />
                            )}
                            {(symmetryMode === 'vertical' || symmetryMode === 'quad') && (
                                <Line
                                    points={[0, dimensions.height / 2, dimensions.width, dimensions.height / 2]}
                                    stroke="#ddd"
                                    strokeWidth={1}
                                    dash={[5, 5]}
                                />
                            )}
                        </>
                    )}

                    {elements.map((el, i) => renderElement(el, i))}
                    <Transformer ref={transformerRef} />
                </Layer>
            </Stage>

            {/* 文字输入框 */}
            {textInput.visible && (
                <div
                    style={{
                        position: 'absolute',
                        left: textInput.x,
                        top: textInput.y,
                        zIndex: 10,
                    }}
                >
                    <input
                        autoFocus
                        type="text"
                        value={textInput.value}
                        onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextSubmit()
                            if (e.key === 'Escape') setTextInput({ visible: false, x: 0, y: 0, value: '' })
                        }}
                        onBlur={handleTextSubmit}
                        style={{
                            padding: '8px 12px',
                            fontSize: brushSize * 1.5 + 'px',
                            color: brushColor,
                            border: '2px solid #3BFBFF',
                            borderRadius: '8px',
                            outline: 'none',
                            minWidth: '150px',
                        }}
                        placeholder="输入文字..."
                    />
                </div>
            )}
        </div>
    )
}

// 导出贴纸和印章配置供ToolBar使用
export { STICKERS, STAMPS, TEMPLATES }
export default KonvaCanvas
