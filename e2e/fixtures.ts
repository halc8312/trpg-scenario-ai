import { Page, Route } from '@playwright/test'

// AIの応答を固定の内容に差し替えるためのデータとヘルパー

// 使用量は1回あたり入力1,000 / 出力500トークンとして返す
const USAGE = { inputTokens: 1000, outputTokens: 500 }
const json = (data: unknown) => ({ content: '```json\n' + JSON.stringify(data) + '\n```', finishReason: 'stop', usage: USAGE })

export const AI_RESPONSES = {
  concept: json({
    overview: {
      title: '霧隠れ村の祭囃子',
      tagline: '祭りの夜、村人がひとり消える',
      playerSynopsis: '山奥の霧隠村では年に一度の祭りが近づいている。',
      hook: '探索者の友人・佐伯から「妹が村で消えた」と連絡が入る。',
      recommendedSkills: ['目星', '図書館', '心理学'],
      estimatedPlayTime: 'ボイセ3時間',
      recommendedPlayers: '3人'
    },
    truth: {
      summary: '神主の宗像が、古い神を鎮めるために村人を生贄にしている。',
      backstory: '百年前の飢饉以来、村では密かに儀式が続いてきた。',
      antagonist: '神主・宗像',
      antagonistGoal: '祭りの夜に生贄を捧げる',
      pastEvents: [{ time: '百年前', event: '飢饉と最初の儀式' }],
      countdown: [{ time: '祭り当日 深夜', event: '佐伯の妹が生贄にされる' }],
      keyRevelations: [
        { id: 'rev-1', fact: '神主が失踪事件の犯人である', importance: 'critical' },
        { id: 'rev-2', fact: '儀式は祭りの夜、神社の奥の洞窟で行われる', importance: 'critical' },
        { id: 'rev-3', fact: '村の古い神の正体', importance: 'optional' }
      ]
    }
  }),
  npcs: json({
    npcs: [
      { id: 'npc-1', name: '宗像 巌', role: '黒幕（神主）', personality: '温厚を装う', motivation: '村を守る', secret: '生贄の儀式を主導', stats: 'STR50 CON60 POW80 耐久力12', dialogueExamples: ['祭りの準備で忙しくてね'], attitude: 'hostile' },
      { id: 'npc-2', name: '佐伯 翔太', role: '依頼人', attitude: 'friendly', dialogueExamples: ['頼む、妹を探してくれ'] }
    ]
  }),
  clues: json({
    locations: [
      { id: 'loc-1', name: '霧隠神社', description: '苔むした石段の上の古社', atmosphere: '静まり返っている', features: ['本殿', '社務所'] },
      { id: 'loc-2', name: '村の図書室', description: '公民館の一角' }
    ],
    clues: [
      { id: 'clue-1', revelationId: 'rev-1', title: '血のついた祭具', description: '社務所の奥に血痕のある祭具', locationId: 'loc-1', discovery: { skill: '目星', difficulty: 'レギュラー', notes: '失敗しても聞き耳で物音に気付ける' } },
      { id: 'clue-2', revelationId: 'rev-1', title: '村人の噂', description: '神主が夜に出歩いている', npcId: 'npc-2', discovery: { skill: '説得', difficulty: 'レギュラー' } },
      { id: 'clue-3', revelationId: 'rev-2', title: '古文書', description: '祭りの夜に洞窟で…', locationId: 'loc-2', discovery: { skill: '図書館', difficulty: 'ハード' }, handout: '「満月ノ夜、洞ニテ神ヲ鎮ムベシ」' },
      { id: 'clue-4', revelationId: 'rev-2', title: '洞窟への足跡', description: '神社裏に続く足跡', locationId: 'loc-1', discovery: { skill: '追跡', difficulty: 'レギュラー' } },
      { id: 'clue-5', revelationId: 'rev-2', title: '神主の日記', description: '儀式の段取り', locationId: 'loc-1', discovery: { skill: '鍵開け', difficulty: 'レギュラー' } }
    ]
  }),
  scenes: json({
    scenes: [
      { id: 'scene-1', title: '友人からの依頼', type: 'intro', readAloud: '夜更けに電話が鳴った。', gmNotes: '佐伯の焦りを演出', objectives: ['村へ向かう'], npcIds: ['npc-2'], clueIds: ['clue-2'], nextSceneIds: ['scene-2', 'scene-3'] },
      { id: 'scene-2', title: '霧隠神社', type: 'investigation', locationId: 'loc-1', readAloud: '霧の中に鳥居が浮かぶ。', checks: [{ skill: '目星', difficulty: 'レギュラー', success: '祭具の血痕に気付く', failure: '神主に声をかけられる' }], clueIds: ['clue-1', 'clue-4', 'clue-5'], npcIds: ['npc-1'], nextSceneIds: ['scene-4'] },
      { id: 'scene-3', title: '図書室の古文書', type: 'investigation', locationId: 'loc-2', clueIds: ['clue-3'], nextSceneIds: ['scene-4'] },
      { id: 'scene-4', title: '洞窟の儀式', type: 'climax', readAloud: '松明の火が揺れる。', encounter: { enemies: [{ name: '宗像 巌', count: 1, stats: '耐久力12 / 儀式短剣 50% 1D4+2', tactics: '儀式の完成を優先' }], notes: '正気度ロール 1/1D6' }, npcIds: ['npc-1'] }
    ]
  }),
  endings: json({
    endings: [
      { id: 'end-1', title: '祭りの終わり', condition: '儀式を阻止し妹を救出', description: '夜明けの霧が晴れる', rewards: '正気度 1D10 回復' },
      { id: 'end-2', title: '祭囃子は続く', condition: '儀式を阻止できない', description: '祭囃子が鳴り止まない', rewards: 'なし' }
    ],
    gmGuide: { pacing: '導入15分、調査120分、クライマックス30分', tips: ['霧の描写で不安を煽る'], rescueMeasures: ['佐伯が新たな情報を持ってくる'], safetyNotes: '生贄の描写は控えめに' }
  }),
  repair: json({
    clues: [
      { revelationId: 'rev-1', sceneId: 'scene-3', title: '失踪者の名簿', description: '失踪者は全員祭りの前に神主と面会していた', locationId: 'loc-2', discovery: { skill: '図書館', difficulty: 'レギュラー' } }
    ]
  }),
  pregens: json({
    pregens: [
      { id: 'pc-1', name: '古賀 明', concept: '新聞記者', background: '地方紙の記者', hook: '失踪事件を追っている', personalGoal: 'スクープを掴む', stats: 'STR50 INT70', skills: ['図書館 70%', '説得 60%'], equipment: ['手帳'], roleplayTips: '好奇心旺盛に' },
      { id: 'pc-2', name: '三浦 静', concept: '医師', hook: '佐伯の妹の主治医', skills: ['医学 70%'] },
      { id: 'pc-3', name: '堂島 剛', concept: '元刑事', hook: '佐伯の旧友', skills: ['目星 70%'] }
    ]
  }),
  review: json({
    summary: '全体として筋は通っていますが、細かな食い違いがあります。',
    issues: [
      { severity: 'warning', category: 'contradiction', targetIds: ['clue-3'], message: '古文書は「満月の夜」としているが、真相では祭りの夜とされている', suggestion: '祭りの日を満月に設定する' }
    ]
  }),
  gm: { content: '案1: 佐伯に「あそこは子どもの頃から近づくなと言われていた」と言わせ、神社に誘導する。\n案2: 〈聞き耳〉で遠くの祭囃子を聞かせる。', finishReason: 'stop' }
}

