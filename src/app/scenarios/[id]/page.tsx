'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import GenerationProgress, { GenerationLog, StepStatus } from '@/components/scenario/GenerationProgress'
import GMAssistantPanel from '@/components/scenario/GMAssistantPanel'
import ScenarioEditor, { EditableTab } from '@/components/editor/ScenarioEditor'
import {
  CluesSection,
  EndingsSection,
  NPCSection,
  OverviewSection,
  PregenSection,
  ScenesSection,
  TruthSection,
  ValidationSection
} from '@/components/scenario/ScenarioSections'
import { trpgScenarioFlow } from '@/data/scenario-flow'
import { DIFFICULTY_LABELS, getGameSystem } from '@/data/game-systems'
import { FlowEngine } from '@/lib/flow/flow-engine'
import { TRPGScenarioFlowExecutor, contextToScenarioPatch, scenarioToContext } from '@/lib/services/scenario-flow-executor'
import { ScenarioExporter } from '@/lib/services/scenario-exporter'
import { TRPGScenarioService } from '@/lib/services/scenario-service'
import { finalizeEdits } from '@/lib/services/scenario-editing'
import { ScenarioSection, TRPGScenario } from '@/lib/types'
import { cn, saveTextToFile, saveToFile } from '@/lib/utils'
import { useToast } from '@/lib/toast'
import { AI_PROVIDERS } from '@/lib/ai/providers'

type TabId = 'overview' | 'pregens' | 'truth' | 'npcs' | 'clues' | 'scenes' | 'endings' | 'validation' | 'assistant'

const TABS: { id: TabId; label: string; section?: ScenarioSection; editable?: boolean }[] = [
  { id: 'overview', label: '概要', section: 'concept', editable: true },
  { id: 'pregens', label: 'PC', section: 'pregens', editable: true },
  { id: 'truth', label: '真相', section: 'concept', editable: true },
  { id: 'npcs', label: 'NPC', section: 'npcs', editable: true },
  { id: 'clues', label: '場所・手がかり', section: 'locationsAndClues', editable: true },
  { id: 'scenes', label: 'シーン', section: 'scenes', editable: true },
  { id: 'endings', label: 'エンディング', section: 'endings', editable: true },
  { id: 'validation', label: '検証' },
  { id: 'assistant', label: 'GM相談' }
]

const SECTION_LABELS: Record<ScenarioSection, string> = {
  concept: '概要と真相',
  npcs: 'NPC',
  locationsAndClues: '場所と手がかり',
  scenes: 'シーン構成',
  endings: 'エンディングとガイド',
  pregens: 'サンプルキャラクター'
}

