import { SCENE_TYPE_LABELS } from '@/lib/services/scenario-exporter'
import { TRPGScenario } from '@/lib/types'

// シナリオの各要素を編集フォームとして描画するための定義

export type RefType = 'revelation' | 'location' | 'npc' | 'clue' | 'scene'

export type FieldDef =
  | { key: string; label: string; type: 'text' | 'textarea' | 'number' }
  | { key: string; label: string; type: 'stringList'; hint?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] }
  | { key: string; label: string; type: 'ref'; refType: RefType }
  | { key: string; label: string; type: 'refList'; refType: RefType }
  | {
      key: string
      label: string
      type: 'objectList'
      fields: FieldDef[]
      itemLabel: string
      idPrefix?: string
      newItem: () => Record<string, unknown>
    }
  | { key: string; label: string; type: 'optionalObject'; fields: FieldDef[]; newValue: () => Record<string, unknown> }

export type RefOptions = Record<RefType, { value: string; label: string }[]>

export function buildRefOptions(scenario: TRPGScenario): RefOptions {
  return {
    revelation: (scenario.truth?.keyRevelations ?? []).map(r => ({ value: r.id, label: r.fact || r.id })),
    location: scenario.locations.map(l => ({ value: l.id, label: l.name || l.id })),
    npc: scenario.npcs.map(n => ({ value: n.id, label: n.name || n.id })),
    clue: scenario.clues.map(c => ({ value: c.id, label: c.title || c.id })),
    scene: scenario.scenes.map((s, i) => ({ value: s.id, label: `#${i + 1} ${s.title || s.id}` }))
  }
}

const timelineFields: FieldDef[] = [
  { key: 'time', label: '時期', type: 'text' },
  { key: 'event', label: '出来事', type: 'textarea' }
]

export const overviewFields: FieldDef[] = [
  { key: 'title', label: 'タイトル', type: 'text' },
  { key: 'tagline', label: 'キャッチコピー', type: 'text' },
  { key: 'playerSynopsis', label: 'あらすじ（PL向け）', type: 'textarea' },
  { key: 'hook', label: '導入', type: 'textarea' },
  { key: 'recommendedSkills', label: '推奨技能', type: 'stringList', hint: '1行に1つ' },
  { key: 'estimatedPlayTime', label: 'プレイ時間', type: 'text' },
  { key: 'recommendedPlayers', label: 'プレイ人数', type: 'text' }
]

export const truthFields: FieldDef[] = [
  { key: 'summary', label: '真相の要約', type: 'textarea' },
  { key: 'backstory', label: '経緯', type: 'textarea' },
  { key: 'antagonist', label: '黒幕・脅威', type: 'text' },
  { key: 'antagonistGoal', label: '目的', type: 'textarea' },
  {
    key: 'keyRevelations',
    label: 'PLが到達すべき情報',
    type: 'objectList',
    itemLabel: 'fact',
    idPrefix: 'rev',
    fields: [
      { key: 'fact', label: '事実', type: 'textarea' },
      {
        key: 'importance',
        label: '重要度',
        type: 'select',
        options: [
          { value: 'critical', label: '重要（クライマックスに必須）' },
          { value: 'optional', label: '任意' }
        ]
      }
    ],
    newItem: () => ({ fact: '', importance: 'critical' })
  },
  { key: 'pastEvents', label: '過去の出来事', type: 'objectList', itemLabel: 'time', fields: timelineFields, newItem: () => ({ time: '', event: '' }) },
  {
    key: 'countdown',
    label: 'タイムライン（PCが介入しなかった場合）',
    type: 'objectList',
    itemLabel: 'time',
    fields: timelineFields,
    newItem: () => ({ time: '', event: '' })
  }
]

export const npcFields: FieldDef[] = [
  { key: 'name', label: '名前', type: 'text' },
  { key: 'role', label: '役割', type: 'text' },
  {
    key: 'attitude',
    label: 'PCへの態度',
    type: 'select',
    options: [
      { value: 'friendly', label: '友好的' },
      { value: 'neutral', label: '中立' },
      { value: 'hostile', label: '敵対的' }
    ]
  },
  { key: 'description', label: '外見・立場', type: 'textarea' },
  { key: 'personality', label: '性格・口調', type: 'textarea' },
  { key: 'motivation', label: '動機', type: 'textarea' },
  { key: 'secret', label: '秘密', type: 'textarea' },
  { key: 'stats', label: 'データ', type: 'textarea' },
  { key: 'dialogueExamples', label: '台詞例', type: 'stringList', hint: '1行に1つ' }
]

export const locationFields: FieldDef[] = [
  { key: 'name', label: '名前', type: 'text' },
  { key: 'description', label: '描写', type: 'textarea' },
  { key: 'atmosphere', label: '雰囲気', type: 'text' },
  { key: 'features', label: '調べられるもの', type: 'stringList', hint: '1行に1つ' }
]

