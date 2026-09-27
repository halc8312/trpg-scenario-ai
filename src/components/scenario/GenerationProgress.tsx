'use client'

import { Flow } from '@/lib/flow/flow-engine'
import { cn } from '@/lib/utils'

export type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

export interface GenerationLog {
  message: string
  type: 'info' | 'warning' | 'error'
}

interface GenerationProgressProps {
  flow: Flow
  stepStatuses: Record<string, StepStatus>
  logs: GenerationLog[]
  background?: boolean
}

const STATUS_ICON: Record<StepStatus, string> = {
  pending: '○',
  running: '◐',
  done: '●',
  skipped: '－',
  error: '×'
}

export default function GenerationProgress({ flow, stepStatuses, logs, background = false }: GenerationProgressProps) {
  const done = flow.steps.filter(s => ['done', 'skipped'].includes(stepStatuses[s.id])).length
  const percent = Math.round((done / flow.steps.length) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5" aria-live="polite">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">シナリオを生成しています</h3>
        <span className="text-sm text-gray-500">{percent}%</span>
      </div>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{background ? 'サーバーで生成中です。画面を閉じても続行し、戻ると進捗と結果を表示します。' : '生成中はこの画面を開いたままにしてください。中断した場合も、保存済みの続きから再開できます。'}</p>
      <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden mb-4">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mb-4">
        {flow.steps.map(step => {
          const status = stepStatuses[step.id] ?? 'pending'
          return (
            <li
              key={step.id}
              className={cn('text-sm flex items-center gap-2', {
                'text-gray-400': status === 'pending' || status === 'skipped',
                'text-blue-600 dark:text-blue-400 font-medium': status === 'running',
                'text-green-700 dark:text-green-400': status === 'done',
                'text-red-600': status === 'error'
              })}
              title={step.action}
            >
              <span className={cn('w-4 text-center', status === 'running' && 'animate-spin')}>{STATUS_ICON[status]}</span>
              {step.name}
            </li>
          )
        })}
      </ol>

      {logs.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded bg-gray-50 dark:bg-gray-900 p-3 text-xs font-mono space-y-0.5">
          {logs.map((log, i) => (
            <div
              key={i}
              className={cn({
                'text-gray-600 dark:text-gray-400': log.type === 'info',
                'text-amber-600': log.type === 'warning',
                'text-red-600': log.type === 'error'
              })}
            >
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
