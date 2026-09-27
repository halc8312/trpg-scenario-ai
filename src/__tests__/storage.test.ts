import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { TRPGScenarioService, resetScenarioServiceForTests } from '@/lib/services/scenario-service'
import { createBackup, isBackupFile, restoreBackup } from '@/lib/services/backup-service'
import { LEGACY_STORAGE_KEY } from '@/lib/storage/scenario-store'
import { ScenarioRequest } from '@/lib/types'

const request: ScenarioRequest = {
  systemId: 'coc7', genre: 'ホラー', premise: '', playerCount: 3, sessionHours: 3, difficulty: 'normal', tone: ''
}

// 再読み込みを模して、メモリ上の状態を捨てて保存先から読み直す
async function reload() {
  await TRPGScenarioService.flush()
  resetScenarioServiceForTests()
  await TRPGScenarioService.init()
}

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  localStorage.clear()
  resetScenarioServiceForTests()
})

describe('TRPGScenarioService with IndexedDB', () => {
  it('persists creates, updates and deletes across reloads', async () => {
    await TRPGScenarioService.init()
    expect(TRPGScenarioService.storageKind()).toBe('indexeddb')

    const a = TRPGScenarioService.create(request)
    const b = TRPGScenarioService.create(request)
    TRPGScenarioService.update(a.id, { status: 'complete', overview: { title: 'A', tagline: '', playerSynopsis: '', hook: '', recommendedSkills: [], estimatedPlayTime: '', recommendedPlayers: '' } })
    TRPGScenarioService.delete(b.id)
    await reload()

    const all = TRPGScenarioService.getAll()
    expect(all.map(s => s.id)).toEqual([a.id])
    expect(all[0].status).toBe('complete')
    expect(all[0].updatedAt).toBeInstanceOf(Date)
  })

  it('moves scenarios saved by older versions from localStorage', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([
      { id: 'old-1', status: 'complete', request, aiSettings: {}, npcs: [], locations: [], clues: [], scenes: [], endings: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' }
    ]))
    await TRPGScenarioService.init()

    expect(TRPGScenarioService.get('old-1')?.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
    await reload()
    expect(TRPGScenarioService.get('old-1')).not.toBeNull()
  })

  it('gives imported scenarios a new id when the id is already used', async () => {
    await TRPGScenarioService.init()
    const original = TRPGScenarioService.create(request)
    const imported = TRPGScenarioService.import(JSON.parse(JSON.stringify(original)))
    expect(imported.id).not.toBe(original.id)
    expect(() => TRPGScenarioService.import({ foo: 1 })).toThrow('形式が正しくありません')
  })

  it('throws a clear error when used before init', () => {
    expect(() => TRPGScenarioService.create(request)).toThrow('init()')
  })
})

describe('backup', () => {
  it('backs up scenarios, GM chats and settings, and restores only newer scenarios', async () => {
    await TRPGScenarioService.init()
    const s1 = TRPGScenarioService.create(request)
    const s2 = TRPGScenarioService.create(request)
    localStorage.setItem(`trpg-gm-chat-${s1.id}`, JSON.stringify([{ role: 'user', content: 'こんにちは' }]))
    localStorage.setItem('trpg-jpy-rate', '150')

    const backup = JSON.parse(JSON.stringify(createBackup()))
    expect(isBackupFile(backup)).toBe(true)
    expect(backup.scenarios).toHaveLength(2)
    expect(backup.settings['trpg-jpy-rate']).toBe('150')

    // 手元では s2 をバックアップ後に編集し、s1 は削除した
    TRPGScenarioService.delete(s1.id)
    TRPGScenarioService.update(s2.id, { lastError: '手元の新しい編集' })
    localStorage.clear()

    const result = restoreBackup(backup)
    expect(result).toEqual({ added: 1, updated: 0, skipped: 1 })
    expect(TRPGScenarioService.get(s1.id)).not.toBeNull()
    expect(TRPGScenarioService.get(s2.id)?.lastError).toBe('手元の新しい編集')
    expect(localStorage.getItem(`trpg-gm-chat-${s1.id}`)).toContain('こんにちは')
    expect(localStorage.getItem('trpg-jpy-rate')).toBe('150')

    await reload()
    expect(TRPGScenarioService.getAll()).toHaveLength(2)
  })
})
