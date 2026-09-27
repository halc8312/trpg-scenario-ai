'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { getGameSystem } from '@/data/game-systems'
import { rollDice } from '@/lib/dice'
import { SCENE_TYPE_LABELS } from '@/lib/services/scenario-exporter'
import { DiceLogEntry, ScenarioSessionState, TRPGScenario } from '@/lib/types'
import { cn } from '@/lib/utils'

export const EMPTY_SESSION: ScenarioSessionState = {
  memo: '',
  diceLog: [],
  foundClueIds: [],
  countdownDone: [],
  timer: { elapsedMs: 0 }
}

const MAX_DICE_LOG = 100

interface SessionPanelProps {
  scenario: TRPGScenario
  onChange: (session: ScenarioSessionState) => void
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  )
}

const smallButton =
  'rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'

/**
 * セッション中にGMが手元で使う画面。ダイス・タイマー・現在のシーン・入手済みの手がかり・メモを1か所にまとめる。
 */
export default function SessionPanel({ scenario, onChange }: SessionPanelProps) {
  const session = { ...EMPTY_SESSION, ...scenario.session }
  const update = (patch: Partial<ScenarioSessionState>) => onChange({ ...session, ...patch })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-4">
        <SceneTracker scenario={scenario} session={session} update={update} />
        <ClueTracker scenario={scenario} session={session} update={update} />
      </div>
      <div className="lg:col-span-2 space-y-4">
        <SessionTimer scenario={scenario} session={session} update={update} />
        <DiceRoller scenario={scenario} session={session} update={update} />
        <CountdownTracker scenario={scenario} session={session} update={update} />
        <SessionMemo session={session} update={update} />
      </div>
    </div>
  )
}

interface PartProps {
  scenario: TRPGScenario
  session: ScenarioSessionState
  update: (patch: Partial<ScenarioSessionState>) => void
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function SessionTimer({ scenario, session, update }: PartProps) {
  const { startedAt, elapsedMs } = session.timer
  const [now, setNow] = useState(() => Date.now())
  const running = startedAt !== undefined

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  const elapsed = elapsedMs + (running ? Math.max(0, now - startedAt!) : 0)
  const plannedMs = scenario.request.sessionHours * 3600_000
  const ratio = Math.min(1, elapsed / plannedMs)

  return (
    <Panel
      title="セッションタイマー"
      action={
        <div className="flex gap-1">
          <button
            type="button"
            className={smallButton}
            onClick={() => {
              const t = Date.now()
              setNow(t)
              update({ timer: running ? { elapsedMs: elapsed } : { elapsedMs, startedAt: t } })
            }}
          >
            {running ? '一時停止' : elapsed > 0 ? '再開' : '開始'}
          </button>
          <button
            type="button"
            className={smallButton}
            disabled={elapsed === 0}
            onClick={() => confirm('タイマーをリセットしますか？') && update({ timer: { elapsedMs: 0 } })}
          >
            リセット
          </button>
        </div>
      }
    >
      <div className="text-3xl font-mono tabular-nums text-gray-900 dark:text-white" aria-label="経過時間">
        {formatElapsed(elapsed)}
      </div>
      <div className="mt-2 h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={cn('h-full', ratio >= 1 ? 'bg-red-500' : ratio > 0.8 ? 'bg-amber-500' : 'bg-green-600')} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">予定 {scenario.request.sessionHours}時間</p>
      {scenario.gmGuide?.pacing && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">時間配分の目安: {scenario.gmGuide.pacing}</p>
      )}
    </Panel>
  )
}

