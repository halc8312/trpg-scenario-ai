import { GAME_SYSTEM_LIST, getGameSystem } from '@/data/game-systems'
import { buildPregensPrompt, buildScenesPrompt, buildSystemPrompt } from '@/lib/services/scenario-prompts'
import { ScenarioRequest, TRPGSystemId } from '@/lib/types'

const request = (systemId: TRPGSystemId): ScenarioRequest => ({
  systemId, genre: 'ホラー', premise: '', playerCount: 4, sessionHours: 4, difficulty: 'normal', tone: 'シリアス'
})

describe('game systems', () => {
  it.each(GAME_SYSTEM_LIST.map(s => [s.id, s]))('%s has every field needed by the prompts', (_id, system) => {
    for (const key of ['name', 'shortName', 'gmTitle', 'diceSystem', 'checkGuidelines', 'npcStatFormat', 'pcStatFormat', 'enemyStatFormat', 'rewardGuidelines', 'designNotes'] as const) {
      expect(system[key].length).toBeGreaterThan(0)
    }
    expect(system.difficultyExamples.length).toBeGreaterThanOrEqual(2)
    expect(system.commonSkills.length).toBeGreaterThanOrEqual(5)
    expect(system.defaultGenres.length).toBeGreaterThan(0)
  })

  it('puts system-specific rules into the prompts', () => {
    expect(buildSystemPrompt(request('shinobigami'))).toContain('使命')
    expect(buildScenesPrompt({ request: request('dx3') })).toContain('〈知覚〉判定 目標値9')
    expect(buildPregensPrompt({ request: request('emoklore') })).toContain('共鳴感情')
    expect(buildSystemPrompt(request('insane'))).toContain('恐怖判定')
  })

  it('falls back to the generic system for unknown ids', () => {
    expect(getGameSystem('unknown' as TRPGSystemId).id).toBe('generic')
  })
})
