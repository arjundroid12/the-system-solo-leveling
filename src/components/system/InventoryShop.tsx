'use client'

import { useState, useEffect } from 'react'
import { useSystem } from '@/lib/store'
import { SHOP_ITEMS, RARITY_COLORS, Rarity } from '@/lib/system'
import { soundClick, soundPurchase } from '@/lib/sound'
import { isPushSupported, getNotificationPermission, requestNotificationPermission, subscribeToPush, unsubscribeFromPush, sendTestNotification } from '@/lib/push'
import { getAuth } from '@/lib/auth'

const RARITY_COST: Record<Rarity, number> = { COMMON: 20, RARE: 50, EPIC: 100, LEGENDARY: 250, MYTHIC: 1000 }

export function InventoryShop() {
  const [tab, setTab] = useState<'inventory' | 'shop'>('inventory')
  const player = useSystem(s => s.player)
  const inventory = useSystem(s => s.inventory)
  const buyItem = useSystem(s => s.buyItem)
  const useItem = useSystem(s => s.useItem)
  const soundEnabled = useSystem(s => s.soundEnabled)
  const toggleSound = useSystem(s => s.toggleSound)
  const resetSystem = useSystem(s => s.resetSystem)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supported = await isPushSupported(); setPushSupported(supported)
      if (supported) {
        const perm = await getNotificationPermission(); setPushPermission(perm)
        if (perm === 'granted') { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); setPushSubscribed(!!sub) }
      }
    }
    check()
  }, [])

  const handleEnablePush = async () => {
    if (pushLoading) return
    setPushLoading(true); soundClick()
    const auth = getAuth(); if (!auth) { setPushLoading(false); return }
    const granted = await requestNotificationPermission()
    if (!granted) { setPushPermission('denied'); setPushLoading(false); return }
    setPushPermission('granted')
    const success = await subscribeToPush(auth.token)
    if (success) { setPushSubscribed(true); await sendTestNotification() }
    setPushLoading(false)
  }

  const handleDisablePush = async () => {
    if (pushLoading) return; setPushLoading(true); soundClick()
    const auth = getAuth(); if (!auth) { setPushLoading(false); return }
    await unsubscribeFromPush(auth.token); setPushSubscribed(false); setPushLoading(false)
  }

  if (!player) return null

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="sl-window sl-slide-in">
        <div className="grid grid-cols-2">
          <button onClick={() => { soundClick(); setTab('inventory') }} className={`py-3 text-[11px] tracking-widest transition-colors ${tab === 'inventory' ? 'sl-glow-blue bg-[var(--system-blue)]/10 border-b-2 border-[var(--system-cyan)]' : 'text-[var(--system-text-dim)]'}`}>◆ INVENTORY</button>
          <button onClick={() => { soundClick(); setTab('shop') }} className={`py-3 text-[11px] tracking-widest transition-colors ${tab === 'shop' ? 'sl-glow-gold bg-[var(--system-gold)]/10 border-b-2 border-[var(--system-gold)]' : 'text-[var(--system-text-dim)]'}`}>◆ SHOP</button>
        </div>
      </div>

      {tab === 'inventory' && (
        <>
          {inventory.length === 0 ? (
            <div className="sl-window p-8 text-center sl-slide-in"><p className="text-3xl mb-3 opacity-30">🎒</p><p className="text-xs text-[var(--system-text-dim)]">Your inventory is empty.</p></div>
          ) : (
            <div className="space-y-2">
              {inventory.map((item, i) => (
                <div key={item.id} className="sl-window sl-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="p-3 flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between"><p className="text-xs font-bold" style={{ color: RARITY_COLORS[item.rarity], textShadow: `0 0 6px ${RARITY_COLORS[item.rarity]}` }}>{item.name}</p><span className="text-[10px] text-[var(--system-text-dim)]">x{item.quantity}</span></div>
                      <p className="text-[10px] text-[var(--system-text-dim)] mt-0.5">{item.description}</p>
                    </div>
                    {item.type === 'CONSUMABLE' && <button onClick={() => { soundClick(); useItem(item.id) }} className="sl-btn px-4 text-[10px] min-h-[40px]">USE</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sl-window sl-slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="sl-title-bar"><span>◆ SETTINGS</span></div>
            <div className="p-3 space-y-2">
              <button onClick={() => { soundClick(); toggleSound() }} className="w-full flex items-center justify-between p-2 border border-[var(--system-border)] hover:border-[var(--system-cyan)]">
                <span className="text-xs">🔊 SOUND EFFECTS</span>
                <span className={`text-xs ${soundEnabled ? 'sl-glow-blue' : 'text-[var(--system-text-dim)]'}`}>{soundEnabled ? 'ON' : 'OFF'}</span>
              </button>
              {pushSupported ? (
                <div className="p-2 border border-[var(--system-border)]">
                  <div className="flex items-center justify-between mb-2"><span className="text-xs">🔔 NOTIFICATIONS</span><span className={`text-xs ${pushSubscribed ? 'sl-glow-blue' : pushPermission === 'denied' ? 'sl-glow-red' : 'text-[var(--system-text-dim)]'}`}>{pushSubscribed ? 'ACTIVE' : pushPermission === 'denied' ? 'BLOCKED' : 'OFF'}</span></div>
                  {!pushSubscribed && pushPermission !== 'denied' && <button onClick={handleEnablePush} disabled={pushLoading} className="sl-btn w-full text-[10px] py-2 mb-2">{pushLoading ? '◆ ENABLING...' : '◆ ENABLE DAILY REMINDERS'}</button>}
                  {pushSubscribed && <div className="space-y-2"><button onClick={() => { soundClick(); sendTestNotification() }} className="sl-btn w-full text-[10px] py-1.5">📨 SEND TEST</button><button onClick={handleDisablePush} disabled={pushLoading} className="sl-btn sl-btn-red w-full text-[10px] py-1.5">✕ DISABLE</button></div>}
                  {pushSubscribed && <p className="text-[10px] text-[var(--system-text-dim)] mt-1">Daily reminders at 9:30 AM IST.</p>}
                </div>
              ) : <div className="p-2 border border-[var(--system-border)] opacity-50"><div className="flex items-center justify-between"><span className="text-xs">🔔 NOTIFICATIONS</span><span className="text-xs text-[var(--system-text-dim)]">UNSUPPORTED</span></div></div>}
              <button onClick={() => { if (confirm('RESET SYSTEM? All progress will be lost.')) { soundClick(); resetSystem() } }} className="w-full p-2 border border-[var(--system-red)]/30 sl-glow-red text-xs hover:bg-[var(--system-red)]/10">⚠ RESET SYSTEM</button>
            </div>
          </div>
        </>
      )}

      {tab === 'shop' && (
        <>
          <div className="sl-window sl-window-glow sl-slide-in"><div className="sl-title-bar"><span>◆ PLAYER POINTS</span></div><div className="p-4 text-center"><p className="font-display text-3xl sl-glow-gold">{player.playerPoints}</p><p className="text-[10px] text-[var(--system-text-dim)] tracking-widest mt-1">PP AVAILABLE</p></div></div>
          <div className="space-y-2">
            {SHOP_ITEMS.map((item, i) => {
              const cost = RARITY_COST[item.rarity]; const canAfford = player.playerPoints >= cost; const owned = inventory.find(i => i.id === item.id)
              return (
                <div key={item.id} className="sl-window sl-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="p-3 flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between"><p className="text-xs font-bold" style={{ color: RARITY_COLORS[item.rarity], textShadow: `0 0 6px ${RARITY_COLORS[item.rarity]}` }}>{item.name}</p>{owned && <span className="text-[10px] text-[var(--system-text-dim)]">x{owned.quantity}</span>}</div>
                      <p className="text-[10px] text-[var(--system-text-dim)] mt-0.5">{item.description}</p>
                      <p className="text-[10px] mt-1" style={{ color: RARITY_COLORS[item.rarity] }}>[{item.rarity}] · {cost} PP</p>
                    </div>
                    <button onClick={() => { soundPurchase(); buyItem(item.id) }} disabled={!canAfford} className="sl-btn sl-btn-gold px-4 text-[10px] min-h-[40px]">BUY</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
