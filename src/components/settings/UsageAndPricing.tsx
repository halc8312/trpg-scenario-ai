'use client'

import { useEffect, useState } from 'react'
import { TRPGScenarioService } from '@/lib/services/scenario-service'
import {
  DEFAULT_MODEL_PRICES,
  ModelPrice,
  formatCost,
  formatTokens,
  loadJpyRate,
  loadModelPrices,
  mergeUsage,
  saveJpyRate,
  saveModelPrices,
  summarizeUsage
} from '@/lib/ai/usage'

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm'

/**
 * 全シナリオのAI使用量の合計と、概算料金の計算に使う料金表の編集。
 */
export default function UsageAndPricing({ isOpen, registerSave }: { isOpen: boolean; registerSave: (save: () => void) => void }) {
  const [prices, setPrices] = useState<Record<string, ModelPrice>>(DEFAULT_MODEL_PRICES)
  const [jpyRate, setJpyRate] = useState('')
  const [newModel, setNewModel] = useState('')
  const [usedModels, setUsedModels] = useState<string[]>([])
  const [totalText, setTotalText] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const loadedPrices = loadModelPrices()
    const rate = loadJpyRate()
    const usage = mergeUsage(TRPGScenarioService.getAll().map(s => s.usage))
    const summary = summarizeUsage(usage, loadedPrices)
    setPrices(loadedPrices)
    setJpyRate(rate ? String(rate) : '')
    setUsedModels(Object.values(usage.byModel).map(u => u.model))
    setTotalText(
      summary.calls > 0
        ? `${summary.calls}回・入力 ${formatTokens(summary.inputTokens)} / 出力 ${formatTokens(summary.outputTokens)} トークン・概算 ${formatCost(summary.costUsd, rate)}${summary.incomplete ? '（料金未設定のモデルを除く）' : ''}`
        : 'まだAIを使っていません'
    )
  }, [isOpen])

  useEffect(() => {
    registerSave(() => {
      saveModelPrices(prices)
      saveJpyRate(Number(jpyRate) || null)
    })
  }, [prices, jpyRate, registerSave])

  const models = Array.from(new Set([...Object.keys(prices), ...usedModels])).sort()
  const setPrice = (model: string, key: keyof ModelPrice, value: string) =>
    setPrices(prev => ({ ...prev, [model]: { ...(prev[model] ?? { input: 0, output: 0 }), [key]: Math.max(0, Number(value) || 0) } }))

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">AI使用量と料金</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300" data-testid="usage-total">全シナリオの合計: {totalText}</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400">料金表を編集（100万トークンあたりの米ドル）</summary>
        <p className="mt-2 text-xs text-gray-500">
          料金は変更されることがあります。各社の料金ページで確認して入力してください。DeepSeekの既定値はピーク時間帯の料金です（オフピークは半額）。
        </p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-1 pr-2 font-normal">モデル</th>
              <th className="py-1 pr-2 font-normal w-24">入力</th>
              <th className="py-1 font-normal w-24">出力</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model}>
                <td className="py-1 pr-2 font-mono text-xs break-all">
                  {model}
                  {!prices[model] && <span className="ml-1 text-amber-600">（未設定）</span>}
                </td>
                <td className="py-1 pr-2">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.01"
                    value={prices[model]?.input ?? ''}
                    onChange={e => setPrice(model, 'input', e.target.value)}
                    aria-label={`${model}の入力料金`}
                  />
                </td>
                <td className="py-1">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.01"
                    value={prices[model]?.output ?? ''}
                    onChange={e => setPrice(model, 'output', e.target.value)}
                    aria-label={`${model}の出力料金`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex gap-2">
          <input
            className={inputClass}
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            placeholder="モデルIDを追加（例: gpt-6-sol）"
          />
          <button
            type="button"
            className="shrink-0 rounded-md border border-gray-300 dark:border-gray-600 px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => {
              const model = newModel.trim()
              if (model && !prices[model]) setPrices(prev => ({ ...prev, [model]: { input: 0, output: 0 } }))
              setNewModel('')
            }}
          >
            追加
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          円換算レート（1ドル＝）
          <input
            className={`${inputClass} w-24`}
            type="number"
            min={0}
            value={jpyRate}
            onChange={e => setJpyRate(e.target.value)}
            placeholder="未設定"
            aria-label="円換算レート"
          />
          円
        </label>
      </details>
    </section>
  )
}
