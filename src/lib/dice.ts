// TRPGのダイス表記を解釈して振る。乱数は差し替えられるようにしてテストしやすくする

export type Random = () => number

export type Outcome = 'success' | 'failure' | 'critical' | 'fumble'

export interface DiceResult {
  notation: string
  total: number
  // 個々の出目（DXは振り足しごとの出目の配列を平坦化したもの）
  rolls: number[]
  detail: string
  outcome?: Outcome
  // CoC7版の成功度など、結果の説明
  label?: string
}

const rollDie = (sides: number, random: Random) => Math.floor(random() * sides) + 1

function compare(value: number, op: string, target: number): boolean {
  switch (op) {
    case '<=': return value <= target
    case '>=': return value >= target
    case '<': return value < target
    case '>': return value > target
    case '=': return value === target
    default: return false
  }
}

/**
 * 対応する表記
 * - 合計: 2D6+3, 1D100, 3D6+1D4-2（比較を付けると成否判定: 2D6>=5）
 * - CoC7版: CC<=60（1D100で技能値60の判定。成功度とクリティカル/ファンブルを判定）
 * - ダブルクロス: 5DX+2@9>=10（10面5個、クリティカル値9で振り足し）
 * - エモクロア: 3DM<=6（10面3個で6以下の数を数える。1は+1、10は-1）
 */
export function rollDice(input: string, random: Random = Math.random): DiceResult {
  const notation = input.replace(/\s+/g, '').toUpperCase()
  if (!notation) throw new Error('ダイスの表記を入力してください')

  return (
    rollCoC(notation, random) ??
    rollDoubleCross(notation, random) ??
    rollEmoklore(notation, random) ??
    rollSum(notation, random)
  )
}

function rollCoC(notation: string, random: Random): DiceResult | null {
  const m = notation.match(/^CC<=(\d+)$/)
  if (!m) return null
  const skill = Number(m[1])
  const value = rollDie(100, random)

  let label: string
  let outcome: Outcome
  if (value === 1) {
    label = 'クリティカル'
    outcome = 'critical'
  } else if (value === 100 || (skill < 50 && value >= 96)) {
    label = 'ファンブル'
    outcome = 'fumble'
  } else if (value <= Math.floor(skill / 5)) {
    label = 'イクストリーム成功'
    outcome = 'success'
  } else if (value <= Math.floor(skill / 2)) {
    label = 'ハード成功'
    outcome = 'success'
  } else if (value <= skill) {
    label = 'レギュラー成功'
    outcome = 'success'
  } else {
    label = '失敗'
    outcome = 'failure'
  }

  return { notation, total: value, rolls: [value], detail: `1D100 → ${value}（技能値${skill}）`, outcome, label }
}

function rollDoubleCross(notation: string, random: Random): DiceResult | null {
  const m = notation.match(/^(\d+)DX([+-]\d+)?(?:@(\d+))?(?:(>=|>)(\d+))?$/)
  if (!m) return null
  const count = Number(m[1])
  const modifier = Number(m[2] ?? 0)
  const critical = Number(m[3] ?? 10)
  if (count < 1 || count > 100) throw new Error('ダイスの個数は1〜100個にしてください')
  if (critical < 2) throw new Error('クリティカル値は2以上にしてください')

  const rolls: number[] = []
  const rounds: string[] = []
  let dice = count
  let base = 0
  let last = 0
  // クリティカル値以上の出目の数だけ振り足す（1回ごとに10を加算）
  for (let round = 0; dice > 0 && round < 100; round++) {
    const values = Array.from({ length: dice }, () => rollDie(10, random))
    rolls.push(...values)
    rounds.push(`[${values.join(',')}]`)
    const crits = values.filter(v => v >= critical).length
    last = Math.max(...values)
    if (crits === 0) break
    base += 10
    dice = crits
  }
  const allFumble = rolls.length === count && rolls.every(v => v === 1)
  const total = allFumble ? 0 : base + last + modifier
  const detail = `${rounds.join(' → ')}${modifier ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''}`

  if (allFumble) return { notation, total, rolls, detail, outcome: 'fumble', label: 'ファンブル（自動失敗）' }
  if (m[4]) {
    const ok = compare(total, m[4], Number(m[5]))
    return { notation, total, rolls, detail, outcome: ok ? (base > 0 ? 'critical' : 'success') : 'failure', label: ok ? '成功' : '失敗' }
  }
  return { notation, total, rolls, detail, outcome: base > 0 ? 'critical' : undefined, label: base > 0 ? 'クリティカル' : undefined }
}

