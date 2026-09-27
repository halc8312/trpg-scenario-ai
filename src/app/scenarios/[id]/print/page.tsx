'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  GMDocument,
  HandoutsDocument,
  PRINT_MODES,
  PlayerDocument,
  PregensDocument,
  PrintMode
} from '@/components/print/PrintDocuments'
import { TRPGScenarioService } from '@/lib/services/scenario-service'
import { TRPGScenario } from '@/lib/types'
import { cn } from '@/lib/utils'

function isPrintMode(value: unknown): value is PrintMode {
  return PRINT_MODES.some(m => m.id === value)
}

export default function PrintPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams: { mode?: string }
}) {
  const router = useRouter()
  const [scenario, setScenario] = useState<TRPGScenario | null | undefined>(undefined)
  const mode: PrintMode = isPrintMode(searchParams.mode) ? searchParams.mode : 'gm'

  useEffect(() => {
    setScenario(TRPGScenarioService.get(params.id))
  }, [params.id])

  if (scenario === undefined) return null
  if (scenario === null) {
    return (
      <div className="p-8 text-center">
        <p>シナリオが見つかりませんでした。</p>
        <Link href="/" className="text-blue-600 underline">シナリオ一覧へ</Link>
      </div>
    )
  }

  return (
    // 印刷ページは常に白地で表示する（ダークモードでも紙面どおりに見えるように）
    <div className="min-h-screen bg-gray-100 text-gray-900 print:bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-300 bg-white px-4 py-3 shadow-sm print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <Link href={`/scenarios/${scenario.id}`} className="mr-2 text-sm text-blue-600 hover:underline">
            ← シナリオに戻る
          </Link>
          <nav className="flex flex-wrap gap-1" aria-label="印刷する内容">
            {PRINT_MODES.map(m => (
              <button
                key={m.id}
                type="button"
                title={m.description}
                aria-pressed={mode === m.id}
                onClick={() => router.replace(`/scenarios/${scenario.id}/print?mode=${m.id}`)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm',
                  mode === m.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 hover:bg-gray-50'
                )}
              >
                {m.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            印刷 / PDFで保存
          </button>
        </div>
        <p className="mx-auto mt-1 max-w-4xl text-xs text-gray-500">
          PDFにするには、印刷画面の送信先で「PDFに保存」を選んでください。
        </p>
      </div>

      <main className="mx-auto my-6 max-w-4xl bg-white px-10 py-10 shadow print:m-0 print:max-w-none print:p-0 print:shadow-none">
        {mode === 'gm' && <GMDocument scenario={scenario} />}
        {mode === 'player' && <PlayerDocument scenario={scenario} />}
        {mode === 'handouts' && <HandoutsDocument scenario={scenario} />}
        {mode === 'pcs' && <PregensDocument scenario={scenario} />}
      </main>
    </div>
  )
}
