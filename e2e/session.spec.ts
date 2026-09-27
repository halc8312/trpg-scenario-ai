import { expect, test } from '@playwright/test'
import { createScenario, mockAI } from './fixtures'

test.beforeEach(async ({ page }) => {
  await mockAI(page)
  await createScenario(page)
  await page.getByRole('tab', { name: 'セッション' }).click()
})

test('ダイスを振ると結果と成功度が表示され、履歴が残る', async ({ page }) => {
  await page.getByRole('button', { name: 'CC<=50' }).click()
  await expect(page.getByTestId('dice-total')).toHaveText(/^\d+$/)
  await expect(page.getByText(/クリティカル|イクストリーム成功|ハード成功|レギュラー成功|失敗|ファンブル/).first()).toBeVisible()

  await page.getByLabel('ダイスの表記').fill('2D6+3')
  await page.getByRole('button', { name: '振る' }).click()
  const total = Number(await page.getByTestId('dice-total').textContent())
  expect(total).toBeGreaterThanOrEqual(5)
  expect(total).toBeLessThanOrEqual(15)
  await expect(page.getByText(/^CC<=50 → \d+/)).toBeVisible()

  await page.getByLabel('ダイスの表記').fill('abc')
  await page.getByRole('button', { name: '振る' }).click()
  await expect(page.getByText('「ABC」は解釈できない表記です')).toBeVisible()
})

test('手がかりの入手やシーンの移動、メモが保存される', async ({ page }) => {
  await expect(page.getByText('手がかりの進み具合（0/6）')).toBeVisible()
  await page.getByRole('checkbox', { name: /村人の噂/ }).first().check()
  await expect(page.getByText('手がかりの進み具合（1/6）')).toBeVisible()

  await page.getByRole('button', { name: '→ #2 霧隠神社' }).click()
  await expect(page.getByText('霧の中に鳥居が浮かぶ。')).toBeVisible()

  await page.getByLabel('セッションメモ').fill('佐伯に神社の話をした')
  await page.getByLabel('セッションメモ').blur()

  await page.reload()
  await page.getByRole('tab', { name: 'セッション' }).click()
  await expect(page.getByText('手がかりの進み具合（1/6）')).toBeVisible()
  await expect(page.getByLabel('現在のシーン')).toHaveValue('scene-2')
  await expect(page.getByLabel('セッションメモ')).toHaveValue('佐伯に神社の話をした')
})

test('タイマーを開始・一時停止できる', async ({ page }) => {
  await page.getByRole('button', { name: '開始' }).click()
  await expect(page.getByLabel('経過時間')).toHaveText('0:00:01', { timeout: 3000 })
  await page.getByRole('button', { name: '一時停止' }).click()
  await expect(page.getByRole('button', { name: '再開' })).toBeVisible()
})
