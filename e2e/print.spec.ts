import { expect, test } from '@playwright/test'
import { createScenario, mockAI } from './fixtures'

test.beforeEach(async ({ page }) => {
  await mockAI(page)
  await createScenario(page)
})

test('GM用の印刷ページにシナリオ全体が載り、PDFにできる', async ({ page, browserName }) => {
  await page.getByRole('link', { name: '印刷・PDF' }).click()
  await expect(page.getByRole('heading', { name: '霧隠れ村の祭囃子', level: 1 })).toBeVisible()
  await expect(page.getByText('神主の宗像が、古い神を鎮めるために村人を生贄にしている。')).toBeVisible()
  await expect(page.getByText('シーン4：洞窟の儀式（クライマックス）')).toBeVisible()

  // 印刷時は操作バーを表示しない
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: '印刷 / PDFで保存' })).toBeHidden()

  test.skip(browserName !== 'chromium', 'PDF出力はChromiumのみ')
  const pdf = await page.pdf({ format: 'A4' })
  // セクションごとに改ページするため複数ページになる
  const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []
  expect(pages.length).toBeGreaterThan(1)
})

test('PL向け資料には真相が載らない', async ({ page }) => {
  await page.getByRole('link', { name: '印刷・PDF' }).click()
  await page.getByRole('button', { name: 'PL向け資料' }).click()
  await expect(page.getByText('探索者の友人・佐伯から「妹が村で消えた」と連絡が入る。')).toBeVisible()
  await expect(page.getByText(/生贄/)).toHaveCount(0)
})

test('ハンドアウトを1枚ずつ印刷できる', async ({ page }) => {
  await page.getByRole('link', { name: '印刷・PDF' }).click()
  await page.getByRole('button', { name: 'ハンドアウト' }).click()
  await expect(page).toHaveURL(/mode=handouts/)
  await expect(page.getByText('「満月ノ夜、洞ニテ神ヲ鎮ムベシ」')).toBeVisible()
})
