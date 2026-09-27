import { expect, test } from '@playwright/test'
import { AI_RESPONSES, mockAI } from './fixtures'

test('生成中はAIから受信しているテキストが表示される', async ({ page }) => {
  await mockAI(page)

  // 最初のAI呼び出しだけ、差分を1つ送ったところで止まる応答にする（テストから再開させる）
  await page.addInitScript(({ partial, rest }) => {
    const originalFetch = window.fetch.bind(window)
    let intercepted = false
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (intercepted || !url.endsWith('/api/ai/complete')) return originalFetch(input, init)
      intercepted = true
      const encoder = new TextEncoder()
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'delta', text: partial }) + '\n'))
          ;(window as any).__releaseStream = () => {
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'delta', text: rest }) + '\n'))
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'done', response: { content: partial + rest, finishReason: 'stop' } }) + '\n')
            )
            controller.close()
          }
        }
      })
      return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } })
    }
  }, { partial: AI_RESPONSES.concept.content.slice(0, 80), rest: AI_RESPONSES.concept.content.slice(80) })

  await page.goto('/')
  await page.getByRole('button', { name: '新規シナリオ' }).first().click()
  await page.getByRole('button', { name: '作成して生成開始' }).click()

  await expect(page.getByText('AIから受信中… 80文字')).toBeVisible()
  await page.evaluate(() => (window as any).__releaseStream())
  await expect(page.getByText('シナリオが完成しました')).toBeVisible()
})
