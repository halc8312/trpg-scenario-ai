import { generateId } from '@/lib/utils'
import { AI_PROVIDERS } from '@/lib/ai/providers'
import { ScenarioStore, openScenarioStore } from '@/lib/storage/scenario-store'
import { ScenarioAISettings, ScenarioRequest, TRPGScenario } from '@/lib/types'

export const DEFAULT_SCENARIO_AI_SETTINGS: ScenarioAISettings = {
  provider: 'anthropic',
  model: AI_PROVIDERS.anthropic.defaultModel,
  temperature: 0.8,
  maxTokens: AI_PROVIDERS.anthropic.defaultMaxTokens
}

// 保存に失敗したとき（容量不足など）に画面へ知らせるイベント
export const STORAGE_ERROR_EVENT = 'trpg-storage-error'

let cache: TRPGScenario[] | null = null
let store: ScenarioStore | null = null
let initPromise: Promise<void> | null = null
let writeQueue: Promise<void> = Promise.resolve()

/**
 * TRPGシナリオの保存・読み込み。
 * 起動時に保存先（IndexedDB）から全件をメモリに読み込み、以後の読み取りは同期的に行う。
 * 書き込みはメモリを更新したうえで、保存先へ順番に書き出す。
 */
export class TRPGScenarioService {
  static init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        store = await openScenarioStore()
        cache = (await store.loadAll()).map(reviveDates)
      })()
    }
    return initPromise
  }

  static isReady(): boolean {
    return cache !== null
  }

  static storageKind(): ScenarioStore['kind'] | null {
    return store?.kind ?? null
  }

  // 保留中の書き込みがすべて終わるまで待つ
  static flush(): Promise<void> {
    return writeQueue
  }

  static getAll(): TRPGScenario[] {
    return [...(cache ?? [])].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  static get(id: string): TRPGScenario | null {
    return cache?.find(s => s.id === id) ?? null
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
    this.save(scenario)
    return scenario
  }

  static update(id: string, updates: Partial<TRPGScenario>): TRPGScenario | null {
    const current = this.get(id)
    if (!current) return null

    const updated: TRPGScenario = {
      ...current,
      ...updates,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date()
    }
    this.save(updated)
    return updated
  }

  static delete(id: string): void {
    this.requireReady()
    cache = cache!.filter(s => s.id !== id)
    this.enqueue(s => s.remove(id))
  }

  static duplicate(id: string): TRPGScenario | null {
    const source = this.get(id)
    if (!source) return null

    const now = new Date()
    const copy: TRPGScenario = {
      ...reviveDates(JSON.parse(JSON.stringify(source))),
      id: generateId(),
      status: source.status === 'generating' ? 'draft' : source.status,
      session: undefined,
      createdAt: now,
      updatedAt: now
    }
    if (copy.overview) copy.overview.title = `${copy.overview.title}（コピー）`

    this.save(copy)
    return copy
  }

  /**
   * JSONファイルから読み込む。同じIDのシナリオが既にある場合は、新しいIDを振って別のシナリオとして追加する。
   */
  static import(data: unknown): TRPGScenario {
    const scenario = normalizeImported(data)
    if (this.get(scenario.id)) scenario.id = generateId()
    this.save(scenario)
    return scenario
  }

  /**
   * IDと日時を保ったまま保存する（バックアップからの復元用）。同じIDのシナリオは置き換える。
   */
  static restore(data: unknown): TRPGScenario {
    const scenario = normalizeImported(data)
    this.save(scenario)
    return scenario
  }

  private static save(scenario: TRPGScenario): void {
    this.requireReady()
    cache = [...cache!.filter(s => s.id !== scenario.id), scenario]
    this.enqueue(s => s.put(scenario))
  }

  private static enqueue(write: (store: ScenarioStore) => Promise<void>): void {
    writeQueue = writeQueue
      .then(() => write(store!))
      .catch(error => {
        console.error('Failed to save scenario:', error)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: error instanceof Error ? error.message : String(error) }))
        }
      })
  }

  private static requireReady(): void {
    if (!cache || !store) throw new Error('保存先の準備ができていません（TRPGScenarioService.init() を先に呼んでください）')
  }
}

// テスト用: 状態を初期化する
export function resetScenarioServiceForTests(): void {
  cache = null
  store = null
  initPromise = null
  writeQueue = Promise.resolve()
}

function normalizeImported(data: unknown): TRPGScenario {
  const raw = data as Partial<TRPGScenario>
  if (!raw || typeof raw !== 'object' || !raw.request) {
    throw new Error('シナリオファイルの形式が正しくありません')
  }
  return {
    ...reviveDates({
      npcs: [],
      locations: [],
      clues: [],
      scenes: [],
      endings: [],
      ...raw,
      aiSettings: { ...DEFAULT_SCENARIO_AI_SETTINGS, ...raw.aiSettings }
    }),
    id: raw.id || generateId(),
    status: raw.status === 'generating' ? 'draft' : raw.status ?? 'draft'
  }
}

function toDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date((value as string | number | undefined) ?? Date.now())
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function reviveDates(s: any): TRPGScenario {
  return {
    ...s,
    createdAt: toDate(s.createdAt),
    updatedAt: toDate(s.updatedAt),
    validation: s.validation ? { ...s.validation, checkedAt: toDate(s.validation.checkedAt) } : undefined,
    review: s.review ? { ...s.review, reviewedAt: toDate(s.review.reviewedAt) } : undefined
  }
}
