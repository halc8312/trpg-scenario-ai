import { GMChatMessage, TRPGScenario } from '@/lib/types'
import { TRPGScenarioService } from './scenario-service'

// すべてのシナリオと設定を1つのファイルにまとめて書き出し・復元する

const SETTINGS_KEYS = ['trpg-scenario-ai-settings', 'trpg-model-prices', 'trpg-jpy-rate'] as const
const GM_CHAT_PREFIX = 'trpg-gm-chat-'

export interface BackupFile {
  app: 'trpg-scenario-ai'
  version: 1
  exportedAt: string
  scenarios: TRPGScenario[]
  // localStorage に保存している設定（キー → 保存されている文字列）
  settings: Record<string, string>
  gmChats: Record<string, GMChatMessage[]>
}

export interface RestoreResult {
  added: number
  updated: number
  skipped: number
}

export function isBackupFile(data: unknown): data is BackupFile {
  return !!data && typeof data === 'object' && (data as BackupFile).app === 'trpg-scenario-ai' && Array.isArray((data as BackupFile).scenarios)
}

export function createBackup(): BackupFile {
  const scenarios = TRPGScenarioService.getAll()
  const settings: Record<string, string> = {}
  for (const key of SETTINGS_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null) settings[key] = value
  }

  const gmChats: Record<string, GMChatMessage[]> = {}
  for (const scenario of scenarios) {
    try {
      const chat = localStorage.getItem(GM_CHAT_PREFIX + scenario.id)
      if (chat) gmChats[scenario.id] = JSON.parse(chat)
    } catch {
      // 壊れた会話履歴は含めない
    }
  }

  return { app: 'trpg-scenario-ai', version: 1, exportedAt: new Date().toISOString(), scenarios, settings, gmChats }
}

/**
 * バックアップから復元する。
 * 同じIDのシナリオがある場合は、バックアップの方が新しいときだけ置き換える（手元の新しい編集を消さないため）。
 */
export function restoreBackup(backup: BackupFile): RestoreResult {
  const result: RestoreResult = { added: 0, updated: 0, skipped: 0 }

  for (const scenario of backup.scenarios) {
    const current = TRPGScenarioService.get(scenario.id)
    if (!current) {
      TRPGScenarioService.restore(scenario)
      result.added++
    } else if (new Date(scenario.updatedAt).getTime() > current.updatedAt.getTime()) {
      TRPGScenarioService.restore(scenario)
      result.updated++
    } else {
      result.skipped++
      continue
    }

    const chat = backup.gmChats?.[scenario.id]
    if (chat) localStorage.setItem(GM_CHAT_PREFIX + scenario.id, JSON.stringify(chat))
  }

  for (const [key, value] of Object.entries(backup.settings ?? {})) {
    if ((SETTINGS_KEYS as readonly string[]).includes(key)) localStorage.setItem(key, value)
  }

  return result
}

export interface StorageInfo {
  usageBytes?: number
  quotaBytes?: number
  persisted?: boolean
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (typeof navigator === 'undefined' || !navigator.storage) return {}
  const [estimate, persisted] = await Promise.all([
    navigator.storage.estimate?.().catch(() => undefined),
    navigator.storage.persisted?.().catch(() => undefined)
  ])
  return { usageBytes: estimate?.usage, quotaBytes: estimate?.quota, persisted }
}

// ブラウザにデータを自動削除しないよう依頼する（許可されるかはブラウザ次第）
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  return navigator.storage.persist().catch(() => false)
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${bytes}B`
}
