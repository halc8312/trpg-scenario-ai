import { AI_PROVIDERS, isAIProviderId } from './providers'
import { AIProviderId } from './types'

// 新規シナリオ作成時に使うAI設定の既定値（ブラウザごとに保存）

export interface DefaultAISettings {
  provider: AIProviderId
  model: string
  temperature: number
}

const STORAGE_KEY = 'trpg-scenario-ai-settings'

export const INITIAL_AI_SETTINGS: DefaultAISettings = {
  provider: 'anthropic',
  model: AI_PROVIDERS.anthropic.defaultModel,
  temperature: 0.8
}

export function loadDefaultAISettings(): DefaultAISettings {
  if (typeof window === 'undefined') return INITIAL_AI_SETTINGS
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (stored && isAIProviderId(stored.provider) && typeof stored.model === 'string') {
      return {
        provider: stored.provider,
        model: stored.model,
        temperature: typeof stored.temperature === 'number' ? stored.temperature : INITIAL_AI_SETTINGS.temperature
      }
    }
  } catch {
    // 壊れた設定は無視して初期値を使う
  }
  return INITIAL_AI_SETTINGS
}

export function saveDefaultAISettings(settings: DefaultAISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
