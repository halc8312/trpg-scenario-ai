'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import {
  StorageInfo,
  createBackup,
  formatBytes,
  getStorageInfo,
  isBackupFile,
  requestPersistentStorage,
  restoreBackup
} from '@/lib/services/backup-service'
import { TRPGScenarioService } from '@/lib/services/scenario-service'
import { loadFromFile, saveToFile } from '@/lib/utils'
import { useToast } from '@/lib/toast'

interface BackupModalProps {
  isOpen: boolean
  onClose: () => void
  onRestored: () => void
}

export default function BackupModal({ isOpen, onClose, onRestored }: BackupModalProps) {
  const { addToast } = useToast()
  const [info, setInfo] = useState<StorageInfo>({})

  useEffect(() => {
    if (isOpen) getStorageInfo().then(setInfo)
  }, [isOpen])

  const handleBackup = async () => {
    await TRPGScenarioService.flush()
    const backup = createBackup()
    const date = new Date().toISOString().slice(0, 10)
    saveToFile(`trpg-scenario-ai-backup-${date}.json`, backup)
    addToast(`${backup.scenarios.length}件のシナリオをバックアップしました`, 'success')
  }

  const handleRestore = async () => {
    try {
      const data = await loadFromFile()
      if (!isBackupFile(data)) throw new Error('バックアップファイルではありません（1件のシナリオは一覧の「JSONを読み込む」から読み込めます）')
      const result = restoreBackup(data)
      addToast(`復元しました（追加 ${result.added}件・更新 ${result.updated}件・手元の方が新しいため変更なし ${result.skipped}件）`, 'success')
      onRestored()
      onClose()
    } catch (error: any) {
      if (error?.message !== 'No file selected') addToast(error?.message || '復元に失敗しました', 'error')
    }
  }

  const handlePersist = async () => {
    const granted = await requestPersistentStorage()
    addToast(granted ? 'ブラウザにデータを保持するよう設定しました' : 'ブラウザが許可しませんでした。定期的なバックアップをおすすめします', granted ? 'success' : 'info')
    setInfo(await getStorageInfo())
  }

  const storageKind = TRPGScenarioService.storageKind()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="バックアップと保存先">
      <div className="space-y-6 text-sm">
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">保存先</h3>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              保存方式: {storageKind === 'indexeddb' ? 'IndexedDB（ブラウザ内のデータベース）' : storageKind === 'localstorage' ? 'localStorage（容量が小さいため、バックアップをおすすめします）' : '—'}
            </li>
            {info.usageBytes !== undefined && info.quotaBytes !== undefined && (
              <li data-testid="storage-usage">
                使用量: {formatBytes(info.usageBytes)} / 上限の目安 {formatBytes(info.quotaBytes)}
              </li>
            )}
            <li className="flex flex-wrap items-center gap-2">
              自動削除の防止: {info.persisted ? '有効' : '未設定（ブラウザが容量不足のときに削除される可能性があります）'}
              {!info.persisted && (
                <button type="button" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={handlePersist}>
                  有効にする
                </button>
              )}
            </li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            データはこのブラウザの中にだけ保存されます。別の端末やブラウザに移すときや、万一に備えて、バックアップを取っておいてください。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">バックアップ</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" onClick={handleBackup}>
              すべてをバックアップ
            </Button>
            <Button size="sm" variant="secondary" onClick={handleRestore}>
              バックアップから復元
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            すべてのシナリオ、GM相談の会話、AI設定・料金表を1つのファイルにまとめます（APIキーは含まれません）。
            復元時、同じシナリオが既にある場合は新しい方を残します。
          </p>
        </section>
      </div>
    </Modal>
  )
}
