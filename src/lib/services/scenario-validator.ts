import { recommendedSceneRange } from '@/data/game-systems'
import { ScenarioIssue, ScenarioValidationReport, TRPGScenario } from '@/lib/types'

// 重要情報1つにつき用意すべき手がかり数（いわゆる「3つの手がかりの法則」）
export const MIN_CLUES_PER_CRITICAL_REVELATION = 3

export type ValidatableScenario = Pick<
  TRPGScenario,
  'request' | 'truth' | 'npcs' | 'locations' | 'clues' | 'scenes' | 'endings'
>

/**
 * シナリオの構造をAIを使わずに検証する。
 * - 重要情報ごとの手がかりの冗長性
 * - ID参照の整合性
 * - シーン遷移（到達可能性・行き止まり）
 * - エンディングの有無、セッション時間とのバランス
 */
export class ScenarioValidator {
  static validate(scenario: ValidatableScenario): ScenarioValidationReport {
    const issues: ScenarioIssue[] = []

    const revelationsNeedingClues = this.checkClueCoverage(scenario, issues)
    this.checkReferences(scenario, issues)
    this.checkSceneFlow(scenario, issues)
    this.checkEndings(scenario, issues)
    this.checkBalance(scenario, issues)

    return {
      score: this.calculateScore(issues),
      issues,
      revelationsNeedingClues,
      needsRepair: revelationsNeedingClues.length > 0,
      checkedAt: new Date()
    }
  }

  /**
   * PLが実際に手にできる手がかりのID。
   * シーンに配置されている、またはシーンの場所・NPCに紐づいている手がかりを数える。
   * シーンが未作成の段階ではすべての手がかりを対象にする。
   */
  static getAccessibleClueIds(scenario: ValidatableScenario): Set<string> {
    const { clues, scenes } = scenario
    if (scenes.length === 0) return new Set(clues.map(c => c.id))

    const sceneClueIds = new Set(scenes.flatMap(s => s.clueIds))
    const sceneLocationIds = new Set(scenes.map(s => s.locationId).filter(Boolean) as string[])
    const sceneNpcIds = new Set(scenes.flatMap(s => s.npcIds))

    return new Set(
      clues
        .filter(c =>
          sceneClueIds.has(c.id) ||
          (c.locationId && sceneLocationIds.has(c.locationId)) ||
          (c.npcId && sceneNpcIds.has(c.npcId))
        )
        .map(c => c.id)
    )
  }

  private static checkClueCoverage(scenario: ValidatableScenario, issues: ScenarioIssue[]): string[] {
    const revelations = scenario.truth?.keyRevelations ?? []
    const accessible = this.getAccessibleClueIds(scenario)
    const needingClues: string[] = []

    for (const revelation of revelations) {
      const related = scenario.clues.filter(c => c.revelationId === revelation.id)
      const accessibleCount = related.filter(c => accessible.has(c.id)).length

      if (revelation.importance === 'critical') {
        if (accessibleCount < MIN_CLUES_PER_CRITICAL_REVELATION) {
          needingClues.push(revelation.id)
          issues.push({
            severity: accessibleCount <= 1 ? 'error' : 'warning',
            category: 'clue-coverage',
            targetId: revelation.id,
            message: `重要情報「${truncate(revelation.fact)}」に到達できる手がかりが${accessibleCount}個しかありません（推奨: ${MIN_CLUES_PER_CRITICAL_REVELATION}個以上）。判定失敗で詰まる恐れがあります。`
          })
        }
      } else if (accessibleCount === 0) {
        issues.push({
          severity: 'info',
          category: 'clue-coverage',
          targetId: revelation.id,
          message: `任意情報「${truncate(revelation.fact)}」に対応する手がかりがありません。`
        })
      }
    }

    // シーンから辿れない手がかり
    if (scenario.scenes.length > 0) {
      for (const clue of scenario.clues) {
        if (!accessible.has(clue.id)) {
          issues.push({
            severity: 'warning',
            category: 'clue-coverage',
            targetId: clue.id,
            message: `手がかり「${clue.title}」はどのシーンにも配置されていないため、PLが入手できません。`
          })
        }
      }
    }

    return needingClues
  }

