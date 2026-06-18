import { useMemo } from 'react'
import * as THREE from 'three'
import { getCity } from './cityModel'
import { sampleHeight, urbanization } from './terrain'

const GRASS = new THREE.Color('#5aa84a')
const ASPHALT = new THREE.Color('#3c4250')
const tmp = new THREE.Color()

/**
 * One displaced, vertex-coloured ground mesh covering the whole world. Height
 * follows the terrain field; colour blends grass (plains) to asphalt (city) by
 * urbanization, so paved streets and open country read clearly without tiled
 * road textures (which never lined up with the grid).
 */
export function Ground() {
  const city = useMemo(() => getCity(), [])

  const geometry = useMemo(() => {
    const size = city.groundSize
    const seg = 180
    const geo = new THREE.PlaneGeometry(size, size, seg, seg)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const wz = -y // after the -90° X rotation, local +Y maps to world -Z
      pos.setZ(i, sampleHeight(x, wz))
      const u = urbanization(x, wz)
      tmp.copy(GRASS).lerp(ASPHALT, THREE.MathUtils.clamp((u - 0.25) * 2.4, 0, 1))
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [city])

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  )
}
