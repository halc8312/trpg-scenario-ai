'use client'

import { useEffect, useState } from 'react'
import { aiClient } from './client'
import { AIProviderStatus } from './types'

// サーバーで設定済み（APIキーあり）のプロバイダーを取得する
export function useAIProviders() {
  const [providers, setProviders] = useState<AIProviderStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    aiClient
      .getProviders()
      .then(result => !cancelled && setProviders(result))
      .catch(e => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [])

  return { providers, error }
}
