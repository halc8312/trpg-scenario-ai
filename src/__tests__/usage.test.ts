import {
  DEFAULT_MODEL_PRICES,
  addUsage,
  formatCost,
  formatTokens,
  loadModelPrices,
  mergeUsage,
  saveModelPrices,
  summarizeUsage
} from '@/lib/ai/usage'

describe('usage', () => {
  it('accumulates usage per provider and model', () => {
    let usage = addUsage(undefined, 'anthropic', 'claude-opus-5', { inputTokens: 1000, outputTokens: 500 })
    usage = addUsage(usage, 'anthropic', 'claude-opus-5', { inputTokens: 2000, outputTokens: 100 })
    usage = addUsage(usage, 'gemini', 'gemini-3.8-flash', undefined)

    expect(usage.byModel['anthropic:claude-opus-5']).toMatchObject({ calls: 2, inputTokens: 3000, outputTokens: 600, unknownCalls: 0 })
    expect(usage.byModel['gemini:gemini-3.8-flash']).toMatchObject({ calls: 1, inputTokens: 0, unknownCalls: 1 })
  })

  it('estimates cost with the price table and flags incomplete totals', () => {
    const usage = mergeUsage([
      addUsage(undefined, 'anthropic', 'claude-opus-5', { inputTokens: 1_000_000, outputTokens: 100_000 }),
      addUsage(undefined, 'openai', 'gpt-6-sol', { inputTokens: 500, outputTokens: 500 })
    ])
    const summary = summarizeUsage(usage, DEFAULT_MODEL_PRICES)
    expect(summary.calls).toBe(2)
    expect(summary.costUsd).toBeCloseTo(5 + 2.5)
    expect(summary.incomplete).toBe(true)

    const complete = summarizeUsage(usage, { ...DEFAULT_MODEL_PRICES, 'gpt-6-sol': { input: 2, output: 8 } })
    expect(complete.incomplete).toBe(false)
    expect(complete.costUsd).toBeCloseTo(7.5 + 0.005)
  })

  it('stores only overridden prices', () => {
    const store: Record<string, string> = {}
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { store[k] = v })
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(k => store[k] ?? null)

    saveModelPrices({ ...DEFAULT_MODEL_PRICES, 'claude-opus-5': { input: 6, output: 30 }, 'gpt-6-sol': { input: 2, output: 8 } })
    expect(JSON.parse(store['trpg-model-prices'])).toEqual({ 'claude-opus-5': { input: 6, output: 30 }, 'gpt-6-sol': { input: 2, output: 8 } })
    expect(loadModelPrices()['claude-sonnet-5']).toEqual(DEFAULT_MODEL_PRICES['claude-sonnet-5'])
    jest.restoreAllMocks()
  })

  it('formats tokens and costs', () => {
    expect(formatTokens(950)).toBe('950')
    expect(formatTokens(12_345)).toBe('12.3k')
    expect(formatTokens(2_500_000)).toBe('2.5M')
    expect(formatCost(0.004, null)).toBe('<$0.01')
    expect(formatCost(1.5, 150)).toBe('$1.50（約225円）')
  })
})
