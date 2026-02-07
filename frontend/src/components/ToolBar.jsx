import { useRef, useState } from 'react'
import { STICKERS, STAMPS, TEMPLATES } from './canvas/KonvaCanvas'

/**
 * 工具栏组件 - 儿童进阶完整版
 * 包含：基础工具、形状、贴纸、印章、对称模式、模板
 */
function ToolBar({
    brushColor,
    onColorChange,
    brushSize,
    onSizeChange,
    tool = 'brush',
    onToolChange,
    selectedSticker,
    onStickerChange,
    selectedStamp,
    onStampChange,
    symmetryMode = 'none',
    onSymmetryChange,
    onClear,
    onUndo,
    onRedo,
    onImportImage,
    onLoadTemplate,
    canRedo = false,
}) {
    const fileInputRef = useRef(null)
    const [showStickerPicker, setShowStickerPicker] = useState(false)
    const [showStampPicker, setShowStampPicker] = useState(false)
    const [showTemplatePicker, setShowTemplatePicker] = useState(false)

    // 颜色调色板
    const colors = [
        { name: '红色', value: '#FF6B6B' },
        { name: '橙色', value: '#FFA94D' },
        { name: '黄色', value: '#FFE066' },
        { name: '绿色', value: '#69DB7C' },
        { name: '蓝色', value: '#4DABF7' },
        { name: '紫色', value: '#DA77F2' },
        { name: '粉色', value: '#F783AC' },
        { name: '棕色', value: '#A0522D' },
        { name: '黑色', value: '#2C2C2C' },
        { name: '白色', value: '#FFFFFF' },
    ]

    // 工具分组
    const toolGroups = [
        {
            name: '画笔',
            tools: [
                { id: 'brush', name: '画笔', icon: '✏️' },
                { id: 'eraser', name: '橡皮擦', icon: '🧽' },
                { id: 'highlighter', name: '荧光笔', icon: '🖍️' },
                { id: 'spray', name: '喷枪', icon: '🎇' },
                { id: 'rainbow', name: '彩虹笔', icon: '🌈' },
                { id: 'pattern', name: '花朵笔', icon: '🌸' },
            ]
        },
        {
            name: '线条',
            tools: [
                { id: 'line', name: '直线', icon: '📏' },
                { id: 'arrow', name: '箭头', icon: '➡️' },
            ]
        },
        {
            name: '形状',
            tools: [
                { id: 'rect', name: '矩形', icon: '⬜' },
                { id: 'circle', name: '圆形', icon: '⭕' },
                { id: 'triangle', name: '三角形', icon: '🔺' },
                { id: 'star', name: '星形', icon: '⭐' },
                { id: 'heart', name: '心形', icon: '❤️' },
            ]
        },
        {
            name: '特殊',
            tools: [
                { id: 'text', name: '文字', icon: '🔤' },
                { id: 'sticker', name: '贴纸', icon: '😊', hasPopup: true },
                { id: 'stamp', name: '印章', icon: '🔶', hasPopup: true },
                { id: 'fill', name: '填充', icon: '🪣' },
                { id: 'gradient', name: '渐变', icon: '🎨' },
                { id: 'select', name: '选择', icon: '👆' },
            ]
        },
    ]

    // 对称模式
    const symmetryModes = [
        { id: 'none', name: '无', icon: '➖' },
        { id: 'horizontal', name: '左右对称', icon: '↔️' },
        { id: 'vertical', name: '上下对称', icon: '↕️' },
        { id: 'quad', name: '四象限', icon: '✚' },
    ]

    // 处理工具选择
    const handleToolSelect = (toolId) => {
        if (toolId === 'sticker') {
            setShowStickerPicker(!showStickerPicker)
            setShowStampPicker(false)
        } else if (toolId === 'stamp') {
            setShowStampPicker(!showStampPicker)
            setShowStickerPicker(false)
        } else {
            setShowStickerPicker(false)
            setShowStampPicker(false)
        }
        onToolChange && onToolChange(toolId)
    }

    // 处理图片导入
    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file && onImportImage) {
            const reader = new FileReader()
            reader.onload = (event) => {
                onImportImage(event.target.result)
            }
            reader.readAsDataURL(file)
        }
        e.target.value = ''
    }

    return (
        <div className="toolbar-container">
            {/* 工具选择 */}
            <div className="toolbar toolbar-tools">
                {toolGroups.map((group) => (
                    <div key={group.name} className="toolbar-group">
                        <span className="toolbar-label">{group.name}</span>
                        <div className="tool-buttons">
                            {group.tools.map((t) => (
                                <button
                                    key={t.id}
                                    className={`tool-btn ${tool === t.id ? 'active' : ''}`}
                                    onClick={() => handleToolSelect(t.id)}
                                    title={t.name}
                                >
                                    <span className="tool-icon">{t.icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* 对称模式 */}
                <div className="toolbar-group">
                    <span className="toolbar-label">对称</span>
                    <div className="tool-buttons">
                        {symmetryModes.map((mode) => (
                            <button
                                key={mode.id}
                                className={`tool-btn ${symmetryMode === mode.id ? 'active' : ''}`}
                                onClick={() => onSymmetryChange && onSymmetryChange(mode.id)}
                                title={mode.name}
                            >
                                <span className="tool-icon">{mode.icon}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 贴纸选择器弹窗 */}
            {showStickerPicker && (
                <div className="picker-popup">
                    <div className="picker-header">
                        <span>😊 选择贴纸</span>
                        <button className="picker-close" onClick={() => setShowStickerPicker(false)}>✕</button>
                    </div>
                    <div className="picker-grid">
                        {STICKERS.map((sticker) => (
                            <button
                                key={sticker.id}
                                className={`picker-item ${selectedSticker === sticker.id ? 'active' : ''}`}
                                onClick={() => {
                                    onStickerChange && onStickerChange(sticker.id)
                                }}
                                title={sticker.name}
                            >
                                {sticker.emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 印章选择器弹窗 */}
            {showStampPicker && (
                <div className="picker-popup">
                    <div className="picker-header">
                        <span>🔶 选择印章</span>
                        <button className="picker-close" onClick={() => setShowStampPicker(false)}>✕</button>
                    </div>
                    <div className="picker-grid">
                        {STAMPS.map((stamp) => (
                            <button
                                key={stamp.id}
                                className={`picker-item stamp-item ${selectedStamp === stamp.id ? 'active' : ''}`}
                                onClick={() => {
                                    onStampChange && onStampChange(stamp.id)
                                }}
                                title={stamp.name}
                            >
                                <div className={`stamp-preview stamp-${stamp.shape}`} style={{ backgroundColor: brushColor }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 颜色、大小和操作 */}
            <div className="toolbar toolbar-colors">
                <div className="toolbar-group">
                    <span className="toolbar-label">🎨 颜色</span>
                    <div className="color-picker">
                        {colors.map((color) => (
                            <button
                                key={color.value}
                                className={`color-btn ${brushColor === color.value ? 'active' : ''}`}
                                style={{
                                    backgroundColor: color.value,
                                    border: color.value === '#FFFFFF' ? '2px solid #ccc' : 'none'
                                }}
                                onClick={() => onColorChange(color.value)}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                <div className="toolbar-group">
                    <span className="toolbar-label">📏 大小</span>
                    <input
                        type="range"
                        className="brush-size-slider"
                        min="1"
                        max="50"
                        value={brushSize}
                        onChange={(e) => onSizeChange(Number(e.target.value))}
                    />
                    <span className="size-value">{brushSize}px</span>
                </div>

                {/* 模板按钮 */}
                <div className="toolbar-group">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                        title="简笔画模板"
                    >
                        📋 模板
                    </button>
                </div>

                {/* 操作按钮 */}
                <div className="toolbar-group toolbar-actions">
                    <button className="btn btn-secondary btn-sm" onClick={onUndo} title="撤销">
                        ↩️
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={onRedo}
                        title="重做"
                        disabled={!canRedo}
                    >
                        ↪️
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        title="导入图片"
                    >
                        🖼️
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={onClear} title="清除全部">
                        🗑️
                    </button>
                </div>
            </div>

            {/* 模板选择器弹窗 */}
            {showTemplatePicker && (
                <div className="picker-popup template-popup">
                    <div className="picker-header">
                        <span>📋 简笔画模板</span>
                        <button className="picker-close" onClick={() => setShowTemplatePicker(false)}>✕</button>
                    </div>
                    <div className="picker-grid">
                        {TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                className="picker-item template-item"
                                onClick={() => {
                                    onLoadTemplate && onLoadTemplate(template.id)
                                    setShowTemplatePicker(false)
                                }}
                                title={template.name}
                            >
                                <span className="template-icon">{template.icon}</span>
                                <span className="template-name">{template.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
        </div>
    )
}

export default ToolBar
