'use client'

import Link from 'next/link'
import { DIFFICULTY_LABELS, getGameSystem } from '@/data/game-systems'
import { ScenarioStatus, TRPGScenario } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

const STATUS_STYLES: Record<ScenarioStatus, { label: string; className: string }> = {
  draft: { label: '未生成', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  generating: { label: '生成中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
  complete: { label: '完成', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  error: { label: 'エラー', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' }
}

interface ScenarioCardProps {
  scenario: TRPGScenario
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export default function ScenarioCard({ scenario, onDelete, onDuplicate }: ScenarioCardProps) {
  const system = getGameSystem(scenario.request.systemId)
  const status = STATUS_STYLES[scenario.status]
  const title = scenario.overview?.title || scenario.request.workingTitle || '（タイトル未定）'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
          {system.shortName}
        </span>
        <span className={cn('px-2 py-0.5 rounded', status.className)}>{status.label}</span>
        {scenario.validation && (
          <span className="ml-auto text-gray-500 dark:text-gray-400">検証 {scenario.validation.score}点</span>
        )}
      </div>

      <Link href={`/scenarios/${scenario.id}`} className="group flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {title}
        </h3>
        {scenario.overview?.tagline && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{scenario.overview.tagline}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {scenario.request.genre} / {scenario.request.playerCount}人 / {scenario.request.sessionHours}時間 /{' '}
          {DIFFICULTY_LABELS[scenario.request.difficulty]}
        </p>
      </Link>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-500">{formatDate(scenario.updatedAt)}</span>
        <div className="flex gap-3 text-sm">
          <button className="text-gray-600 dark:text-gray-300 hover:underline" onClick={() => onDuplicate(scenario.id)}>
            複製
          </button>
          <button
            className="text-red-600 dark:text-red-400 hover:underline"
            onClick={() => {
              if (confirm(`「${title}」を削除しますか？`)) onDelete(scenario.id)
            }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
