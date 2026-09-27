'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import {
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  GAME_SYSTEM_LIST,
  TONE_OPTIONS,
  getGameSystem
} from '@/data/game-systems'
import ProviderModelPicker from '@/components/settings/ProviderModelPicker'
import { AI_PROVIDERS } from '@/lib/ai/providers'
import { loadDefaultAISettings } from '@/lib/ai/settings'
import { useAIProviders } from '@/lib/ai/useAIProviders'
import { ScenarioAISettings, ScenarioDifficulty, ScenarioRequest, TRPGSystemId } from '@/lib/types'

interface CreateScenarioModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (request: ScenarioRequest, aiSettings: ScenarioAISettings) => void
}

const textareaClass =
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

function defaultAISettings(): ScenarioAISettings {
  const saved = loadDefaultAISettings()
  return { ...saved, maxTokens: AI_PROVIDERS[saved.provider].defaultMaxTokens }
}

const initialRequest: ScenarioRequest = {
  systemId: 'coc7',
  workingTitle: '',
  genre: 'ホラー',
  premise: '',
  setting: '',
  playerCount: 3,
  sessionHours: 3,
  difficulty: 'normal',
  tone: 'シリアス',
  mustInclude: '',
  avoid: ''
}

export default function CreateScenarioModal({ isOpen, onClose, onCreate }: CreateScenarioModalProps) {
  const [request, setRequest] = useState<ScenarioRequest>(initialRequest)
  const [aiSettings, setAISettings] = useState<ScenarioAISettings>(defaultAISettings)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { providers } = useAIProviders()

  // 開くたびに「AI設定」で保存した既定値を反映する
  useEffect(() => {
    if (isOpen) setAISettings(defaultAISettings())
  }, [isOpen])

  const providerReady = providers?.find(p => p.id === aiSettings.provider)?.configured ?? true

  // 既定のプロバイダーにAPIキーがなければ、設定済みのプロバイダーに切り替える
  useEffect(() => {
    if (!isOpen || !providers || providerReady) return
    const available = providers.find(p => p.configured)
    if (available) {
      setAISettings(prev => ({
        ...prev,
        provider: available.id,
        model: available.defaultModel,
        maxTokens: AI_PROVIDERS[available.id].defaultMaxTokens
      }))
    }
  }, [isOpen, providers, providerReady])

  const system = getGameSystem(request.systemId)

  const set = <K extends keyof ScenarioRequest>(key: K, value: ScenarioRequest[K]) =>
    setRequest(prev => ({ ...prev, [key]: value }))

  const handleSystemChange = (systemId: TRPGSystemId) => {
    const next = getGameSystem(systemId)
    setRequest(prev => ({
      ...prev,
      systemId,
      // 前のシステムのデフォルトジャンルのままなら新しいシステムのものに差し替える
      genre: getGameSystem(prev.systemId).defaultGenres.includes(prev.genre) ? next.defaultGenres[0] : prev.genre
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(
      {
        ...request,
        workingTitle: request.workingTitle?.trim() || undefined,
        setting: request.setting?.trim() || undefined,
        mustInclude: request.mustInclude?.trim() || undefined,
        avoid: request.avoid?.trim() || undefined
      },
      { ...aiSettings, model: aiSettings.model.trim() }
    )
    setRequest(initialRequest)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新しいシナリオを作成" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>ゲームシステム</label>
            <Select
              value={request.systemId}
              onChange={e => handleSystemChange(e.target.value as TRPGSystemId)}
              options={GAME_SYSTEM_LIST.map(s => ({ value: s.id, label: s.name }))}
            />
          </div>
          <div>
            <Input
              label="ジャンル"
              value={request.genre}
              onChange={e => set('genre', e.target.value)}
              list="trpg-genre-options"
              required
            />
            <datalist id="trpg-genre-options">
              {system.defaultGenres.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
        </div>

        <div>
          <label className={labelClass}>アイデア・あらすじ</label>
          <textarea
            className={textareaClass}
            rows={4}
            value={request.premise}
            onChange={e => set('premise', e.target.value)}
            placeholder="例: 閉鎖された山奥の温泉宿で、毎晩ひとりずつ宿泊客が姿を消していく。宿の主人は何かを隠している…（空欄ならAIが考案します）"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input
            label="プレイ人数"
            type="number"
            min={1}
            max={8}
            value={request.playerCount}
            onChange={e => set('playerCount', Number(e.target.value) || 1)}
          />
          <Input
            label="プレイ時間（h）"
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={request.sessionHours}
            onChange={e => set('sessionHours', Number(e.target.value) || 1)}
          />
          <div>
            <label className={labelClass}>難易度</label>
            <Select
              value={request.difficulty}
              onChange={e => set('difficulty', e.target.value as ScenarioDifficulty)}
              options={Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div>
            <Input
              label="トーン"
              value={request.tone}
              onChange={e => set('tone', e.target.value)}
              list="trpg-tone-options"
            />
            <datalist id="trpg-tone-options">
              {TONE_OPTIONS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">{DIFFICULTY_DESCRIPTIONS[request.difficulty]}</p>

        <button
          type="button"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          onClick={() => setShowAdvanced(v => !v)}
        >
          {showAdvanced ? '▲ 詳細設定を閉じる' : '▼ 詳細設定（舞台・NG要素・出力トークン数）'}
        </button>

        <ProviderModelPicker
          provider={aiSettings.provider}
          model={aiSettings.model}
          statuses={providers}
          onChange={(provider, model) =>
            setAISettings(prev => ({
              ...prev,
              provider,
              model,
              maxTokens: provider === prev.provider ? prev.maxTokens : AI_PROVIDERS[provider].defaultMaxTokens
            }))
          }
        />

        {showAdvanced && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="仮タイトル"
                value={request.workingTitle}
                onChange={e => set('workingTitle', e.target.value)}
                placeholder="空欄ならAIが命名"
              />
              <Input
                label="舞台"
                value={request.setting}
                onChange={e => set('setting', e.target.value)}
                placeholder="例: 1920年代のアーカム / 現代日本の地方都市"
              />
            </div>
            <div>
              <label className={labelClass}>必ず含めたい要素</label>
              <textarea
                className={textareaClass}
                rows={2}
                value={request.mustInclude}
                onChange={e => set('mustInclude', e.target.value)}
                placeholder="例: 双子のNPC、雪山、タイムリミット"
              />
            </div>
            <div>
              <label className={labelClass}>避けたい要素（NG・センシティブな題材）</label>
              <textarea
                className={textareaClass}
                rows={2}
                value={request.avoid}
                onChange={e => set('avoid', e.target.value)}
                placeholder="例: 子どもの死、過度なゴア表現"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="最大出力トークン数"
                  type="number"
                  min={1000}
                  step={1000}
                  value={aiSettings.maxTokens}
                  onChange={e => setAISettings(prev => ({ ...prev, maxTokens: Number(e.target.value) || prev.maxTokens }))}
                />
                <p className="mt-1 text-xs text-gray-500">応答が途中で切れる場合は増やしてください（モデルの上限を超えるとエラーになります）。</p>
              </div>
              <div>
                <label className={labelClass}>創造性（temperature: {aiSettings.temperature.toFixed(1)}）</label>
                <input
                  type="range"
                  min={0.2}
                  max={1.2}
                  step={0.1}
                  value={aiSettings.temperature}
                  onChange={e => setAISettings(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                  className="w-full mt-3"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" disabled={!request.genre.trim() || !aiSettings.model.trim() || !providerReady}>
            作成して生成開始
          </Button>
        </div>
      </form>
    </Modal>
  )
}
