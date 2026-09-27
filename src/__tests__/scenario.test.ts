import { extractJSON } from '@/lib/json-extract'
import { ScenarioValidator, ValidatableScenario } from '@/lib/services/scenario-validator'
import { mergeRepairClues, normalizeNPCs, normalizeScenes, normalizeTruth } from '@/lib/services/scenario-normalizer'
import { ScenarioExporter } from '@/lib/services/scenario-exporter'
import { TRPGScenarioService } from '@/lib/services/scenario-service'
import { TRPGScenarioFlowExecutor, contextToScenarioPatch } from '@/lib/services/scenario-flow-executor'
import { FlowEngine } from '@/lib/flow/flow-engine'
import { trpgScenarioFlow } from '@/data/scenario-flow'
import { aiClient } from '@/lib/ai/client'
import { ScenarioClue, ScenarioRequest, ScenarioScene, TRPGScenario } from '@/lib/types'

jest.mock('@/lib/ai/client', () => ({
  aiClient: { complete: jest.fn() }
}))

const request: ScenarioRequest = {
  systemId: 'coc7',
  genre: 'ホラー',
  premise: '山奥の村で失踪事件が起きる',
  playerCount: 3,
  sessionHours: 3,
  difficulty: 'normal',
  tone: 'シリアス'
}

const clue = (id: string, revelationId: string, locationId?: string): ScenarioClue => ({
  id,
  revelationId,
  title: `手がかり${id}`,
  description: '説明',
  locationId,
  discovery: { skill: '目星', difficulty: 'レギュラー', notes: '' }
})

const scene = (id: string, overrides: Partial<ScenarioScene> = {}): ScenarioScene => ({
  id,
  title: `シーン${id}`,
  type: 'investigation',
  readAloud: '',
  gmNotes: '',
  objectives: [],
  checks: [],
  clueIds: [],
  npcIds: [],
  nextSceneIds: [],
  ...overrides
})

function baseScenario(): ValidatableScenario {
  return {
    request,
    truth: normalizeTruth({
      summary: '村の神主が儀式のために村人をさらっている',
      keyRevelations: [
        { id: 'rev-1', fact: '神主が犯人', importance: 'critical' },
        { id: 'rev-2', fact: '儀式は満月の夜', importance: 'optional' }
      ]
    }),
    npcs: [],
    locations: [{ id: 'loc-1', name: '神社', description: '', atmosphere: '', features: [] }],
    clues: [clue('clue-1', 'rev-1'), clue('clue-2', 'rev-1'), clue('clue-3', 'rev-1'), clue('clue-4', 'rev-2')],
    scenes: [
      scene('scene-1', { type: 'intro', nextSceneIds: ['scene-2', 'scene-3'] }),
      scene('scene-2', { clueIds: ['clue-1', 'clue-2'], nextSceneIds: ['scene-4'] }),
      scene('scene-3', { clueIds: ['clue-3', 'clue-4'], nextSceneIds: ['scene-4'] }),
      scene('scene-4', { type: 'climax' })
    ],
    endings: [
      { id: 'end-1', title: 'トゥルー', condition: '', description: '', rewards: '' },
      { id: 'end-2', title: 'バッド', condition: '', description: '', rewards: '' }
    ]
  }
}

describe('extractJSON', () => {
  it('parses a ```json fenced block', () => {
    expect(extractJSON('前置き\n```json\n{"a": 1}\n```\n後書き')).toEqual({ a: 1 })
  })

  it('parses a bare JSON object surrounded by text', () => {
    expect(extractJSON('結果は {"a": {"b": "}"}} です')).toEqual({ a: { b: '}' } })
  })

  it('tolerates trailing commas', () => {
    expect(extractJSON('```json\n{"a": [1, 2,],}\n```')).toEqual({ a: [1, 2] })
  })

  it('returns null for non-JSON text', () => {
    expect(extractJSON('JSONではありません')).toBeNull()
  })
})

describe('normalizer', () => {
  it('assigns ids to missing and duplicate entries', () => {
    const npcs = normalizeNPCs([{ name: 'A' }, { id: 'npc-1', name: 'B' }, { id: 'npc-1', name: 'C' }])
    expect(npcs.map(n => n.id)).toEqual(['npc-1', 'npc-2', 'npc-3'])
    expect(new Set(npcs.map(n => n.id)).size).toBe(3)
  })

  it('coerces unknown scene types and string fields', () => {
    const [s] = normalizeScenes([{ title: 'X', type: 'boss', clueIds: 'clue-1' }])
    expect(s.type).toBe('other')
    expect(s.clueIds).toEqual(['clue-1'])
  })

  it('merges repair clues and registers them in the target scene', () => {
    const scenes = [scene('scene-1'), scene('scene-2')]
    const result = mergeRepairClues([clue('clue-1', 'rev-1')], scenes, [
      { id: 'clue-1', revelationId: 'rev-1', sceneId: 'scene-2', title: '新しい手がかり', description: 'x' },
      { revelationId: 'rev-1', sceneId: 'missing', title: '別の手がかり', description: 'y' }
    ])
    expect(result.added.map(c => c.id)).toEqual(['clue-r1', 'clue-r2'])
    expect(result.clues).toHaveLength(3)
    expect(result.scenes[1].clueIds).toEqual(['clue-r1'])
    expect(result.scenes[0].clueIds).toEqual([])
  })
})

