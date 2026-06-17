import * as THREE from 'three'

/**
 * Procedurally generated canvas textures. Kept tiny and cached so the whole
 * city shares one window/road texture (cheap, and avoids shipping image assets).
 */

let lightsTex: THREE.CanvasTexture | null = null
let roadTex: THREE.CanvasTexture | null = null

/** Emissive window pattern: black walls, randomly lit warm/cool windows. */
export function getLightsTexture(): THREE.CanvasTexture {
  if (lightsTex) return lightsTex
  const cols = 4
  const rows = 8
  const cw = 32
  const ch = 28
  const canvas = document.createElement('canvas')
  canvas.width = cols * cw
  canvas.height = rows * ch
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const warm = ['#ffd9a0', '#ffe9b0', '#fff2c8', '#9fd0ff', '#ffcf8a']
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < 0.42) {
        ctx.fillStyle = warm[(Math.random() * warm.length) | 0]
      } else {
        ctx.fillStyle = '#05060a'
      }
      ctx.fillRect(c * cw + 5, r * ch + 5, cw - 12, ch - 12)
    }
  }
  lightsTex = new THREE.CanvasTexture(canvas)
  lightsTex.wrapS = lightsTex.wrapT = THREE.RepeatWrapping
  lightsTex.repeat.set(2, 3)
  return lightsTex
}

/** Asphalt tile with lane markings, repeated across the ground plane. */
export function getRoadTexture(repeat: number): THREE.CanvasTexture {
  if (roadTex) {
    roadTex.repeat.set(repeat, repeat)
    return roadTex
  }
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  // Asphalt base.
  ctx.fillStyle = '#1b1f2a'
  ctx.fillRect(0, 0, size, size)
  // Lighter lot in the centre (block footprint area).
  ctx.fillStyle = '#23283440'
  const inset = size * 0.18
  ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2)
  // Lane markings along the road edges.
  ctx.strokeStyle = '#41475a'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, size - 2, size - 2)
  // Dashed centre lines on the roads (edges of the tile).
  ctx.setLineDash([10, 10])
  ctx.strokeStyle = '#c9a23a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, size * 0.06)
  ctx.lineTo(size, size * 0.06)
  ctx.moveTo(size * 0.06, 0)
  ctx.lineTo(size * 0.06, size)
  ctx.stroke()
  roadTex = new THREE.CanvasTexture(canvas)
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping
  roadTex.repeat.set(repeat, repeat)
  return roadTex
}
