import { ScenarioDifficulty, TRPGSystemId } from '@/lib/types'

export interface GameSystemPreset {
  id: TRPGSystemId
  name: string
  shortName: string
  // GMの呼称（KP / DM / GM）
  gmTitle: string
  diceSystem: string
  checkGuidelines: string
  difficultyExamples: string[]
  commonSkills: string[]
  npcStatFormat: string
  enemyStatFormat: string
  rewardGuidelines: string
  defaultGenres: string[]
  designNotes: string
}

export const GAME_SYSTEMS: Record<TRPGSystemId, GameSystemPreset> = {
  coc7: {
    id: 'coc7',
    name: 'クトゥルフ神話TRPG（第7版）',
    shortName: 'CoC7版',
    gmTitle: 'KP',
    diceSystem: '1d100のロールアンダー。技能値以下で成功。',
    checkGuidelines:
      '成功度は「レギュラー / ハード（技能値の1/2）/ イクストリーム（1/5）」で表現する。対抗ロール・プッシュ・ロールも活用できる。恐ろしい存在や光景には正気度ロール（成功時/失敗時の喪失量を「0/1D3」の形式で記載）を設定する。',
    difficultyExamples: ['〈目星〉レギュラー', '〈図書館〉ハード', '〈心理学〉', 'POW×5', '正気度ロール 0/1D6'],
    commonSkills: [
      '目星', '聞き耳', '図書館', '心理学', '説得', '言いくるめ', '威圧', '魅惑',
      'オカルト', 'クトゥルフ神話', '歴史', '医学', '応急手当', '鍵開け', '隠密',
      'コンピューター', '運転', '追跡', 'ナビゲート', '回避', '近接戦闘', '射撃'
    ],
    npcStatFormat: 'STR / CON / SIZ / DEX / APP / INT / POW / EDU、耐久力、主要技能3〜5個（技能名 値%）',
    enemyStatFormat: 'STR / CON / SIZ / DEX / POW、耐久力、装甲、攻撃（技能値% / ダメージ）、正気度喪失、特殊能力',
    rewardGuidelines: '正気度の回復（1D6〜1D10など）、クトゥルフ神話技能の獲得、関係者からの謝礼や情報',
    defaultGenres: ['ホラー', '現代ミステリー', '1920年代', 'クローズドサークル'],
    designNotes:
      '探索者は戦闘に弱い前提で、真相へ到達すること・生還することが目的になる構成が望ましい。神話的存在との直接戦闘は避けられる、または回避手段がある設計にする。'
  },
  dnd5e: {
    id: 'dnd5e',
    name: 'ダンジョンズ＆ドラゴンズ（第5版）',
    shortName: 'D&D5版',
    gmTitle: 'DM',
    diceSystem: '1d20 + 能力値修正 + 習熟ボーナスで難易度（DC）以上なら成功。',
    checkGuidelines:
      '能力値判定・技能判定・セーヴィング・スローは「【判断力】（〈知覚〉）判定 DC 15」の形式で書く。DCの目安は 5=非常に容易、10=容易、15=普通、20=困難、25=非常に困難。',
    difficultyExamples: ['【判断力】（〈知覚〉）DC 13', '【知力】（〈捜査〉）DC 15', '【筋力】セーヴ DC 12'],
    commonSkills: [
      '知覚', '捜査', '看破', '説得', 'ペテン', '威圧', '運動', '軽業', '隠密',
      '手先の早業', '魔法学', '歴史', '宗教', '自然', '動物使い', '医術', '生存'
    ],
    npcStatFormat: 'AC、hp、移動速度、能力値（筋/敏/耐/知/判/魅）、主要技能、脅威度（CR）',
    enemyStatFormat: 'AC、hp、移動速度、能力値、攻撃（命中ボーナス / ダメージ）、特殊能力、脅威度（CR）',
    rewardGuidelines: '経験点（遭遇の脅威度に基づく）またはマイルストーン成長、金貨、魔法のアイテム',
    defaultGenres: ['ハイファンタジー', 'ダンジョン探索', '冒険', '政治陰謀'],
    designNotes:
      '戦闘・探索・交流の3本柱をバランスよく配置する。遭遇の難易度はパーティのレベルと人数を考慮し、休息のタイミングも想定する。'
  },
  sw25: {
    id: 'sw25',
    name: 'ソード・ワールド2.5',
    shortName: 'SW2.5',
    gmTitle: 'GM',
    diceSystem: '2d6 + 判定値（技能レベル + 能力値ボーナス）で目標値以上なら成功。',
    checkGuidelines:
      '判定は「探索判定 目標値12」のように、判定パッケージ名と目標値で書く。魔物知識判定の知名度/弱点値、危険感知判定なども活用する。',
    difficultyExamples: ['探索判定 目標値11', '見識判定 目標値13', '危険感知判定 目標値12', '魔物知識判定 15/18'],
    commonSkills: [
      '探索判定', '見識判定', '聞き耳判定', '危険感知判定', '魔物知識判定',
      '隠密判定', '解除判定', '文献判定', '交渉（生命抵抗・精神抵抗）', '先制判定'
    ],
    npcStatFormat: 'レベル、主要技能（例: ファイター4 / セージ2）、生命抵抗力、精神抵抗力、HP、MP',
    enemyStatFormat: 'レベル、知名度/弱点値、命中力、打撃点、回避力、防護点、HP、MP、特殊能力、戦利品',
    rewardGuidelines: '経験点（基本 + 倒した魔物のレベル合計×10）、報酬（ガメル）、名誉点、剥ぎ取りによる戦利品',
    defaultGenres: ['冒険者の依頼', '遺跡探索', '蛮族との戦い', 'ファンタジー'],
    designNotes:
      '冒険者の宿で依頼を受ける導入が定番。依頼人・報酬・目的地を明確にし、魔物との戦闘と探索判定による情報収集を組み合わせる。'
  },
  generic: {
    id: 'generic',
    name: '汎用（システム非依存）',
    shortName: '汎用',
    gmTitle: 'GM',
    diceSystem: '使用するシステムに合わせてGMが読み替える。',
    checkGuidelines:
      '判定は「知覚系・難易度：普通」のように、行為の分類と「易しい / 普通 / 難しい / 至難」の4段階で書く。',
    difficultyExamples: ['知覚系・普通', '知識系・難しい', '交渉系・易しい', '運動系・至難'],
    commonSkills: ['知覚', '調査', '知識', '交渉', '威圧', '運動', '隠密', '技術', '医療', '戦闘'],
    npcStatFormat: '強さの目安（弱い / 普通 / 強い / 脅威）、得意なこと、苦手なこと',
    enemyStatFormat: '強さの目安、攻撃手段、防御の特徴、弱点、特殊能力',
    rewardGuidelines: '物語上の報酬（情報・人脈・アイテム）とシステムに応じた成長点',
    defaultGenres: ['ファンタジー', 'SF', '現代異能', 'ミステリー', 'ホラー'],
    designNotes: '特定のルールに依存しない書き方にし、どのシステムにもコンバートしやすい記述にする。'
  }
}

