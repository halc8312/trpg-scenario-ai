/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { readStream } from '@/lib/ai/client'

const complete = jest.fn()
jest.mock('@/lib/ai/server/registry', () => ({
  getAdapter: () => ({ complete })
}))

import { POST } from '@/app/api/ai/complete/route'

function responseFrom(chunks: string[]): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach(c => controller.enqueue(encoder.encode(c)))
        controller.close()
      }
    })
  )
}

const request = (body: unknown) =>
  new NextRequest('http://localhost/api/ai/complete', { method: 'POST', body: JSON.stringify(body) })

const validBody = { provider: 'deepseek', model: 'deepseek-flash', messages: [{ role: 'user', content: 'hi' }] }

describe('readStream', () => {
  it('handles events split across chunk boundaries and multibyte characters', async () => {
    const deltas: string[] = []
    const res = await readStream(
      responseFrom(['{"type":"delta","text":"霧隠', 'れ"}\n{"type":"del', 'ta","text":"村"}\n', '{"type":"done","response":{"content":"霧隠れ村","finishReason":"stop"}}']),
      d => deltas.push(d)
    )
    expect(deltas).toEqual(['霧隠れ', '村'])
    expect(res).toEqual({ content: '霧隠れ村', finishReason: 'stop' })
  })

  it('throws the error sent by the server', async () => {
    await expect(readStream(responseFrom(['{"type":"delta","text":"a"}\n{"type":"error","error":"上限に達しました"}\n']), () => {}))
      .rejects.toThrow('上限に達しました')
  })

  it('throws when the stream ends without a result', async () => {
    await expect(readStream(responseFrom(['{"type":"delta","text":"a"}\n']), () => {})).rejects.toThrow('途切れました')
  })
})

describe('POST /api/ai/complete', () => {
  beforeEach(() => complete.mockReset())

  it('streams deltas and the final response as NDJSON', async () => {
    complete.mockImplementation(async (_req, onDelta) => {
      onDelta('こん')
      onDelta('にちは')
      return { content: 'こんにちは', finishReason: 'stop' }
    })
    const res = await POST(request({ ...validBody, stream: true }))
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')

    const deltas: string[] = []
    const result = await readStream(res, d => deltas.push(d))
    expect(deltas).toEqual(['こん', 'にちは'])
    expect(result.content).toBe('こんにちは')
  })

  it('sends provider errors as an error event while streaming', async () => {
    complete.mockRejectedValue(new Error('残高が不足しています'))
    const res = await POST(request({ ...validBody, stream: true }))
    await expect(readStream(res, () => {})).rejects.toThrow('残高が不足しています')
  })

  it('returns plain JSON when streaming is not requested', async () => {
    complete.mockResolvedValue({ content: 'ok', finishReason: 'stop' })
    const res = await POST(request(validBody))
    expect(await res.json()).toEqual({ content: 'ok', finishReason: 'stop' })
    expect(complete.mock.calls[0][1]).toBeUndefined()
  })

  it('rejects invalid requests before streaming', async () => {
    const res = await POST(request({ ...validBody, provider: 'unknown', stream: true }))
    expect(res.status).toBe(400)
  })
})
