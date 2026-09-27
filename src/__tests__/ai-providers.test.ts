/**
 * @jest-environment node
 */
import { AICompletionRequest, AIProviderError } from '@/lib/ai/types'

const openaiCreate = jest.fn()
const anthropicStream = jest.fn()
const anthropicBetaStream = jest.fn()

jest.mock('openai', () => {
  class APIError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  }
  const OpenAI = jest.fn().mockImplementation((options: unknown) => ({
    options,
    chat: { completions: { create: openaiCreate } }
  }))
  Object.assign(OpenAI, { APIError })
  return { __esModule: true, default: OpenAI }
})

jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  }
  const Anthropic = jest.fn().mockImplementation(() => ({
    messages: { stream: anthropicStream },
    beta: { messages: { stream: anthropicBetaStream } }
  }))
  Object.assign(Anthropic, { APIError })
  return { __esModule: true, default: Anthropic }
})

import OpenAI from 'openai'
import { OpenAICompatibleAdapter } from '@/lib/ai/server/openai-compatible'
import { AnthropicAdapter } from '@/lib/ai/server/anthropic'
import { getAdapter, getProviderStatuses } from '@/lib/ai/server/registry'

const baseRequest = (overrides: Partial<AICompletionRequest>): AICompletionRequest => ({
  provider: 'openai',
  model: 'gpt-6-sol',
  messages: [
    { role: 'system', content: 'あなたはGMです' },
    { role: 'user', content: 'シナリオを作って' }
  ],
  temperature: 0.8,
  maxTokens: 1000,
  ...overrides
})

const claudeMessage = (overrides: Record<string, unknown> = {}) => ({
  content: [
    { type: 'thinking', thinking: '' },
    { type: 'text', text: '```json\n{}\n```' }
  ],
  stop_reason: 'end_turn',
  stop_details: null,
  usage: { input_tokens: 10, output_tokens: 20 },
  ...overrides
})

// Anthropic SDK の MessageStream を模したオブジェクト
function streamOf(message: unknown, deltas: string[] = []) {
  const listeners: ((d: string) => void)[] = []
  return {
    on: (event: string, listener: (d: string) => void) => {
      if (event === 'text') listeners.push(listener)
    },
    finalMessage: async () => {
      deltas.forEach(d => listeners.forEach(l => l(d)))
      return message
    }
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  openaiCreate.mockResolvedValue({
    choices: [{ message: { content: 'ok' }, finish_reason: 'length' }],
    usage: { prompt_tokens: 1, completion_tokens: 2 }
  })
})

describe('OpenAICompatibleAdapter', () => {
  it('uses max_completion_tokens and omits temperature for OpenAI reasoning models', async () => {
    const adapter = new OpenAICompatibleAdapter({ provider: 'openai', apiKey: 'k', tokenParam: 'max_completion_tokens', maxTemperature: 2, supportsStreamUsage: true })
    const res = await adapter.complete(baseRequest({ model: 'gpt-6-sol' }))

    const params = openaiCreate.mock.calls[0][0]
    expect(params.max_completion_tokens).toBe(1000)
    expect(params).not.toHaveProperty('temperature')
    expect(res).toEqual({ content: 'ok', finishReason: 'length', usage: { inputTokens: 1, outputTokens: 2 } })
  })

  it('sends max_tokens and temperature to OpenAI-compatible providers', async () => {
    const adapter = new OpenAICompatibleAdapter({
      provider: 'deepseek',
      apiKey: 'k',
      baseURL: 'https://api.deepseek.com',
      tokenParam: 'max_tokens',
      maxTemperature: 2,
      supportsStreamUsage: true
    })
    await adapter.complete(baseRequest({ provider: 'deepseek', model: 'deepseek-chat', temperature: 5 }))

    const params = openaiCreate.mock.calls[0][0]
    expect(params.max_tokens).toBe(1000)
    expect(params.temperature).toBe(2)
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'k', baseURL: 'https://api.deepseek.com' })
  })

  it('wraps SDK errors with the HTTP status', async () => {
    openaiCreate.mockRejectedValueOnce(new (OpenAI as any).APIError(401, 'invalid key'))
    const adapter = new OpenAICompatibleAdapter({ provider: 'gemini', apiKey: 'k', tokenParam: 'max_tokens', maxTemperature: 2, supportsStreamUsage: false })
    await expect(adapter.complete(baseRequest({ provider: 'gemini' }))).rejects.toMatchObject({
      provider: 'gemini',
      status: 401
    })
  })
})