export const GAME_SYSTEM_LIST: GameSystemPreset[] = Object.values(GAME_SYSTEMS)

export function getGameSystem(id: TRPGSystemId): GameSystemPreset {
  return GAME_SYSTEMS[id] ?? GAME_SYSTEMS.generic
}

export const DIFFICULTY_LABELS: Record<ScenarioDifficulty, string> = {
  easy: '初心者向け',
  normal: '標準',
  hard: '高難度',
  deadly: '高致死率'
}

export const DIFFICULTY_DESCRIPTIONS: Record<ScenarioDifficulty, string> = {
  easy: '初心者でも迷わず進める。手がかりは見つけやすく、ロストの危険はほぼない。',
  normal: '適度な歯ごたえ。判定の失敗や判断ミスで苦戦するが、全滅は稀。',
  hard: '慎重な探索と戦術が必要。誤った選択はPCの負傷・ロストにつながる。',
  deadly: '生還自体が目標になる。容赦のない展開で、PCロストも十分にありうる。'
}

export const TONE_OPTIONS = ['シリアス', 'ダーク', '王道・熱血', 'コミカル', 'ほのぼの', '切ない', 'サスペンス']

// セッション時間から推奨シーン数を算出（1シーンあたり約30〜45分）
export function recommendedSceneRange(sessionHours: number): { min: number; max: number } {
  const hours = Math.max(1, sessionHours)
  return {
    min: Math.max(3, Math.floor((hours * 60) / 45)),
    max: Math.max(4, Math.ceil((hours * 60) / 30))
  }
}