function DiceRoller({ scenario, session, update }: PartProps) {
  const system = getGameSystem(scenario.request.systemId)
  const [notation, setNotation] = useState(system.dicePresets[0])
  const [error, setError] = useState<string | null>(null)

  const roll = (value: string) => {
    try {
      const result = rollDice(value)
      const entry: DiceLogEntry = {
        at: new Date().toISOString(),
        notation: result.notation,
        total: result.total,
        detail: result.detail,
        label: result.label,
        outcome: result.outcome
      }
      setError(null)
      update({ diceLog: [entry, ...session.diceLog].slice(0, MAX_DICE_LOG) })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const latest = session.diceLog[0]

  return (
    <Panel
      title="ダイス"
      action={
        session.diceLog.length > 0 && (
          <button type="button" className={smallButton} onClick={() => update({ diceLog: [] })}>
            履歴を消去
          </button>
        )
      }
    >
      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault()
          roll(notation)
        }}
      >
        <input
          className="min-w-0 flex-grow rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 font-mono text-sm"
          value={notation}
          onChange={e => setNotation(e.target.value)}
          aria-label="ダイスの表記"
        />
        <button type="submit" className="rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
          振る
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1">
        {system.dicePresets.map(preset => (
          <button key={preset} type="button" className={cn(smallButton, 'font-mono')} onClick={() => { setNotation(preset); roll(preset) }}>
            {preset}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">
        例: 2D6+3、2D6&gt;=5、CC&lt;=60（CoC）、5DX+2@9（DX）、3DM&lt;=6（エモクロア）
      </p>

      {latest && (
        <div className="mt-3 rounded-md bg-gray-50 dark:bg-gray-900 p-3" aria-live="polite">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums" data-testid="dice-total">{latest.total}</span>
            {latest.label && <OutcomeBadge outcome={latest.outcome} label={latest.label} />}
          </div>
          <p className="mt-1 font-mono text-xs text-gray-500">{latest.notation}: {latest.detail}</p>
        </div>
      )}
      {session.diceLog.length > 1 && (
        <ul className="mt-2 max-h-32 overflow-y-auto text-xs font-mono text-gray-500 space-y-0.5">
          {session.diceLog.slice(1, 20).map(entry => (
            <li key={entry.at + entry.detail}>
              {entry.notation} → {entry.total}{entry.label ? ` ${entry.label}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function OutcomeBadge({ outcome, label }: { outcome?: DiceLogEntry['outcome']; label: string }) {
  return (
    <span
      className={cn('rounded px-2 py-0.5 text-sm font-medium', {
        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200': outcome === 'success',
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200': outcome === 'critical',
        'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200': outcome === 'failure' || !outcome,
        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200': outcome === 'fumble'
      })}
    >
      {label}
    </span>
  )
}

function SceneTracker({ scenario, session, update }: PartProps) {
  const system = getGameSystem(scenario.request.systemId)
  const scene = scenario.scenes.find(s => s.id === session.currentSceneId) ?? scenario.scenes[0]
  if (!scene) return <Panel title="現在のシーン"><p className="text-sm text-gray-500">シーンがありません。</p></Panel>

  const sceneIndex = new Map(scenario.scenes.map((s, i) => [s.id, i]))
  const location = scenario.locations.find(l => l.id === scene.locationId)
  const npcs = scenario.npcs.filter(n => scene.npcIds.includes(n.id))
  const clues = scenario.clues.filter(c => scene.clueIds.includes(c.id))

  return (
    <Panel
      title="現在のシーン"
      action={
        <select
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
          value={scene.id}
          onChange={e => update({ currentSceneId: e.target.value })}
          aria-label="現在のシーン"
        >
          {scenario.scenes.map((s, i) => (
            <option key={s.id} value={s.id}>#{i + 1} {s.title}</option>
          ))}
        </select>
      }
    >
      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
        {scene.title}
        <span className="ml-2 text-xs font-normal text-gray-500">{SCENE_TYPE_LABELS[scene.type]}{location && ` @ ${location.name}`}</span>
      </h4>
      {scene.readAloud && (
        <blockquote className="my-2 border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm whitespace-pre-wrap">
          {scene.readAloud}
        </blockquote>
      )}
      {scene.gmNotes && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{scene.gmNotes}</p>}

      {scene.checks.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {scene.checks.map((c, i) => (
            <li key={i}>
              <span className="font-medium">{c.skill} {c.difficulty}</span>
              <span className="text-gray-600 dark:text-gray-400">　成功: {c.success} ／ 失敗: {c.failure}</span>
            </li>
          ))}
        </ul>
      )}

      {npcs.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          {npcs.map(n => (
            <details key={n.id}>
              <summary className="cursor-pointer font-medium">{n.name}<span className="ml-1 text-xs font-normal text-gray-500">{n.role}</span></summary>
              <div className="pl-4 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <p>性格: {n.personality}</p>
                <p>{system.gmTitle}のみ: {n.secret}</p>
                {n.dialogueExamples.map((d, i) => <p key={i}>「{d.replace(/^「|」$/g, '')}」</p>)}
              </div>
            </details>
          ))}
        </div>
      )}

      {clues.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">このシーンの手がかり</p>
          {clues.map(c => (
            <ClueCheckbox key={c.id} clue={c} session={session} update={update} />
          ))}
        </div>
      )}

      {scene.nextSceneIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {scene.nextSceneIds.filter(id => sceneIndex.has(id)).map(id => (
            <button key={id} type="button" className={smallButton} onClick={() => update({ currentSceneId: id })}>
              → #{sceneIndex.get(id)! + 1} {scenario.scenes[sceneIndex.get(id)!].title}
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}

function ClueCheckbox({ clue, session, update }: { clue: TRPGScenario['clues'][number] } & Omit<PartProps, 'scenario'>) {
  const found = session.foundClueIds.includes(clue.id)
  return (
    <label className="flex items-start gap-2 text-sm py-0.5">
      <input
        type="checkbox"
        className="mt-1"
        checked={found}
        onChange={e =>
          update({
            foundClueIds: e.target.checked
              ? [...session.foundClueIds, clue.id]
              : session.foundClueIds.filter(id => id !== clue.id)
          })
        }
      />
      <span className={cn(found && 'text-gray-500 line-through')}>
        {clue.title}
        <span className="ml-1 text-xs text-gray-500">{[clue.discovery.skill, clue.discovery.difficulty].filter(Boolean).join(' ')}</span>
      </span>
    </label>
  )
}

function ClueTracker({ scenario, session, update }: PartProps) {
  const revelations = scenario.truth?.keyRevelations ?? []
  const foundCount = session.foundClueIds.filter(id => scenario.clues.some(c => c.id === id)).length

  return (
    <Panel
      title={`手がかりの進み具合（${foundCount}/${scenario.clues.length}）`}
      action={
        foundCount > 0 && (
          <button type="button" className={smallButton} onClick={() => confirm('入手済みの記録をすべて外しますか？') && update({ foundClueIds: [] })}>
            リセット
          </button>
        )
      }
    >
      <div className="space-y-3">
        {revelations.map(r => {
          const clues = scenario.clues.filter(c => c.revelationId === r.id)
          const found = clues.filter(c => session.foundClueIds.includes(c.id)).length
          return (
            <div key={r.id}>
              <div className="flex items-start gap-2 text-sm">
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded px-1.5 text-xs',
                    found > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700'
                  )}
                >
                  {found > 0 ? '判明' : '未判明'}
                </span>
                <span className="font-medium">{r.fact}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-500">{found}/{clues.length}</span>
              </div>
              <div className="pl-12">
                {clues.map(c => <ClueCheckbox key={c.id} clue={c} session={session} update={update} />)}
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function CountdownTracker({ scenario, session, update }: PartProps) {
  const events = scenario.truth?.countdown ?? []
  if (events.length === 0) return null
  return (
    <Panel title="タイムライン（PCが介入しなかった場合）">
      <ul className="space-y-1 text-sm">
        {events.map((event, i) => {
          const done = session.countdownDone.includes(i)
          return (
            <li key={i}>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={done}
                  onChange={e =>
                    update({ countdownDone: e.target.checked ? [...session.countdownDone, i] : session.countdownDone.filter(n => n !== i) })
                  }
                />
                <span className={cn(done && 'text-gray-500 line-through')}>
                  <span className="font-medium">{event.time}</span> {event.event}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function SessionMemo({ session, update }: Omit<PartProps, 'scenario'>) {
  const [memo, setMemo] = useState(session.memo)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestUpdate = useRef(update)
  latestUpdate.current = update

  // 入力のたびに保存せず、入力が止まってから保存する
  const handleChange = (value: string) => {
    setMemo(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => latestUpdate.current({ memo: value }), 500)
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <Panel title="セッションメモ">
      <textarea
        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        rows={6}
        value={memo}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current)
          if (memo !== session.memo) update({ memo })
        }}
        placeholder="PLの行動、決まったこと、次回への引き継ぎなど"
        aria-label="セッションメモ"
      />
    </Panel>
  )
}