export type AIResponseKind = keyof typeof AI_RESPONSES | 'unknown'

export function classifyRequest(body: { messages: { role: string; content: string }[] }): AIResponseKind {
  const system = body.messages.find(m => m.role === 'system')?.content ?? ''
  const last = body.messages[body.messages.length - 1]?.content ?? ''
  if (system.includes('アシスタント')) return 'gm'
  if (last.includes('手がかりが不足')) return 'repair'
  if (last.includes('内容の整合性をレビュー')) return 'review'
  if (last.includes('サンプルキャラクター（PC）を')) return 'pregens'
  if (last.includes('概要と真相を設計')) return 'concept'
  if (last.includes('NPCを設計')) return 'npcs'
  if (last.includes('探索場所と手がかりを設計')) return 'clues'
  if (last.includes('シーン構成を設計')) return 'scenes'
  if (last.includes('エンディングと')) return 'endings'
  return 'unknown'
}

export interface MockAIOptions {
  // 特定の種類の応答を上書きする（エラーを返すなど）
  override?: (kind: AIResponseKind, route: Route) => Promise<boolean> | boolean
  delayMs?: number
}

/**
 * /api/ai/complete への呼び出しを横取りして固定の応答を返す。呼び出された種類の一覧を返す。
 */
export async function mockAI(page: Page, options: MockAIOptions = {}) {
  const calls: { kind: AIResponseKind; body: any }[] = []
  await page.route('**/api/ai/complete', async route => {
    const body = route.request().postDataJSON()
    const kind = classifyRequest(body)
    calls.push({ kind, body })
    if (options.delayMs) await new Promise(r => setTimeout(r, options.delayMs))
    if (options.override && (await options.override(kind, route))) return
    await fulfillAI(route, kind === 'unknown' ? { content: '', finishReason: 'stop' } : AI_RESPONSES[kind])
  })
  return calls
}

/**
 * AIの応答を返す。ストリーミング要求にはNDJSON（本文を3分割した差分 + 完了イベント）で返す。
 */
export async function fulfillAI(route: Route, response: { content: string; finishReason: string }) {
  const body = route.request().postDataJSON()
  if (!body.stream) {
    await route.fulfill({ json: response })
    return
  }
  const size = Math.ceil(response.content.length / 3) || 1
  const deltas = [0, 1, 2].map(i => response.content.slice(i * size, (i + 1) * size)).filter(Boolean)
  const lines = [...deltas.map(text => ({ type: 'delta', text })), { type: 'done', response }]
  await route.fulfill({
    contentType: 'application/x-ndjson',
    body: lines.map(line => JSON.stringify(line)).join('\n') + '\n'
  })
}

/**
 * 新規作成フォームからシナリオを作り、生成完了まで待つ。
 */
export async function createScenario(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '新規シナリオ' }).first().click()
  await page.getByPlaceholder(/閉鎖された山奥の温泉宿/).fill('山奥の村の祭りで人が消える')
  await page.getByRole('button', { name: '作成して生成開始' }).click()
  await page.getByText('シナリオが完成しました').waitFor({ timeout: 30_000 })
}
