import { NextRequest, NextResponse } from 'next/server'
import { isAIProviderId } from '@/lib/ai/providers'
import { getAdapter } from '@/lib/ai/server/registry'
import { AIProviderError } from '@/lib/ai/types'

export const dynamic = 'force-dynamic'

// プロバイダーのAPIから利用可能なモデルIDの一覧を取得する
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider')
  if (!isAIProviderId(provider)) {
    return NextResponse.json({ error: '不明なAIプロバイダーです' }, { status: 400 })
  }

  try {
    const models = await getAdapter(provider).listModels()
    return NextResponse.json({ models })
  } catch (error) {
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'モデル一覧の取得に失敗しました' }, { status: 500 })
  }
}
