/**
 * Procedural audio engine (no asset files). Everything is synthesised with the
 * Web Audio API:
 *  - Dynamic chase music whose tempo/intensity rises with heat (GDD §11).
 *  - Engine hum tied to player speed.
 *  - A two-tone siren that fades in while spotted.
 *  - One-shot cues: heat increase, escape, helicopter, bust.
 *
 * Fully defensive — if Web Audio is unavailable it silently no-ops.
 */

type CueName = 'heatUp' | 'escape' | 'heli' | 'bust' | 'roadblock' | 'explosion' | 'pickup'

class AudioManagerImpl {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null

  private engineOsc: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  private engineFilter: BiquadFilterNode | null = null

  private sirenOsc: OscillatorNode | null = null
  private sirenLfo: OscillatorNode | null = null
  private sirenGain: GainNode | null = null

  private musicVol = 0.7
  private sfxVol = 0.8
  private running = false
  private schedulerId: number | null = null

  /** Lazily create the context (must follow a user gesture). */
  start(): void {
    try {
      if (!this.ctx) this.build()
      this.ctx?.resume()
      this.running = true
    } catch {
      /* audio unsupported — ignore */
    }
  }

  stop(): void {
    this.running = false
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId)
      this.schedulerId = null
    }
    if (this.engineGain) this.engineGain.gain.value = 0
    if (this.sirenGain) this.sirenGain.gain.value = 0
    this.ctx?.suspend()
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music
    this.sfxVol = sfx
    if (this.musicGain) this.musicGain.gain.value = music * 0.5
    if (this.sfxGain) this.sfxGain.gain.value = sfx
  }

  /** Per-tick update of continuous sources. */
  update(p: {
    heat: number
    spotted: boolean
    speed: number
    inVehicle: boolean
  }): void {
    if (!this.ctx || !this.running) return
    const t = this.ctx.currentTime

    // Engine: frequency + volume track speed when driving.
    if (this.engineOsc && this.engineGain && this.engineFilter) {
      const target = p.inVehicle ? 55 + p.speed * 4.2 : 0
      this.engineOsc.frequency.setTargetAtTime(Math.max(40, target), t, 0.08)
      this.engineGain.gain.setTargetAtTime(p.inVehicle ? 0.12 * this.sfxVol : 0, t, 0.15)
      this.engineFilter.frequency.setTargetAtTime(300 + p.speed * 20, t, 0.1)
    }

    // Siren swells while spotted, louder at higher heat.
    if (this.sirenGain) {
      const target = p.spotted ? (0.06 + Math.min(0.12, p.heat * 0.015)) * this.sfxVol : 0
      this.sirenGain.gain.setTargetAtTime(target, t, 0.25)
    }
  }

  cue(name: CueName): void {
    if (!this.ctx || !this.sfxGain || !this.running) return
    const t = this.ctx.currentTime
    switch (name) {
      case 'heatUp':
        this.blip(440, 660, 0.18, 'square')
        break
      case 'escape':
        this.blip(660, 330, 0.4, 'sine')
        break
      case 'heli':
        this.thump()
        break
      case 'bust':
        this.blip(330, 80, 0.7, 'sawtooth')
        break
      case 'roadblock':
        this.blip(220, 220, 0.3, 'square')
        break
      case 'explosion':
        this.explosion()
        break
      case 'pickup':
        this.blip(520, 880, 0.22, 'triangle')
        break
    }
    void t
  }

  // --- internals ---

  private build(): void {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(this.ctx.destination)

    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = this.musicVol * 0.5
    this.musicGain.connect(this.master)

    this.sfxGain = this.ctx.createGain()
    this.sfxGain.gain.value = this.sfxVol
    this.sfxGain.connect(this.master)

    // Engine chain.
    this.engineOsc = this.ctx.createOscillator()
    this.engineOsc.type = 'sawtooth'
    this.engineFilter = this.ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 400
    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.value = 0
    this.engineOsc.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.master)
    this.engineOsc.start()

    // Siren: oscillator warbled by an LFO.
    this.sirenOsc = this.ctx.createOscillator()
    this.sirenOsc.type = 'triangle'
    this.sirenOsc.frequency.value = 760
    this.sirenLfo = this.ctx.createOscillator()
    this.sirenLfo.type = 'sine'
    this.sirenLfo.frequency.value = 4
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 120
    this.sirenLfo.connect(lfoGain)
    lfoGain.connect(this.sirenOsc.frequency)
    this.sirenGain = this.ctx.createGain()
    this.sirenGain.gain.value = 0
    this.sirenOsc.connect(this.sirenGain)
    this.sirenGain.connect(this.master)
    this.sirenOsc.start()
    this.sirenLfo.start()
  }

  /** Punchy explosion: filtered noise burst + descending low boom. */
  private explosion(): void {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    const dur = 0.6
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const decay = 1 - i / data.length
      data[i] = (Math.random() * 2 - 1) * decay * decay
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filt = this.ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.setValueAtTime(1100, t)
    filt.frequency.exponentialRampToValueAtTime(120, t + dur)
    const ng = this.ctx.createGain()
    ng.gain.setValueAtTime(0.7 * this.sfxVol, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(filt)
    filt.connect(ng)
    ng.connect(this.sfxGain)
    src.start(t)
    src.stop(t + dur)

    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(95, t)
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.5)
    const og = this.ctx.createGain()
    og.gain.setValueAtTime(0.55 * this.sfxVol, t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(og)
    og.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.55)
  }

  private blip(from: number, to: number, dur: number, type: OscillatorType): void {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.35 * this.sfxVol, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  private thump(): void {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime
    for (let i = 0; i < 6; i++) {
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 60
      const tt = t + i * 0.12
      g.gain.setValueAtTime(0.0001, tt)
      g.gain.exponentialRampToValueAtTime(0.3 * this.sfxVol, tt + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.1)
      osc.connect(g)
      g.connect(this.sfxGain)
      osc.start(tt)
      osc.stop(tt + 0.12)
    }
  }
}

export const Audio = new AudioManagerImpl()
