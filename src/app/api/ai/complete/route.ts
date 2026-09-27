import { NextRequest, NextResponse } from 'next/server'
import { isAIProviderId } from '@/lib/ai/providers'
import { getAdapter } from '@/lib/ai/server/registry'
import { AICompletionRequest, AIMessage, AIProviderError, AIStreamEvent } from '@/lib/ai/types'

// 生成に数分かかることがあるため、ホスティング先の上限まで待つ
export const maxDuration = 300

const ROLES = new Set(['system', 'user', 'assistant'])

function isMessages(value: unknown): value is AIMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(m => m && ROLES.has(m.role) && typeof m.content === 'string')
  )
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const { provider, model, messages, temperature, maxTokens, stream } = body ?? {}
  if (!isAIProviderId(provider)) {
    return NextResponse.json({ error: '不明なAIプロバイダーです' }, { status: 400 })
  }
  if (typeof model !== 'string' || !model.trim()) {
    return NextResponse.json({ error: 'モデルが指定されていません' }, { status: 400 })
  }
  if (!isMessages(messages)) {
    return NextResponse.json({ error: 'メッセージの形式が正しくありません' }, { status: 400 })
  }

  const completionRequest: AICompletionRequest = {
    provider,
    model: model.trim(),
    messages,
    temperature: typeof temperature === 'number' ? temperature : undefined,
    maxTokens: typeof maxTokens === 'number' && maxTokens > 0 ? Math.floor(maxTokens) : undefined
  }

  try {
    const adapter = getAdapter(provider)
    if (stream === true) return streamCompletion(adapter.complete.bind(adapter), completionRequest)

    const response = await adapter.complete(completionRequest)
    return NextResponse.json(response)
  } catch (error) {
    console.error(`[ai:${provider}] completion failed:`, error)
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'AIの呼び出しに失敗しました' }, { status: 500 })
  }
}

/**
 * 生成中のテキストを1行1イベントのJSON（NDJSON）で順に送る。
 * 最後に done（全文と使用量）または error を送って終了する。
 */
function streamCompletion(
  complete: (request: AICompletionRequest, onDelta: (delta: string) => void) => Promise<unknown>,
  request: AICompletionRequest
): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AIStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      try {
        const response = await complete(request, text => send({ type: 'delta', text }))
        send({ type: 'done', response } as AIStreamEvent)
      } catch (error) {
        console.error(`[ai:${request.provider}] streaming failed:`, error)
        send({ type: 'error', error: error instanceof Error ? error.message : 'AIの呼び出しに失敗しました' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  })
}
