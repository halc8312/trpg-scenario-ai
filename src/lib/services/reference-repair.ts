import { ScenarioSection, TRPGScenario } from '@/lib/types'

// セクションの再生成や手動編集で参照先のIDが変わったり消えたりしたときに、参照を張り直す

export type EntityKind = 'revelation' | 'npc' | 'location' | 'clue' | 'scene'

export interface ReferenceRepairReport {
  // 名前が一致したため新しいIDに付け替えた参照の数
  remapped: number
  // 参照先が存在しないため取り除いた参照の数
  removed: number
}

type Labeled = { id: string; label: string }

// セクションごとに作り直される要素の種類
export const SECTION_ENTITY_KINDS: Record<ScenarioSection, EntityKind[]> = {
  concept: ['revelation'],
  npcs: ['npc'],
  locationsAndClues: ['location', 'clue'],
  scenes: ['scene'],
  endings: [],
  pregens: []
}

function labelsOf(scenario: Pick<TRPGScenario, 'truth' | 'npcs' | 'locations' | 'clues' | 'scenes'>, kind: EntityKind): Labeled[] {
  switch (kind) {
    case 'revelation':
      return (scenario.truth?.keyRevelations ?? []).map(r => ({ id: r.id, label: r.fact }))
    case 'npc':
      return scenario.npcs.map(n => ({ id: n.id, label: n.name }))
    case 'location':
      return scenario.locations.map(l => ({ id: l.id, label: l.name }))
    case 'clue':
      return scenario.clues.map(c => ({ id: c.id, label: c.title }))
    case 'scene':
      return scenario.scenes.map(s => ({ id: s.id, label: s.title }))
  }
}

function normalizeLabel(label: string): string {
  return label.replace(/[\s　・「」『』()（）【】]/g, '').toLowerCase()
}

/**
 * 作り直し前後の要素を名前で対応付け、旧ID → 新IDの対応表を作る。
 * 名前が一致するものを優先し、次に同じIDが残っているものを同一とみなす。
 */
export function buildIdMap(before: Labeled[], after: Labeled[]): Map<string, string> {
  const map = new Map<string, string>()
  const taken = new Set<string>()
  const afterByLabel = new Map<string, string>()
  for (const item of after) {
    const key = normalizeLabel(item.label)
    if (key && !afterByLabel.has(key)) afterByLabel.set(key, item.id)
  }
  const afterIds = new Set(after.map(a => a.id))

  for (const item of before) {
    const byLabel = afterByLabel.get(normalizeLabel(item.label))
    if (byLabel && !taken.has(byLabel)) {
      map.set(item.id, byLabel)
      taken.add(byLabel)
    }
  }
  for (const item of before) {
    if (!map.has(item.id) && afterIds.has(item.id) && !taken.has(item.id)) {
      map.set(item.id, item.id)
      taken.add(item.id)
    }
  }
  return map
}

/**
 * 参照を張り直し、存在しない参照を取り除く。
 * clue.revelationId は必須項目のため取り除かず、検証で警告する。
 */
export function repairReferences<T extends Pick<TRPGScenario, 'truth' | 'npcs' | 'locations' | 'clues' | 'scenes'>>(
  scenario: T,
  idMaps: Partial<Record<EntityKind, Map<string, string>>> = {}
): { scenario: T; report: ReferenceRepairReport } {
  const report: ReferenceRepairReport = { remapped: 0, removed: 0 }
  const existing: Record<EntityKind, Set<string>> = {
    revelation: new Set(labelsOf(scenario, 'revelation').map(i => i.id)),
    npc: new Set(scenario.npcs.map(n => n.id)),
    location: new Set(scenario.locations.map(l => l.id)),
    clue: new Set(scenario.clues.map(c => c.id)),
    scene: new Set(scenario.scenes.map(s => s.id))
  }

  const remap = (kind: EntityKind, id: string): string => {
    if (existing[kind].has(id) && !idMaps[kind]?.has(id)) return id
    const mapped = idMaps[kind]?.get(id)
    if (mapped && mapped !== id) report.remapped++
    return mapped ?? id
  }

  const single = (kind: EntityKind, id: string | undefined): string | undefined => {
    if (!id) return undefined
    const next = remap(kind, id)
    if (existing[kind].has(next)) return next
    report.removed++
    return undefined
  }

  const list = (kind: EntityKind, ids: string[]): string[] => {
    const result: string[] = []
    for (const id of ids) {
      const next = remap(kind, id)
      if (!existing[kind].has(next)) {
        report.removed++
      } else if (!result.includes(next)) {
        result.push(next)
      }
    }
    return result
  }

  const repaired = {
    ...scenario,
    clues: scenario.clues.map(clue => {
      const revelationId = remap('revelation', clue.revelationId)
      return {
        ...clue,
        revelationId,
        locationId: single('location', clue.locationId),
        npcId: single('npc', clue.npcId)
      }
    }),
    scenes: scenario.scenes.map(scene => ({
      ...scene,
      locationId: single('location', scene.locationId),
      npcIds: list('npc', scene.npcIds),
      clueIds: list('clue', scene.clueIds),
      nextSceneIds: list('scene', scene.nextSceneIds.filter(id => id !== scene.id))
    }))
  }

  return { scenario: repaired, report }
}

/**
 * セクションを作り直したときの参照の張り直し。作り直した種類の要素だけ名前で対応付ける。
 */
export function repairAfterRegeneration<T extends Pick<TRPGScenario, 'truth' | 'npcs' | 'locations' | 'clues' | 'scenes'>>(
  before: T,
  after: T,
  section: ScenarioSection
): { scenario: T; report: ReferenceRepairReport } {
  const idMaps: Partial<Record<EntityKind, Map<string, string>>> = {}
  for (const kind of SECTION_ENTITY_KINDS[section]) {
    idMaps[kind] = buildIdMap(labelsOf(before, kind), labelsOf(after, kind))
  }
  return repairReferences(after, idMaps)
}

/**
 * 再生成時にAIへ渡す「既存のID」の一覧。同じ要素は同じIDを使うよう促す。
 */
export function existingIdHint(scenario: TRPGScenario, section: ScenarioSection): string | undefined {
  const lines = SECTION_ENTITY_KINDS[section].flatMap(kind =>
    labelsOf(scenario, kind).map(item => `- ${item.id}: ${item.label.slice(0, 40)}`)
  )
  if (lines.length === 0) return undefined
  return `作り直す前の要素とIDは以下のとおりです。同じ要素を残す場合は必ず同じIDを使い、新しい要素には未使用のIDを振ってください。\n${lines.join('\n')}`
}
