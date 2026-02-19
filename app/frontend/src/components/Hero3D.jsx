import { Canvas } from '@react-three/fiber'
import { Stars, Sparkles, Float, MeshDistortMaterial } from '@react-three/drei'

function FloatingShape({ position, color, scale = 1 }) {
    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
            <mesh position={position} scale={scale}>
                <icosahedronGeometry args={[1, 0]} />
                <MeshDistortMaterial
                    color={color}
                    speed={2.5}
                    distort={0.4}
                    radius={1}
                    metalness={0.5}
                    roughness={0.2}
                />
            </mesh>
        </Float>
    )
}

export default function Hero3D() {
    return (
        <Canvas
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            camera={{ position: [0, 0, 8], fov: 45 }}
            gl={{ alpha: true }}
        >
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            <Sparkles count={80} scale={12} size={3} speed={0.4} opacity={0.7} color="#FBBF24" />

            {/* Floating abstract gems */}
            <FloatingShape position={[-3.5, 0.5, -2]} color="#F59E0B" scale={1.2} /> {/* Gold */}
            <FloatingShape position={[3.5, -1, -3]} color="#3B82F6" scale={1.4} /> {/* Blue */}
            <FloatingShape position={[0, -2.5, -5]} color="#10B981" scale={1.0} /> {/* Green */}
            <FloatingShape position={[0, 2.5, -6]} color="#EC4899" scale={0.8} /> {/* Pink */}
        </Canvas>
    )
}
