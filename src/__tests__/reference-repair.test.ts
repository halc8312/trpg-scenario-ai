import { buildIdMap, existingIdHint, repairAfterRegeneration, repairReferences } from '@/lib/services/reference-repair'
import { finalizeEdits } from '@/lib/services/scenario-editing'
import { ScenarioNPC, ScenarioScene, TRPGScenario } from '@/lib/types'

const npc = (id: string, name: string): ScenarioNPC => ({
  id, name, role: '', description: '', personality: '', motivation: '', secret: '', stats: '', dialogueExamples: [], attitude: 'neutral'
})

const scene = (id: string, overrides: Partial<ScenarioScene> = {}): ScenarioScene => ({
  id, title: id, type: 'investigation', readAloud: '', gmNotes: '', objectives: [], checks: [],
  clueIds: [], npcIds: [], nextSceneIds: [], ...overrides
})

function scenario(overrides: Partial<TRPGScenario> = {}): TRPGScenario {
  return {
    id: 's',
    status: 'complete',
    request: { systemId: 'coc7', genre: 'ホラー', premise: '', playerCount: 3, sessionHours: 3, difficulty: 'normal', tone: '' },
    aiSettings: { provider: 'anthropic', model: 'claude-opus-5', temperature: 0.8, maxTokens: 1000 },
    truth: {
      summary: '', backstory: '', antagonist: '', antagonistGoal: '', pastEvents: [], countdown: [],
      keyRevelations: [{ id: 'rev-1', fact: '神主が犯人', importance: 'critical' }]
    },
    npcs: [npc('npc-1', '宗像 巌'), npc('npc-2', '佐伯 翔太')],
    locations: [{ id: 'loc-1', name: '神社', description: '', atmosphere: '', features: [] }],
    clues: [
      { id: 'clue-1', revelationId: 'rev-1', title: '噂', description: '', npcId: 'npc-2', discovery: { skill: '', difficulty: '', notes: '' } }
    ],
    scenes: [
      scene('scene-1', { npcIds: ['npc-1', 'npc-2'], clueIds: ['clue-1'], nextSceneIds: ['scene-2'] }),
      scene('scene-2', { type: 'climax', locationId: 'loc-1', npcIds: ['npc-1'] })
    ],
    endings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

describe('buildIdMap', () => {
  it('matches items by name even when ids change or are reused for someone else', () => {
    const map = buildIdMap(
      [{ id: 'npc-1', label: '宗像 巌' }, { id: 'npc-2', label: '佐伯 翔太' }, { id: 'npc-3', label: '消えた人' }],
      [{ id: 'npc-1', label: '佐伯翔太' }, { id: 'npc-7', label: '宗像　巌' }, { id: 'npc-3', label: '新しい人' }]
    )
    expect(map.get('npc-1')).toBe('npc-7')
    expect(map.get('npc-2')).toBe('npc-1')
    // 名前が一致しなくても、同じIDが残っていれば同一とみなす
    expect(map.get('npc-3')).toBe('npc-3')
  })
})

describe('repairAfterRegeneration', () => {
  it('remaps references to regenerated NPCs and removes references to NPCs that no longer exist', () => {
    const before = scenario()
    const after = { ...before, npcs: [npc('npc-a', '宗像 巌'), npc('npc-b', '村長')] }

    const { scenario: repaired, report } = repairAfterRegeneration(before, after, 'npcs')

    expect(repaired.scenes[0].npcIds).toEqual(['npc-a'])
    expect(repaired.scenes[1].npcIds).toEqual(['npc-a'])
    expect(repaired.clues[0].npcId).toBeUndefined()
    expect(report).toEqual({ remapped: 2, removed: 2 })
  })

  it('leaves unrelated references untouched', () => {
    const before = scenario()
    const { scenario: repaired, report } = repairAfterRegeneration(before, before, 'endings')
    expect(repaired.scenes).toEqual(before.scenes)
    expect(report).toEqual({ remapped: 0, removed: 0 })
  })
})

describe('repairReferences', () => {
  it('drops dangling and self references but keeps missing revelations for the validator', () => {
    const base = scenario()
    const broken = {
      ...base,
      clues: [{ ...base.clues[0], revelationId: 'rev-9', locationId: 'loc-9' }],
      scenes: [scene('scene-1', { nextSceneIds: ['scene-1', 'scene-9'], clueIds: ['clue-1', 'clue-1'] })]
    }
    const { scenario: repaired, report } = repairReferences(broken)
    expect(repaired.clues[0].revelationId).toBe('rev-9')
    expect(repaired.clues[0].locationId).toBeUndefined()
    expect(repaired.scenes[0].nextSceneIds).toEqual([])
    expect(repaired.scenes[0].clueIds).toEqual(['clue-1'])
    expect(report.removed).toBe(2)
  })
})

describe('finalizeEdits', () => {
  it('removes references to deleted NPCs and trims empty lines', () => {
    const draft = scenario({ npcs: [npc('npc-2', '佐伯 翔太')] })
    draft.locations[0].features = ['本殿', '', '  ']
    const patch = finalizeEdits(draft)
    expect(patch.scenes?.[0].npcIds).toEqual(['npc-2'])
    expect(patch.scenes?.[1].npcIds).toEqual([])
    expect(patch.locations?.[0].features).toEqual(['本殿'])
    expect(patch.validation).toBeDefined()
  })
})

describe('existingIdHint', () => {
  it('lists the ids of the section being regenerated', () => {
    const hint = existingIdHint(scenario(), 'npcs')!
    expect(hint).toContain('npc-1: 宗像 巌')
    expect(existingIdHint(scenario(), 'endings')).toBeUndefined()
  })
})
