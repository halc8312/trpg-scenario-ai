import { AICompletionRequest, AICompletionResponse, AIProviderId, AIProviderStatus } from './types'

// ブラウザからサーバーのAPIルート経由でAIを呼び出す

async function parseError(response: Response): Promise<Error> {
  try {
    const body = await response.json() as { error?: string }
    return new Error(body.error || `AIの呼び出しに失敗しました（${response.status}）`)
  } catch {
    return new Error(`AIの呼び出しに失敗しました（${response.status}）`)
  }
}

export const aiClient = {
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const response = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async getProviders(): Promise<AIProviderStatus[]> {
    const response = await fetch('/api/ai/providers')
    if (!response.ok) throw await parseError(response)
    const body = await response.json() as { providers: AIProviderStatus[] }
    return body.providers
  },

  async getModels(provider: AIProviderId): Promise<string[]> {
    const response = await fetch(`/api/ai/models?provider=${provider}`)
    if (!response.ok) throw await parseError(response)
    const body = await response.json() as { models: string[] }
    return body.models
  }
}

