import { AI_PROVIDERS, AI_PROVIDER_IDS } from '../providers'
import { AIProviderAdapter, AIProviderError, AIProviderId, AIProviderStatus } from '../types'
import { AnthropicAdapter } from './anthropic'
import { OpenAICompatibleAdapter } from './openai-compatible'

// APIキーは環境変数からのみ読み込み、ブラウザには渡さない

const adapters = new Map<AIProviderId, AIProviderAdapter>()

function apiKeyFor(provider: AIProviderId): string | undefined {
  return process.env[AI_PROVIDERS[provider].apiKeyEnv]?.trim() || undefined
}

export function getDefaultModel(provider: AIProviderId): string {
  return process.env[AI_PROVIDERS[provider].modelEnv]?.trim() || AI_PROVIDERS[provider].defaultModel
}

export function getProviderStatuses(): AIProviderStatus[] {
  return AI_PROVIDER_IDS.map(id => ({
    id,
    name: AI_PROVIDERS[id].name,
    configured: !!apiKeyFor(id),
    defaultModel: getDefaultModel(id)
  }))
}

export function getAdapter(provider: AIProviderId): AIProviderAdapter {
  const cached = adapters.get(provider)
  if (cached) return cached

  const apiKey = apiKeyFor(provider)
  if (!apiKey) {
    throw new AIProviderError(
      `${AI_PROVIDERS[provider].name} のAPIキーが設定されていません（環境変数 ${AI_PROVIDERS[provider].apiKeyEnv}）`,
      provider,
      400
    )
  }

  const adapter = createAdapter(provider, apiKey)
  adapters.set(provider, adapter)
  return adapter
}

function createAdapter(provider: AIProviderId, apiKey: string): AIProviderAdapter {
  const { maxTemperature } = AI_PROVIDERS[provider]
  switch (provider) {
    case 'anthropic':
      return new AnthropicAdapter(apiKey)
    case 'openai':
      return new OpenAICompatibleAdapter({
        provider,
        apiKey,
        baseURL: process.env.OPENAI_BASE_URL || undefined,
        tokenParam: 'max_completion_tokens',
        maxTemperature,
        supportsStreamUsage: true
      })
    case 'gemini':
      return new OpenAICompatibleAdapter({
        provider,
        apiKey,
        baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
        tokenParam: 'max_tokens',
        maxTemperature,
        supportsStreamUsage: false
      })
    case 'deepseek':
      return new OpenAICompatibleAdapter({
        provider,
        apiKey,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        tokenParam: 'max_tokens',
        maxTemperature,
        supportsStreamUsage: true
      })
  }
}
