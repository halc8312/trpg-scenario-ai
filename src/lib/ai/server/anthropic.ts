import Anthropic from '@anthropic-ai/sdk'
import {
  AICompletionRequest,
  AICompletionResponse,
  AIFinishReason,
  AIProviderAdapter,
  AIProviderError
} from '../types'

// 拒否時にサーバー側で別モデルへ自動フォールバックできるモデル
const SERVER_FALLBACK_MODELS = new Set(['claude-opus-5', 'claude-opus-5-5', 'claude-fable-5', 'claude-fable-5-1'])

// temperature を受け付けるモデル（Opus 4.7 以降・Sonnet 5 以降などは指定すると400になる）
const SAMPLING_SUPPORTED_MODEL = /^claude-(3|haiku-4|sonnet-4|opus-4-[1-6]\b|opus-4\b)/

// 通常版とbeta版のレスポンスで共通して使うフィールド
interface CompletedMessage {
  content: ReadonlyArray<{ type: string; text?: string }>
  stop_reason: string | null
  stop_details: { category?: string | null } | null
  usage: { input_tokens: number; output_tokens: number }
}

/**
 * Claude（Anthropic Messages API）用のアダプター。
 * 大きな max_tokens でもタイムアウトしないよう常にストリーミングで受け取り、最終メッセージを返す。
 */
export class AnthropicAdapter implements AIProviderAdapter {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const system = request.messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n\n')
    const messages: Anthropic.MessageParam[] = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const params = {
      model: request.model,
      max_tokens: request.maxTokens ?? 64000,
      messages,
      ...(system ? { system } : {}),
      ...(request.temperature !== undefined && SAMPLING_SUPPORTED_MODEL.test(request.model)
        ? { temperature: Math.min(Math.max(request.temperature, 0), 1) }
        : {})
    }

    try {
      const message: CompletedMessage = SERVER_FALLBACK_MODELS.has(request.model)
        ? await this.client.beta.messages
            .stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
            .finalMessage()
        : await this.client.messages.stream(params).finalMessage()

      if (message.stop_reason === 'refusal') {
        const category = message.stop_details?.category
        throw new AIProviderError(
          `Claudeがこのリクエストへの応答を拒否しました${category ? `（${category}）` : ''}。内容を調整して再度お試しください。`,
          'anthropic',
          422
        )
      }

      let content = ''
      for (const block of message.content) {
        if (block.type === 'text' && block.text) content += block.text
      }

      return {
        content,
        finishReason: mapStopReason(message.stop_reason),
        usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }
      }
    } catch (error) {
      throw toProviderError(error)
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const ids: string[] = []
      for await (const model of this.client.models.list()) ids.push(model.id)
      return ids
    } catch (error) {
      throw toProviderError(error)
    }
  }
}

function mapStopReason(reason: string | null): AIFinishReason {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop'
    case 'max_tokens':
    case 'model_context_window_exceeded':
      return 'length'
    case 'refusal':
      return 'refusal'
    default:
      return 'other'
  }
}

function toProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error
  if (error instanceof Anthropic.APIError) {
    return new AIProviderError(error.message, 'anthropic', error.status ?? 502)
  }
  const message = error instanceof Error ? error.message : String(error)
  return new AIProviderError(message, 'anthropic', 502)
}
