'use client'

import { useId, useState } from 'react'
import Select from '@/components/ui/Select'
import { aiClient } from '@/lib/ai/client'
import { AI_PROVIDERS, AI_PROVIDER_IDS } from '@/lib/ai/providers'
import { AIProviderId, AIProviderStatus } from '@/lib/ai/types'

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

interface ProviderModelPickerProps {
  provider: AIProviderId
  model: string
  statuses: AIProviderStatus[] | null
  onChange: (provider: AIProviderId, model: string) => void
}

export default function ProviderModelPicker({ provider, model, statuses, onChange }: ProviderModelPickerProps) {
  const listId = useId()
  const [fetchedModels, setFetchedModels] = useState<Partial<Record<AIProviderId, string[]>>>({})
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const status = statuses?.find(s => s.id === provider)
  const info = AI_PROVIDERS[provider]
  const candidates = fetchedModels[provider] ?? info.suggestedModels

  const handleProviderChange = (next: AIProviderId) => {
    setFetchError(null)
    const nextDefault = statuses?.find(s => s.id === next)?.defaultModel ?? AI_PROVIDERS[next].defaultModel
    onChange(next, nextDefault)
  }

  const fetchModels = async () => {
    setIsFetching(true)
    setFetchError(null)
    try {
      const models = await aiClient.getModels(provider)
      setFetchedModels(prev => ({ ...prev, [provider]: models }))
    } catch (e: any) {
      setFetchError(e.message)
    } finally {
      setIsFetching(false)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>AIプロバイダー</label>
        <Select
          value={provider}
          onChange={e => handleProviderChange(e.target.value as AIProviderId)}
          options={AI_PROVIDER_IDS.map(id => {
            const configured = statuses?.find(s => s.id === id)?.configured
            return {
              value: id,
              label: `${AI_PROVIDERS[id].name}${statuses && !configured ? '（APIキー未設定）' : ''}`
            }
          })}
        />
        {statuses && status && !status.configured && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            サーバーの環境変数 <code>{info.apiKeyEnv}</code> を設定してください。
          </p>
        )}
      </div>
      <div>
        <label className={labelClass}>モデル</label>
        <div className="flex gap-2">
          <input
            className="block w-full min-w-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 h-10 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={model}
            onChange={e => onChange(provider, e.target.value)}
            list={listId}
            placeholder={info.defaultModel}
            required
          />
          <datalist id={listId}>
            {candidates.map(m => <option key={m} value={m} />)}
          </datalist>
          <button
            type="button"
            className="shrink-0 rounded-md border border-gray-300 dark:border-gray-600 px-3 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            onClick={fetchModels}
            disabled={isFetching || !status?.configured}
            title="プロバイダーのAPIから利用可能なモデルの一覧を取得します"
          >
            {isFetching ? '取得中…' : '一覧を取得'}
          </button>
        </div>
        {fetchError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fetchError}</p>}
        {fetchedModels[provider] && !fetchError && (
          <p className="mt-1 text-xs text-gray-500">{fetchedModels[provider]!.length}件のモデルを取得しました。入力欄から選べます。</p>
        )}
      </div>
    </div>
  )
}
