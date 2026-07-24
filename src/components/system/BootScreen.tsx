'use client'

import { useState, useEffect, useRef } from 'react'
import { useSystem } from '@/lib/store'
import { soundSystemBoot, soundNotification, soundClick } from '@/lib/sound'
import { registerAndBoot, loginWithCredentials, isLoggedIn, loginAndPull } from '@/lib/cloudSync'
import { clearAuth } from '@/lib/auth'

type Phase = 'intro' | 'choice' | 'register' | 'login' | 'booting' | 'autoLogin' | 'autoLoginFailed'

export function BootScreen() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [bootLines, setBootLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isLoggedIn()) setPhase('autoLogin')
  }, [])

  useEffect(() => {
    if (phase === 'autoLogin') {
      soundSystemBoot()
      loginAndPull().then(result => {
        if (!result.success) {
          // Server doesn't have this account (wiped) or token expired
          // CRITICAL: Clear stale localStorage + auth so we don't show ghost data
          clearAuth()
          useSystem.getState().resetSystem()
          // Also clear the persisted localStorage directly
          if (typeof window !== 'undefined') {
            localStorage.removeItem('solo-leveling-system')
          }
          setPhase('choice')
        }
      })
    }
  }, [phase])

  useEffect(() => { if (phase === 'intro') { const t = setTimeout(() => soundSystemBoot(), 300); return () => clearTimeout(t) } }, [phase])
  useEffect(() => { if (phase === 'register' || phase === 'login') inputRef.current?.focus() }, [phase])

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) return
    setError(''); setLoading(true); soundClick()
    const result = await registerAndBoot(username.trim(), password.trim())
    if (!result.success) { setError(result.error || 'Failed'); setLoading(false); return }
    setPhase('booting')
    const lines = ['> INITIALIZING SYSTEM...', '> CHECKING QUALIFICATIONS... PASSED', `> REGISTERING PLAYER: ${username.toUpperCase()}`, '> CREATING CLOUD SYNC... DONE', '> GENERATING QUESTS... DONE', '> SYSTEM ACTIVATED.']
    let i = 0
    const interval = setInterval(() => { if (i < lines.length) { setBootLines(prev => [...prev, lines[i]]); soundNotification(); i++ } else clearInterval(interval) }, 500)
  }

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return
    setError(''); setLoading(true); soundClick()
    const result = await loginWithCredentials(username.trim(), password.trim())
    if (!result.success) { setError(result.error || 'Failed'); setLoading(false); return }
    setPhase('booting')
    const lines = ['> INITIALIZING SYSTEM...', '> AUTHENTICATING... VERIFIED', `> WELCOME BACK: ${username.toUpperCase()}`, '> SYNCING CLOUD DATA... COMPLETE', '> SYSTEM ACTIVATED.']
    let i = 0
    const interval = setInterval(() => { if (i < lines.length) { setBootLines(prev => [...prev, lines[i]]); soundNotification(); i++ } else clearInterval(interval) }, 500)
  }

  if (phase === 'intro') return (
    <div className="sl-app flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="sl-window sl-window-glow sl-glow-pulse max-w-sm w-full sl-slide-in">
        <div className="sl-title-bar justify-center"><span>[ SYSTEM ]</span></div>
        <div className="p-8">
          <p className="text-xs text-[var(--system-violet)] mb-6 tracking-[0.5em]">◆ ◆ ◆</p>
          <h1 className="sl-numeral text-5xl mb-5 uppercase tracking-[0.08em]">THE SYSTEM</h1>
          <p className="text-xs text-[var(--system-text-dim)] mb-8 leading-relaxed">You have acquired the qualifications<br />to be a Player.</p>
          <button onClick={() => setPhase('choice')} className="sl-btn w-full">ENTER</button>
        </div>
      </div>
      <p className="text-[10px] text-[var(--system-text-dim)] mt-8 opacity-50">◆ SOLO LEVELING — REAL-LIFE RPG ◆</p>
    </div>
  )

  if (phase === 'autoLogin') return (
    <div className="sl-app flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="sl-window sl-window-glow sl-glow-pulse max-w-sm w-full">
        <div className="sl-title-bar justify-center"><span>[ SYSTEM ]</span></div>
        <div className="p-8">
          <p className="text-xs sl-glow-blue mb-6 tracking-widest sl-pulse">◆ SYNCING ◆</p>
          <p className="text-xs text-[var(--system-text-dim)] leading-relaxed">Reconnecting to the System...<br />Syncing your Player data.</p>
        </div>
      </div>
    </div>
  )

  if (phase === 'choice') return (
    <div className="sl-app flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="sl-window sl-window-glow max-w-sm w-full sl-slide-in">
        <div className="sl-title-bar justify-center"><span>[ PLAYER SELECTION ]</span></div>
        <div className="p-6 space-y-3">
          <button onClick={() => { soundClick(); setPhase('register') }} className="sl-btn w-full py-4">◆ NEW PLAYER</button>
          <button onClick={() => { soundClick(); setPhase('login') }} className="sl-btn w-full py-4">◆ RETURNING PLAYER</button>
        </div>
      </div>
    </div>
  )

  if (phase === 'register' || phase === 'login') {
    const isRegister = phase === 'register'
    return (
      <div className="sl-app flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="sl-window sl-window-glow max-w-sm w-full sl-slide-in">
          <div className="sl-title-bar justify-center"><span>[ {isRegister ? 'PLAYER REGISTRATION' : 'PLAYER LOGIN'} ]</span></div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-[10px] text-[var(--system-text-dim)] mb-2 tracking-widest text-left">{isRegister ? 'CHOOSE USERNAME' : 'USERNAME'}</p>
              <input ref={inputRef} type="text" value={username} onChange={e => setUsername(e.target.value)} maxLength={20} placeholder="Sung Jinwoo" className="w-full bg-transparent border border-[var(--system-border)] text-center text-sm sl-glow-blue p-2.5 outline-none focus:border-[var(--system-cyan)]" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--system-text-dim)] mb-2 tracking-widest text-left">PASSWORD</p>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (isRegister ? handleRegister() : handleLogin())} placeholder="••••••••" className="w-full bg-transparent border border-[var(--system-border)] text-center text-sm sl-glow-blue p-2.5 outline-none focus:border-[var(--system-cyan)]" />
            </div>
            {error && <p className="text-[10px] sl-glow-red sl-shake">{error}</p>}
            <button onClick={isRegister ? handleRegister : handleLogin} disabled={!username.trim() || !password.trim() || loading} className="sl-btn w-full">{loading ? '◆ PROCESSING...' : isRegister ? '◆ REGISTER' : '◆ LOGIN'}</button>
            <button onClick={() => { soundClick(); setPhase('choice') }} className="text-[10px] text-[var(--system-text-dim)] hover:text-[var(--system-cyan)] w-full">← BACK</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sl-app flex flex-col items-center justify-center min-h-screen px-6">
      <div className="sl-window max-w-sm w-full">
        <div className="sl-title-bar"><span>[ SYSTEM BOOT ]</span></div>
        <div className="p-4 font-mono text-xs">
          {bootLines.map((line, i) => <div key={i} className="sl-glow-blue mb-2 sl-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>{line}</div>)}
          <div className="sl-pulse mt-2">_</div>
        </div>
      </div>
    </div>
  )
}