  private static checkReferences(scenario: ValidatableScenario, issues: ScenarioIssue[]): void {
    const revelationIds = new Set((scenario.truth?.keyRevelations ?? []).map(r => r.id))
    const npcIds = new Set(scenario.npcs.map(n => n.id))
    const locationIds = new Set(scenario.locations.map(l => l.id))
    const clueIds = new Set(scenario.clues.map(c => c.id))
    const sceneIds = new Set(scenario.scenes.map(s => s.id))

    const report = (targetId: string, message: string) =>
      issues.push({ severity: 'warning', category: 'reference', targetId, message })

    for (const clue of scenario.clues) {
      if (!revelationIds.has(clue.revelationId)) {
        report(clue.id, `手がかり「${clue.title}」が存在しない重要情報（${clue.revelationId || '未指定'}）を参照しています。`)
      }
      if (clue.locationId && !locationIds.has(clue.locationId)) {
        report(clue.id, `手がかり「${clue.title}」が存在しない場所（${clue.locationId}）を参照しています。`)
      }
      if (clue.npcId && !npcIds.has(clue.npcId)) {
        report(clue.id, `手がかり「${clue.title}」が存在しないNPC（${clue.npcId}）を参照しています。`)
      }
    }

    for (const scene of scenario.scenes) {
      if (scene.locationId && !locationIds.has(scene.locationId)) {
        report(scene.id, `シーン「${scene.title}」が存在しない場所（${scene.locationId}）を参照しています。`)
      }
      for (const id of scene.npcIds) {
        if (!npcIds.has(id)) report(scene.id, `シーン「${scene.title}」が存在しないNPC（${id}）を参照しています。`)
      }
      for (const id of scene.clueIds) {
        if (!clueIds.has(id)) report(scene.id, `シーン「${scene.title}」が存在しない手がかり（${id}）を参照しています。`)
      }
      for (const id of scene.nextSceneIds) {
        if (!sceneIds.has(id)) report(scene.id, `シーン「${scene.title}」の遷移先（${id}）が存在しません。`)
      }
    }
  }

  private static checkSceneFlow(scenario: ValidatableScenario, issues: ScenarioIssue[]): void {
    const { scenes } = scenario
    if (scenes.length === 0) {
      issues.push({ severity: 'error', category: 'scene-flow', message: 'シーンが1つもありません。' })
      return
    }

    const byId = new Map(scenes.map(s => [s.id, s]))
    const start = scenes.find(s => s.type === 'intro') ?? scenes[0]

    const reachable = new Set<string>()
    const queue = [start.id]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (reachable.has(id)) continue
      reachable.add(id)
      for (const next of byId.get(id)?.nextSceneIds ?? []) {
        if (byId.has(next) && !reachable.has(next)) queue.push(next)
      }
    }

    for (const scene of scenes) {
      if (!reachable.has(scene.id)) {
        issues.push({
          severity: 'warning',
          category: 'scene-flow',
          targetId: scene.id,
          message: `シーン「${scene.title}」は導入シーンから到達できません。`
        })
      }

      const isTerminal = scene.type === 'ending' || scene.type === 'climax'
      if (!isTerminal && scene.nextSceneIds.filter(id => byId.has(id)).length === 0) {
        issues.push({
          severity: 'warning',
          category: 'scene-flow',
          targetId: scene.id,
          message: `シーン「${scene.title}」から次に進むシーンが設定されていません（行き止まり）。`
        })
      }

      if (scene.type === 'combat' && (!scene.encounter || scene.encounter.enemies.length === 0)) {
        issues.push({
          severity: 'warning',
          category: 'balance',
          targetId: scene.id,
          message: `戦闘シーン「${scene.title}」に敵データがありません。`
        })
      }
    }

    if (!scenes.some(s => s.type === 'climax')) {
      issues.push({
        severity: 'warning',
        category: 'scene-flow',
        message: 'クライマックスシーンがありません。'
      })
    }
  }

  private static checkEndings(scenario: ValidatableScenario, issues: ScenarioIssue[]): void {
    if (scenario.endings.length === 0) {
      issues.push({ severity: 'error', category: 'ending', message: 'エンディングが設定されていません。' })
    } else if (scenario.endings.length === 1) {
      issues.push({
        severity: 'info',
        category: 'ending',
        message: 'エンディングが1種類のみです。PLの選択が結末に反映されるよう、複数の結末を用意すると満足度が上がります。'
      })
    }
  }

  private static checkBalance(scenario: ValidatableScenario, issues: ScenarioIssue[]): void {
    const count = scenario.scenes.length
    if (count === 0) return

    const { min, max } = recommendedSceneRange(scenario.request.sessionHours)
    if (count < min) {
      issues.push({
        severity: 'info',
        category: 'balance',
        message: `想定プレイ時間${scenario.request.sessionHours}時間に対してシーン数（${count}）が少なめです（目安: ${min}〜${max}）。`
      })
    } else if (count > max) {
      issues.push({
        severity: 'info',
        category: 'balance',
        message: `想定プレイ時間${scenario.request.sessionHours}時間に対してシーン数（${count}）が多めです（目安: ${min}〜${max}）。時間内に収まるか確認してください。`
      })
    }
  }

  private static calculateScore(issues: ScenarioIssue[]): number {
    const penalty = issues.reduce((sum, issue) => {
      switch (issue.severity) {
        case 'error': return sum + 15
        case 'warning': return sum + 5
        default: return sum + 1
      }
    }, 0)
    return Math.max(0, 100 - penalty)
  }
}

function truncate(text: string, max = 30): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
