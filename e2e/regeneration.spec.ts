import { expect, test } from '@playwright/test'
import { createScenario, fulfillAI, mockAI } from './fixtures'

const json = (data: unknown) => ({ content: '```json\n' + JSON.stringify(data) + '\n```', finishReason: 'stop' })

test('NPCを再生成してもシーンからの参照が名前で付け替えられる', async ({ page }) => {
  let regenerating = false
  const calls = await mockAI(page, {
    override: async (kind, route) => {
      if (kind !== 'npcs' || !regenerating) return false
      // IDを変えて返し、佐伯は削除、村長を追加する
      await fulfillAI(route, json({ npcs: [{ id: 'npc-10', name: '宗像 巌', role: '黒幕' }, { id: 'npc-11', name: '村長・田所', role: '協力者' }] }))
      return true
    }
  })
  await createScenario(page)

  regenerating = true
  await page.getByRole('tab', { name: 'NPC' }).click()
  await page.getByPlaceholder(/追加の指示/).fill('村長を登場させて')
  await page.getByRole('button', { name: '再生成', exact: true }).click()
  await expect(page.getByText(/NPCを再生成しました（参照を\d+件付け替え、\d+件の無効な参照を削除）/)).toBeVisible()

  // 再生成時のプロンプトに既存IDが含まれている
  const regenCall = calls.filter(c => c.kind === 'npcs').at(-1)!
  expect(regenCall.body.messages.at(-1).content).toContain('npc-1: 宗像 巌')

  await page.getByRole('tab', { name: 'シーン' }).click()
  await expect(page.getByText('NPC: 宗像 巌').first()).toBeVisible()
  await expect(page.getByText('佐伯 翔太')).toHaveCount(0)
})

test('検証タブから手がかりをAIで補強できる', async ({ page }) => {
  const calls = await mockAI(page)
  await createScenario(page)

  // 手がかりを1つ削除して不足させる
  await page.getByRole('tab', { name: '場所・手がかり' }).click()
  await page.getByRole('button', { name: '編集', exact: true }).click()
  const clueCard = page.locator('div', { has: page.getByRole('button', { name: /血のついた祭具/ }) }).last()
  await clueCard.getByRole('button', { name: '削除' }).click()
  await page.getByRole('button', { name: '保存', exact: true }).click()

  await page.getByRole('tab', { name: /検証/ }).click()
  await page.getByRole('button', { name: 'AIで手がかりを補強' }).click()
  await expect(page.getByText('手がかりを補強しました')).toBeVisible()
  expect(calls.filter(c => c.kind === 'repair')).toHaveLength(2)
  await expect(page.getByRole('button', { name: 'AIで手がかりを補強' })).toHaveCount(0)
})
