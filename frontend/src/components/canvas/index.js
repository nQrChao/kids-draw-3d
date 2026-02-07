// 画布组件导出
export { default as KonvaCanvas } from './KonvaCanvas'
export { default as SkiaCanvas } from './SkiaCanvas'
export { default as TldrawCanvas } from './TldrawCanvas'

// 画布引擎配置
export const CANVAS_ENGINES = {
    konva: {
        id: 'konva',
        name: 'React-Konva',
        icon: '🎨',
        description: 'React友好、高性能',
        component: 'KonvaCanvas'
    },
    skia: {
        id: 'skia',
        name: 'Google Skia',
        icon: '🔷',
        description: 'Google技术、GPU加速',
        component: 'SkiaCanvas'
    },
    tldraw: {
        id: 'tldraw',
        name: 'Tldraw',
        icon: '✏️',
        description: '无限画布、类Figma',
        component: 'TldrawCanvas'
    }
}
