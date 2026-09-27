import AxeBuilder from '@axe-core/playwright'
import { expect, Page, test } from '@playwright/test'
import { createScenario, mockAI } from './fixtures'

// 重大・深刻な問題のみを失敗扱いにする
async function expectNoSeriousViolations(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
  const summary = serious.map(v => `${v.id}: ${v.help}\n  ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join('\n  ')}`)
  expect(summary, `${name} のアクセシビリティ上の問題`).toEqual([])
}

// 横方向にはみ出す要素がない（スマホで横スクロールが発生しない）
async function expectNoHorizontalOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, `${name} が横にはみ出しています`).toBeLessThanOrEqual(1)
}

test('主要な画面にアクセシビリティ上の重大な問題がなく、画面幅に収まる', async ({ page }) => {
  await mockAI(page)
  await page.goto('/')
  await expectNoSeriousViolations(page, '一覧')

  await page.getByRole('button', { name: '新規シナリオ' }).first().click()
  await expectNoSeriousViolations(page, '作成フォーム')
  await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()

  await page.getByRole('button', { name: 'AI設定' }).click()
  await expectNoSeriousViolations(page, 'AI設定')
  await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()

  await createScenario(page)
  for (const tab of ['概要', 'PC', '真相', 'NPC', '場所・手がかり', 'シーン', 'エンディング', '検証', 'GM相談', 'セッション']) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click()
    await expectNoSeriousViolations(page, `${tab}タブ`)
    await expectNoHorizontalOverflow(page, `${tab}タブ`)
  }

  await page.getByRole('tab', { name: 'シーン' }).click()
  await page.getByRole('button', { name: '編集', exact: true }).click()
  await expectNoSeriousViolations(page, 'シーンの編集')
  await expectNoHorizontalOverflow(page, 'シーンの編集')
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click()

  await page.getByRole('link', { name: '印刷・PDF' }).click()
  await expectNoSeriousViolations(page, '印刷')
  await expectNoHorizontalOverflow(page, '印刷')
})
