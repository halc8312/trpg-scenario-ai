import { expect, test } from '@playwright/test'
import { readFileSync } from 'fs'
import { createScenario, mockAI, selectFile } from './fixtures'

test('すべてをバックアップし、削除したシナリオを復元できる', async ({ page }, testInfo) => {
  await mockAI(page)
  await createScenario(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'バックアップ', exact: true }).click()
  await expect(page.getByText('保存方式: IndexedDB（ブラウザ内のデータベース）')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'すべてをバックアップ' }).click()
  ])
  const backupPath = testInfo.outputPath('backup.json')
  await download.saveAs(backupPath)
  await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()

  // シナリオを削除する
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '削除' }).click()
  await expect(page.getByText('シナリオがありません')).toBeVisible()

  // 再読み込みしても削除されたまま（IndexedDBに保存されている）
  await page.reload()
  await expect(page.getByText('シナリオがありません')).toBeVisible()

  await page.getByRole('button', { name: 'バックアップ', exact: true }).click()
  await page.getByRole('button', { name: 'バックアップから復元' }).click()
  await selectFile(page, readFileSync(backupPath, 'utf-8'))
  await expect(page.getByText(/復元しました（追加 1件/)).toBeVisible()
  await expect(page.getByRole('heading', { name: '霧隠れ村の祭囃子' })).toBeVisible()
})
