import { ReactNode } from 'react'
import { DIFFICULTY_LABELS, getGameSystem } from '@/data/game-systems'
import { SCENE_TYPE_LABELS } from '@/lib/services/scenario-exporter'
import { TRPGScenario } from '@/lib/types'

// 印刷用のレイアウト。画面のカード表示とは別に、紙面で読みやすい文書として組む

export type PrintMode = 'gm' | 'player' | 'handouts' | 'pcs'

export const PRINT_MODES: { id: PrintMode; label: string; description: string }[] = [
  { id: 'gm', label: 'GM用（全体）', description: '真相・NPC・シーンなどを含むシナリオ全文' },
  { id: 'player', label: 'PL向け資料', description: 'あらすじ・導入・推奨技能・サンプルキャラクター（ネタバレなし）' },
  { id: 'handouts', label: 'ハンドアウト', description: '手がかりのハンドアウトを1枚ずつ' },
  { id: 'pcs', label: 'キャラクター', description: 'サンプルキャラクターを1人1枚ずつ' }
]

function H2({ children, pageBreak }: { children: ReactNode; pageBreak?: boolean }) {
  return (
    <h2 className={`mt-8 mb-3 border-b-2 border-gray-800 pb-1 text-xl font-bold ${pageBreak ? 'print:break-before-page' : ''}`}>
      {children}
    </h2>
  )
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-5 mb-2 text-base font-bold break-after-avoid">{children}</h3>
}

function Para({ label, children }: { label?: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed">
      {label && <span className="font-bold">{label}：</span>}
      {children}
    </p>
  )
}

function Block({ children }: { children: ReactNode }) {
  return <div className="break-inside-avoid">{children}</div>
}

