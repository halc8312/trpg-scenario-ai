import { expect, test } from '@playwright/test'
import { createScenario, mockAI } from './fixtures'

test('作成時にチェックするとサンプルキャラクターも生成される', async ({ page }) => {
  const calls = await mockAI(page)
  await page.goto('/')
  await page.getByRole('button', { name: '新規シナリオ' }).first().click()
  await page.getByLabel('プレイヤー人数分のサンプルキャラクター（PC）も作る').check()
  await page.getByRole('button', { name: '作成して生成開始' }).click()
  await page.getByText('シナリオが完成しました').waitFor()

  expect(calls.map(c => c.kind)).toContain('pregens')
  await page.getByRole('tab', { name: 'PC', exact: true }).click()
  await expect(page.getByText('古賀 明')).toBeVisible()
  await expect(page.getByText('新聞記者')).toBeVisible()
  await expect(page.getByText('図書館 70%')).toBeVisible()
})

test('あとからPCタブで作成できる', async ({ page }) => {
  const calls = await mockAI(page)
  await createScenario(page)
  expect(calls.map(c => c.kind)).not.toContain('pregens')

  await page.getByRole('tab', { name: 'PC', exact: true }).click()
  await page.getByRole('button', { name: 'サンプルキャラクターを作成' }).click()
  await expect(page.getByText('サンプルキャラクターを再生成しました')).toBeVisible()
  await expect(page.getByText('三浦 静')).toBeVisible()
})
