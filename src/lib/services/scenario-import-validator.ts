import { isAIProviderId } from '@/lib/ai/providers'
import { TRPGScenario } from '@/lib/types'

type Rule = (value: unknown, path: string) => void
const fail = (path: string): never => { throw new Error(`シナリオファイルの「${path}」の形式が正しくありません`) }
const text: Rule = (v, p) => { if (typeof v !== 'string') fail(p) }
const nonempty: Rule = (v, p) => { text(v, p); if (!(v as string).trim()) fail(p) }
const number = (min: number, max = Number.MAX_SAFE_INTEGER): Rule => (v, p) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(p)
}
const oneOf = (...values: string[]): Rule => (v, p) => { if (!values.includes(v as string)) fail(p) }
const optional = (rule: Rule): Rule => (v, p) => { if (v !== undefined) rule(v, p) }
const object = (fields: Record<string, Rule>): Rule => (v, p) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p)
  for (const [key, rule] of Object.entries(fields)) rule((v as Record<string, unknown>)[key], `${p}.${key}`)
}
const array = (rule: Rule, uniqueIds = false): Rule => (v, p) => {
  if (!Array.isArray(v)) fail(p)
  const ids = new Set<string>()
  ;(v as unknown[]).forEach((item, index) => {
    rule(item, `${p}[${index + 1}]`)
    if (uniqueIds) {
      const id = (item as { id: string }).id
      if (ids.has(id)) fail(`${p}[${index + 1}].id（重複）`)
      ids.add(id)
    }
  })
}
const texts = array(text)
const timeline = array(object({ time: text, event: text }))
const date: Rule = (v, p) => {
  if (!(v instanceof Date) && typeof v !== 'string') fail(p)
  if (!Number.isFinite(new Date(v as string).getTime())) fail(p)
}

/** 外部JSONの型を保存前に検証する。生成結果用の補正で不正入力を黙って受け入れない。 */
export function validateScenarioImport(data: unknown): asserts data is Partial<TRPGScenario> & Pick<TRPGScenario, 'request'> {
  object({
    request: object({
      systemId: oneOf('coc7', 'dnd5e', 'sw25', 'generic'), workingTitle: optional(text),
      genre: nonempty, premise: text, setting: optional(text), playerCount: number(1),
      sessionHours: number(1), difficulty: oneOf('easy', 'normal', 'hard', 'deadly'),
      tone: text, mustInclude: optional(text), avoid: optional(text)
    }),
    status: optional(oneOf('draft', 'generating', 'complete', 'review', 'error')),
    createdAt: optional(date), updatedAt: optional(date),
    aiSettings: optional(object({
      provider: optional((v, p) => { if (!isAIProviderId(v)) fail(p) }),
      model: optional(nonempty), temperature: optional(number(0, 2)), maxTokens: optional(number(1))
    })),
    overview: optional(object({ title: nonempty, tagline: text, playerSynopsis: text, hook: text,
      recommendedSkills: texts, estimatedPlayTime: text, recommendedPlayers: text })),
    truth: optional(object({ summary: text, backstory: text, antagonist: text, antagonistGoal: text,
      pastEvents: timeline, countdown: timeline,
      keyRevelations: array(object({ id: nonempty, fact: nonempty, importance: oneOf('critical', 'optional') }), true) })),
    npcs: optional(array(object({ id: nonempty, name: nonempty, role: text, description: text,
      personality: text, motivation: text, secret: text, stats: text, dialogueExamples: texts,
      attitude: oneOf('friendly', 'neutral', 'hostile') }), true)),
    locations: optional(array(object({ id: nonempty, name: nonempty, description: text, atmosphere: text, features: texts }), true)),
    clues: optional(array(object({ id: nonempty, revelationId: nonempty, title: nonempty, description: text,
      locationId: optional(text), npcId: optional(text), handout: optional(text),
      discovery: object({ skill: text, difficulty: text, notes: text }) }), true)),
    scenes: optional(array(object({ id: nonempty, title: nonempty,
      type: oneOf('intro', 'investigation', 'social', 'combat', 'climax', 'ending', 'other'),
      locationId: optional(text), readAloud: text, gmNotes: text, objectives: texts,
      checks: array(object({ skill: text, difficulty: text, success: text, failure: text })),
      clueIds: texts, npcIds: texts, nextSceneIds: texts,
      encounter: optional(object({ notes: text, enemies: array(object({ name: nonempty, count: number(1), stats: text, tactics: text })) }))
    }), true)),
    endings: optional(array(object({ id: nonempty, title: nonempty, condition: text, description: text, rewards: text }), true)),
    gmGuide: optional(object({ pacing: text, tips: texts, rescueMeasures: texts, safetyNotes: text })),
    lastError: optional(text)
  })(data, 'シナリオ')
}
