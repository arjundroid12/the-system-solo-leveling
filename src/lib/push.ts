// THE SYSTEM — Push Notification Helper (client-side)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied'
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  return (await Notification.requestPermission()) === 'granted'
}

export async function subscribeToPush(token: string): Promise<boolean> {
  if (typeof window === 'undefined' || !VAPID_PUBLIC_KEY) return false
  try {
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
    }
    const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subscription }) })
    return res.ok
  } catch (error) { console.error('Push subscribe error:', error); return false }
}

export async function unsubscribeFromPush(token: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
    }
    return true
  } catch (error) { console.error('Push unsubscribe error:', error); return false }
}

export async function sendTestNotification(): Promise<void> {
  if (typeof window === 'undefined') return
  const registration = await navigator.serviceWorker.ready
  registration.showNotification('◆ THE SYSTEM', { body: 'Notifications are active. The System will now alert you.', icon: '/icon.svg', badge: '/icon.svg', tag: 'test' })
}
