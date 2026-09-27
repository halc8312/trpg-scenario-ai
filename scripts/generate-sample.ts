/**
 * 実際のAIを使ってシナリオ生成フローを通しで実行し、結果を確認するためのスクリプト。
 * 起動中のアプリ（npm run dev など）の /api/ai/complete を経由してAIを呼ぶ。
 *
 * 使い方:
 *   npm run dev   # 別のターミナルで起動しておく（.env.local にAPIキーを設定）
 *   npm run generate:sample -- --provider deepseek --model deepseek-flash --system coc7
 *
 * オプション:
 *   --provider openai|anthropic|gemini|deepseek（既定: deepseek）
 *   --model    モデルID（既定: プロバイダーの既定モデル）
 *   --system   coc7|dnd5e|sw25|emoklore|shinobigami|dx3|insane|generic（既定: coc7）
 *   --premise  アイデア（既定: 空欄＝AIにおまかせ）
 *   --pregens  サンプルキャラクターも作る
 *   --url      アプリのURL（既定: http://localhost:3000）
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parseArgs } from 'util'
import { trpgScenarioFlow } from '@/data/scenario-flow'
import { AI_PROVIDERS, isAIProviderId } from '@/lib/ai/providers'
import { addUsage, loadModelPrices, summarizeUsage, formatCost, formatTokens, ScenarioUsage } from '@/lib/ai/usage'
import { FlowEngine } from '@/lib/flow/flow-engine'
import { ScenarioExporter } from '@/lib/services/scenario-exporter'
import { TRPGScenarioFlowExecutor, contextToScenarioPatch } from '@/lib/services/scenario-flow-executor'
import { ScenarioRequest, TRPGScenario, TRPGSystemId } from '@/lib/types'

const { values } = parseArgs({
  options: {
    provider: { type: 'string', default: 'deepseek' },
    model: { type: 'string' },
    system: { type: 'string', default: 'coc7' },
    premise: { type: 'string', default: '' },
    pregens: { type: 'boolean', default: false },
    url: { type: 'string', default: 'http://localhost:3000' }
  }
})

async function main() {
  const provider = values.provider
  if (!isAIProviderId(provider)) throw new Error(`不明なプロバイダー: ${provider}`)
  const model = values.model ?? AI_PROVIDERS[provider].defaultModel

  // ブラウザ用のクライアントは相対URLで呼ぶため、アプリのURLを補う
  const realFetch = globalThis.fetch
  globalThis.fetch = (input, init) =>
    realFetch(typeof input === 'string' && input.startsWith('/') ? new URL(input, values.url) : input, init)

  const request: ScenarioRequest = {
    systemId: values.system as TRPGSystemId,
    genre: '',
    premise: values.premise ?? '',
    playerCount: 3,
    sessionHours: 3,
    difficulty: 'normal',
    tone: 'シリアス',
    includePregens: values.pregens
  }
  const aiSettings = { provider, model, temperature: 0.8, maxTokens: AI_PROVIDERS[provider].defaultMaxTokens }

  let usage: ScenarioUsage | undefined
  let received = 0
  const executor = new TRPGScenarioFlowExecutor(aiSettings, {
    onStream: text => {
      if (text.length - received >= 2000 || text.length < received) {
        received = text.length
        process.stdout.write(`  … ${text.length}文字受信\n`)
      }
    },
    onUsage: (u, s) => {
      usage = addUsage(usage, s.provider, s.model, u)
    }
  })
  const engine = new FlowEngine(trpgScenarioFlow, executor)
  executor.setFlowEngine(engine)
  engine.on('stepStart', step => console.log(`▶ ${step.name}`))
  engine.on('log', (message, type) => console.log(`  ${type === 'warning' ? '⚠ ' : ''}${message}`))

  const started = Date.now()
  console.log(`${provider} / ${model} / ${request.systemId} で生成します\n`)
  const context = await engine.execute({ request })

  const now = new Date()
  const scenario: TRPGScenario = {
    id: 'sample', status: 'complete', request, aiSettings,
    npcs: [], locations: [], clues: [], scenes: [], endings: [],
    ...contextToScenarioPatch(context),
    usage, createdAt: now, updatedAt: now
  }

  const outDir = join('out', `${now.toISOString().replace(/[:.]/g, '-')}-${provider}-${request.systemId}`)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'scenario.json'), JSON.stringify(scenario, null, 2))
  writeFileSync(join(outDir, 'scenario.md'), ScenarioExporter.toMarkdown(scenario))

  const summary = summarizeUsage(usage, loadModelPrices())
  console.log('\n===== 結果 =====')
  console.log(`タイトル: ${scenario.overview?.title}`)
  console.log(`所要時間: ${Math.round((Date.now() - started) / 1000)}秒`)
  console.log(`NPC ${scenario.npcs.length} / 場所 ${scenario.locations.length} / 手がかり ${scenario.clues.length} / シーン ${scenario.scenes.length} / エンディング ${scenario.endings.length}`)
  console.log(`構造検証: ${scenario.validation?.score}点`)
  for (const issue of scenario.validation?.issues ?? []) console.log(`  [${issue.severity}] ${issue.message}`)
  console.log(`内容チェック: ${scenario.review ? `${scenario.review.issues.length}件の指摘` : '未実行（失敗）'}`)
  for (const issue of scenario.review?.issues ?? []) console.log(`  [${issue.severity}/${issue.category}] ${issue.message}`)
  console.log(`AI使用量: ${summary.calls}回・入力 ${formatTokens(summary.inputTokens)} / 出力 ${formatTokens(summary.outputTokens)}・概算 ${formatCost(summary.costUsd, null)}`)
  console.log(`\n保存先: ${outDir}`)
}

main().catch(error => {
  console.error(`\n失敗しました: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})
