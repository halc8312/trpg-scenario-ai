import OpenAI from 'openai'
import {
  AICompletionRequest,
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

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: request.model,
      messages: request.messages
    }

    // Preserve the old deepseek-chat non-thinking behavior for structured scenario generation.
    if (this.config.provider === 'deepseek') params.reasoning_effort = 'none'

    if (request.maxTokens) params[this.config.tokenParam] = request.maxTokens
    if (request.temperature !== undefined && this.supportsTemperature(request.model)) {
      params.temperature = Math.min(Math.max(request.temperature, 0), this.config.maxTemperature)
    }

    try {
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
      const message = this.config.provider === 'deepseek'
        ? error.status === 401 ? 'DeepSeekのAPIキーが無効です。AI設定で更新してください。'
          : error.status === 402 ? 'DeepSeekの残高が不足しています。APIの利用残高を確認してください。'
          : error.status === 429 ? 'DeepSeekの利用制限に達しました。少し待って再試行してください。'
          : 'DeepSeekのリクエストに失敗しました。モデル名と設定を確認して再試行してください。'
        : error.message
      return new AIProviderError(message, this.config.provider, error.status ?? 502)
    }
    const message = this.config.provider === 'deepseek' ? 'DeepSeekに接続できませんでした。再試行してください。' : error instanceof Error ? error.message : String(error)
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

