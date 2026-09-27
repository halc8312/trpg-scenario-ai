import { TRPGScenario } from '@/lib/types'

// シナリオの保存先。IndexedDB が使えればそちらに、使えなければ localStorage に保存する

export interface ScenarioStore {
  readonly kind: 'indexeddb' | 'localstorage'
  loadAll(): Promise<TRPGScenario[]>
  put(scenario: TRPGScenario): Promise<void>
  remove(id: string): Promise<void>
}

const DB_NAME = 'trpg-scenario-ai'
const DB_VERSION = 1
const STORE = 'scenarios'
export const LEGACY_STORAGE_KEY = 'trpg-scenarios'

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('保存が中断されました'))
  })
}

class IndexedDBStore implements ScenarioStore {
  readonly kind = 'indexeddb' as const
  constructor(private db: IDBDatabase) {}

  static async open(): Promise<IndexedDBStore> {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    return new IndexedDBStore(await promisify(request))
  }

  async loadAll(): Promise<TRPGScenario[]> {
    const tx = this.db.transaction(STORE, 'readonly')
    return promisify(tx.objectStore(STORE).getAll())
  }

  async put(scenario: TRPGScenario): Promise<void> {
    const tx = this.db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(scenario)
    await transactionDone(tx)
  }

  async remove(id: string): Promise<void> {
    const tx = this.db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    await transactionDone(tx)
  }
}

class LocalStorageStore implements ScenarioStore {
  readonly kind = 'localstorage' as const
  private cache: TRPGScenario[] = []

  async loadAll(): Promise<TRPGScenario[]> {
    this.cache = readLegacyScenarios()
    return this.cache
  }

  async put(scenario: TRPGScenario): Promise<void> {
    this.cache = [...this.cache.filter(s => s.id !== scenario.id), scenario]
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.cache))
  }

  async remove(id: string): Promise<void> {
    this.cache = this.cache.filter(s => s.id !== id)
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.cache))
  }
}

export function readLegacyScenarios(): TRPGScenario[] {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * 保存先を開く。IndexedDB が使えない環境（一部のプライベートブラウズなど）では localStorage を使う。
 * 以前のバージョンで localStorage に保存したシナリオは IndexedDB に移し替える。
 */
export async function openScenarioStore(): Promise<ScenarioStore> {
  let store: ScenarioStore
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available')
    store = await IndexedDBStore.open()
  } catch (error) {
    console.warn('IndexedDBを使えないため、localStorageに保存します', error)
    return new LocalStorageStore()
  }

  const legacy = readLegacyScenarios()
  if (legacy.length > 0) {
    const existing = new Set((await store.loadAll()).map(s => s.id))
    for (const scenario of legacy) {
      if (!existing.has(scenario.id)) await store.put(scenario)
    }
    // すべて移し終えてから古いデータを消す
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
  return store
}
