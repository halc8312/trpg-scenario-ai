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

// サーバー側でのみ使うプロバイダー実装のインターフェース
export interface AIProviderAdapter {
  complete(request: AICompletionRequest): Promise<AICompletionResponse>
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