describe('ScenarioValidator', () => {
  it('passes a well-formed scenario without repair', () => {
    const report = ScenarioValidator.validate(baseScenario())
    expect(report.needsRepair).toBe(false)
    expect(report.issues.filter(i => i.severity !== 'info')).toEqual([])
    expect(report.score).toBeGreaterThanOrEqual(95)
  })

  it('flags critical revelations with fewer than three accessible clues', () => {
    const scenario = baseScenario()
    // clue-3 をどのシーンにも置かない
    scenario.scenes[2].clueIds = ['clue-4']
    const report = ScenarioValidator.validate(scenario)
    expect(report.needsRepair).toBe(true)
    expect(report.revelationsNeedingClues).toEqual(['rev-1'])
    expect(report.issues.some(i => i.targetId === 'clue-3' && i.category === 'clue-coverage')).toBe(true)
  })

  it('counts clues reachable through a scene location', () => {
    const scenario = baseScenario()
    scenario.clues[2] = clue('clue-3', 'rev-1', 'loc-1')
    scenario.scenes[2] = { ...scenario.scenes[2], clueIds: ['clue-4'], locationId: 'loc-1' }
    expect(ScenarioValidator.validate(scenario).needsRepair).toBe(false)
  })

  it('detects unreachable scenes, dead ends and dangling references', () => {
    const scenario = baseScenario()
    scenario.scenes.push(scene('scene-5', { npcIds: ['npc-99'] }))
    const report = ScenarioValidator.validate(scenario)
    const messages = report.issues.filter(i => i.targetId === 'scene-5').map(i => i.category)
    expect(messages).toEqual(expect.arrayContaining(['scene-flow', 'reference']))
  })

  it('reports missing endings as an error', () => {
    const scenario = { ...baseScenario(), endings: [] }
    const report = ScenarioValidator.validate(scenario)
    expect(report.issues.some(i => i.category === 'ending' && i.severity === 'error')).toBe(true)
  })
})

