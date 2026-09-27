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
  pcStatFormat: string
  enemyStatFormat: string
  rewardGuidelines: string
  // セッション画面のダイスローラーに並べるよく使う表記
  dicePresets: string[]
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
    pcStatFormat: '職業、年齢、STR / CON / SIZ / DEX / APP / INT / POW / EDU、耐久力 / MP / 正気度 / 幸運、ダメージ・ボーナス',
    enemyStatFormat: 'STR / CON / SIZ / DEX / POW、耐久力、装甲、攻撃（技能値% / ダメージ）、正気度喪失、特殊能力',
    rewardGuidelines: '正気度の回復（1D6〜1D10など）、クトゥルフ神話技能の獲得、関係者からの謝礼や情報',
    dicePresets: ['CC<=50', '1D100', '1D3', '1D6', '1D10'],
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
    pcStatFormat: '種族、クラスとレベル、背景、能力値（筋/敏/耐/知/判/魅）、AC、hp、習熟ボーナス、主な攻撃・呪文',
    enemyStatFormat: 'AC、hp、移動速度、能力値、攻撃（命中ボーナス / ダメージ）、特殊能力、脅威度（CR）',
    rewardGuidelines: '経験点（遭遇の脅威度に基づく）またはマイルストーン成長、金貨、魔法のアイテム',
    dicePresets: ['1D20', '1D20+5', '2D6', '1D8+3', '4D6'],
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
    pcStatFormat: '種族、生まれ、技能とレベル（例: ファイター2 / スカウト1）、能力値（器用度〜精神力）、HP / MP、生命抵抗力 / 精神抵抗力、戦闘特技',
    enemyStatFormat: 'レベル、知名度/弱点値、命中力、打撃点、回避力、防護点、HP、MP、特殊能力、戦利品',
    rewardGuidelines: '経験点（基本 + 倒した魔物のレベル合計×10）、報酬（ガメル）、名誉点、剥ぎ取りによる戦利品',
    dicePresets: ['2D6', '2D6+5', '1D6', '2D6>=10'],
    defaultGenres: ['冒険者の依頼', '遺跡探索', '蛮族との戦い', 'ファンタジー'],
    designNotes:
      '冒険者の宿で依頼を受ける導入が定番。依頼人・報酬・目的地を明確にし、魔物との戦闘と探索判定による情報収集を組み合わせる。'
  },
  emoklore: {
    id: 'emoklore',
    name: 'エモクロアTRPG',
    shortName: 'エモクロア',
    gmTitle: 'GM',
    diceSystem: '技能レベル（＋ダイスボーナス）個のD10を振り、判定値（能力値＋技能レベル）以下の出目を成功ダイスとして数える。出目1はクリティカル（+1）、出目10はエラー（-1）。',
    checkGuidelines:
      '判定は「〈調査〉判定」「〈観察眼〉判定（成功数2以上で追加情報）」のように技能名で書き、必要なら必要成功数を添える。《怪異》や強い感情に直面した場面では〈∞共鳴〉による共鳴判定を設定する。PCの共鳴感情（表・裏・ルーツ）と関わる感情を持つ《怪異》を用意すると盛り上がる。',
    difficultyExamples: ['〈調査〉判定', '〈観察眼〉判定（成功数2以上）', '〈聞き耳〉判定', '共鳴判定'],
    commonSkills: [
      '調査', '検索', '洞察', 'マッピング', '直感', '鑑定', '知覚', '観察眼', '聞き耳', '危機察知', '霊感',
      '交渉', '説得', '心理', '運動', '隠密', '医術', '芸術', '知識'
    ],
    npcStatFormat: '能力値の目安（身体・器用・精神・五感・知力・魅力・社会）、HP、主な技能とレベル',
    pcStatFormat: '能力値（身体・器用・精神・五感・知力・魅力・社会・運勢）、HP（身体+10）、MP（精神+知力）、共鳴感情（表・裏・ルーツ）、主な技能とレベル',
    enemyStatFormat: '《怪異》の名前と正体、HP、攻撃手段（判定とダメージ）、共鳴する感情、特殊な性質・弱点',
    rewardGuidelines: '成長点、〈∞共鳴〉の変化、《怪異》にまつわるアイテムや記憶',
    dicePresets: ['1DM<=5', '2DM<=6', '3DM<=7', '1D10'],
    defaultGenres: ['現代怪異譚', 'ホラー', 'ミステリー', 'エモーショナル'],
    designNotes:
      '現代を舞台に、人の感情と結びついた《怪異》を扱う。探索と感情のドラマが中心で、《怪異》は倒すより「感情を理解して向き合う」解決も用意すると良い。〈∞共鳴〉が上がりすぎるとPCが逸脱するため、共鳴判定の回数は抑えめにする。'
  },
  shinobigami: {
    id: 'shinobigami',
    name: 'シノビガミ',
    shortName: 'シノビガミ',
    gmTitle: 'GM',
    diceSystem: '2D6で目標値5以上なら成功。特技表で指定特技から離れた特技で代用すると、1マスごとに目標値+1。',
    checkGuidelines:
      '判定は「《見敵術》判定」「《隠蔽術》で判定」のように特技名で書く。特技は器術・体術・忍術・謀術・戦術・妖術の6分野。情報は「秘密」「居所」「奥義」として、ドラマシーンの情報判定で獲得させる。',
    difficultyExamples: ['《見敵術》判定', '《調査術》判定', '《隠形術》判定', '《医術》判定'],
    commonSkills: [
      '絡繰術', '火術', '手裏剣術', '刀術', '骨法術', '隠形術', '変装術', '第六感', '潜伏術', '盗聴術',
      '医術', '毒術', '調査術', '詐術', '対人術', '経済力', '見敵術', '記憶術', '人脈', '瞳術', '結界術', '呪術'
    ],
    npcStatFormat: '流派、階級、主な特技、忍法、奥義（あれば）、生命力',
    pcStatFormat: '流派、階級、信念、特技（6つ）、忍法、背景、生命力6（器術〜妖術）',
    enemyStatFormat: '流派、主な特技、忍法（攻撃・サポート）、奥義、生命力、戦闘時の行動方針',
    rewardGuidelines: '功績点（使命の達成、秘密の獲得、戦果など）',
    dicePresets: ['2D6>=5', '2D6>=6', '1D6', '2D6'],
    defaultGenres: ['忍術バトル', '陰謀', '伝奇', '現代忍者'],
    designNotes:
      'PCごとに「使命」と「秘密」を書いたハンドアウトを用意し、PC同士の対立や協力が生まれるように設計する。セッションはドラマシーンでの情報収集・感情判定を数サイクル行い、最後にクライマックス戦闘で決着をつける構成が基本。秘密には他のPCの使命を揺るがす事実を仕込む。'
  },
  dx3: {
    id: 'dx3',
    name: 'ダブルクロス The 3rd Edition',
    shortName: 'DX3',
    gmTitle: 'GM',
    diceSystem: '能力値（肉体・感覚・精神・社会）個のD10を振る。クリティカル値（通常10）以上の出目は振り足し、最大の出目＋技能値が達成値。達成値が目標値以上で成功。',
    checkGuidelines:
      '判定は「〈知覚〉判定 目標値9」「〈情報：UGN〉目標値8」のように技能名と目標値で書く。目標値5で常人でも成功、10以上はプロの領域。情報収集は情報項目ごとに〈情報：〇〇〉と目標値を示し、段階的に情報が開示される形にする。',
    difficultyExamples: ['〈知覚〉判定 目標値9', '〈情報：UGN〉目標値8', '〈意志〉判定 目標値10', '〈交渉〉判定 目標値7'],
    commonSkills: ['白兵', '回避', '射撃', '知覚', 'RC', '意志', '交渉', '調達', '運転', '芸術', '知識', '情報：UGN', '情報：噂話', '情報：裏社会', '情報：警察'],
    npcStatFormat: '所属、シンドローム（オーヴァードの場合）、主な技能、Dロイス、戦闘の有無',
    pcStatFormat: 'ワークス、カヴァー、シンドローム、能力値（肉体・感覚・精神・社会）、主な技能、HP、行動値、侵蝕基本値、主なエフェクト',
    enemyStatFormat: 'シンドローム、HP、行動値、装甲、主なエフェクトとコンボ（命中判定・ダメージ）、Eロイス、戦闘時の行動方針',
    rewardGuidelines: '経験点（セッションに最後まで参加、目的の達成、侵蝕率による経験点、Sロイスなど）',
    dicePresets: ['3DX+1', '4DX+2@9', '5DX+3@8', '2D10'],
    defaultGenres: ['現代異能アクション', 'UGN', 'FH陰謀', '学園'],
    designNotes:
      'トレーラーとPCごとのハンドアウト（シナリオロイス、カヴァー/ワークスの指定）を用意し、オープニング→ミドル（情報収集・トリガーシーン）→クライマックス（戦闘）→エンディングの順に構成する。能力を使うほど侵蝕率が上がるため、ミドルの登場・戦闘回数を抑え、クライマックスで全力を出せる余地を残す。'
  },
  insane: {
    id: 'insane',
    name: 'マルチジャンル・ホラーRPG インセイン',
    shortName: 'インセイン',
    gmTitle: 'GM',
    diceSystem: '2D6で目標値5以上なら成功。特技表で指定特技から離れた特技で代用すると、1マスごとに目標値+1。',
    checkGuidelines:
      '判定は「《情景》で判定」「《医学》判定」のように特技名で書く。特技は暴力・情動・知覚・技術・知識・怪異の6分野。恐ろしい出来事には恐怖判定（指定特技で判定し、失敗すると生命力ではなく正気度が減り狂気を得る）を設定する。情報は「秘密」「居所」として調査判定で獲得させる。',
    difficultyExamples: ['《情景》で判定', '《医学》判定', '《死》で恐怖判定', '《物音》判定'],
    commonSkills: [
      '殴打', '射撃', '脅す', '恋', '怒り', '哀しみ', '痛み', 'におい', '物音', '情景', '追跡', '第六感',
      '電子機器', '薬品', 'メディア', '医学', '歴史', '民俗学', '死', '霊魂', '魔術', '夢'
    ],
    npcStatFormat: '役割、主な特技、秘密、正気度・生命力（戦闘に関わる場合）',
    pcStatFormat: '職業、好奇心（分野）、恐怖心（特技）、特技（6つ）、アビリティ、生命力、正気度、アイテム',
    enemyStatFormat: '怪異の正体、生命力、攻撃（アビリティ・指定特技・ダメージ）、恐怖判定の指定特技、弱点',
    rewardGuidelines: '功績点、正気度の回復、生還そのもの',
    dicePresets: ['2D6>=5', '2D6>=6', '1D6', '2D6'],
    defaultGenres: ['現代ホラー', '都市伝説', 'サイコホラー', '学校の怪談'],
    designNotes:
      'PCごとに「使命」と「秘密」を書いたハンドアウトを用意する。秘密には恐ろしい真実や他のPCへの疑念を仕込み、PC同士の疑心暗鬼を生む。ドラマシーンでの調査と感情判定を繰り返し、狂気カードが発狂するタイミングで恐怖を演出する。'
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
    pcStatFormat: '得意分野、能力の目安（身体・知性・社交・特殊の4項目を5段階）、特技',
    enemyStatFormat: '強さの目安、攻撃手段、防御の特徴、弱点、特殊能力',
    rewardGuidelines: '物語上の報酬（情報・人脈・アイテム）とシステムに応じた成長点',
    dicePresets: ['1D6', '2D6', '1D20', '1D100'],
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