export default function TRPGScenarioPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams: { autostart?: string }
}) {
  const router = useRouter()
  const { addToast } = useToast()
  const [scenario, setScenario] = useState<TRPGScenario | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [regenerating, setRegenerating] = useState<ScenarioSection | null>(null)
  const [instruction, setInstruction] = useState('')
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({})
  const [logs, setLogs] = useState<GenerationLog[]>([])
  // 手動編集中の下書き（null のときは閲覧モード）
  const [draft, setDraft] = useState<TRPGScenario | null>(null)
  const [reinforcing, setReinforcing] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  // AIから受信中のテキスト（画面の更新は間引く）
  const [streamText, setStreamText] = useState('')
  const pendingStreamText = useRef('')
  const streamTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onStream = useCallback((text: string) => {
    pendingStreamText.current = text
    // 100msごとにまとめて画面を更新し、最後の受信分も必ず反映する
    if (streamTimer.current) return
    streamTimer.current = setTimeout(() => {
      streamTimer.current = null
      setStreamText(pendingStreamText.current)
    }, 100)
  }, [])
  const clearStream = useCallback(() => {
    if (streamTimer.current) clearTimeout(streamTimer.current)
    streamTimer.current = null
    pendingStreamText.current = ''
    setStreamText('')
  }, [])
  useEffect(() => clearStream, [clearStream])
  const autostartHandled = useRef(false)

  const persist = useCallback((updates: Partial<TRPGScenario>) => {
    const updated = TRPGScenarioService.update(params.id, updates)
    if (updated) setScenario(updated)
    return updated
  }, [params.id])

  const runGeneration = useCallback(async (target: TRPGScenario, mode: 'fresh' | 'resume' = 'fresh') => {
    // 途中再開のときは、完了済みのステップを飛ばして最初の未完了ステップから始める
    const completedSteps = mode === 'resume' ? [...(target.generation?.completedSteps ?? [])] : []
    const startStep = trpgScenarioFlow.steps.find(step => !completedSteps.includes(step.id))

    setIsGenerating(true)
    setLogs(mode === 'resume' && startStep ? [{ message: `「${startStep.name}」から再開します`, type: 'info' }] : [])
    setStepStatuses(Object.fromEntries(completedSteps.map(id => [id, 'done' as StepStatus])))
    setActiveTab('overview')
    persist({ status: 'generating', lastError: undefined, generation: { completedSteps } })

    const executor = new TRPGScenarioFlowExecutor(target.aiSettings, { onStream })
    const engine = new FlowEngine(trpgScenarioFlow, executor)
    executor.setFlowEngine(engine)

    engine.on('stepStart', step => setStepStatuses(prev => ({ ...prev, [step.id]: 'running' })))
    engine.on('stepComplete', step => {
      setStepStatuses(prev => ({ ...prev, [step.id]: 'done' }))
      completedSteps.push(step.id)
      // 途中で失敗しても完成済みのセクションは残るよう、ステップごとに保存する
      persist({ ...contextToScenarioPatch(engine.getContext()), generation: { completedSteps: [...completedSteps] } })
    })
    engine.on('stepError', step => setStepStatuses(prev => ({ ...prev, [step.id]: 'error' })))
    engine.on('log', (message, type = 'info') => setLogs(prev => [...prev, { message, type }]))

    try {
      const context = mode === 'resume' && startStep
        ? await engine.execute(scenarioToContext(target), { startStepId: startStep.id })
        : await engine.execute({ request: target.request })
      // 条件を満たさず実行されなかったステップ
      setStepStatuses(prev => {
        const next = { ...prev }
        for (const step of trpgScenarioFlow.steps) if (!next[step.id]) next[step.id] = 'skipped'
        return next
      })
      persist({ ...contextToScenarioPatch(context), status: 'complete' })
      addToast('シナリオが完成しました', 'success')
    } catch (error: any) {
      console.error('Scenario generation failed:', error)
      const message = error?.message || 'シナリオの生成に失敗しました'
      setLogs(prev => [...prev, { message, type: 'error' }])
      persist({ status: 'error', lastError: message })
      addToast('シナリオの生成に失敗しました', 'error')
    } finally {
      setIsGenerating(false)
      clearStream()
    }
  }, [persist, addToast, onStream, clearStream])

  useEffect(() => {
    let loaded = TRPGScenarioService.get(params.id)
    if (!loaded) {
      setNotFound(true)
      return
    }

    // ページ遷移などで中断された生成はエラーとして扱う
    if (loaded.status === 'generating' && !autostartHandled.current) {
      loaded = TRPGScenarioService.update(params.id, {
        status: 'error',
        lastError: '生成が中断されました。もう一度生成してください。'
      }) ?? loaded
    }
    setScenario(loaded)

    if (searchParams.autostart && !autostartHandled.current && loaded.status === 'draft') {
      autostartHandled.current = true
      router.replace(`/scenarios/${params.id}`)
      runGeneration(loaded)
    }
  }, [params.id, searchParams.autostart, router, runGeneration])

  const handleRegenerate = async (section: ScenarioSection) => {
    if (!scenario) return
    setRegenerating(section)
    try {
      const executor = new TRPGScenarioFlowExecutor(scenario.aiSettings, { onStream })
      const { patch, report } = await executor.regenerateSection(scenario, section, instruction.trim() || undefined)
      persist(patch)
      setInstruction('')
      const repaired = report.remapped || report.removed
        ? `（参照を${report.remapped}件付け替え、${report.removed}件の無効な参照を削除）`
        : ''
      addToast(`${SECTION_LABELS[section]}を再生成しました${repaired}`, 'success')
    } catch (error: any) {
      addToast(error?.message || '再生成に失敗しました', 'error')
    } finally {
      setRegenerating(null)
      clearStream()
    }
  }

  const handleReinforce = async () => {
    if (!scenario) return
    setReinforcing(true)
    try {
      const executor = new TRPGScenarioFlowExecutor(scenario.aiSettings, { onStream })
      persist(await executor.reinforceClues(scenario))
      addToast('手がかりを補強しました', 'success')
    } catch (error: any) {
      addToast(error?.message || '手がかりの補強に失敗しました', 'error')
    } finally {
      setReinforcing(false)
      clearStream()
    }
  }

  const handleReview = async () => {
    if (!scenario) return
    setReviewing(true)
    try {
      const executor = new TRPGScenarioFlowExecutor(scenario.aiSettings, { onStream })
      persist({ review: await executor.reviewContent(scenario) })
      addToast('内容のチェックが完了しました', 'success')
    } catch (error: any) {
      addToast(error?.message || '内容のチェックに失敗しました', 'error')
    } finally {
      setReviewing(false)
      clearStream()
    }
  }

  // 編集中にページを離れようとしたら確認する
  useEffect(() => {
    if (!draft) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [draft])

  const startEditing = () => {
    if (scenario) setDraft(JSON.parse(JSON.stringify(scenario), reviveDate))
  }

  const saveEdits = () => {
    if (!draft) return
    persist(finalizeEdits(draft))
    setDraft(null)
    addToast('編集内容を保存しました', 'success')
  }

  const cancelEditing = () => {
    if (confirm('編集内容を破棄しますか？')) setDraft(null)
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center gap-4">
          <p className="text-gray-600 dark:text-gray-300">シナリオが見つかりませんでした。</p>
          <Link href="/"><Button>シナリオ一覧へ</Button></Link>
        </div>
      </div>
    )
  }

  if (!scenario) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900" />

  const system = getGameSystem(scenario.request.systemId)
  const title = scenario.overview?.title || scenario.request.workingTitle || '（タイトル未定）'
  const hasContent = !!scenario.overview
  const isEditing = draft !== null
  const canResume = (scenario.generation?.completedSteps.length ?? 0) > 0
  const busy = isGenerating || regenerating !== null || isEditing || reinforcing || reviewing
  const currentTab = TABS.find(t => t.id === activeTab)!
  const fileBase = title.replace(/[\\/:*?"<>|]/g, '_')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <div className="flex-grow max-w-6xl mx-auto px-4 py-6 sm:py-8 w-full">
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← シナリオ一覧
        </Link>

        <div className="mt-3 mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2 text-xs mb-2">
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                {system.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {scenario.request.genre} / {scenario.request.playerCount}人 / {scenario.request.sessionHours}時間 /{' '}
                {DIFFICULTY_LABELS[scenario.request.difficulty]}
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                {AI_PROVIDERS[scenario.aiSettings.provider]?.name ?? scenario.aiSettings.provider} / {scenario.aiSettings.model}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {scenario.overview?.tagline && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">{scenario.overview.tagline}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasContent && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => saveTextToFile(`${fileBase}.md`, ScenarioExporter.toMarkdown(scenario), 'text/markdown')}
                >
                  Markdown出力
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => saveToFile(`${fileBase}.json`, scenario)}>
                  JSON出力
                </Button>
              </>
            )}
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                if (!hasContent || confirm('シナリオ全体を作り直します。現在の内容は上書きされます。よろしいですか？')) {
                  runGeneration(scenario)
                }
              }}
            >
              {hasContent ? '全体を再生成' : '生成開始'}
            </Button>
          </div>
        </div>

        {(isGenerating || (logs.length > 0 && !hasContent)) && (
          <div className="mb-6">
            <GenerationProgress flow={trpgScenarioFlow} stepStatuses={stepStatuses} logs={logs} streamText={streamText} />
          </div>
        )}

        {scenario.status === 'error' && !isGenerating && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            <p className="flex-grow">
              {scenario.lastError || 'シナリオの生成に失敗しました。'}
              {hasContent && ' 生成済みのセクションは保存されています。'}
            </p>
            {canResume && (
              <Button size="sm" disabled={busy} onClick={() => runGeneration(scenario, 'resume')}>
                続きから再開
              </Button>
            )}
          </div>
        )}

        {scenario.status === 'draft' && !isGenerating && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              「生成開始」を押すと、真相 → NPC → 手がかり → シーン → エンディングの順にシナリオを組み立てます。
            </p>
            <Button onClick={() => runGeneration(scenario)}>生成開始</Button>
          </div>
        )}

        {hasContent && (
          <>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
              <nav className="flex gap-1 min-w-max" role="tablist">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    disabled={isEditing && !tab.editable}
                    className={cn(
                      'px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap disabled:opacity-40',
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                  >
                    {tab.label}
                    {tab.id === 'validation' && scenario.validation && (
                      <span className="ml-1 text-xs text-gray-400">{scenario.validation.score}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {currentTab.editable && !isGenerating && (
              <div
                className={cn(
                  'mb-4 flex flex-wrap items-center justify-end gap-2',
                  isEditing && 'sticky top-0 z-20 -mx-4 bg-gray-50/95 px-4 py-2 backdrop-blur dark:bg-gray-900/95'
                )}
              >
                {isEditing ? (
                  <>
                    <span className="mr-auto text-sm text-amber-700 dark:text-amber-300">
                      編集中です。タブを切り替えても編集内容は保持されます。
                    </span>
                    <Button size="sm" variant="secondary" onClick={cancelEditing}>
                      キャンセル
                    </Button>
                    <Button size="sm" onClick={saveEdits}>
                      保存
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={startEditing}>
                    編集
                  </Button>
                )}
              </div>
            )}

            {isEditing && currentTab.editable ? (
              <ScenarioEditor tab={activeTab as EditableTab} draft={draft} onChange={setDraft} />
            ) : (
              <>
                {activeTab === 'overview' && <OverviewSection scenario={scenario} />}
                {activeTab === 'pregens' && (
                  <PregenSection scenario={scenario} onCreate={() => handleRegenerate('pregens')} disabled={busy} />
                )}
                {activeTab === 'truth' && <TruthSection scenario={scenario} />}
                {activeTab === 'npcs' && <NPCSection scenario={scenario} />}
                {activeTab === 'clues' && <CluesSection scenario={scenario} />}
                {activeTab === 'scenes' && <ScenesSection scenario={scenario} />}
                {activeTab === 'endings' && <EndingsSection scenario={scenario} />}
                {activeTab === 'validation' && (
                  <ValidationSection
                    scenario={scenario}
                    onReinforce={handleReinforce}
                    isReinforcing={reinforcing}
                    onReview={handleReview}
                    isReviewing={reviewing}
                    disabled={busy}
                  />
                )}
                {activeTab === 'assistant' && <GMAssistantPanel scenario={scenario} />}
              </>
            )}

            {currentTab.section && !isEditing && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {SECTION_LABELS[currentTab.section]}を再生成
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-grow rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={instruction}
                    onChange={e => setInstruction(e.target.value)}
                    placeholder="追加の指示（任意）例: 黒幕をもっと同情できる人物にして / 戦闘を1回減らして"
                    disabled={busy}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => handleRegenerate(currentTab.section!)}
                  >
                    {regenerating === currentTab.section
                      ? `再生成中…${streamText ? `（${streamText.length.toLocaleString()}文字）` : ''}`
                      : '再生成'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  他のセクションはそのまま残ります。名前が同じ要素への参照は自動で付け替え、なくなった要素への参照は外します。
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// JSON経由で複製したときに日付を Date に戻す
function reviveDate(key: string, value: unknown) {
  return (key === 'createdAt' || key === 'updatedAt' || key === 'checkedAt' || key === 'reviewedAt') && typeof value === 'string'
    ? new Date(value)
    : value
}
