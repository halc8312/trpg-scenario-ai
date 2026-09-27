import { expect, test } from '@playwright/test'
import { createScenario, mockAI } from './fixtures'

test.beforeEach(async ({ page }) => {
  await mockAI(page)
  await createScenario(page)
})

test('NPCを編集・追加して保存できる', async ({ page }) => {
  await page.getByRole('tab', { name: 'NPC' }).click()
  await page.getByRole('button', { name: '編集', exact: true }).click()

  await page.getByRole('button', { name: /宗像 巌/ }).click()
  await page.getByLabel('名前').first().fill('宗像 厳一郎')

  await page.getByRole('button', { name: '＋ NPCを追加' }).click()
  await page.getByLabel('名前').last().fill('村長・田所')

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('編集内容を保存しました')).toBeVisible()
  await expect(page.getByText('宗像 厳一郎')).toBeVisible()
  await expect(page.getByText('村長・田所')).toBeVisible()

  // 再読み込みしても残っている
  await page.reload()
  await page.getByRole('tab', { name: 'NPC' }).click()
  await expect(page.getByText('宗像 厳一郎')).toBeVisible()
})

test('手がかりを削除すると検証結果が更新される', async ({ page }) => {
  await page.getByRole('tab', { name: '場所・手がかり' }).click()
  await page.getByRole('button', { name: '編集', exact: true }).click()

  const clueCard = page.locator('div', { has: page.getByRole('button', { name: /血のついた祭具/ }) }).last()
  await clueCard.getByRole('button', { name: '削除' }).click()
  await page.getByRole('button', { name: '保存', exact: true }).click()

  await page.getByRole('tab', { name: /検証/ }).click()
  await expect(page.getByText(/神主が失踪事件の犯人である」に到達できる手がかりが2個/)).toBeVisible()
})

test('キャンセルすると編集内容は破棄される', async ({ page }) => {
  await page.getByRole('button', { name: '編集', exact: true }).click()
  await page.getByLabel('タイトル').fill('別のタイトル')

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click()

  await expect(page.getByRole('heading', { name: '霧隠れ村の祭囃子' })).toBeVisible()
  await expect(page.getByText('別のタイトル')).toHaveCount(0)
})
