import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { landmarkCell, streamLandmarks, type Landmark } from './landmarkModel'
import { sampleHeight } from './terrain'
import { useGameStore } from '@/state/useGameStore'

const RADIUS = 260

/** One landmark's voxel structure (a few distinct, memorable set-pieces). */
function LandmarkMesh({ lm }: { lm: Landmark }) {
  const y = sampleHeight(lm.x, lm.z)
  if (lm.type === 'tower') {
    return (
      <group position={[lm.x, y, lm.z]} rotation={[0, lm.rot, 0]}>
        <mesh castShadow position={[0, 3, 0]}>
          <boxGeometry args={[7, 6, 7]} />
          <meshStandardMaterial color="#9aa3b4" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 18, 0]}>
          <boxGeometry args={[3.4, 24, 3.4]} />
          <meshStandardMaterial color="#c2c8d4" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, 33, 0]}>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#7e8696" roughness={0.7} />
        </mesh>
        <mesh position={[0, 37, 0]}>
          <boxGeometry args={[0.5, 5, 0.5]} />
          <meshStandardMaterial color="#ff4d4d" emissive="#ff2e2e" emissiveIntensity={1.4} />
        </mesh>
      </group>
    )
  }
  if (lm.type === 'obelisk') {
    return (
      <group position={[lm.x, y, lm.z]} rotation={[0, lm.rot, 0]}>
        <mesh castShadow position={[0, 1, 0]}>
          <boxGeometry args={[6, 2, 6]} />
          <meshStandardMaterial color="#8b93a6" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 12, 0]}>
          <boxGeometry args={[3, 22, 3]} />
          <meshStandardMaterial color="#d8b65a" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh castShadow position={[0, 24, 0]}>
          <coneGeometry args={[2.4, 4, 4]} />
          <meshStandardMaterial color="#ffd23f" emissive="#ffb300" emissiveIntensity={0.6} />
        </mesh>
      </group>
    )
  }
  // dome / stadium
  return (
    <group position={[lm.x, y, lm.z]} rotation={[0, lm.rot, 0]}>
      <mesh castShadow position={[0, 2.5, 0]}>
        <cylinderGeometry args={[12, 12, 5, 20]} />
        <meshStandardMaterial color="#b8becb" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 5, 0]}>
        <sphereGeometry args={[11, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e3e8f0" roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  )
}

/**
 * Streaming landmarks: large, distinct voxel set-pieces (radio tower, golden
 * obelisk, domed stadium) scattered sparsely so the infinite world has
 * memorable beats. Re-streamed when the player crosses a landmark cell.
 */
export function Landmarks() {
  const [list, setList] = useState<Landmark[]>(() => streamLandmarks(0, 0, RADIUS))
  const lastCell = useRef({ i: 0, j: 0 })

  useFrame(() => {
    const { px, pz } = useGameStore.getState().radar
    const { i, j } = landmarkCell(px, pz)
    if (i !== lastCell.current.i || j !== lastCell.current.j) {
      lastCell.current = { i, j }
      setList(streamLandmarks(px, pz, RADIUS))
    }
  })

  return (
    <group>
      {list.map((lm, idx) => (
        <LandmarkMesh key={`${lm.x.toFixed(1)}:${lm.z.toFixed(1)}:${idx}`} lm={lm} />
      ))}
    </group>
  )
}
