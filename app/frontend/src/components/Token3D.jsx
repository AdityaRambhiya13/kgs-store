import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'

function Coin({ token, isReady }) {
    const group = useRef()

    useFrame((state, delta) => {
        // Spin faster if ready
        const speed = isReady ? 3 : 0.8
        if (group.current) {
            group.current.rotation.y += delta * speed
        }
    })

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={isReady ? 1.5 : 0.8} floatingRange={[-0.2, 0.2]}>
            <group ref={group}>
                {/* The Coin Body */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[2.2, 2.2, 0.25, 64]} />
                    <meshStandardMaterial
                        color="#F59E0B"
                        metalness={0.7}
                        roughness={0.2}
                    />
                </mesh>

                {/* Edge / Rim (slightly larger) */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[2.25, 2.25, 0.15, 64]} />
                    <meshStandardMaterial color="#B45309" metalness={0.8} roughness={0.3} />
                </mesh>

                {/* Front Text */}
                <Text
                    position={[0, 0, 0.14]}
                    fontSize={0.7}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#78350F"
                    font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
                >
                    {token}
                </Text>

                {/* Back Text */}
                <Text
                    position={[0, 0, -0.14]}
                    rotation={[0, Math.PI, 0]}
                    fontSize={0.7}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#78350F"
                    font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
                >
                    {token}
                </Text>
            </group>
        </Float>
    )
}

export default function Token3D({ token, isReady }) {
    return (
        <Canvas
            camera={{ position: [0, 0, 6], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
            style={{ width: '100%', height: '100%' }}
        >
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <spotLight position={[-5, 5, 5]} angle={0.5} penumbra={1} intensity={1} color="#FFF7ED" />
            <Coin token={token} isReady={isReady} />
        </Canvas>
    )
}
