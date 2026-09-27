import {
  ClueDiscovery,
  ContentIssue,
  ContentIssueCategory,
  Encounter,
  KeyRevelation,
  ScenarioClue,
  ScenarioEnding,
  ScenarioGMGuide,
  ScenarioLocation,
  ScenarioNPC,
  ScenarioOverview,
  ScenarioScene,
  ScenarioTruth,
  SceneType,
  SkillCheck,
  TimelineEvent
} from '@/lib/types'

// AIの出力は形が揺れるため、画面・検証で安全に扱える形に整える

const SCENE_TYPES: SceneType[] = ['intro', 'investigation', 'social', 'combat', 'climax', 'ending', 'other']

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value && typeof value === 'object') return JSON.stringify(value)
  return fallback
}

function optStr(value: unknown): string | undefined {
  const s = str(value)
  return s ? s : undefined
}

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function strArr(value: unknown): string[] {
  if (typeof value === 'string') return value ? [value.trim()] : []
  return arr(value).map(v => str(v)).filter(Boolean)
}

// 欠けている・重複しているIDを prefix-連番 で補う
function assignIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  const used = new Set<string>()
  return items.map((item, index) => {
    let id = item.id
    if (!id || used.has(id)) {
      let n = index + 1
      id = `${prefix}-${n}`
      while (used.has(id)) id = `${prefix}-${++n}`
    }
    used.add(id)
    return { ...item, id }
  })
}

function normalizeTimeline(value: unknown): TimelineEvent[] {
  return arr(value)
    .map(e => (typeof e === 'string' ? { time: '', event: e } : { time: str(e?.time), event: str(e?.event ?? e?.description) }))
    .filter(e => e.event)
}

export function normalizeOverview(raw: any, fallbackTitle = '無題のシナリオ'): ScenarioOverview {
  return {
    title: str(raw?.title, fallbackTitle) || fallbackTitle,
    tagline: str(raw?.tagline),
    playerSynopsis: str(raw?.playerSynopsis ?? raw?.synopsis),
    hook: str(raw?.hook),
    recommendedSkills: strArr(raw?.recommendedSkills),
    estimatedPlayTime: str(raw?.estimatedPlayTime),
    recommendedPlayers: str(raw?.recommendedPlayers)
  }
}

export function normalizeTruth(raw: any): ScenarioTruth {
  const revelations: KeyRevelation[] = arr(raw?.keyRevelations)
    .map((r: any) => ({
      id: str(r?.id),
      fact: str(r?.fact ?? r?.description),
      importance: r?.importance === 'optional' ? 'optional' as const : 'critical' as const
    }))
    .filter(r => r.fact)

  return {
    summary: str(raw?.summary),
    backstory: str(raw?.backstory),
    antagonist: str(raw?.antagonist),
    antagonistGoal: str(raw?.antagonistGoal),
    pastEvents: normalizeTimeline(raw?.pastEvents),
    countdown: normalizeTimeline(raw?.countdown),
    keyRevelations: assignIds(revelations, 'rev')
  }
}

export function normalizeNPCs(raw: unknown): ScenarioNPC[] {
  const npcs = arr(raw)
    .map((n: any) => ({
      id: str(n?.id),
      name: str(n?.name),
      role: str(n?.role),
      description: str(n?.description),
      personality: str(n?.personality),
      motivation: str(n?.motivation),
      secret: str(n?.secret),
      stats: str(n?.stats),
      dialogueExamples: strArr(n?.dialogueExamples),
      attitude: (['friendly', 'neutral', 'hostile'].includes(n?.attitude) ? n.attitude : 'neutral') as ScenarioNPC['attitude']
    }))
    .filter(n => n.name)
  return assignIds(npcs, 'npc')
}

export function normalizeLocations(raw: unknown): ScenarioLocation[] {
  const locations = arr(raw)
    .map((l: any) => ({
      id: str(l?.id),
      name: str(l?.name),
      description: str(l?.description),
      atmosphere: str(l?.atmosphere),
      features: strArr(l?.features)
    }))
    .filter(l => l.name)
  return assignIds(locations, 'loc')
}

function normalizeDiscovery(raw: any): ClueDiscovery {
  if (typeof raw === 'string') return { skill: raw, difficulty: '', notes: '' }
  return {
    skill: str(raw?.skill),
    difficulty: str(raw?.difficulty),
    notes: str(raw?.notes)
  }
}

export function normalizeClues(raw: unknown, idPrefix = 'clue'): ScenarioClue[] {
  const clues = arr(raw)
    .map((c: any) => ({
      id: str(c?.id),
      revelationId: str(c?.revelationId),
      title: str(c?.title),
      description: str(c?.description),
      locationId: optStr(c?.locationId),
      npcId: optStr(c?.npcId),
      discovery: normalizeDiscovery(c?.discovery),
      handout: optStr(c?.handout)
    }))
    .filter(c => c.description || c.title)
    .map(c => ({ ...c, title: c.title || c.description.slice(0, 20) }))
  return assignIds(clues, idPrefix)
}

