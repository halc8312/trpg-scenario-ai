export type AIProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionRequest {
  provider: AIProviderId
  model: string
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
}

export type AIFinishReason = 'stop' | 'length' | 'refusal' | 'other'

export interface AICompletionResponse {
  content: string
  finishReason: AIFinishReason
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// 生成中のテキストを少しずつ受け取るコールバック
export type AIDeltaListener = (delta: string) => void

// ストリーミング時にサーバーからブラウザへ送る1行分のイベント（NDJSON）
export type AIStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; response: AICompletionResponse }
  | { type: 'error'; error: string }

// サーバー側でのみ使うプロバイダー実装のインターフェース
export interface AIProviderAdapter {
  // onDelta を渡すとストリーミングで受け取り、届いた分から順に通知する
  complete(request: AICompletionRequest, onDelta?: AIDeltaListener): Promise<AICompletionResponse>
  listModels(): Promise<string[]>
}

export interface AIProviderStatus {
  id: AIProviderId
  name: string
  configured: boolean
  defaultModel: string
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProviderId,
    public readonly status: number = 500
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}
