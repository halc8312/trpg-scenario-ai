import { aiClient } from '@/lib/ai/client'
import { cn, formatDate, generateId, loadFromFile, saveTextToFile, saveToFile } from '@/lib/utils'

describe('aiClient', () => {
  const fetchMock = jest.fn()
  beforeEach(() => {
    globalThis.fetch = fetchMock as any
    fetchMock.mockReset()
  })

  it('returns JSON when streaming is not requested', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ content: 'ok', finishReason: 'stop' }) })
    const res = await aiClient.complete({ provider: 'openai', model: 'gpt-6-sol', messages: [{ role: 'user', content: 'hi' }] })
    expect(res.content).toBe('ok')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).stream).toBe(false)
  })

  it('turns error responses into readable errors', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'APIキーが設定されていません' }) })
    await expect(aiClient.complete({ provider: 'openai', model: 'x', messages: [] })).rejects.toThrow('APIキーが設定されていません')

    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('not json') } })
    await expect(aiClient.getProviders()).rejects.toThrow('（502）')
  })

  it('fetches providers and models', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ providers: [{ id: 'openai' }] }) })
    expect(await aiClient.getProviders()).toEqual([{ id: 'openai' }])
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ models: ['a', 'b'] }) })
    expect(await aiClient.getModels('gemini')).toEqual(['a', 'b'])
    expect(fetchMock.mock.calls[1][0]).toBe('/api/ai/models?provider=gemini')
  })
})

describe('utils', () => {
  it('merges class names', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4')
  })

  it('generates unique ids and formats dates', () => {
    expect(generateId()).not.toBe(generateId())
    expect(formatDate(new Date(2026, 8, 27, 13, 5))).toContain('2026/09/27')
  })

  it('downloads text and JSON files', () => {
    const createObjectURL = jest.fn(() => 'blob:x')
    const revokeObjectURL = jest.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    saveTextToFile('a.md', '# A', 'text/markdown')
    saveToFile('b.json', { a: 1 })
    expect(click).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
    click.mockRestore()
  })

  it('reads a selected JSON file and rejects invalid JSON', async () => {
    jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const select = (content: string) => {
      const input = document.querySelector<HTMLInputElement>('input[data-file-loader]')!
      const file = new File([content], 'a.json')
      Object.defineProperty(file, 'text', { value: async () => content })
      Object.defineProperty(input, 'files', { value: [file] })
      input.dispatchEvent(new Event('change'))
    }

    const ok = loadFromFile()
    select('{"a": 1}')
    await expect(ok).resolves.toEqual({ a: 1 })

    const broken = loadFromFile()
    select('{broken')
    await expect(broken).rejects.toThrow('JSONファイルを読み込めませんでした')

    const none = loadFromFile()
    const input = document.querySelector<HTMLInputElement>('input[data-file-loader]')!
    Object.defineProperty(input, 'files', { value: [] })
    input.dispatchEvent(new Event('change'))
    await expect(none).rejects.toThrow('No file selected')
    jest.restoreAllMocks()
  })
})
