import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, Grid, Environment, Html } from '@react-three/drei'
import * as THREE from 'three'

/**
 * XYZ坐标轴辅助组件
 */
function AxisHelper({ size = 4 }) {
    return (
        <group>
            {/* X轴 - 红色 - 加粗 */}
            <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), size, 0xff3333, 0.5, 0.25]} />
            {/* Y轴 - 绿色 - 加粗 */}
            <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), size, 0x33ff33, 0.5, 0.25]} />
            {/* Z轴 - 蓝色 - 加粗 */}
            <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), size, 0x3333ff, 0.5, 0.25]} />

            {/* 轴标签 - 更大更醒目 */}
            <Html position={[size + 0.6, 0, 0]} center>
                <span style={{ color: '#ff3333', fontWeight: 'bold', fontSize: '24px', textShadow: '2px 2px 4px #000, -1px -1px 2px #000' }}>X</span>
            </Html>
            <Html position={[0, size + 0.6, 0]} center>
                <span style={{ color: '#33ff33', fontWeight: 'bold', fontSize: '24px', textShadow: '2px 2px 4px #000, -1px -1px 2px #000' }}>Y</span>
            </Html>
            <Html position={[0, 0, size + 0.6]} center>
                <span style={{ color: '#3333ff', fontWeight: 'bold', fontSize: '24px', textShadow: '2px 2px 4px #000, -1px -1px 2px #000' }}>Z</span>
            </Html>
        </group>
    )
}

/**
 * 3D模型渲染组件 - 增强版
 */
function Model({ url, autoRotate }) {
    const groupRef = useRef()
    const { scene } = useGLTF(url)

    // 自动旋转
    useFrame((state, delta) => {
        if (autoRotate && groupRef.current) {
            groupRef.current.rotation.y += delta * 0.5
        }
    })

    // 克隆场景以避免重复使用问题
    const clonedScene = scene.clone()

    return (
        <group ref={groupRef}>
            <Center>
                {/* 旋转180度修正模型方向（X轴翻转） */}
                <group rotation={[Math.PI, 0, 0]}>
                    <primitive object={clonedScene} />
                </group>
            </Center>
        </group>
    )
}

/**
 * 加载中的占位符
 */
function LoadingFallback() {
    const meshRef = useRef()

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta
            meshRef.current.rotation.y += delta * 0.5
        }
    })

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#3BFBFF" wireframe />
        </mesh>
    )
}

/**
 * 3D模型预览组件 - 增强版
 * 支持：缩放、旋转、平移、XYZ轴显示、网格地面
 */
function Model3DViewer({ modelUrl, isLoading }) {
    const controlsRef = useRef()
    const [showAxis, setShowAxis] = useState(true)
    const [showGrid, setShowGrid] = useState(true)
    const [autoRotate, setAutoRotate] = useState(false)

    // 重置视角
    const resetCamera = () => {
        if (controlsRef.current) {
            controlsRef.current.reset()
        }
    }

    // 加载状态
    if (isLoading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner" />
                <div className="loading-text">🔮 正在将画作变成3D魔法...</div>
            </div>
        )
    }

    // 无模型时显示占位符
    if (!modelUrl) {
        return (
            <div className="viewer-placeholder">
                <div className="viewer-placeholder-icon">🎲</div>
                <p className="viewer-placeholder-text">
                    在左边画出你的作品，<br />
                    然后点击"生成3D模型"按钮，<br />
                    你的画就会变成3D的哦！
                </p>
            </div>
        )
    }

    // 有模型时显示3D视图
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* 控制按钮 */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 10,
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => setShowAxis(!showAxis)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: showAxis ? 'linear-gradient(135deg, #3BFBFF, #0AFFA4)' : 'rgba(255,255,255,0.2)',
                        color: showAxis ? '#1a1a2e' : '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    📐 坐标轴
                </button>
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: showGrid ? 'linear-gradient(135deg, #3BFBFF, #0AFFA4)' : 'rgba(255,255,255,0.2)',
                        color: showGrid ? '#1a1a2e' : '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    🔲 网格
                </button>
                <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: autoRotate ? 'linear-gradient(135deg, #3BFBFF, #0AFFA4)' : 'rgba(255,255,255,0.2)',
                        color: autoRotate ? '#1a1a2e' : '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    🔄 自动旋转
                </button>
                <button
                    onClick={resetCamera}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    🎯 重置视角
                </button>
            </div>

            {/* 操作提示 */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                zIndex: 10,
                fontSize: '11px',
                color: 'rgba(255,255,255,0.6)',
                background: 'rgba(0,0,0,0.3)',
                padding: '6px 10px',
                borderRadius: '6px'
            }}>
                🖱️ 左键拖动旋转 | 右键拖动平移 | 滚轮缩放
            </div>

            <Canvas
                camera={{ position: [3, 3, 3], fov: 50 }}
                style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
            >
                {/* 环境光 */}
                <ambientLight intensity={0.4} />

                {/* 主光源 */}
                <directionalLight
                    position={[5, 5, 5]}
                    intensity={1}
                    castShadow
                />

                {/* 补光 */}
                <directionalLight
                    position={[-5, 3, -5]}
                    intensity={0.4}
                />

                {/* 底部补光 */}
                <directionalLight
                    position={[0, -5, 0]}
                    intensity={0.2}
                />

                {/* 环境贴图 */}
                <Environment preset="city" />

                {/* 网格地面 */}
                {showGrid && (
                    <Grid
                        args={[10, 10]}
                        cellSize={0.5}
                        cellThickness={0.5}
                        cellColor="#3BFBFF"
                        sectionSize={2}
                        sectionThickness={1}
                        sectionColor="#0AFFA4"
                        fadeDistance={15}
                        fadeStrength={1}
                        followCamera={false}
                        position={[0, -1, 0]}
                    />
                )}

                {/* XYZ坐标轴 */}
                {showAxis && <AxisHelper size={3} />}

                {/* 3D模型 */}
                <Suspense fallback={<LoadingFallback />}>
                    <Model url={modelUrl} autoRotate={autoRotate} />
                </Suspense>

                {/* 轨道控制器 - 增强版 */}
                <OrbitControls
                    ref={controlsRef}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={0.3}
                    maxDistance={50}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI}
                    zoomSpeed={1.2}
                    panSpeed={0.8}
                    rotateSpeed={0.8}
                    dampingFactor={0.1}
                    enableDamping={true}
                />
            </Canvas>
        </div>
    )
}

export default Model3DViewer
