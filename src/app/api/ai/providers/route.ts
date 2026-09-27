import { NextResponse } from 'next/server'
import { getProviderStatuses } from '@/lib/ai/server/registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ providers: getProviderStatuses() })
}