describe('OpenAICompatibleAdapter streaming', () => {
  it('forwards deltas and collects usage from the final chunk', async () => {
    openaiCreate.mockResolvedValueOnce(
      (async function* () {
        yield { choices: [{ delta: { content: '```json' } }] }
        yield { choices: [{ delta: { content: '\n{}' }, finish_reason: 'stop' }] }
        yield { choices: [], usage: { prompt_tokens: 5, completion_tokens: 7 } }
      })()
    )
    const adapter = new OpenAICompatibleAdapter({ provider: 'deepseek', apiKey: 'k', tokenParam: 'max_tokens', maxTemperature: 2, supportsStreamUsage: true })
    const deltas: string[] = []
    const res = await adapter.complete(baseRequest({ provider: 'deepseek', model: 'deepseek-chat' }), d => deltas.push(d))

    const params = openaiCreate.mock.calls[0][0]
    expect(params.stream).toBe(true)
    expect(params.stream_options).toEqual({ include_usage: true })
    expect(deltas).toEqual(['```json', '\n{}'])
    expect(res).toEqual({ content: '```json\n{}', finishReason: 'stop', usage: { inputTokens: 5, outputTokens: 7 } })
  })

  it('does not request usage from providers that do not support it', async () => {
    openaiCreate.mockResolvedValueOnce((async function* () {})())
    const adapter = new OpenAICompatibleAdapter({ provider: 'gemini', apiKey: 'k', tokenParam: 'max_tokens', maxTemperature: 2, supportsStreamUsage: false })
    await adapter.complete(baseRequest({ provider: 'gemini' }), () => {})
    expect(openaiCreate.mock.calls[0][0]).not.toHaveProperty('stream_options')
  })
})

describe('AnthropicAdapter', () => {
  it('moves system messages to the system field, returns only text, and enables server-side fallback', async () => {
    anthropicBetaStream.mockReturnValue(streamOf(claudeMessage()))
    const adapter = new AnthropicAdapter('k')
    const res = await adapter.complete(baseRequest({ provider: 'anthropic', model: 'claude-opus-5' }))

    const params = anthropicBetaStream.mock.calls[0][0]
    expect(params.system).toBe('あなたはGMです')
    expect(params.messages).toEqual([{ role: 'user', content: 'シナリオを作って' }])
    expect(params.fallbacks).toBe('default')
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01'])
    expect(params).not.toHaveProperty('temperature')
    expect(res.content).toBe('```json\n{}\n```')
    expect(res.finishReason).toBe('stop')
  })

  it('sends temperature only to models that accept it', async () => {
    anthropicStream.mockReturnValue(streamOf(claudeMessage({ stop_reason: 'max_tokens' })))
    const adapter = new AnthropicAdapter('k')
    const res = await adapter.complete(baseRequest({ provider: 'anthropic', model: 'claude-haiku-4-5', temperature: 1.5 }))

    expect(anthropicStream.mock.calls[0][0].temperature).toBe(1)
    expect(anthropicBetaStream).not.toHaveBeenCalled()
    expect(res.finishReason).toBe('length')

    await adapter.complete(baseRequest({ provider: 'anthropic', model: 'claude-sonnet-5' }))
    expect(anthropicStream.mock.calls[1][0]).not.toHaveProperty('temperature')
  })

  it('forwards text deltas while streaming', async () => {
    anthropicBetaStream.mockReturnValue(streamOf(claudeMessage(), ['```json', '\n{}\n```']))
    const deltas: string[] = []
    await new AnthropicAdapter('k').complete(baseRequest({ provider: 'anthropic', model: 'claude-opus-5' }), d => deltas.push(d))
    expect(deltas).toEqual(['```json', '\n{}\n```'])
  })

  it('turns a refusal into a readable error', async () => {
    anthropicBetaStream.mockReturnValue(
      streamOf(claudeMessage({ content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber' } }))
    )
    const adapter = new AnthropicAdapter('k')
    await expect(adapter.complete(baseRequest({ provider: 'anthropic', model: 'claude-opus-5' }))).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('cyber')
    })
  })
})

describe('registry', () => {
  const env = process.env
  beforeEach(() => {
    process.env = { ...env, OPENAI_API_KEY: 'k', GEMINI_MODEL: 'gemini-custom' }
    delete process.env.ANTHROPIC_API_KEY
  })
  afterAll(() => {
    process.env = env
  })

  it('reports which providers are configured and applies model overrides', () => {
    const statuses = getProviderStatuses()
    expect(statuses.find(s => s.id === 'openai')?.configured).toBe(true)
    expect(statuses.find(s => s.id === 'anthropic')?.configured).toBe(false)
    expect(statuses.find(s => s.id === 'gemini')?.defaultModel).toBe('gemini-custom')
  })

  it('throws a helpful error for providers without an API key', () => {
    expect(() => getAdapter('anthropic')).toThrow(AIProviderError)
    expect(() => getAdapter('anthropic')).toThrow('ANTHROPIC_API_KEY')
  })
})