describe('ScenarioExporter', () => {
  it('separates player information from GM spoilers', () => {
    const scenario: TRPGScenario = {
      ...baseScenario(),
      id: 's1',
      status: 'complete',
      aiSettings: { provider: 'openai', model: 'gpt-6-sol', temperature: 0.8, maxTokens: 1000 },
      overview: {
        title: '霧隠れ村',
        tagline: '',
        playerSynopsis: 'あらすじ',
        hook: '導入',
        recommendedSkills: ['目星'],
        estimatedPlayTime: '',
        recommendedPlayers: ''
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const md = ScenarioExporter.toMarkdown(scenario)
    expect(md.startsWith('# 霧隠れ村')).toBe(true)
    expect(md.indexOf('## PL向け情報')).toBeLessThan(md.indexOf('## KP向け情報'))
    expect(md.indexOf('## KP向け情報')).toBeLessThan(md.indexOf('神主'))
    expect(md).toContain('#### シーン1: シーンscene-1（導入）')
  })
})

describe('TRPGScenarioService', () => {
  beforeEach(() => localStorage.clear())

  it('creates, updates, duplicates and deletes scenarios', () => {
    const created = TRPGScenarioService.create(request)
    TRPGScenarioService.update(created.id, { status: 'complete' })
    expect(TRPGScenarioService.get(created.id)?.status).toBe('complete')
    expect(TRPGScenarioService.get(created.id)?.createdAt).toBeInstanceOf(Date)

    const copy = TRPGScenarioService.duplicate(created.id)!
    expect(copy.id).not.toBe(created.id)
    expect(TRPGScenarioService.getAll()).toHaveLength(2)

    TRPGScenarioService.delete(created.id)
    expect(TRPGScenarioService.getAll().map(s => s.id)).toEqual([copy.id])
  })
})

describe('TRPG scenario flow', () => {
  const reply = (data: unknown) => ({ content: '```json\n' + JSON.stringify(data) + '\n```', finishReason: 'stop' })

  it('generates every section and repairs missing clues', async () => {
    const complete = aiClient.complete as jest.Mock
    complete
      .mockResolvedValueOnce(reply({
        overview: { title: '霧隠れ村', playerSynopsis: 'あらすじ', hook: '導入' },
        truth: { summary: '真相', keyRevelations: [{ id: 'rev-1', fact: '神主が犯人', importance: 'critical' }] }
      }))
      .mockResolvedValueOnce(reply({ npcs: [{ id: 'npc-1', name: '神主', role: '黒幕' }] }))
      .mockResolvedValueOnce(reply({
        locations: [{ id: 'loc-1', name: '神社' }],
        clues: [{ id: 'clue-1', revelationId: 'rev-1', title: '血痕', description: '境内に血痕', locationId: 'loc-1' }]
      }))
      .mockResolvedValueOnce(reply({
        scenes: [
          { id: 'scene-1', title: '依頼', type: 'intro', nextSceneIds: ['scene-2'] },
          { id: 'scene-2', title: '神社の調査', type: 'investigation', locationId: 'loc-1', clueIds: ['clue-1'], nextSceneIds: ['scene-3'] },
          { id: 'scene-3', title: '儀式の夜', type: 'climax' }
        ]
      }))
      .mockResolvedValueOnce(reply({
        endings: [{ id: 'end-1', title: '生還', condition: '儀式を止める' }],
        gmGuide: { pacing: '導入15分', tips: ['コツ'] }
      }))
      // 最初のJSONが壊れていても再試行で回復する
      .mockResolvedValueOnce({ content: '手がかりを追加します', finishReason: 'stop' })
      .mockResolvedValueOnce(reply({
        clues: [
          { revelationId: 'rev-1', sceneId: 'scene-1', title: '村人の噂', description: '神主が夜に出歩く' },
          { revelationId: 'rev-1', sceneId: 'scene-2', title: '祝詞の写し', description: '生贄の記述' }
        ]
      }))
      .mockResolvedValueOnce(reply({
        summary: '大きな問題はありません',
        issues: [{ severity: 'warning', category: 'npc', targetIds: ['npc-1'], message: '神主の口調が不安定', suggestion: '丁寧語に統一' }, { message: '' }]
      }))

    const executor = new TRPGScenarioFlowExecutor({ provider: 'anthropic', model: 'claude-opus-5', temperature: 0.8, maxTokens: 1000 })
    const engine = new FlowEngine(trpgScenarioFlow, executor)
    executor.setFlowEngine(engine)
    const completed: string[] = []
    engine.on('stepComplete', step => completed.push(step.id))

    const context = await engine.execute({ request })
    const patch = contextToScenarioPatch(context)

    expect(completed).toEqual([
      'design-concept', 'create-npcs', 'design-locations-clues', 'structure-scenes',
      'design-endings', 'validate-structure', 'repair-clues', 'finalize', 'review-content'
    ])
    expect(complete).toHaveBeenCalledTimes(8)
    expect(patch.overview?.title).toBe('霧隠れ村')
    expect(patch.clues).toHaveLength(3)
    expect(patch.scenes?.[0].clueIds).toEqual(['clue-r1'])
    expect(patch.validation?.needsRepair).toBe(false)
    expect(patch.review?.issues).toEqual([
      { severity: 'warning', category: 'npc', targetIds: ['npc-1'], message: '神主の口調が不安定', suggestion: '丁寧語に統一' }
    ])
    // 生成時に選んだプロバイダーとモデルで呼び出している
    expect(complete.mock.calls[0][0]).toMatchObject({ provider: 'anthropic', model: 'claude-opus-5' })
  })

  it('finishes the flow even when the content review fails', async () => {
    const complete = aiClient.complete as jest.Mock
    complete.mockReset()
    complete
      .mockResolvedValueOnce(reply({ overview: { title: 'T' }, truth: { keyRevelations: [{ id: 'rev-1', fact: 'F', importance: 'optional' }] } }))
      .mockResolvedValueOnce(reply({ npcs: [] }))
      .mockResolvedValueOnce(reply({ locations: [], clues: [] }))
      .mockResolvedValueOnce(reply({ scenes: [{ id: 'scene-1', title: 'S', type: 'climax' }] }))
      .mockResolvedValueOnce(reply({ endings: [{ title: 'E' }] }))
      .mockRejectedValueOnce(new Error('rate limited'))

    const executor = new TRPGScenarioFlowExecutor({ provider: 'deepseek', model: 'deepseek-chat', temperature: 0.8, maxTokens: 1000 })
    const engine = new FlowEngine(trpgScenarioFlow, executor)
    executor.setFlowEngine(engine)
    const logs: string[] = []
    engine.on('log', message => logs.push(message))

    const context = await engine.execute({ request })
    expect(context.review).toBeUndefined()
    expect(context.endings).toHaveLength(1)
    expect(logs.some(l => l.includes('内容チェックに失敗しました'))).toBe(true)
  })
})