function Header({ scenario, subtitle }: { scenario: TRPGScenario; subtitle: string }) {
  const system = getGameSystem(scenario.request.systemId)
  return (
    <header className="mb-6">
      <p className="text-xs text-gray-600">{system.name} / {subtitle}</p>
      <h1 className="mt-1 text-3xl font-bold">{scenario.overview?.title ?? '無題のシナリオ'}</h1>
      {scenario.overview?.tagline && <p className="mt-1 text-sm italic text-gray-700">{scenario.overview.tagline}</p>}
      <table className="mt-4 w-full border-collapse text-sm">
        <tbody>
          {[
            ['プレイ人数', scenario.overview?.recommendedPlayers || `${scenario.request.playerCount}人`],
            ['プレイ時間', scenario.overview?.estimatedPlayTime || `${scenario.request.sessionHours}時間`],
            ['難易度', DIFFICULTY_LABELS[scenario.request.difficulty]],
            ['推奨技能', scenario.overview?.recommendedSkills.join('、') ?? '']
          ].map(([label, value]) => (
            <tr key={label}>
              <th className="w-28 border border-gray-400 bg-gray-100 px-2 py-1 text-left font-bold">{label}</th>
              <td className="border border-gray-400 px-2 py-1">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </header>
  )
}

function PregenSheet({ pc }: { pc: NonNullable<TRPGScenario['pregens']>[number] }) {
  return (
    <Block>
      <H3>{pc.name}{pc.concept && `（${pc.concept}）`}</H3>
      <Para label="経歴">{pc.background}</Para>
      <Para label="事件に関わる理由">{pc.hook}</Para>
      <Para label="個人的な目的">{pc.personalGoal}</Para>
      <Para label="データ">{pc.stats}</Para>
      <Para label="技能">{pc.skills.join('、')}</Para>
      <Para label="所持品">{pc.equipment.join('、')}</Para>
      <Para label="演じ方のヒント">{pc.roleplayTips}</Para>
    </Block>
  )
}

export function PlayerDocument({ scenario }: { scenario: TRPGScenario }) {
  return (
    <article>
      <Header scenario={scenario} subtitle="PL向け資料" />
      <H2>あらすじ</H2>
      <Para>{scenario.overview?.playerSynopsis}</Para>
      <H2>導入</H2>
      <Para>{scenario.overview?.hook}</Para>
      {!!scenario.pregens?.length && (
        <>
          <H2>サンプルキャラクター</H2>
          {scenario.pregens.map(pc => <PregenSheet key={pc.id} pc={pc} />)}
        </>
      )}
    </article>
  )
}

export function GMDocument({ scenario }: { scenario: TRPGScenario }) {
  const system = getGameSystem(scenario.request.systemId)
  const npcName = new Map(scenario.npcs.map(n => [n.id, n.name]))
  const locationName = new Map(scenario.locations.map(l => [l.id, l.name]))
  const clueTitle = new Map(scenario.clues.map(c => [c.id, c.title]))
  const sceneIndex = new Map(scenario.scenes.map((s, i) => [s.id, i + 1]))
  const fact = new Map((scenario.truth?.keyRevelations ?? []).map(r => [r.id, r.fact]))
  const t = scenario.truth

  return (
    <article>
      <Header scenario={scenario} subtitle={`${system.gmTitle}用シナリオ`} />

      <H2>PL向け情報</H2>
      <H3>あらすじ</H3>
      <Para>{scenario.overview?.playerSynopsis}</Para>
      <H3>導入</H3>
      <Para>{scenario.overview?.hook}</Para>

      {t && (
        <>
          <H2 pageBreak>真相（{system.gmTitle}のみ）</H2>
          <Para>{t.summary}</Para>
          <Para label="経緯">{t.backstory}</Para>
          <Para label="黒幕・脅威">{t.antagonist}</Para>
          <Para label="目的">{t.antagonistGoal}</Para>
          <H3>PLが到達すべき情報</H3>
          <ul className="mb-2 list-disc pl-6 text-sm">
            {t.keyRevelations.map(r => <li key={r.id}>{r.importance === 'critical' ? '【重要】' : '【任意】'}{r.fact}</li>)}
          </ul>
          {t.countdown.length > 0 && (
            <>
              <H3>タイムライン（PCが介入しなかった場合）</H3>
              <ul className="mb-2 list-disc pl-6 text-sm">
                {t.countdown.map((e, i) => <li key={i}><span className="font-bold">{e.time}</span> {e.event}</li>)}
              </ul>
            </>
          )}
        </>
      )}

      {scenario.npcs.length > 0 && (
        <>
          <H2 pageBreak>NPC</H2>
          {scenario.npcs.map(npc => (
            <Block key={npc.id}>
              <H3>{npc.name}（{npc.role}）</H3>
              <Para>{npc.description}</Para>
              <Para label="性格">{npc.personality}</Para>
              <Para label="動機">{npc.motivation}</Para>
              <Para label="秘密">{npc.secret}</Para>
              <Para label="データ">{npc.stats}</Para>
              <Para label="台詞例">{npc.dialogueExamples.map(d => `「${d.replace(/^「|」$/g, '')}」`).join(' ')}</Para>
            </Block>
          ))}
        </>
      )}

      {scenario.clues.length > 0 && (
        <>
          <H2 pageBreak>手がかり一覧</H2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                {['手がかり', '判明する情報', '入手場所', '判定'].map(h => (
                  <th key={h} className="border border-gray-400 px-2 py-1 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenario.clues.map(c => (
                <tr key={c.id} className="break-inside-avoid align-top">
                  <td className="border border-gray-400 px-2 py-1 font-bold">{c.title}</td>
                  <td className="border border-gray-400 px-2 py-1">{fact.get(c.revelationId) ?? c.description}</td>
                  <td className="border border-gray-400 px-2 py-1">
                    {[c.locationId && locationName.get(c.locationId), c.npcId && npcName.get(c.npcId)].filter(Boolean).join(' / ')}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">{[c.discovery.skill, c.discovery.difficulty].filter(Boolean).join(' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {scenario.scenes.length > 0 && (
        <>
          <H2 pageBreak>シーン</H2>
          {scenario.scenes.map((scene, i) => (
            <Block key={scene.id}>
              <H3>
                シーン{i + 1}：{scene.title}（{SCENE_TYPE_LABELS[scene.type]}）
                {scene.locationId && <span className="font-normal">　場所：{locationName.get(scene.locationId)}</span>}
              </H3>
              {scene.readAloud && (
                <blockquote className="mb-2 border-l-4 border-gray-500 pl-3 text-sm italic whitespace-pre-wrap">{scene.readAloud}</blockquote>
              )}
              <Para label={`${system.gmTitle}メモ`}>{scene.gmNotes}</Para>
              <Para label="目的">{scene.objectives.join(' / ')}</Para>
              {scene.checks.map((c, j) => (
                <Para key={j} label={`判定 ${c.skill} ${c.difficulty}`}>成功：{c.success}　失敗：{c.failure}</Para>
              ))}
              {scene.encounter?.enemies.map((e, j) => (
                <Para key={j} label={`戦闘 ${e.name}×${e.count}`}>{e.stats}　戦術：{e.tactics}</Para>
              ))}
              <Para label="手がかり">{scene.clueIds.map(id => clueTitle.get(id) ?? id).join('、')}</Para>
              <Para label="次のシーン">{scene.nextSceneIds.map(id => `#${sceneIndex.get(id) ?? id}`).join(' / ')}</Para>
            </Block>
          ))}
        </>
      )}

      {scenario.endings.length > 0 && (
        <>
          <H2 pageBreak>エンディング</H2>
          {scenario.endings.map(e => (
            <Block key={e.id}>
              <H3>{e.title}</H3>
              <Para label="条件">{e.condition}</Para>
              <Para>{e.description}</Para>
              <Para label="報酬">{e.rewards}</Para>
            </Block>
          ))}
        </>
      )}

      {scenario.gmGuide && (
        <>
          <H2>{system.gmTitle}向けガイド</H2>
          <Para label="時間配分">{scenario.gmGuide.pacing}</Para>
          <Para label="進行のコツ">{scenario.gmGuide.tips.join(' / ')}</Para>
          <Para label="救済策">{scenario.gmGuide.rescueMeasures.join(' / ')}</Para>
          <Para label="注意事項">{scenario.gmGuide.safetyNotes}</Para>
        </>
      )}
    </article>
  )
}

export function HandoutsDocument({ scenario }: { scenario: TRPGScenario }) {
  const handouts = scenario.clues.filter(c => c.handout)
  if (handouts.length === 0) return <p className="text-sm">このシナリオにはハンドアウトがありません。</p>

  return (
    <div>
      {handouts.map((clue, i) => (
        <section key={clue.id} className={`flex min-h-[80vh] flex-col ${i > 0 ? 'print:break-before-page' : ''} mb-12 print:mb-0`}>
          <p className="text-xs text-gray-600">{scenario.overview?.title} / ハンドアウト {i + 1}</p>
          <h2 className="mt-2 mb-6 text-2xl font-bold">{clue.title}</h2>
          <div className="flex-grow rounded border-2 border-gray-700 p-8 font-serif text-lg leading-loose whitespace-pre-wrap">
            {clue.handout}
          </div>
        </section>
      ))}
    </div>
  )
}

export function PregensDocument({ scenario }: { scenario: TRPGScenario }) {
  const pregens = scenario.pregens ?? []
  if (pregens.length === 0) return <p className="text-sm">サンプルキャラクターがありません。PCタブで作成できます。</p>

  return (
    <div>
      {pregens.map((pc, i) => (
        <section key={pc.id} className={`${i > 0 ? 'print:break-before-page' : ''} mb-12 print:mb-0`}>
          <p className="text-xs text-gray-600">{scenario.overview?.title} / キャラクターシート {i + 1}</p>
          <PregenSheet pc={pc} />
          <div className="mt-6 rounded border border-gray-400 p-3">
            <p className="text-xs font-bold text-gray-600">メモ</p>
            <div className="h-40" />
          </div>
        </section>
      ))}
    </div>
  )
}
