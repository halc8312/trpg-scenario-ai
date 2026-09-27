'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ProviderModelPicker from './ProviderModelPicker'
import UsageAndPricing from './UsageAndPricing'
import { AI_PROVIDERS } from '@/lib/ai/providers'
import { DefaultAISettings, loadDefaultAISettings, saveDefaultAISettings } from '@/lib/ai/settings'
import { useAIProviders } from '@/lib/ai/useAIProviders'
import { cn } from '@/lib/utils'

interface AISettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const { providers, error } = useAIProviders()
  const [settings, setSettings] = useState<DefaultAISettings>(loadDefaultAISettings)

  useEffect(() => {
    if (isOpen) setSettings(loadDefaultAISettings())
  }, [isOpen])

  const savePricing = useRef<() => void>(() => {})
  const registerSave = useCallback((save: () => void) => {
    savePricing.current = save
  }, [])

  const handleSave = () => {
    saveDefaultAISettings(settings)
    savePricing.current()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI設定" className="max-w-2xl">
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">APIキーの設定状況</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(providers ?? []).map(p => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
              >
                <span>{p.name}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    p.configured
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                  )}
                >
                  {p.configured ? '利用可能' : '未設定'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            APIキーはサーバーの環境変数（<code>.env.local</code>）で設定します。ブラウザには保存・送信されません。
            {' '}
            {(providers ?? []).filter(p => !p.configured).map(p => (
              <a
                key={p.id}
                href={AI_PROVIDERS[p.id].consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-2 text-blue-600 dark:text-blue-400 underline"
              >
                {p.name}のキーを取得
              </a>
            ))}
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">新規シナリオで使う既定のAI</h3>
          <ProviderModelPicker
            provider={settings.provider}
            model={settings.model}
            statuses={providers}
            onChange={(provider, model) => setSettings(prev => ({ ...prev, provider, model }))}
          />
          <div className="mt-4">
            <label htmlFor="default-temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              創造性（temperature: {settings.temperature.toFixed(1)}）
            </label>
            <input
              id="default-temperature"
              type="range"
              min={0.2}
              max={1.2}
              step={0.1}
              value={settings.temperature}
              onChange={e => setSettings(prev => ({ ...prev, temperature: Number(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              temperature を受け付けないモデル（OpenAIの推論モデルや新しいClaudeなど）では自動的に無視されます。
            </p>
          </div>
        </section>

        <UsageAndPricing isOpen={isOpen} registerSave={registerSave} />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!settings.model.trim()}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  )
}