function normalizeChecks(raw: unknown): SkillCheck[] {
  return arr(raw)
    .map((c: any) => ({
      skill: str(c?.skill),
      difficulty: str(c?.difficulty),
      success: str(c?.success),
      failure: str(c?.failure)
    }))
    .filter(c => c.skill)
}

function normalizeEncounter(raw: any): Encounter | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const enemies = arr(raw.enemies)
    .map((e: any) => ({
      name: str(e?.name),
      count: Math.max(1, Number(e?.count) || 1),
      stats: str(e?.stats),
      tactics: str(e?.tactics)
    }))
    .filter(e => e.name)
  if (enemies.length === 0 && !str(raw.notes)) return undefined
  return { enemies, notes: str(raw.notes) }
}

export function normalizeScenes(raw: unknown): ScenarioScene[] {
  const scenes = arr(raw)
    .map((s: any) => ({
      id: str(s?.id),
      title: str(s?.title),
      type: (SCENE_TYPES.includes(s?.type) ? s.type : 'other') as SceneType,
      locationId: optStr(s?.locationId),
      readAloud: str(s?.readAloud),
      gmNotes: str(s?.gmNotes ?? s?.description),
      objectives: strArr(s?.objectives),
      checks: normalizeChecks(s?.checks),
      clueIds: strArr(s?.clueIds),
      npcIds: strArr(s?.npcIds),
      nextSceneIds: strArr(s?.nextSceneIds),
      encounter: normalizeEncounter(s?.encounter)
    }))
    .filter(s => s.title)
  return assignIds(scenes, 'scene')
}

export function normalizeEndings(raw: unknown): ScenarioEnding[] {
  const endings = arr(raw)
    .map((e: any) => ({
      id: str(e?.id),
      title: str(e?.title),
      condition: str(e?.condition),
      description: str(e?.description),
      rewards: str(e?.rewards)
    }))
    .filter(e => e.title)
  return assignIds(endings, 'end')
}

export function normalizeGMGuide(raw: any): ScenarioGMGuide {
  return {
    pacing: str(raw?.pacing),
    tips: strArr(raw?.tips),
    rescueMeasures: strArr(raw?.rescueMeasures),
    safetyNotes: str(raw?.safetyNotes)
  }
}

/**
 * 修復ステップで生成された手がかりを既存データへ統合する。
 * AIが指定した sceneId をもとに、該当シーンの clueIds にも登録する。
 */
export function mergeRepairClues(
  existingClues: ScenarioClue[],
  scenes: ScenarioScene[],
  rawClues: unknown
): { clues: ScenarioClue[]; scenes: ScenarioScene[]; added: ScenarioClue[] } {
  const usedIds = new Set(existingClues.map(c => c.id))
  const sceneIds = new Set(scenes.map(s => s.id))
  const sceneAssignments = new Map<string, string[]>()
  const added: ScenarioClue[] = []

  let counter = 1
  for (const raw of arr(rawClues)) {
    const [clue] = normalizeClues([raw])
    if (!clue) continue

    let id = str(raw?.id)
    if (!id || usedIds.has(id)) {
      do { id = `clue-r${counter++}` } while (usedIds.has(id))
    }
    usedIds.add(id)
    const merged = { ...clue, id }
    added.push(merged)

    const sceneId = str(raw?.sceneId)
    if (sceneIds.has(sceneId)) {
      sceneAssignments.set(sceneId, [...(sceneAssignments.get(sceneId) ?? []), id])
    }
  }

  return {
    clues: [...existingClues, ...added],
    scenes: scenes.map(scene => {
      const extra = sceneAssignments.get(scene.id)
      return extra ? { ...scene, clueIds: [...scene.clueIds, ...extra] } : scene
    }),
    added
  }
}

const CONTENT_CATEGORIES: ContentIssueCategory[] = ['contradiction', 'timeline', 'npc', 'rules', 'safety', 'balance', 'other']
const SEVERITIES = ['error', 'warning', 'info'] as const

export function normalizeContentIssues(raw: unknown): ContentIssue[] {
  return arr(raw)
    .map((i: any) => ({
      severity: (SEVERITIES.includes(i?.severity) ? i.severity : 'warning') as ContentIssue['severity'],
      category: (CONTENT_CATEGORIES.includes(i?.category) ? i.category : 'other') as ContentIssueCategory,
      message: str(i?.message),
      suggestion: str(i?.suggestion),
      targetIds: strArr(i?.targetIds)
    }))
    .filter(i => i.message)
}
