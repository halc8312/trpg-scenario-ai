import { TRPGScenario } from '@/lib/types'
import { ScenarioValidator } from './scenario-validator'
import { repairReferences } from './reference-repair'

const trimList = (list: string[] | undefined): string[] => (list ?? []).map(s => s.trim()).filter(Boolean)

/**
 * 手動編集した内容を保存できる形に整え、検証をやり直す。
 * 入力途中で残った空行や空白を取り除き、削除された要素への参照を外す。
 */
export function finalizeEdits(draft: TRPGScenario): Partial<TRPGScenario> {
  const cleaned: TRPGScenario = {
    ...draft,
    overview: draft.overview && { ...draft.overview, recommendedSkills: trimList(draft.overview.recommendedSkills) },
    npcs: draft.npcs.map(n => ({ ...n, dialogueExamples: trimList(n.dialogueExamples) })),
    locations: draft.locations.map(l => ({ ...l, features: trimList(l.features) })),
    clues: draft.clues.map(c => ({
      ...c,
      locationId: c.locationId || undefined,
      npcId: c.npcId || undefined,
      handout: c.handout?.trim() ? c.handout : undefined
    })),
    scenes: draft.scenes.map(s => ({ ...s, locationId: s.locationId || undefined, objectives: trimList(s.objectives) })),
    gmGuide: draft.gmGuide && {
      ...draft.gmGuide,
      tips: trimList(draft.gmGuide.tips),
      rescueMeasures: trimList(draft.gmGuide.rescueMeasures)
    }
  }
  const { scenario } = repairReferences(cleaned)

  return {
    overview: scenario.overview,
    truth: scenario.truth,
    npcs: scenario.npcs,
    locations: scenario.locations,
    clues: scenario.clues,
    scenes: scenario.scenes,
    endings: scenario.endings,
    gmGuide: scenario.gmGuide,
    validation: ScenarioValidator.validate(scenario)
  }
}
