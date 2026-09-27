import { generateId } from '@/lib/utils'
import { AI_PROVIDERS } from '@/lib/ai/providers'
import { ScenarioAISettings, ScenarioRequest, TRPGScenario } from '@/lib/types'

export const DEFAULT_SCENARIO_AI_SETTINGS: ScenarioAISettings = {
  provider: 'anthropic',
  model: AI_PROVIDERS.anthropic.defaultModel,
  temperature: 0.8,
  maxTokens: AI_PROVIDERS.anthropic.defaultMaxTokens
}

const STORAGE_KEY = 'trpg-scenarios'

/**
 * TRPGシナリオの保存・読み込み（ブラウザのlocalStorageを使用）
 */
export class TRPGScenarioService {
  static getAll(): TRPGScenario[] {
    if (typeof window === 'undefined') return []

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    try {
      const scenarios = JSON.parse(stored) as any[]
      return scenarios
        .map(reviveDates)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    } catch (error) {
      console.error('Failed to load TRPG scenarios:', error)
      return []
    }
  }

  static get(id: string): TRPGScenario | null {
    return this.getAll().find(s => s.id === id) ?? null
  }

  static create(request: ScenarioRequest, aiSettings: ScenarioAISettings = DEFAULT_SCENARIO_AI_SETTINGS): TRPGScenario {
    const now = new Date()
    const scenario: TRPGScenario = {
      id: generateId(),
      status: 'draft',
      request,
      aiSettings,
      npcs: [],
      locations: [],
      clues: [],
      scenes: [],
      endings: [],
      createdAt: now,
      updatedAt: now
    }

    this.saveAll([scenario, ...this.getAll()])
    return scenario
  }

  static update(id: string, updates: Partial<TRPGScenario>): TRPGScenario | null {
    const scenarios = this.getAll()
    const index = scenarios.findIndex(s => s.id === id)
    if (index === -1) return null

    scenarios[index] = {
      ...scenarios[index],
      ...updates,
      id: scenarios[index].id,
      createdAt: scenarios[index].createdAt,
      updatedAt: new Date()
    }
    this.saveAll(scenarios)
    return scenarios[index]
  }

  static delete(id: string): void {
    this.saveAll(this.getAll().filter(s => s.id !== id))
  }

  static duplicate(id: string): TRPGScenario | null {
    const source = this.get(id)
    if (!source) return null

    const now = new Date()
    const copy: TRPGScenario = {
      ...reviveDates(JSON.parse(JSON.stringify(source))),
      id: generateId(),
      status: source.status === 'generating' ? 'draft' : source.status,
      createdAt: now,
      updatedAt: now
    }
    if (copy.overview) copy.overview.title = `${copy.overview.title}（コピー）`

    this.saveAll([copy, ...this.getAll()])
    return copy
  }

  static import(data: unknown): TRPGScenario {
    const raw = data as Partial<TRPGScenario>
    if (!raw || typeof raw !== 'object' || !raw.request) {
      throw new Error('シナリオファイルの形式が正しくありません')
    }

    const now = new Date()
    const scenario: TRPGScenario = {
      ...reviveDates({
        npcs: [],
        locations: [],
        clues: [],
        scenes: [],
        endings: [],
        ...raw,
        aiSettings: { ...DEFAULT_SCENARIO_AI_SETTINGS, ...raw.aiSettings }
      }),
      id: generateId(),
      status: raw.status === 'generating' ? 'draft' : raw.status ?? 'draft',
      createdAt: now,
      updatedAt: now
    }

    this.saveAll([scenario, ...this.getAll()])
    return scenario
  }

  private static saveAll(scenarios: TRPGScenario[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
  }
}

function reviveDates(s: any): TRPGScenario {
  return {
    ...s,
    createdAt: new Date(s.createdAt ?? Date.now()),
    updatedAt: new Date(s.updatedAt ?? Date.now()),
    validation: s.validation
      ? { ...s.validation, checkedAt: new Date(s.validation.checkedAt ?? Date.now()) }
      : undefined,
    review: s.review
      ? { ...s.review, reviewedAt: new Date(s.review.reviewedAt ?? Date.now()) }
      : undefined
  }
}
