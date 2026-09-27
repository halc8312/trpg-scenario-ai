import { rollDice } from '@/lib/dice'

// 指定した出目を順に返す乱数（出目 n は (n - 1) / sides 付近の値にする）
function fixed(sides: number, ...values: number[]) {
  let i = 0
  return () => (values[i++ % values.length] - 0.5) / sides
}

describe('rollDice', () => {
  it('sums dice and modifiers', () => {
    const r = rollDice('2d6+3', fixed(6, 4, 5))
    expect(r.total).toBe(12)
    expect(r.rolls).toEqual([4, 5])
    expect(r.outcome).toBeUndefined()
  })

  it('supports multiple dice terms and subtraction', () => {
    const r = rollDice('1D6+1D4-2', fixed(6, 6, 3))
    expect(r.rolls).toEqual([6, 2])
    expect(r.total).toBe(6)
  })

  it('judges success for comparisons and 2D6 specials/fumbles', () => {
    expect(rollDice('2D6>=5', fixed(6, 2, 3)).outcome).toBe('success')
    expect(rollDice('2D6>=5', fixed(6, 1, 3)).outcome).toBe('failure')
    expect(rollDice('2D6>=13', fixed(6, 6, 6))).toMatchObject({ outcome: 'critical', label: 'スペシャル（6ゾロ）' })
    expect(rollDice('2D6>=2', fixed(6, 1, 1))).toMatchObject({ outcome: 'fumble', label: 'ファンブル（1ゾロ）' })
    expect(rollDice('1D100<=50', fixed(100, 50)).outcome).toBe('success')
  })

  it('resolves CoC 7th success levels', () => {
    expect(rollDice('CC<=60', fixed(100, 1)).label).toBe('クリティカル')
    expect(rollDice('CC<=60', fixed(100, 12)).label).toBe('イクストリーム成功')
    expect(rollDice('CC<=60', fixed(100, 30)).label).toBe('ハード成功')
    expect(rollDice('CC<=60', fixed(100, 60)).label).toBe('レギュラー成功')
    expect(rollDice('CC<=60', fixed(100, 61)).label).toBe('失敗')
    expect(rollDice('CC<=60', fixed(100, 100)).label).toBe('ファンブル')
    expect(rollDice('CC<=40', fixed(100, 96)).label).toBe('ファンブル')
    expect(rollDice('CC<=60', fixed(100, 96)).label).toBe('失敗')
  })

  it('rerolls Double Cross criticals and adds 10 per round', () => {
    // 1回目 [10, 3, 5] → 10が1個でクリティカル、2回目 [7] → 10 + 7 + 2 = 19
    const r = rollDice('3DX+2', fixed(10, 10, 3, 5, 7))
    expect(r.total).toBe(19)
    expect(r.detail).toBe('[10,3,5] → [7] +2')
    expect(r.outcome).toBe('critical')
    expect(rollDice('2DX@8>=9', fixed(10, 8, 1, 4)).total).toBe(14)
  })

  it('treats an all-ones Double Cross roll as a fumble', () => {
    expect(rollDice('2DX+5', fixed(10, 1, 1))).toMatchObject({ total: 0, outcome: 'fumble' })
  })

  it('counts Emoklore successes with criticals and errors', () => {
    // 1 → +2（成功+クリティカル）, 5 → +1, 10 → -1, 8 → 0
    const r = rollDice('4DM<=6', fixed(10, 1, 5, 10, 8))
    expect(r.total).toBe(2)
    expect(r.label).toBe('ダブル')
    expect(rollDice('1DM<=6', fixed(10, 10))).toMatchObject({ total: -1, label: 'ファンブル' })
  })

  it('rejects invalid notation', () => {
    expect(() => rollDice('')).toThrow('入力してください')
    expect(() => rollDice('abc')).toThrow('解釈できない')
    expect(() => rollDice('3+4')).toThrow('ダイスを1個以上')
    expect(() => rollDice('1000D6')).toThrow('1〜100個')
  })
})
