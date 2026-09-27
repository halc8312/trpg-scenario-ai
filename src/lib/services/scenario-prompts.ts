import {
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  getGameSystem,
  recommendedSceneRange
} from '@/data/game-systems'
import {
  ScenarioClue,
  ScenarioLocation,
  ScenarioNPC,
  ScenarioOverview,
  ScenarioRequest,
  ScenarioScene,
  ScenarioTruth,
  TRPGScenario
} from '@/lib/types'
import { MIN_CLUES_PER_CRITICAL_REVELATION } from './scenario-validator'

export interface ScenarioPromptContext {
  request: ScenarioRequest
  overview?: ScenarioOverview
  truth?: ScenarioTruth
  npcs?: ScenarioNPC[]
  locations?: ScenarioLocation[]
  clues?: ScenarioClue[]
  scenes?: ScenarioScene[]
  // ユーザーからの追加指示（再生成時）
  instruction?: string
}

export function buildSystemPrompt(request: ScenarioRequest): string {
  const system = getGameSystem(request.systemId)
  return `あなたは数多くの卓を回してきた熟練の${system.gmTitle}であり、商業レベルのTRPGシナリオライターです。
「${system.name}」用のシナリオを、実際のセッションでそのまま使える品質で設計します。

# システム情報
- ダイスと判定: ${system.diceSystem}
- 判定の書き方: ${system.checkGuidelines}
- 判定の記述例: ${system.difficultyExamples.join(' / ')}
- よく使う技能・判定: ${system.commonSkills.join('、')}
- 設計上の注意: ${system.designNotes}

# シナリオ設計の原則
- PLが「何をすればいいか」迷わないよう、各シーンに明確な目的と行動の選択肢を用意する
- 重要な情報には複数の入手経路を用意し、1回の判定失敗でシナリオが止まらないようにする
- PCの選択が展開や結末に影響する余地を残す（一本道にしすぎない）
- NPCには行動原理を持たせ、PLの働きかけに反応できるようにする
- 避けたい要素として指定された内容は絶対に含めない

# 出力ルール
- すべて日本語で書く
- 指定されたJSON形式のみを \`\`\`json コードブロックで出力し、前後に説明文を付けない
- IDは指定された接頭辞 + 連番（例: npc-1, loc-2）で振り、参照には必ず定義済みのIDを使う`
}

function formatRequest(request: ScenarioRequest): string {
  const system = getGameSystem(request.systemId)
  const lines = [
    `- システム: ${system.name}`,
    request.workingTitle ? `- 仮タイトル: ${request.workingTitle}` : null,
    `- ジャンル: ${request.genre}`,
    `- トーン: ${request.tone}`,
    `- プレイ人数: ${request.playerCount}人`,
    `- 想定プレイ時間: ${request.sessionHours}時間`,
    `- 難易度: ${DIFFICULTY_LABELS[request.difficulty]}（${DIFFICULTY_DESCRIPTIONS[request.difficulty]}）`,
    request.setting ? `- 舞台: ${request.setting}` : null,
    `- アイデア・あらすじ: ${request.premise || '（指定なし。ジャンルとトーンから魅力的な題材を考案すること）'}`,
    request.mustInclude ? `- 必ず含めたい要素: ${request.mustInclude}` : null,
    request.avoid ? `- 避けたい要素（絶対に含めない）: ${request.avoid}` : null
  ]
  return lines.filter(Boolean).join('\n')
}

