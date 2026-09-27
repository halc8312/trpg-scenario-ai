import { expect, test } from '@playwright/test'
import { createScenario, mockAI } from './fixtures'

test('条件を入力するとシナリオが生成され、手がかり不足が自動補強される', async ({ page }) => {
  const calls = await mockAI(page, { delayMs: 100 })
  await createScenario(page)

  expect(calls.map(c => c.kind)).toEqual(['concept', 'npcs', 'clues', 'scenes', 'endings', 'repair', 'review'])
  // 既定のAI設定（Claude）で呼び出している
  expect(calls[0].body).toMatchObject({ provider: 'anthropic', model: 'claude-opus-5' })

  await expect(page.getByRole('heading', { name: '霧隠れ村の祭囃子' })).toBeVisible()

  await page.getByRole('tab', { name: 'シーン' }).click()
  await expect(page.getByText('手がかり: 古文書、失踪者の名簿')).toBeVisible()

  await page.getByRole('tab', { name: /検証/ }).click()
  await expect(page.getByText('シナリオ構造の検証スコア（100点満点）')).toBeVisible()
  await expect(page.getByText('99', { exact: true }).last()).toBeVisible()

  // AIによる内容チェックの結果も表示される
  await expect(page.getByText(/古文書は「満月の夜」としている/)).toBeVisible()
  await expect(page.getByText('対象: 古文書')).toBeVisible()
  await expect(page.getByText('直し方: 祭りの日を満月に設定する')).toBeVisible()
})

test('内容チェックに失敗してもシナリオは完成し、検証タブから再実行できる', async ({ page }) => {
  let failReview = true
  const calls = await mockAI(page, {
    override: async (kind, route) => {
      if (kind !== 'review' || !failReview) return false
      await route.fulfill({ status: 429, json: { error: 'rate limited' } })
      return true
    }
  })
  await createScenario(page)

  await page.getByRole('tab', { name: /検証/ }).click()
  failReview = false
  await page.getByRole('button', { name: 'AIで内容をチェック' }).click()
  await expect(page.getByText('内容のチェックが完了しました')).toBeVisible()
  await expect(page.getByText(/古文書は「満月の夜」としている/)).toBeVisible()
  expect(calls.filter(c => c.kind === 'review')).toHaveLength(2)
})

test('Markdownで書き出すとPL向けとGM向けの情報が分かれている', async ({ page }) => {
  await mockAI(page)
  await createScenario(page)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Markdown出力' }).click()
  ])
  const text = await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString('utf-8'))
  expect(text.indexOf('## PL向け情報')).toBeLessThan(text.indexOf('## KP向け情報'))
  expect(text).toContain('#### シーン1: 友人からの依頼（導入）')
})

test('GM相談でシナリオを踏まえた回答が返る', async ({ page }) => {
  const calls = await mockAI(page)
  await createScenario(page)

  await page.getByRole('tab', { name: 'GM相談' }).click()
  await page.getByRole('button', { name: /想定外の場所/ }).click()
  await expect(page.getByText(/案1: 佐伯に/)).toBeVisible()

  const gmCall = calls.find(c => c.kind === 'gm')!
  expect(gmCall.body.messages[0].content).toContain('神主の宗像')
})
