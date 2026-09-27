'use client'

import { ReactNode } from 'react'
import { DIFFICULTY_LABELS, getGameSystem } from '@/data/game-systems'
import { SCENE_TYPE_LABELS } from '@/lib/services/scenario-exporter'
import { ContentIssueCategory, ScenarioIssueSeverity, TRPGScenario } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

interface SectionProps {
  scenario: TRPGScenario
}

function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg shadow p-5', className)}>
      {title && <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>}
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{children}</div>
    </div>
  )
}

function Empty({ children = 'まだ生成されていません。' }: { children?: ReactNode }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-block px-2 py-0.5 rounded text-xs', className)}>{children}</span>
}

export function SpoilerNotice({ gmTitle }: { gmTitle: string }) {
  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
      このセクションは{gmTitle}向けの情報です。プレイヤーには見せないでください。
    </div>
  )
}

export function OverviewSection({ scenario }: SectionProps) {
  const { overview, request } = scenario
  const system = getGameSystem(request.systemId)
  if (!overview) return <Empty />

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Field label="システム">{system.name}</Field>
          <Field label="プレイ人数">{overview.recommendedPlayers || `${request.playerCount}人`}</Field>
          <Field label="プレイ時間">{overview.estimatedPlayTime || `${request.sessionHours}時間`}</Field>
          <Field label="難易度">{DIFFICULTY_LABELS[request.difficulty]}</Field>
        </div>
        {overview.recommendedSkills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {overview.recommendedSkills.map(skill => (
              <Badge key={skill} className="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{skill}</Badge>
            ))}
          </div>
        )}
      </Card>
      <Card title="あらすじ（PL向け）">
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{overview.playerSynopsis}</p>
      </Card>
      <Card title="導入">
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{overview.hook}</p>
      </Card>
    </div>
  )
}

