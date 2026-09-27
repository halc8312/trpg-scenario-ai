import { expect, test } from '@playwright/test'
import { mockAI } from './fixtures'

test('生成が途中で失敗しても、続きから再開できる', async ({ page }) => {
  let failScenes = true
  const calls = await mockAI(page, {
    override: async (kind, route) => {
      if (kind !== 'scenes' || !failScenes) return false
      await route.fulfill({ status: 503, json: { error: 'サーバーが混み合っています' } })
      return true
    }
  })

  await page.goto('/')
  await page.getByRole('button', { name: '新規シナリオ' }).first().click()
  await page.getByRole('button', { name: '作成して生成開始' }).click()

  await expect(page.getByText('「シーン構成」で失敗しました: サーバーが混み合っています')).toBeVisible()
  await expect(page.getByText(/生成済みのセクションは保存されています/)).toBeVisible()

  // ページを読み込み直しても再開できる
  await page.reload()
  failScenes = false
  await page.getByRole('button', { name: '続きから再開' }).click()
  await expect(page.getByText('シナリオが完成しました')).toBeVisible()

  // 完了済みのステップ（概要・NPC・手がかり）はやり直さない
  expect(calls.map(c => c.kind)).toEqual(['concept', 'npcs', 'clues', 'scenes', 'scenes', 'endings', 'repair', 'review'])
  await page.getByRole('tab', { name: 'シーン' }).click()
  await expect(page.getByText('洞窟の儀式')).toBeVisible()
})
