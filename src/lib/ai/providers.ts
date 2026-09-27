import { AIProviderId } from './types'

// クライアント・サーバー共通で使うプロバイダー情報（APIキーは含まない）
export interface AIProviderInfo {
  id: AIProviderId
  name: string
  // サーバーで参照する環境変数
  apiKeyEnv: string
  modelEnv: string
  defaultModel: string
  // モデル一覧を取得できない場合の候補
  suggestedModels: string[]
  // シナリオ生成で使う最大出力トークン数の既定値
  defaultMaxTokens: number
  // temperature の上限
  maxTemperature: number
  consoleUrl: string
}

export const AI_PROVIDERS: Record<AIProviderId, AIProviderInfo> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-6-sol',
    suggestedModels: ['gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna'],
    defaultMaxTokens: 32000,
    maxTemperature: 2,
    consoleUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-opus-5',
    suggestedModels: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5', 'claude-fable-5-1'],
    defaultMaxTokens: 64000,
    maxTemperature: 1,
    consoleUrl: 'https://platform.claude.com/settings/keys'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini (Google)',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-3.8-flash',
    suggestedModels: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'],
    defaultMaxTokens: 32000,
    maxTemperature: 2,
    consoleUrl: 'https://aistudio.google.com/apikey'
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    defaultMaxTokens: 8192,
    maxTemperature: 2,
    consoleUrl: 'https://platform.deepseek.com/api_keys'
  }
}

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AIProviderId[]

export function isAIProviderId(value: unknown): value is AIProviderId {
  return typeof value === 'string' && value in AI_PROVIDERS
}
