import 'fake-indexeddb/auto'
import { aiClient } from '@/lib/ai/client'
import { GMAssistantService } from '@/lib/services/gm-assistant-service'
import { TRPGScenarioFlowExecutor } from '@/lib/services/scenario-flow-executor'
import { ScenarioExporter } from '@/lib/services/scenario-exporter'
import { INITIAL_AI_SETTINGS, loadDefaultAISettings, saveDefaultAISettings } from '@/lib/ai/settings'
import { openScenarioStore, LEGACY_STORAGE_KEY } from '@/lib/storage/scenario-store'
import { formatBytes, getStorageInfo, requestPersistentStorage } from '@/lib/services/backup-service'
import { TRPGScenario } from '@/lib/types'

jest.mock('@/lib/ai/client', () => ({ aiClient: { complete: jest.fn() } }))
const complete = aiClient.complete as jest.Mock
const reply = (data: unknown) => ({ content: '```json\n' + JSON.stringify(data) + '\n```', finishReason: 'stop', usage: { inputTokens: 10, outputTokens: 5 } })

function scenario(overrides: Partial<TRPGScenario> = {}): TRPGScenario {
  return {
    id: 's', status: 'complete',
    request: { systemId: 'dx3', genre: '現代異能', premise: '', playerCount: 2, sessionHours: 3, difficulty: 'hard', tone: '', avoid: '流血' },
    aiSettings: { provider: 'deepseek', model: 'deepseek-flash', temperature: 0.8, maxTokens: 32000 },
    overview: { title: '街の灯', tagline: 'T', playerSynopsis: 'P', hook: 'H', recommendedSkills: ['知覚'], estimatedPlayTime: '', recommendedPlayers: '' },
    truth: {
      summary: '真相', backstory: '経緯', antagonist: '黒幕', antagonistGoal: '目的',
      pastEvents: [{ time: '昔', event: '事件' }], countdown: [{ time: '夜', event: '崩壊' }],
      keyRevelations: [{ id: 'rev-1', fact: '事実', importance: 'critical' }]
    },
    npcs: [{ id: 'npc-1', name: '支部長', role: '依頼人', description: 'D', personality: 'P', motivation: 'M', secret: 'S', stats: 'X', dialogueExamples: ['「頼む」'], attitude: 'friendly' }],
    locations: [{ id: 'loc-1', name: '支部', description: 'D', atmosphere: 'A', features: ['端末'] }],
    clues: [{ id: 'clue-1', revelationId: 'rev-1', title: '記録', description: 'd', locationId: 'loc-1', npcId: 'npc-1', discovery: { skill: '〈情報：UGN〉', difficulty: '目標値8', notes: '' }, handout: '一行目\n二行目' }],
    scenes: [{
      id: 'scene-1', title: '襲撃', type: 'combat', locationId: 'loc-1', readAloud: '爆音', gmNotes: 'N', objectives: ['生き残る'],
      checks: [{ skill: '〈知覚〉', difficulty: '目標値9', success: 's', failure: 'f' }], clueIds: ['clue-1'], npcIds: ['npc-1'], nextSceneIds: [],
      encounter: { enemies: [{ name: 'ジャーム', count: 2, stats: 'HP30', tactics: '突撃' }], notes: '増援あり' }
    }],
    endings: [{ id: 'end-1', title: '帰還', condition: 'C', description: 'D', rewards: '経験点5' }],
    pregens: [{ id: 'pc-1', name: '結城', concept: 'UGNエージェント', background: 'B', hook: 'H', personalGoal: 'G', stats: 'S', skills: ['白兵 2'], equipment: ['拳銃'], roleplayTips: 'R' }],
    gmGuide: { pacing: '3時間', tips: ['T'], rescueMeasures: ['R'], safetyNotes: 'S' },
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides
  }
}

beforeEach(() => complete.mockReset())

