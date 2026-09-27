export interface NetworkRecoveryOptions {
  onRetry?: (attempt: number) => void
}

// iOS can suspend a background page. Start the next request only after the
// page is visible and online; an interrupted page can also use its checkpoint.
export async function waitForActiveConnection(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const ready = () => document.visibilityState !== 'hidden' && navigator.onLine !== false
  if (ready()) return
  await new Promise<void>(resolve => {
    const check = () => {
      if (!ready()) return
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
      resolve()
    }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    check()
  })
}

export async function withNetworkRecovery<T>(operation: () => Promise<T>, options: NetworkRecoveryOptions = {}): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await waitForActiveConnection()
    try {
      return await operation()
    } catch (error) {
      // fetch / response body network failures are TypeErrors. Do not retry
      // authentication, balance, provider or invalid-JSON errors here.
      if (!(error instanceof TypeError)) throw error
      if (attempt === 2) {
        throw new Error('通信が中断されました。画面を開いたまま「続きから生成」で再開してください。')
      }
      options.onRetry?.(attempt + 1)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
  throw new Error('通信を再開できませんでした。')
}
