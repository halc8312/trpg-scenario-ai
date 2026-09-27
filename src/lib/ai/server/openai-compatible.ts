import OpenAI from 'openai'
import {
  AICompletionRequest,
  AIDeltaListener,
  AICompletionResponse,
  AIFinishReason,
  AIProviderAdapter,
  AIProviderError,
  AIProviderId
} from '../types'

interface OpenAICompatibleConfig {
  provider: AIProviderId
  apiKey: string
  baseURL?: string
  // OpenAI本家は max_completion_tokens、互換APIは max_tokens を使う
  tokenParam: 'max_completion_tokens' | 'max_tokens'
  maxTemperature: number
  // ストリーミング時に使用量を最後のチャンクで受け取れるか
  supportsStreamUsage: boolean
}

// OpenAI の推論モデルは temperature の指定を受け付けない
const OPENAI_REASONING_MODEL = /^(o\d|gpt-5|gpt-6)/

/**
 * OpenAI Chat Completions API とその互換API（Gemini / DeepSeek）用のアダプター
 */
export class OpenAICompatibleAdapter implements AIProviderAdapter {
  private client: OpenAI
  private config: OpenAICompatibleConfig

  constructor(config: OpenAICompatibleConfig) {
    this.config = config
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })
  }

  async complete(request: AICompletionRequest, onDelta?: AIDeltaListener): Promise<AICompletionResponse> {
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: request.model,
      messages: request.messages
    }

    if (request.maxTokens) params[this.config.tokenParam] = request.maxTokens
    if (request.temperature !== undefined && this.supportsTemperature(request.model)) {
      params.temperature = Math.min(Math.max(request.temperature, 0), this.config.maxTemperature)
    }

    try {
      if (onDelta) return await this.completeStreaming(params, onDelta)

      const completion = await this.client.chat.completions.create(params)
      const choice = completion.choices[0]
      return {
        content: choice?.message?.content ?? '',
        finishReason: mapFinishReason(choice?.finish_reason),
        usage: completion.usage
          ? { inputTokens: completion.usage.prompt_tokens, outputTokens: completion.usage.completion_tokens }
          : undefined
      }
    } catch (error) {
      throw this.toProviderError(error)
    }
  }

  private async completeStreaming(
    params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    onDelta: AIDeltaListener
  ): Promise<AICompletionResponse> {
    const stream = await this.client.chat.completions.create({
      ...params,
      stream: true,
      ...(this.config.supportsStreamUsage ? { stream_options: { include_usage: true } } : {})
    })

    let content = ''
    let finishReason: string | null | undefined
    let usage: AICompletionResponse['usage']
    for await (const chunk of stream) {
      const choice = chunk.choices[0]
      const delta = choice?.delta?.content
      if (delta) {
        content += delta
        onDelta(delta)
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason
      if (chunk.usage) {
        usage = { inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens }
      }
    }

    return { content, finishReason: mapFinishReason(finishReason), usage }
  }

  async listModels(): Promise<string[]> {
    try {
      const ids: string[] = []
      for await (const model of this.client.models.list()) {
        // Gemini は "models/gemini-..." 形式で返す
        ids.push(model.id.replace(/^models\//, ''))
      }
      return ids.sort()
    } catch (error) {
      throw this.toProviderError(error)
    }
  }

  private supportsTemperature(model: string): boolean {
    return !(this.config.provider === 'openai' && OPENAI_REASONING_MODEL.test(model))
  }

  private toProviderError(error: unknown): AIProviderError {
    if (error instanceof OpenAI.APIError) {
      return new AIProviderError(error.message, this.config.provider, error.status ?? 502)
    }
    const message = error instanceof Error ? error.message : String(error)
    return new AIProviderError(message, this.config.provider, 502)
  }
}

function mapFinishReason(reason: string | null | undefined): AIFinishReason {
  switch (reason) {
    case 'stop':
      return 'stop'
    case 'length':
      return 'length'
    case 'content_filter':
      return 'refusal'
    default:
      return 'other'
  }
}