describe('GMAssistantService', () => {
  it('sends the scenario as context and streams the answer', async () => {
    complete.mockImplementation(async (_req, { onDelta }) => {
      onDelta('案1')
      onDelta(': 支部長に相談させる')
      return { content: ' 案1: 支部長に相談させる ', finishReason: 'stop', usage: { inputTokens: 1, outputTokens: 2 } }
    })
    const partials: string[] = []
    const onUsage = jest.fn()
    const history = Array.from({ length: 20 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}` }))

    const answer = await GMAssistantService.ask(scenario(), history, 'どうする？', p => partials.push(p), onUsage)

    expect(answer).toBe('案1: 支部長に相談させる')
    expect(partials).toEqual(['案1', '案1: 支部長に相談させる'])
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 1, outputTokens: 2 })
    const request = complete.mock.calls[0][0]
    expect(request.messages[0].content).toContain('ダブルクロス')
    expect(request.messages).toHaveLength(1 + 12 + 1)
    expect(request.maxTokens).toBe(16000)
  })
})

describe('TRPGScenarioFlowExecutor section operations', () => {
  const settings = { provider: 'deepseek' as const, model: 'deepseek-flash', temperature: 0.9, maxTokens: 32000 }

  it('regenerates endings and keeps other sections', async () => {
    complete.mockResolvedValue(reply({ endings: [{ title: '新しい結末' }], gmGuide: { pacing: '2時間' } }))
    const { patch, report } = await new TRPGScenarioFlowExecutor(settings).regenerateSection(scenario(), 'endings', '明るく')
    expect(patch.endings?.[0].title).toBe('新しい結末')
    expect(patch.scenes?.[0].title).toBe('襲撃')
    expect(report).toEqual({ remapped: 0, removed: 0 })
    expect(complete.mock.calls[0][0].messages[1].content).toContain('明るく')
  })

  it.each([
    ['concept', { overview: { title: '新' }, truth: { keyRevelations: [{ id: 'rev-1', fact: '事実' }] } }, 'overview'],
    ['locationsAndClues', { locations: [{ id: 'loc-1', name: '支部' }], clues: [] }, 'locations'],
    ['scenes', { scenes: [{ id: 'scene-1', title: 'S', type: 'climax' }] }, 'scenes'],
    ['pregens', { pregens: [{ name: 'PC' }] }, 'pregens']
  ] as const)('regenerates %s', async (section, data, key) => {
    complete.mockResolvedValue(reply(data))
    const { patch } = await new TRPGScenarioFlowExecutor(settings).regenerateSection(scenario(), section)
    expect(patch[key]).toBeDefined()
    expect(patch.validation).toBeDefined()
  })

  it('reinforces clues only when needed', async () => {
    const executor = new TRPGScenarioFlowExecutor(settings)
    const ok = scenario({ clues: [1, 2, 3].map(n => ({ ...scenario().clues[0], id: `clue-${n}` })) })
    ok.scenes[0].clueIds = ['clue-1', 'clue-2', 'clue-3']
    expect(await executor.reinforceClues(ok)).toEqual({ validation: expect.objectContaining({ needsRepair: false }) })
    expect(complete).not.toHaveBeenCalled()

    complete.mockResolvedValue(reply({ clues: [{ revelationId: 'rev-1', sceneId: 'scene-1', title: '追加', description: 'x' }, { revelationId: 'rev-1', sceneId: 'scene-1', title: '追加2', description: 'y' }] }))
    const patch = await executor.reinforceClues(scenario())
    expect(patch.clues).toHaveLength(3)
    expect(patch.validation?.needsRepair).toBe(false)
  })

  it('reviews content and warns when the response is cut off', async () => {
    const logs: string[] = []
    const executor = new TRPGScenarioFlowExecutor(settings)
    executor.setFlowEngine({ log: (m: string) => logs.push(m) } as any)
    complete
      .mockResolvedValueOnce({ content: '{"summary": "途中で', finishReason: 'length' })
      .mockResolvedValueOnce(reply({ summary: 'OK', issues: [{ severity: 'error', category: 'safety', message: '流血描写がある', targetIds: ['scene-1'] }] }))
    const review = await executor.reviewContent(scenario())
    expect(review.issues[0]).toMatchObject({ severity: 'error', category: 'safety' })
    expect(logs.some(l => l.includes('最大出力トークン数'))).toBe(true)
    expect(complete.mock.calls[0][0].messages[1].content).toContain('流血')
  })

  it('gives up after two unparseable responses', async () => {
    complete.mockResolvedValue({ content: 'JSONではありません', finishReason: 'stop' })
    await expect(new TRPGScenarioFlowExecutor(settings).reviewContent(scenario())).rejects.toThrow('JSONとして解析できませんでした')
    expect(complete).toHaveBeenCalledTimes(2)
  })
})

describe('ScenarioExporter', () => {
  it('exports every section including combat, handouts, pregens and the GM guide', () => {
    const md = ScenarioExporter.toMarkdown(scenario())
    for (const text of [
      '# 街の灯', '> T', '| システム | ダブルクロス The 3rd Edition |', '**推奨技能:** 知覚',
      '#### 結城（UGNエージェント）', '## GM向け情報', '#### 経緯', '**黒幕:** 黒幕', '- **昔** 事件', '- **夜** 崩壊',
      '- 【重要】事実', '#### 支部長（依頼人）', '- 「頼む」', '#### 支部', '*A*', '| 記録 | 事実 | 支部 / 支部長 | 〈情報：UGN〉 目標値8 |',
      '> 一行目\n> 二行目', '#### シーン1: 襲撃（戦闘）', '**場所:** 支部', '> 爆音', '- **ジャーム** ×2', '- 増援あり',
      '**入手できる手がかり:** 記録', '**登場NPC:** 支部長', '**報酬:** 経験点5', '### GM向けガイド', '**救済策**'
    ]) {
      expect(md).toContain(text)
    }
  })

  it('handles an empty scenario', () => {
    const md = ScenarioExporter.toMarkdown(scenario({ overview: undefined, truth: undefined, npcs: [], locations: [], clues: [], scenes: [], endings: [], pregens: [], gmGuide: undefined }))
    expect(md.startsWith('# 無題のシナリオ')).toBe(true)
  })
})

describe('default AI settings', () => {
  beforeEach(() => localStorage.clear())

  it('saves and loads settings and ignores broken values', () => {
    expect(loadDefaultAISettings()).toEqual(INITIAL_AI_SETTINGS)
    saveDefaultAISettings({ provider: 'gemini', model: 'gemini-3.8-flash', temperature: 1 })
    expect(loadDefaultAISettings()).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', temperature: 1 })

    localStorage.setItem('trpg-scenario-ai-settings', JSON.stringify({ provider: 'unknown', model: 'x' }))
    expect(loadDefaultAISettings()).toEqual(INITIAL_AI_SETTINGS)
    localStorage.setItem('trpg-scenario-ai-settings', '{broken')
    expect(loadDefaultAISettings()).toEqual(INITIAL_AI_SETTINGS)
  })
})

describe('scenario store fallback', () => {
  it('uses localStorage when IndexedDB is unavailable', async () => {
    const original = globalThis.indexedDB
    // @ts-expect-error IndexedDB がない環境を再現する
    delete globalThis.indexedDB
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.clear()
    try {
      const store = await openScenarioStore()
      expect(store.kind).toBe('localstorage')
      await store.put(scenario())
      expect(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)!)).toHaveLength(1)
      expect(await store.loadAll()).toHaveLength(1)
      await store.remove('s')
      expect(await store.loadAll()).toHaveLength(0)
    } finally {
      globalThis.indexedDB = original
      jest.restoreAllMocks()
    }
  })
})

describe('storage info', () => {
  it('reports usage when the Storage API is available', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 2048, quota: 10 * 1024 ** 3 }),
        persisted: async () => false,
        persist: async () => true
      }
    })
    expect(await getStorageInfo()).toEqual({ usageBytes: 2048, quotaBytes: 10 * 1024 ** 3, persisted: false })
    expect(await requestPersistentStorage()).toBe(true)
    expect(formatBytes(2048)).toBe('2KB')
    expect(formatBytes(10 * 1024 ** 3)).toBe('10.0GB')
    expect(formatBytes(3 * 1024 ** 2)).toBe('3.0MB')
    expect(formatBytes(10)).toBe('10B')
  })
})