export const clueFields: FieldDef[] = [
  { key: 'title', label: '名前', type: 'text' },
  { key: 'revelationId', label: '判明する重要情報', type: 'ref', refType: 'revelation' },
  { key: 'description', label: 'PLが得られる情報', type: 'textarea' },
  { key: 'locationId', label: '場所', type: 'ref', refType: 'location' },
  { key: 'npcId', label: 'NPC', type: 'ref', refType: 'npc' },
  {
    key: 'discovery',
    label: '入手方法',
    type: 'optionalObject',
    fields: [
      { key: 'skill', label: '技能・判定', type: 'text' },
      { key: 'difficulty', label: '難易度', type: 'text' },
      { key: 'notes', label: '失敗時の扱い・補足', type: 'textarea' }
    ],
    newValue: () => ({ skill: '', difficulty: '', notes: '' })
  },
  { key: 'handout', label: 'ハンドアウト本文', type: 'textarea' }
]

export const sceneFields: FieldDef[] = [
  { key: 'title', label: 'シーン名', type: 'text' },
  {
    key: 'type',
    label: '種類',
    type: 'select',
    options: Object.entries(SCENE_TYPE_LABELS).map(([value, label]) => ({ value, label }))
  },
  { key: 'locationId', label: '場所', type: 'ref', refType: 'location' },
  { key: 'readAloud', label: '読み上げ文', type: 'textarea' },
  { key: 'gmNotes', label: '進行メモ', type: 'textarea' },
  { key: 'objectives', label: '目的', type: 'stringList', hint: '1行に1つ' },
  {
    key: 'checks',
    label: '判定',
    type: 'objectList',
    itemLabel: 'skill',
    fields: [
      { key: 'skill', label: '技能・判定', type: 'text' },
      { key: 'difficulty', label: '難易度', type: 'text' },
      { key: 'success', label: '成功時', type: 'textarea' },
      { key: 'failure', label: '失敗時', type: 'textarea' }
    ],
    newItem: () => ({ skill: '', difficulty: '', success: '', failure: '' })
  },
  { key: 'clueIds', label: '入手できる手がかり', type: 'refList', refType: 'clue' },
  { key: 'npcIds', label: '登場NPC', type: 'refList', refType: 'npc' },
  { key: 'nextSceneIds', label: '次のシーン', type: 'refList', refType: 'scene' },
  {
    key: 'encounter',
    label: '戦闘',
    type: 'optionalObject',
    fields: [
      {
        key: 'enemies',
        label: '敵',
        type: 'objectList',
        itemLabel: 'name',
        fields: [
          { key: 'name', label: '名前', type: 'text' },
          { key: 'count', label: '数', type: 'number' },
          { key: 'stats', label: 'データ', type: 'textarea' },
          { key: 'tactics', label: '戦術', type: 'textarea' }
        ],
        newItem: () => ({ name: '', count: 1, stats: '', tactics: '' })
      },
      { key: 'notes', label: '補足', type: 'textarea' }
    ],
    newValue: () => ({ enemies: [], notes: '' })
  }
]

export const pregenFields: FieldDef[] = [
  { key: 'name', label: '名前', type: 'text' },
  { key: 'concept', label: '職業・クラス', type: 'text' },
  { key: 'background', label: '経歴', type: 'textarea' },
  { key: 'hook', label: '事件に関わる理由', type: 'textarea' },
  { key: 'personalGoal', label: '個人的な目的', type: 'textarea' },
  { key: 'stats', label: 'データ', type: 'textarea' },
  { key: 'skills', label: '技能', type: 'stringList', hint: '1行に1つ' },
  { key: 'equipment', label: '所持品', type: 'stringList', hint: '1行に1つ' },
  { key: 'roleplayTips', label: '演じ方のヒント', type: 'textarea' }
]

export const endingFields: FieldDef[] = [
  { key: 'title', label: 'エンディング名', type: 'text' },
  { key: 'condition', label: '到達条件', type: 'textarea' },
  { key: 'description', label: '結末', type: 'textarea' },
  { key: 'rewards', label: '報酬', type: 'textarea' }
]

export const gmGuideFields: FieldDef[] = [
  { key: 'pacing', label: '時間配分', type: 'textarea' },
  { key: 'tips', label: '進行のコツ', type: 'stringList', hint: '1行に1つ' },
  { key: 'rescueMeasures', label: '救済策', type: 'stringList', hint: '1行に1つ' },
  { key: 'safetyNotes', label: '注意事項', type: 'textarea' }
]

// 既存のIDと重ならない新しいIDを作る
export function nextId(prefix: string, existing: { id?: unknown }[]): string {
  const used = new Set(existing.map(e => String(e.id)))
  let n = existing.length + 1
  while (used.has(`${prefix}-${n}`)) n++
  return `${prefix}-${n}`
}
