import { NextRequest, NextResponse } from 'next/server'
import { isAIProviderId } from '@/lib/ai/providers'
import { getAdapter } from '@/lib/ai/server/registry'
import { AIMessage, AIProviderError } from '@/lib/ai/types'

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

  const { provider, model, messages, temperature, maxTokens } = body ?? {}
  if (!isAIProviderId(provider)) {
    return NextResponse.json({ error: '不明なAIプロバイダーです' }, { status: 400 })
  }
  if (typeof model !== 'string' || !model.trim()) {
    return NextResponse.json({ error: 'モデルが指定されていません' }, { status: 400 })
  }
  if (!isMessages(messages)) {
    return NextResponse.json({ error: 'メッセージの形式が正しくありません' }, { status: 400 })
  }

  try {
    const response = await getAdapter(provider).complete({
      provider,
      model: model.trim(),
      messages,
      temperature: typeof temperature === 'number' ? temperature : undefined,
      maxTokens: typeof maxTokens === 'number' && maxTokens > 0 ? Math.floor(maxTokens) : undefined
    })
    return NextResponse.json(response)
  } catch (error) {
    console.error(`[ai:${provider}] completion failed:`, error)
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'AIの呼び出しに失敗しました' }, { status: 500 })
  }
}
