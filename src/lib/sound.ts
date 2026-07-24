// THE SYSTEM — Sound Effects (Web Audio synthesis)
let ctx: AudioContext | null = null
let enabled = true

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { return null } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function setSoundEnabled(on: boolean) { enabled = on }
export function isSoundEnabled() { return enabled }

function tone(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1, delay: number = 0) {
  const c = getCtx(); if (!c || !enabled) return
  const osc = c.createOscillator(); const gain = c.createGain()
  osc.type = type; osc.frequency.value = freq
  osc.connect(gain); gain.connect(c.destination)
  const start = c.currentTime + delay
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.start(start); osc.stop(start + duration)
}

export function soundNotification() { tone(880, 0.15, 'sine', 0.08); tone(1320, 0.2, 'sine', 0.06, 0.05) }
export function soundQuestComplete() { tone(659, 0.15, 'triangle', 0.1); tone(880, 0.2, 'triangle', 0.1, 0.1); tone(1318, 0.3, 'triangle', 0.08, 0.2) }
export function soundLevelUp() {
  tone(523, 0.1, 'square', 0.06); tone(659, 0.1, 'square', 0.06, 0.05); tone(784, 0.15, 'square', 0.07, 0.1)
  tone(1047, 0.4, 'triangle', 0.1, 0.25); tone(1319, 0.4, 'triangle', 0.08, 0.25); tone(1568, 0.4, 'triangle', 0.06, 0.25)
  tone(2093, 0.5, 'sine', 0.04, 0.4)
}
export function soundWarning() { tone(220, 0.3, 'sawtooth', 0.08); tone(180, 0.4, 'sawtooth', 0.06, 0.1) }
export function soundPenalty() { tone(110, 0.2, 'square', 0.1); tone(140, 0.2, 'square', 0.1, 0.15); tone(110, 0.2, 'square', 0.1, 0.3); tone(140, 0.3, 'square', 0.1, 0.45) }
export function soundShadowExtract() { tone(440, 0.1, 'sawtooth', 0.08); tone(330, 0.15, 'sawtooth', 0.08, 0.05); tone(220, 0.3, 'sawtooth', 0.1, 0.1); tone(165, 0.5, 'triangle', 0.06, 0.25) }
export function soundGateOpen() { tone(80, 0.6, 'sawtooth', 0.08); tone(120, 0.4, 'sine', 0.06, 0.1); tone(160, 0.3, 'sine', 0.04, 0.2) }
export function soundDungeonClear() { tone(523, 0.2, 'triangle', 0.08); tone(659, 0.2, 'triangle', 0.08, 0.05); tone(784, 0.3, 'triangle', 0.08, 0.1); tone(1047, 0.5, 'sine', 0.06, 0.2) }
export function soundClick() { tone(1200, 0.04, 'square', 0.04) }
export function soundStatUp() { tone(880, 0.08, 'triangle', 0.06); tone(1320, 0.1, 'triangle', 0.05, 0.04) }
export function soundSkillUnlock() { tone(659, 0.1, 'sine', 0.06); tone(988, 0.15, 'sine', 0.06, 0.05); tone(1319, 0.3, 'sine', 0.05, 0.1); tone(1976, 0.4, 'sine', 0.04, 0.2) }
export function soundPurchase() { tone(1319, 0.06, 'square', 0.05); tone(1568, 0.08, 'square', 0.05, 0.04); tone(1976, 0.1, 'square', 0.04, 0.08) }
export function soundSystemBoot() { tone(110, 0.5, 'sine', 0.06); tone(220, 0.4, 'sine', 0.05, 0.1); tone(440, 0.3, 'sine', 0.04, 0.2); tone(880, 0.5, 'triangle', 0.06, 0.3) }
export function soundAchievement() { tone(659, 0.1, 'triangle', 0.08); tone(880, 0.1, 'triangle', 0.08, 0.05); tone(1047, 0.15, 'triangle', 0.08, 0.1); tone(1319, 0.3, 'sine', 0.06, 0.2); tone(1568, 0.4, 'sine', 0.05, 0.3) }
export function soundStreak() { tone(523, 0.1, 'triangle', 0.06); tone(659, 0.1, 'triangle', 0.06, 0.08); tone(784, 0.1, 'triangle', 0.06, 0.16); tone(1047, 0.4, 'sine', 0.08, 0.24) }
