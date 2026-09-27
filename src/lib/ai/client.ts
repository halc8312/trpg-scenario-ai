import { AICompletionRequest, AICompletionResponse, AIDeltaListener, AIProviderId, AIProviderStatus, AIStreamEvent } from './types'

// ブラウザからサーバーのAPIルート経由でAIを呼び出す

async function parseError(response: Response): Promise<Error> {
  try {
    const body = await response.json()
    return new Error(body.error || `AIの呼び出しに失敗しました（${response.status}）`)
  } catch {
    return new Error(`AIの呼び出しに失敗しました（${response.status}）`)
  }
}

export const aiClient = {
  /**
   * onDelta を渡すと、生成中のテキストを届いた分から順に受け取れる。
   */
  async complete(request: AICompletionRequest, options: { onDelta?: AIDeltaListener } = {}): Promise<AICompletionResponse> {
    const response = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: !!options.onDelta })
    })
    if (!response.ok) throw await parseError(response)
    if (!options.onDelta) return response.json()
    return readStream(response, options.onDelta)
  },

  async getProviders(): Promise<AIProviderStatus[]> {
    const response = await fetch('/api/ai/providers')
    if (!response.ok) throw await parseError(response)
    const body = await response.json()
    return body.providers
  },

  async getModels(provider: AIProviderId): Promise<string[]> {
    const response = await fetch(`/api/ai/models?provider=${provider}`)
    if (!response.ok) throw await parseError(response)
    const body = await response.json()
    return body.models
  }
}

export async function readStream(response: Response, onDelta: AIDeltaListener): Promise<AICompletionResponse> {
  if (!response.body) throw new Error('AIからの応答を受け取れませんでした')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: AICompletionResponse | null = null

  const handleLine = (line: string) => {
    if (!line.trim()) return
    const event = JSON.parse(line) as AIStreamEvent
    if (event.type === 'delta') onDelta(event.text)
    else if (event.type === 'done') result = event.response
    else if (event.type === 'error') throw new Error(event.error)
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(handleLine)
  }
  handleLine(buffer + decoder.decode())

  if (!result) throw new Error('AIの応答が途中で途切れました。もう一度お試しください')
  return result
}