export function TruthSection({ scenario }: SectionProps) {
  const { truth } = scenario
  const system = getGameSystem(scenario.request.systemId)
  if (!truth) return <Empty />

  const clueCount = (revelationId: string) => scenario.clues.filter(c => c.revelationId === revelationId).length

  return (
    <div className="space-y-4">
      <SpoilerNotice gmTitle={system.gmTitle} />
      <Card title="真相">
        <Field label="要約">{truth.summary}</Field>
        <Field label="経緯">{truth.backstory}</Field>
        <Field label="黒幕・脅威">{truth.antagonist}</Field>
        <Field label="目的">{truth.antagonistGoal}</Field>
      </Card>
      <Card title="PLが到達すべき情報">
        <ul className="space-y-2">
          {truth.keyRevelations.map(r => (
            <li key={r.id} className="flex items-start gap-2 text-sm">
              <Badge
                className={r.importance === 'critical'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}
              >
                {r.importance === 'critical' ? '重要' : '任意'}
              </Badge>
              <span className="flex-grow text-gray-800 dark:text-gray-200">{r.fact}</span>
              <span className="text-xs text-gray-500 whitespace-nowrap">手がかり {clueCount(r.id)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="過去の出来事">
          {truth.pastEvents.length ? <Timeline events={truth.pastEvents} /> : <Empty>なし</Empty>}
        </Card>
        <Card title="タイムライン（PCが介入しなかった場合）">
          {truth.countdown.length ? <Timeline events={truth.countdown} /> : <Empty>なし</Empty>}
        </Card>
      </div>
    </div>
  )
}

function Timeline({ events }: { events: { time: string; event: string }[] }) {
  return (
    <ol className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-3">
      {events.map((e, i) => (
        <li key={i} className="text-sm">
          <div className="text-xs font-medium text-purple-600 dark:text-purple-300">{e.time}</div>
          <div className="text-gray-800 dark:text-gray-200">{e.event}</div>
        </li>
      ))}
    </ol>
  )
}

const ATTITUDE_STYLES = {
  friendly: { label: '友好的', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' },
  neutral: { label: '中立', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  hostile: { label: '敵対的', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' }
}

export function NPCSection({ scenario }: SectionProps) {
  if (scenario.npcs.length === 0) return <Empty />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {scenario.npcs.map(npc => (
        <Card
          key={npc.id}
          title={
            <div className="flex items-center gap-2">
              <span>{npc.name}</span>
              <span className="text-sm font-normal text-gray-500">{npc.role}</span>
              <Badge className={cn('ml-auto', ATTITUDE_STYLES[npc.attitude].className)}>
                {ATTITUDE_STYLES[npc.attitude].label}
              </Badge>
            </div>
          }
        >
          <Field label="外見・立場">{npc.description}</Field>
          <Field label="性格・口調">{npc.personality}</Field>
          <Field label="動機">{npc.motivation}</Field>
          <Field label="秘密">{npc.secret}</Field>
          <Field label="データ">{npc.stats}</Field>
          {npc.dialogueExamples.length > 0 && (
            <Field label="台詞例">
              {npc.dialogueExamples.map((d, i) => <div key={i}>「{d.replace(/^「|」$/g, '')}」</div>)}
            </Field>
          )}
        </Card>
      ))}
    </div>
  )
}

export function CluesSection({ scenario }: SectionProps) {
  const revelationFact = new Map((scenario.truth?.keyRevelations ?? []).map(r => [r.id, r.fact]))
  const npcName = new Map(scenario.npcs.map(n => [n.id, n.name]))

  if (scenario.locations.length === 0 && scenario.clues.length === 0) return <Empty />

  return (
    <div className="space-y-6">
      {scenario.locations.map(location => {
        const clues = scenario.clues.filter(c => c.locationId === location.id)
        return (
          <Card key={location.id} title={location.name}>
            <Field label="描写">{location.description}</Field>
            <Field label="雰囲気">{location.atmosphere}</Field>
            {location.features.length > 0 && (
              <Field label="調べられるもの">{location.features.map(f => `・${f}`).join('\n')}</Field>
            )}
            {clues.length > 0 && (
              <div className="mt-4 space-y-2">
                {clues.map(clue => <ClueRow key={clue.id} clue={clue} fact={revelationFact.get(clue.revelationId)} npc={clue.npcId && npcName.get(clue.npcId)} />)}
              </div>
            )}
          </Card>
        )
      })}

      {(() => {
        const locationIds = new Set(scenario.locations.map(l => l.id))
        const others = scenario.clues.filter(c => !c.locationId || !locationIds.has(c.locationId))
        if (others.length === 0) return null
        return (
          <Card title="人物・その他から得られる手がかり">
            <div className="space-y-2">
              {others.map(clue => <ClueRow key={clue.id} clue={clue} fact={revelationFact.get(clue.revelationId)} npc={clue.npcId && npcName.get(clue.npcId)} />)}
            </div>
          </Card>
        )
      })()}
    </div>
  )
}

function ClueRow({
  clue,
  fact,
  npc
}: {
  clue: TRPGScenario['clues'][number]
  fact?: string
  npc?: string | false
}) {
  return (
    <details className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
      <summary className="cursor-pointer text-sm">
        <span className="font-medium text-gray-900 dark:text-white">{clue.title}</span>
        <span className="ml-2 text-xs text-gray-500">
          {[clue.discovery.skill, clue.discovery.difficulty].filter(Boolean).join(' ')}
          {npc ? ` / ${npc}` : ''}
        </span>
      </summary>
      <div className="mt-2 text-sm space-y-1">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{clue.description}</p>
        {fact && <p className="text-xs text-purple-600 dark:text-purple-300">→ 判明する情報: {fact}</p>}
        {clue.discovery.notes && <p className="text-xs text-gray-500">補足: {clue.discovery.notes}</p>}
        {clue.handout && (
          <blockquote className="mt-2 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm whitespace-pre-wrap">
            {clue.handout}
          </blockquote>
        )}
      </div>
    </details>
  )
}

export function ScenesSection({ scenario }: SectionProps) {
  const system = getGameSystem(scenario.request.systemId)
  const locationName = new Map(scenario.locations.map(l => [l.id, l.name]))
  const npcName = new Map(scenario.npcs.map(n => [n.id, n.name]))
  const clueTitle = new Map(scenario.clues.map(c => [c.id, c.title]))
  const sceneIndex = new Map(scenario.scenes.map((s, i) => [s.id, i + 1]))

  if (scenario.scenes.length === 0) return <Empty />

  return (
    <div className="space-y-4">
      {scenario.scenes.map((scene, i) => (
        <Card
          key={scene.id}
          title={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400">#{i + 1}</span>
              <span>{scene.title}</span>
              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                {SCENE_TYPE_LABELS[scene.type]}
              </Badge>
              {scene.locationId && (
                <span className="text-sm font-normal text-gray-500">@ {locationName.get(scene.locationId) ?? scene.locationId}</span>
              )}
            </div>
          }
        >
          {scene.readAloud && (
            <blockquote className="mb-3 border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm italic text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {scene.readAloud}
            </blockquote>
          )}
          <Field label={`${system.gmTitle}メモ`}>{scene.gmNotes}</Field>
          {scene.objectives.length > 0 && <Field label="目的">{scene.objectives.map(o => `・${o}`).join('\n')}</Field>}

          {scene.checks.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">判定</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-1 pr-3">技能・難易度</th>
                      <th className="py-1 pr-3">成功</th>
                      <th className="py-1">失敗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scene.checks.map((check, j) => (
                      <tr key={j} className="border-t border-gray-100 dark:border-gray-700 align-top">
                        <td className="py-1 pr-3 whitespace-nowrap font-medium">{check.skill} {check.difficulty}</td>
                        <td className="py-1 pr-3">{check.success}</td>
                        <td className="py-1">{check.failure}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {scene.encounter && (
            <div className="mb-3 rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2">
              <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">戦闘</div>
              {scene.encounter.enemies.map((enemy, j) => (
                <div key={j} className="text-sm mb-2 last:mb-0">
                  <div className="font-medium">{enemy.name} ×{enemy.count}</div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{enemy.stats}</div>
                  {enemy.tactics && <div className="text-xs text-gray-600 dark:text-gray-400">戦術: {enemy.tactics}</div>}
                </div>
              ))}
              {scene.encounter.notes && <p className="text-xs text-gray-600 dark:text-gray-400">{scene.encounter.notes}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
            {scene.clueIds.length > 0 && <span>手がかり: {scene.clueIds.map(id => clueTitle.get(id) ?? id).join('、')}</span>}
            {scene.npcIds.length > 0 && <span>NPC: {scene.npcIds.map(id => npcName.get(id) ?? id).join('、')}</span>}
            {scene.nextSceneIds.length > 0 && (
              <span>次: {scene.nextSceneIds.map(id => (sceneIndex.has(id) ? `#${sceneIndex.get(id)}` : id)).join(' / ')}</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

export function EndingsSection({ scenario }: SectionProps) {
  const system = getGameSystem(scenario.request.systemId)
  const guide = scenario.gmGuide
  if (scenario.endings.length === 0 && !guide) return <Empty />

  return (
    <div className="space-y-4">
      {scenario.endings.map(ending => (
        <Card key={ending.id} title={ending.title}>
          <Field label="到達条件">{ending.condition}</Field>
          <Field label="結末">{ending.description}</Field>
          <Field label="報酬">{ending.rewards}</Field>
        </Card>
      ))}
      {guide && (
        <Card title={`${system.gmTitle}向けガイド`}>
          <Field label="時間配分">{guide.pacing}</Field>
          {guide.tips.length > 0 && <Field label="進行のコツ">{guide.tips.map(t => `・${t}`).join('\n')}</Field>}
          {guide.rescueMeasures.length > 0 && (
            <Field label="救済策">{guide.rescueMeasures.map(t => `・${t}`).join('\n')}</Field>
          )}
          <Field label="注意事項">{guide.safetyNotes}</Field>
        </Card>
      )}
    </div>
  )
}

const SEVERITY_STYLES: Record<ScenarioIssueSeverity, { label: string; className: string }> = {
  error: { label: 'エラー', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' },
  warning: { label: '警告', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' },
  info: { label: '情報', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
}

interface ValidationSectionProps extends SectionProps {
  onReinforce?: () => void
  isReinforcing?: boolean
  onReview?: () => void
  isReviewing?: boolean
  disabled?: boolean
}

const CONTENT_CATEGORY_LABELS: Record<ContentIssueCategory, string> = {
  contradiction: '矛盾',
  timeline: '時系列',
  npc: 'NPC',
  rules: 'ルール',
  safety: 'NG要素',
  balance: 'バランス',
  other: 'その他'
}

function ContentReviewCard({ scenario, onReview, isReviewing, disabled }: ValidationSectionProps) {
  const review = scenario.review
  const names = new Map<string, string>([
    ...(scenario.truth?.keyRevelations ?? []).map(r => [r.id, r.fact] as [string, string]),
    ...scenario.npcs.map(n => [n.id, n.name] as [string, string]),
    ...scenario.locations.map(l => [l.id, l.name] as [string, string]),
    ...scenario.clues.map(c => [c.id, c.title] as [string, string]),
    ...scenario.scenes.map(s => [s.id, s.title] as [string, string]),
    ...scenario.endings.map(e => [e.id, e.title] as [string, string])
  ])
  // チェック後に編集や再生成で内容が変わっているか
  const outdated = review && scenario.validation && scenario.validation.checkedAt.getTime() > review.reviewedAt.getTime()

  return (
    <Card
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>AIによる内容チェック</span>
          {review && (
            <span className="text-xs font-normal text-gray-500">
              {formatDate(review.reviewedAt)}（{review.model}）
            </span>
          )}
          {onReview && (
            <button
              type="button"
              className="ml-auto rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm font-normal hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              onClick={onReview}
              disabled={disabled}
            >
              {isReviewing ? 'チェック中…' : review ? '再チェック' : 'AIで内容をチェック'}
            </button>
          )}
        </div>
      }
    >
      {!review ? (
        <Empty>真相と手がかりの食い違い、時系列、NPCの言動、ルールの書き方などをAIが確認します。</Empty>
      ) : (
        <div className="space-y-3">
          {outdated && (
            <p className="text-xs text-amber-700 dark:text-amber-300">このチェックの後にシナリオが変更されています。再チェックをおすすめします。</p>
          )}
          {review.summary && <p className="text-sm text-gray-700 dark:text-gray-300">{review.summary}</p>}
          {review.issues.length === 0 ? (
            <Empty>内容の問題は見つかりませんでした。</Empty>
          ) : (
            <ul className="space-y-3">
              {review.issues.map((issue, i) => (
                <li key={i} className="text-sm">
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge className={SEVERITY_STYLES[issue.severity].className}>{SEVERITY_STYLES[issue.severity].label}</Badge>
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                      {CONTENT_CATEGORY_LABELS[issue.category]}
                    </Badge>
                    <span className="flex-1 text-gray-800 dark:text-gray-200">{issue.message}</span>
                  </div>
                  {issue.targetIds.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">対象: {issue.targetIds.map(id => names.get(id) ?? id).join('、')}</p>
                  )}
                  {issue.suggestion && <p className="mt-1 text-xs text-green-700 dark:text-green-300">直し方: {issue.suggestion}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

export function ValidationSection(props: ValidationSectionProps) {
  const { scenario, onReinforce, isReinforcing, disabled } = props
  const report = scenario.validation
  if (!report) return <Empty>検証はまだ実行されていません。</Empty>

  const scoreColor = report.score >= 80 ? 'text-green-600' : report.score >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-6">
          <div className={cn('text-4xl font-bold', scoreColor)}>{report.score}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>シナリオ構造の検証スコア（100点満点）</p>
            <p className="text-xs text-gray-500 mt-1">
              重要情報ごとの手がかり数（3つ以上推奨）、ID参照の整合性、シーン遷移、エンディング、時間配分をチェックしています。
            </p>
          </div>
        </div>
      </Card>
      {report.needsRepair && onReinforce && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 px-4 py-3">
          <p className="flex-grow text-sm text-amber-800 dark:text-amber-200">
            手がかりが足りない重要情報が{report.revelationsNeedingClues.length}件あります。AIに別ルートの手がかりを追加させられます。
          </p>
          <button
            type="button"
            className="shrink-0 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            onClick={onReinforce}
            disabled={disabled}
          >
            {isReinforcing ? '補強中…' : 'AIで手がかりを補強'}
          </button>
        </div>
      )}
      <Card title={`構造の検証（${report.issues.length}件）`}>
        {report.issues.length === 0 ? (
          <Empty>問題は見つかりませんでした。</Empty>
        ) : (
          <ul className="space-y-2">
            {report.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge className={SEVERITY_STYLES[issue.severity].className}>{SEVERITY_STYLES[issue.severity].label}</Badge>
                <span className="text-gray-800 dark:text-gray-200">{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ContentReviewCard {...props} />
    </div>
  )
}
