import { DIFFICULTY_LABELS, getGameSystem } from '@/data/game-systems'
import { SceneType, TRPGScenario } from '@/lib/types'

export const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  intro: '導入',
  investigation: '探索',
  social: '交流',
  combat: '戦闘',
  climax: 'クライマックス',
  ending: 'エンディング',
  other: 'その他'
}

/**
 * シナリオをそのまま配布・印刷できるMarkdownに変換する。
 * 前半がPL向け（公開情報）、後半がGM向け（ネタバレ）になるよう構成する。
 */
export class ScenarioExporter {
  static toMarkdown(scenario: TRPGScenario): string {
    const system = getGameSystem(scenario.request.systemId)
    const gm = system.gmTitle
    const title = scenario.overview?.title || scenario.request.workingTitle || '無題のシナリオ'

    const npcName = new Map(scenario.npcs.map(n => [n.id, n.name]))
    const locationName = new Map(scenario.locations.map(l => [l.id, l.name]))
    const sceneTitle = new Map(scenario.scenes.map(s => [s.id, s.title]))
    const clueTitle = new Map(scenario.clues.map(c => [c.id, c.title]))
    const revelationFact = new Map((scenario.truth?.keyRevelations ?? []).map(r => [r.id, r.fact]))
    const names = (ids: string[], map: Map<string, string>) => ids.map(id => map.get(id) ?? id).join('、')

    const out: string[] = []
    const push = (...lines: string[]) => out.push(...lines)

    push(`# ${title}`, '')
    if (scenario.overview?.tagline) push(`> ${scenario.overview.tagline}`, '')

    push(
      '| 項目 | 内容 |',
      '| --- | --- |',
      `| システム | ${system.name} |`,
      `| ジャンル | ${scenario.request.genre} |`,
      `| プレイ人数 | ${scenario.overview?.recommendedPlayers || `${scenario.request.playerCount}人`} |`,
      `| プレイ時間 | ${scenario.overview?.estimatedPlayTime || `${scenario.request.sessionHours}時間`} |`,
      `| 難易度 | ${DIFFICULTY_LABELS[scenario.request.difficulty]} |`,
      ''
    )
    if (scenario.overview?.recommendedSkills.length) {
      push(`**推奨技能:** ${scenario.overview.recommendedSkills.join('、')}`, '')
    }

    push('## PL向け情報', '')
    if (scenario.overview?.playerSynopsis) push('### あらすじ', '', scenario.overview.playerSynopsis, '')
    if (scenario.overview?.hook) push('### 導入', '', scenario.overview.hook, '')

    push('---', '', `## ${gm}向け情報（ここから先はネタバレを含みます）`, '')

    if (scenario.truth) {
      const t = scenario.truth
      push('### 真相', '', t.summary, '')
      if (t.backstory) push('#### 経緯', '', t.backstory, '')
      if (t.antagonist) push(`**黒幕:** ${t.antagonist}`, '')
      if (t.antagonistGoal) push(`**目的:** ${t.antagonistGoal}`, '')
      if (t.pastEvents.length) {
        push('#### 過去の出来事', '')
        t.pastEvents.forEach(e => push(`- **${e.time}** ${e.event}`))
        push('')
      }
      if (t.countdown.length) {
        push('#### タイムライン（PCが介入しなかった場合）', '')
        t.countdown.forEach(e => push(`- **${e.time}** ${e.event}`))
        push('')
      }
      if (t.keyRevelations.length) {
        push('#### PLが到達すべき情報', '')
        t.keyRevelations.forEach(r => push(`- ${r.importance === 'critical' ? '【重要】' : '【任意】'}${r.fact}`))
        push('')
      }
    }

    if (scenario.npcs.length) {
      push('### NPC', '')
      for (const npc of scenario.npcs) {
        push(`#### ${npc.name}（${npc.role}）`, '')
        if (npc.description) push(npc.description, '')
        if (npc.personality) push(`- **性格:** ${npc.personality}`)
        if (npc.motivation) push(`- **動機:** ${npc.motivation}`)
        if (npc.secret) push(`- **秘密:** ${npc.secret}`)
        if (npc.stats) push(`- **データ:** ${npc.stats}`)
        npc.dialogueExamples.forEach(d => push(`- 「${d.replace(/^「|」$/g, '')}」`))
        push('')
      }
    }

    if (scenario.locations.length) {
      push('### 場所', '')
      for (const loc of scenario.locations) {
        push(`#### ${loc.name}`, '', loc.description, '')
        if (loc.atmosphere) push(`*${loc.atmosphere}*`, '')
        loc.features.forEach(f => push(`- ${f}`))
        if (loc.features.length) push('')
      }
    }

    if (scenario.clues.length) {
      push(
        '### 手がかり一覧', '',
        '| 手がかり | 判明する情報 | 入手場所 | 判定 |',
        '| --- | --- | --- | --- |'
      )
      for (const clue of scenario.clues) {
        const where = [clue.locationId && locationName.get(clue.locationId), clue.npcId && npcName.get(clue.npcId)]
          .filter(Boolean).join(' / ')
        const check = [clue.discovery.skill, clue.discovery.difficulty].filter(Boolean).join(' ')
        push(`| ${cell(clue.title)} | ${cell(revelationFact.get(clue.revelationId) ?? clue.description)} | ${cell(where)} | ${cell(check)} |`)
      }
      push('')

      const handouts = scenario.clues.filter(c => c.handout)
      if (handouts.length) {
        push('### ハンドアウト', '')
        handouts.forEach(c => push(`#### ${c.title}`, '', ...c.handout!.split('\n').map(l => `> ${l}`), ''))
      }
    }

    if (scenario.scenes.length) {
      push('### シーン', '')
      scenario.scenes.forEach((scene, i) => {
        push(`#### シーン${i + 1}: ${scene.title}（${SCENE_TYPE_LABELS[scene.type]}）`, '')
        if (scene.locationId) push(`**場所:** ${locationName.get(scene.locationId) ?? scene.locationId}`, '')
        if (scene.readAloud) push('**描写（読み上げ）**', '', ...scene.readAloud.split('\n').map(l => `> ${l}`), '')
        if (scene.gmNotes) push(`**${gm}メモ:** ${scene.gmNotes}`, '')
        if (scene.objectives.length) push(`**目的:** ${scene.objectives.join(' / ')}`, '')
        if (scene.checks.length) {
          push('**判定**', '')
          scene.checks.forEach(c => push(`- **${c.skill}** ${c.difficulty}`, `  - 成功: ${c.success}`, `  - 失敗: ${c.failure}`))
          push('')
        }
        if (scene.encounter) {
          push('**戦闘**', '')
          scene.encounter.enemies.forEach(e =>
            push(`- **${e.name}** ×${e.count}`, `  - データ: ${e.stats}`, `  - 戦術: ${e.tactics}`)
          )
          if (scene.encounter.notes) push(`- ${scene.encounter.notes}`)
          push('')
        }
        if (scene.clueIds.length) push(`**入手できる手がかり:** ${names(scene.clueIds, clueTitle)}`, '')
        if (scene.npcIds.length) push(`**登場NPC:** ${names(scene.npcIds, npcName)}`, '')
        if (scene.nextSceneIds.length) push(`**次のシーン:** ${names(scene.nextSceneIds, sceneTitle)}`, '')
      })
    }

    if (scenario.endings.length) {
      push('### エンディング', '')
      for (const ending of scenario.endings) {
        push(`#### ${ending.title}`, '', `**条件:** ${ending.condition}`, '', ending.description, '')
        if (ending.rewards) push(`**報酬:** ${ending.rewards}`, '')
      }
    }

    if (scenario.gmGuide) {
      const g = scenario.gmGuide
      push(`### ${gm}向けガイド`, '')
      if (g.pacing) push(`**時間配分:** ${g.pacing}`, '')
      if (g.tips.length) {
        push('**進行のコツ**', '')
        g.tips.forEach(t => push(`- ${t}`))
        push('')
      }
      if (g.rescueMeasures.length) {
        push('**救済策**', '')
        g.rescueMeasures.forEach(t => push(`- ${t}`))
        push('')
      }
      if (g.safetyNotes) push(`**注意事項:** ${g.safetyNotes}`, '')
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
  }
}

function cell(text: string): string {
  return text.replace(/\|/g, '｜').replace(/\n/g, ' ')
}