function formatInstruction(instruction?: string): string {
  return instruction ? `\n# 追加の指示（最優先で反映すること）\n${instruction}\n` : ''
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function buildConceptPrompt(ctx: ScenarioPromptContext): string {
  return `以下の依頼に基づき、シナリオの概要と真相を設計してください。

# 依頼内容
${formatRequest(ctx.request)}
${formatInstruction(ctx.instruction)}
# 設計の要点
- overview はPLに公開してよい情報のみ（ネタバレ禁止）
- hook は「なぜPCたちがこの事件に関わるのか」を具体的に書いた導入
- truth は${getGameSystem(ctx.request.systemId).gmTitle}だけが知る真相。事件の黒幕・動機・経緯を筋が通るように
- keyRevelations はPLが探索で明らかにすべき事実。クライマックスに必要な critical を3〜5個、深掘り用の optional を1〜3個
- countdown はPCが何もしなかった場合に時間経過で起きる出来事（緊張感を生む時間制限）

# 出力形式
\`\`\`json
{
  "overview": {
    "title": "シナリオタイトル",
    "tagline": "一行キャッチコピー",
    "playerSynopsis": "PL向けのあらすじ（200〜300字、ネタバレなし）",
    "hook": "PCが事件に関わる導入（具体的な状況と依頼・動機）",
    "recommendedSkills": ["推奨技能"],
    "estimatedPlayTime": "例: ボイスセッション${ctx.request.sessionHours}時間",
    "recommendedPlayers": "例: ${ctx.request.playerCount}人（推奨）"
  },
  "truth": {
    "summary": "真相の要約（300字程度）",
    "backstory": "事件に至るまでの経緯（詳細）",
    "antagonist": "黒幕・脅威の正体",
    "antagonistGoal": "黒幕の目的と手段",
    "pastEvents": [{ "time": "3年前", "event": "出来事" }],
    "countdown": [{ "time": "1日目 夜", "event": "PCが介入しなかった場合に起きること" }],
    "keyRevelations": [
      { "id": "rev-1", "fact": "PLが突き止めるべき事実", "importance": "critical" }
    ]
  }
}
\`\`\``
}

export function buildNPCPrompt(ctx: ScenarioPromptContext): string {
  const system = getGameSystem(ctx.request.systemId)
  return `以下のシナリオに登場するNPCを設計してください。

# 依頼内容
${formatRequest(ctx.request)}

# シナリオ概要
${json(ctx.overview)}

# 真相（${system.gmTitle}のみが知る情報）
${json(ctx.truth)}
${formatInstruction(ctx.instruction)}
# 設計の要点
- 4〜7人。依頼人・協力者・情報源・容疑者・黒幕（または黒幕の手先）など役割を分散させる
- 各NPCは真相の一部を知っている、または誤解している。secret にその内容を書く
- PLが話しかけたときにすぐ演じられるよう、口調がわかる台詞例を2〜3個
- stats は「${system.npcStatFormat}」を簡潔に1〜3行で

# 出力形式
\`\`\`json
{
  "npcs": [
    {
      "id": "npc-1",
      "name": "名前",
      "role": "シナリオ上の役割（例: 依頼人）",
      "description": "外見・立場",
      "personality": "性格・口調",
      "motivation": "行動原理",
      "secret": "隠していること・知っている真相の断片",
      "stats": "データ",
      "dialogueExamples": ["台詞例"],
      "attitude": "friendly | neutral | hostile"
    }
  ]
}
\`\`\``
}

export function buildLocationsAndCluesPrompt(ctx: ScenarioPromptContext): string {
  const system = getGameSystem(ctx.request.systemId)
  return `以下のシナリオの探索場所と手がかりを設計してください。

# 依頼内容
${formatRequest(ctx.request)}

# 真相
${json(ctx.truth)}

# NPC
${json(summarizeNPCs(ctx.npcs))}
${formatInstruction(ctx.instruction)}
# 設計の要点
- 探索場所は4〜7箇所。雰囲気と、PLが調べたくなる特徴（features）を具体的に
- 手がかりは keyRevelations の各事実に紐づける（revelationId）
- critical な事実には、それぞれ異なる場所・NPC・手段で最低${MIN_CLUES_PER_CRITICAL_REVELATION}個の手がかりを用意する
- 手がかりは場所（locationId）かNPC（npcId）の少なくとも一方に紐づける
- discovery には入手に必要な判定（${system.difficultyExamples.slice(0, 2).join(' / ')} のような書式）と、失敗時の扱いを書く
- 日記・手紙・新聞記事など、PLに渡せる資料は handout に本文を書く

# 出力形式
\`\`\`json
{
  "locations": [
    { "id": "loc-1", "name": "場所名", "description": "描写", "atmosphere": "雰囲気", "features": ["調べられるもの"] }
  ],
  "clues": [
    {
      "id": "clue-1",
      "revelationId": "rev-1",
      "title": "手がかりの名前",
      "description": "PLが得られる情報",
      "locationId": "loc-1",
      "npcId": "npc-1",
      "discovery": { "skill": "技能・判定", "difficulty": "難易度", "notes": "失敗時の扱い・別の入手方法" },
      "handout": "ハンドアウト本文（任意）"
    }
  ]
}
\`\`\``
}

export function buildScenesPrompt(ctx: ScenarioPromptContext): string {
  const system = getGameSystem(ctx.request.systemId)
  const { min, max } = recommendedSceneRange(ctx.request.sessionHours)
  return `以下の素材を使って、セッションのシーン構成を設計してください。

# 依頼内容
${formatRequest(ctx.request)}

# 概要と導入
${json({ title: ctx.overview?.title, hook: ctx.overview?.hook })}

# 真相
${json({ summary: ctx.truth?.summary, countdown: ctx.truth?.countdown, keyRevelations: ctx.truth?.keyRevelations })}

# NPC
${json(summarizeNPCs(ctx.npcs))}

# 場所
${json((ctx.locations ?? []).map(l => ({ id: l.id, name: l.name })))}

# 手がかり
${json((ctx.clues ?? []).map(c => ({ id: c.id, title: c.title, revelationId: c.revelationId, locationId: c.locationId, npcId: c.npcId })))}
${formatInstruction(ctx.instruction)}
# 設計の要点
- シーン数は${min}〜${max}個。最初は type "intro"、終盤に type "climax" を置く
- 中盤は探索・交流シーンを並列に選べる構造にし、nextSceneIds で遷移先を複数指定してよい
- すべての手がかりを、いずれかのシーンの clueIds に配置する
- readAloud は${system.gmTitle}が読み上げる描写文（2〜4文、PLに見えるものだけ）
- gmNotes には進行のコツ、NPCの動き、PLが詰まった時の誘導を書く
- checks には主要な判定と成功・失敗時の結果を書く（${system.checkGuidelines}）
- 戦闘があるシーンは type "combat" または "climax" とし、encounter に敵データ（${system.enemyStatFormat}）と戦術を書く
- 難易度「${DIFFICULTY_LABELS[ctx.request.difficulty]}」とプレイ人数${ctx.request.playerCount}人に合った敵の強さ・数にする

# 出力形式
\`\`\`json
{
  "scenes": [
    {
      "id": "scene-1",
      "title": "シーン名",
      "type": "intro | investigation | social | combat | climax | ending | other",
      "locationId": "loc-1",
      "readAloud": "読み上げ文",
      "gmNotes": "${system.gmTitle}向けの進行メモ",
      "objectives": ["このシーンでPLが目指すこと"],
      "checks": [{ "skill": "技能・判定", "difficulty": "難易度", "success": "成功時", "failure": "失敗時" }],
      "clueIds": ["clue-1"],
      "npcIds": ["npc-1"],
      "nextSceneIds": ["scene-2"],
      "encounter": { "enemies": [{ "name": "敵名", "count": 1, "stats": "データ", "tactics": "戦術" }], "notes": "戦闘の補足" }
    }
  ]
}
\`\`\`
encounter は戦闘がないシーンでは省略してください。`
}

export function buildEndingsPrompt(ctx: ScenarioPromptContext): string {
  const system = getGameSystem(ctx.request.systemId)
  return `以下のシナリオのエンディングと、${system.gmTitle}向けの運営ガイドを作成してください。

# 依頼内容
${formatRequest(ctx.request)}

# 真相
${json({ summary: ctx.truth?.summary, antagonist: ctx.truth?.antagonist, antagonistGoal: ctx.truth?.antagonistGoal })}

# シーン構成
${json((ctx.scenes ?? []).map(s => ({ id: s.id, title: s.title, type: s.type, objectives: s.objectives })))}
${formatInstruction(ctx.instruction)}
# 設計の要点
- エンディングは2〜4種類。PLの行動（どこまで真相に迫ったか、誰を救ったか等）で分岐する条件を明確に
- rewards は「${system.rewardGuidelines}」を参考に具体的な数値や内容で
- pacing は時間配分の目安（例: 導入15分、調査90分…）
- rescueMeasures はPLが行き詰まった時の救済策
- safetyNotes は扱うテーマの注意点と、セッション前に共有すべき内容

# 出力形式
\`\`\`json
{
  "endings": [
    { "id": "end-1", "title": "エンディング名", "condition": "到達条件", "description": "結末の描写", "rewards": "報酬" }
  ],
  "gmGuide": {
    "pacing": "時間配分の目安",
    "tips": ["進行のコツ"],
    "rescueMeasures": ["救済策"],
    "safetyNotes": "注意事項"
  }
}
\`\`\``
}

export function buildClueRepairPrompt(ctx: ScenarioPromptContext, revelationIds: string[]): string {
  const system = getGameSystem(ctx.request.systemId)
  const targets = (ctx.truth?.keyRevelations ?? []).filter(r => revelationIds.includes(r.id))
  const existing = (ctx.clues ?? []).filter(c => revelationIds.includes(c.revelationId))

  return `シナリオの検証で、以下の重要情報に到達するための手がかりが不足していることがわかりました。
PLが1回の判定失敗で詰まらないよう、手がかりを追加してください。

# 手がかりが不足している重要情報
${json(targets)}

# 既存の手がかり（重複しない別ルートを用意すること）
${json(existing.map(c => ({ id: c.id, revelationId: c.revelationId, title: c.title, description: c.description })))}

# 使える場所
${json((ctx.locations ?? []).map(l => ({ id: l.id, name: l.name })))}

# 使えるNPC
${json(summarizeNPCs(ctx.npcs))}

# 使えるシーン
${json((ctx.scenes ?? []).map(s => ({ id: s.id, title: s.title, type: s.type, locationId: s.locationId })))}

# 要点
- 各重要情報について、既存と合わせて${MIN_CLUES_PER_CRITICAL_REVELATION}個以上になるように追加する
- 新しい手がかりは既存と異なる場所・NPC・技能で入手できるようにする
- sceneId には手がかりを入手できるシーンのIDを必ず指定する
- 判定は ${system.difficultyExamples.slice(0, 2).join(' / ')} のような書式で

# 出力形式
\`\`\`json
{
  "clues": [
    {
      "id": "clue-r1",
      "revelationId": "rev-1",
      "sceneId": "scene-2",
      "title": "手がかりの名前",
      "description": "PLが得られる情報",
      "locationId": "loc-1",
      "npcId": "npc-1",
      "discovery": { "skill": "技能・判定", "difficulty": "難易度", "notes": "失敗時の扱い" }
    }
  ]
}
\`\`\``
}

function summarizeNPCs(npcs?: ScenarioNPC[]) {
  return (npcs ?? []).map(n => ({ id: n.id, name: n.name, role: n.role, secret: n.secret }))
}

export function buildGMAssistantSystemPrompt(scenario: TRPGScenario): string {
  const system = getGameSystem(scenario.request.systemId)
  const digest = {
    title: scenario.overview?.title,
    truth: scenario.truth,
    npcs: scenario.npcs.map(n => ({ id: n.id, name: n.name, role: n.role, personality: n.personality, motivation: n.motivation, secret: n.secret })),
    locations: scenario.locations.map(l => ({ id: l.id, name: l.name })),
    clues: scenario.clues.map(c => ({ id: c.id, title: c.title, revelationId: c.revelationId, description: c.description })),
    scenes: scenario.scenes.map(s => ({ id: s.id, title: s.title, type: s.type, nextSceneIds: s.nextSceneIds })),
    endings: scenario.endings.map(e => ({ title: e.title, condition: e.condition }))
  }

  return `あなたはセッション中の${system.gmTitle}を支える熟練のアシスタントです。
システムは「${system.name}」（${system.diceSystem}）です。

以下のシナリオデータを前提に、${system.gmTitle}からの相談（PLの予想外の行動、NPCの即興演技、判定の裁定、展開の調整など）に答えてください。

# 回答方針
- シナリオの真相・NPCの動機と矛盾しない提案をする
- すぐ使えるよう簡潔に。選択肢がある場合は2〜3案を箇条書きで
- NPCの台詞を求められたら、そのNPCの口調で台詞例を示す
- 判定が必要なら、このシステムの書式（${system.difficultyExamples[0]} など）で具体的に提示する
- PLの楽しさを最優先し、シナリオから外れても物語が破綻しない着地点を示す

# シナリオデータ
\`\`\`json
${JSON.stringify(digest)}
\`\`\``
}