function rollEmoklore(notation: string, random: Random): DiceResult | null {
  const m = notation.match(/^(\d+)DM<=(\d+)$/)
  if (!m) return null
  const count = Number(m[1])
  const target = Number(m[2])
  if (count < 1 || count > 100) throw new Error('ダイスの個数は1〜100個にしてください')

  const rolls = Array.from({ length: count }, () => rollDie(10, random))
  const successes = rolls.reduce((sum, v) => {
    if (v === 1) return sum + 2 // 成功ダイス + クリティカル
    if (v === 10) return sum - 1 // エラー
    return v <= target ? sum + 1 : sum
  }, 0)

  const label =
    successes < 0 ? 'ファンブル' :
    successes === 0 ? '失敗' :
    successes === 1 ? 'シングル' :
    successes === 2 ? 'ダブル' :
    successes === 3 ? 'トリプル' :
    successes < 10 ? 'ミラクル' : 'カタストロフ'
  const outcome: Outcome = successes < 0 ? 'fumble' : successes === 0 ? 'failure' : successes >= 2 ? 'critical' : 'success'

  return { notation, total: successes, rolls, detail: `[${rolls.join(',')}] 判定値${target} → 成功数${successes}`, outcome, label }
}

function rollSum(notation: string, random: Random): DiceResult {
  const m = notation.match(/^([0-9D+-]+?)(?:(<=|>=|<|>|=)(\d+))?$/)
  if (!m) throw new Error(`「${notation}」は解釈できない表記です`)

  const terms = m[1].match(/[+-]?[^+-]+/g)
  if (!terms) throw new Error(`「${notation}」は解釈できない表記です`)

  const rolls: number[] = []
  const parts: string[] = []
  let total = 0
  let diceCount = 0
  let singleDiceTerm: { count: number; sides: number } | null = null

  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1
    const body = term.replace(/^[+-]/, '')
    const dice = body.match(/^(\d*)D(\d+)$/)
    if (dice) {
      const count = Number(dice[1] || 1)
      const sides = Number(dice[2])
      if (count < 1 || count > 100 || sides < 2 || sides > 1000) throw new Error('ダイスは1〜100個、2〜1000面にしてください')
      const values = Array.from({ length: count }, () => rollDie(sides, random))
      rolls.push(...values)
      diceCount += count
      singleDiceTerm = terms.length === 1 ? { count, sides } : null
      total += sign * values.reduce((a, b) => a + b, 0)
      parts.push(`${sign < 0 ? '-' : parts.length ? '+' : ''}[${values.join(',')}]`)
    } else if (/^\d+$/.test(body)) {
      total += sign * Number(body)
      parts.push(`${sign < 0 ? '-' : '+'}${body}`)
    } else {
      throw new Error(`「${notation}」は解釈できない表記です`)
    }
  }
  if (diceCount === 0) throw new Error('ダイスを1個以上含めてください（例: 2D6）')

  const detail = `${parts.join('')} → ${total}`
  if (!m[2]) return { notation, total, rolls, detail }

  const ok = compare(total, m[2], Number(m[3]))
  // 2D6の判定（シノビガミ・インセイン・SW2.5など）: 6ゾロはスペシャル、1ゾロはファンブル
  const is2d6 = singleDiceTerm?.count === 2 && singleDiceTerm.sides === 6
  if (is2d6 && rolls[0] + rolls[1] === 12) return { notation, total, rolls, detail, outcome: 'critical', label: 'スペシャル（6ゾロ）' }
  if (is2d6 && rolls[0] + rolls[1] === 2) return { notation, total, rolls, detail, outcome: 'fumble', label: 'ファンブル（1ゾロ）' }
  return { notation, total, rolls, detail, outcome: ok ? 'success' : 'failure', label: ok ? '成功' : '失敗' }
}
