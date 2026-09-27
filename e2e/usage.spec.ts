import { expect, test } from '@playwright/test'
import { createScenario, mockAI } from './fixtures'

test('AIの使用量と概算料金が表示され、円換算も設定できる', async ({ page }) => {
  await mockAI(page)
  await createScenario(page)

  // 7回 × (入力1,000 × $5 + 出力500 × $25) / 100万 = $0.1225
  await expect(page.getByText('AI使用量: 7回・入力 7.0k / 出力 3.5k トークン・ 概算 $0.12')).toBeVisible()

  await page.getByRole('button', { name: 'AI設定' }).click()
  await expect(page.getByTestId('usage-total')).toContainText('7回')
  await page.getByText('料金表を編集').click()
  await page.getByLabel('円換算レート').fill('150')
  await page.getByRole('button', { name: '保存' }).click()

  await expect(page.getByText(/概算 \$0\.12（約18円）/)).toBeVisible()
})
