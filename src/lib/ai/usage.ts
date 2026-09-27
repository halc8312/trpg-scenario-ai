import { AIProviderId } from './types'

// AIの使用量（トークン数）と概算料金

export interface ModelUsage {
  provider: AIProviderId
  model: string
  calls: number
  inputTokens: number
  outputTokens: number
  // プロバイダーから使用量が返らなかった呼び出しの回数（トークン数に含まれない）
  unknownCalls: number
}

export interface ScenarioUsage {
  byModel: Record<string, ModelUsage>
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export function addUsage(
  current: ScenarioUsage | undefined,
  provider: AIProviderId,
  model: string,
  usage: TokenUsage | undefined
): ScenarioUsage {
  const key = `${provider}:${model}`
  const prev: ModelUsage = current?.byModel[key] ?? { provider, model, calls: 0, inputTokens: 0, outputTokens: 0, unknownCalls: 0 }
  return {
    byModel: {
      ...current?.byModel,
      [key]: {
        ...prev,
        calls: prev.calls + 1,
        inputTokens: prev.inputTokens + (usage?.inputTokens ?? 0),
        outputTokens: prev.outputTokens + (usage?.outputTokens ?? 0),
        unknownCalls: prev.unknownCalls + (usage ? 0 : 1)
      }
    }
  }
}

export function mergeUsage(usages: (ScenarioUsage | undefined)[]): ScenarioUsage {
  const result: ScenarioUsage = { byModel: {} }
  for (const usage of usages) {
    for (const [key, u] of Object.entries(usage?.byModel ?? {})) {
      const prev = result.byModel[key]
      result.byModel[key] = prev
        ? {
            ...prev,
            calls: prev.calls + u.calls,
            inputTokens: prev.inputTokens + u.inputTokens,
            outputTokens: prev.outputTokens + u.outputTokens,
            unknownCalls: prev.unknownCalls + u.unknownCalls
          }
        : { ...u }
    }
  }
  return result
}

// 100万トークンあたりの料金（米ドル）
export interface ModelPrice {
  input: number
  output: number
}

/**
 * 公式の料金表で確認できたモデルの既定価格。料金は変わることがあるため、AI設定で上書きできる。
 * - Claude: Anthropic の料金表（2026年6月時点）
 * - DeepSeek: ピーク時間帯の料金（オフピークは半額）
 */
export const DEFAULT_MODEL_PRICES: Record<string, ModelPrice> = {
  'claude-fable-5-1': { input: 10, output: 50 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'deepseek-flash': { input: 0.3, output: 1.2 },
  'deepseek-v4-pro': { input: 1.32, output: 3.96 }
}

// 料金表や円換算レートが変わったことを画面に知らせるイベント
export const PRICING_CHANGED_EVENT = 'trpg-pricing-changed'

const PRICES_KEY = 'trpg-model-prices'
const RATE_KEY = 'trpg-jpy-rate'

export function loadModelPrices(): Record<string, ModelPrice> {
  if (typeof window === 'undefined') return DEFAULT_MODEL_PRICES
  try {
    return { ...DEFAULT_MODEL_PRICES, ...JSON.parse(localStorage.getItem(PRICES_KEY) ?? '{}') }
  } catch {
    return DEFAULT_MODEL_PRICES
  }
}

export function saveModelPrices(prices: Record<string, ModelPrice>): void {
  // 既定値と同じものは保存しない（既定値の更新を反映できるように）
  const overrides = Object.fromEntries(
    Object.entries(prices).filter(([model, price]) => {
      const d = DEFAULT_MODEL_PRICES[model]
      return !d || d.input !== price.input || d.output !== price.output
    })
  )
  localStorage.setItem(PRICES_KEY, JSON.stringify(overrides))
  window.dispatchEvent(new Event(PRICING_CHANGED_EVENT))
}

// 円換算のレート（未設定なら円表示しない）
export function loadJpyRate(): number | null {
  if (typeof window === 'undefined') return null
  const value = Number(localStorage.getItem(RATE_KEY))
  return value > 0 ? value : null
}

export function saveJpyRate(rate: number | null): void {
  if (rate && rate > 0) localStorage.setItem(RATE_KEY, String(rate))
  else localStorage.removeItem(RATE_KEY)
  window.dispatchEvent(new Event(PRICING_CHANGED_EVENT))
}

export interface UsageSummary {
  calls: number
  inputTokens: number
  outputTokens: number
  // 料金が分かるモデル分の合計（米ドル）
  costUsd: number
  // 料金が未設定のモデルや使用量不明の呼び出しがあるか
  incomplete: boolean
}

export function summarizeUsage(usage: ScenarioUsage | undefined, prices: Record<string, ModelPrice>): UsageSummary {
  const summary: UsageSummary = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, incomplete: false }
  for (const u of Object.values(usage?.byModel ?? {})) {
    summary.calls += u.calls
    summary.inputTokens += u.inputTokens
    summary.outputTokens += u.outputTokens
    const price = prices[u.model]
    if (price) summary.costUsd += (u.inputTokens * price.input + u.outputTokens * price.output) / 1_000_000
    if (!price || u.unknownCalls > 0) summary.incomplete = true
  }
  return summary
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function formatCost(usd: number, jpyRate: number | null): string {
  const dollars = usd < 0.01 && usd > 0 ? '<$0.01' : `$${usd.toFixed(2)}`
  return jpyRate ? `${dollars}（約${Math.round(usd * jpyRate).toLocaleString()}円）` : dollars
}
