import { FlowContext, FlowEngine, FlowExecutor, FlowStep } from '@/lib/flow/flow-engine'
import { aiClient } from '@/lib/ai/client'
import { AIMessage } from '@/lib/ai/types'
import { extractJSON } from '@/lib/json-extract'
import {
  ScenarioAISettings,
  ScenarioContentReview,
  ScenarioRequest,
  ScenarioSection,
  TRPGScenario
} from '@/lib/types'
import {
  ScenarioPromptContext,
  buildClueRepairPrompt,
  buildContentReviewPrompt,
  buildConceptPrompt,
  buildEndingsPrompt,
  buildLocationsAndCluesPrompt,
  buildNPCPrompt,
  buildScenesPrompt,
  buildSystemPrompt
} from './scenario-prompts'
import {
  mergeRepairClues,
  normalizeClues,
  normalizeContentIssues,
  normalizeEndings,
  normalizeGMGuide,
  normalizeLocations,
  normalizeNPCs,
  normalizeOverview,
  normalizeScenes,
  normalizeTruth
} from './scenario-normalizer'
import { ScenarioValidator } from './scenario-validator'
import { ReferenceRepairReport, existingIdHint, repairAfterRegeneration } from './reference-repair'

// フローのコンテキストのうち、シナリオとして保存するキー
const SCENARIO_CONTEXT_KEYS = [
  'overview', 'truth', 'npcs', 'locations', 'clues', 'scenes', 'endings', 'gmGuide', 'validation', 'review'
] as const

export function contextToScenarioPatch(context: FlowContext): Partial<TRPGScenario> {
  const patch: Partial<TRPGScenario> = {}
  for (const key of SCENARIO_CONTEXT_KEYS) {
    if (context[key] !== undefined) (patch as any)[key] = context[key]
  }
  return patch
}

export function scenarioToContext(scenario: TRPGScenario): FlowContext {
  return {
    request: scenario.request,
    overview: scenario.overview,
    truth: scenario.truth,
    npcs: scenario.npcs,
    locations: scenario.locations,
    clues: scenario.clues,
    scenes: scenario.scenes,
    endings: scenario.endings,
    gmGuide: scenario.gmGuide,
    validation: scenario.validation
  }
}

export interface ExecutorOptions {
  // 生成中のテキスト（その呼び出しで受信した全文）を受け取る
  onStream?: (receivedText: string) => void
}

export class TRPGScenarioFlowExecutor implements FlowExecutor {
  private aiSettings: ScenarioAISettings
  private flowEngine?: FlowEngine
  private options: ExecutorOptions

  constructor(aiSettings: ScenarioAISettings, options: ExecutorOptions = {}) {
    this.aiSettings = aiSettings
    this.options = options
  }

  setFlowEngine(engine: FlowEngine): void {
    this.flowEngine = engine
  }

  async executeStep(step: FlowStep, context: FlowContext): Promise<FlowContext> {
    const request = context.request as ScenarioRequest
    if (!request) throw new Error('シナリオの依頼内容がありません')

    const promptContext: ScenarioPromptContext = { ...context, request }

    switch (step.id) {
      case 'design-concept':
        return this.designConcept(promptContext)
      case 'create-npcs':
        return this.createNPCs(promptContext)
      case 'design-locations-clues':
        return this.designLocationsAndClues(promptContext)
      case 'structure-scenes':
        return this.structureScenes(promptContext)
      case 'design-endings':
        return this.designEndings(promptContext)
      case 'validate-structure':
      case 'finalize':
        return this.validate(context)
      case 'repair-clues':
        return this.repairClues(promptContext, context.validation?.revelationsNeedingClues ?? [])
      case 'review-content':
        return this.reviewContentStep(context)
      default:
        throw new Error(`Unknown step: ${step.id}`)
    }
  }

  /**
   * 既存シナリオの一部だけを作り直す。他のセクションはそのまま使い、
   * IDが変わった要素への参照を張り直してから検証をやり直す。
   */
  async regenerateSection(
    scenario: TRPGScenario,
    section: ScenarioSection,
    instruction?: string
  ): Promise<{ patch: Partial<TRPGScenario>; report: ReferenceRepairReport }> {
    const context = scenarioToContext(scenario)
    const combinedInstruction = [instruction, existingIdHint(scenario, section)].filter(Boolean).join('\n\n')
    const promptContext: ScenarioPromptContext = {
      ...context,
      request: scenario.request,
      instruction: combinedInstruction || undefined
    }

    let result: FlowContext
    switch (section) {
      case 'concept':
        result = await this.designConcept(promptContext)
        break
      case 'npcs':
        result = await this.createNPCs(promptContext)
        break
      case 'locationsAndClues':
        result = await this.designLocationsAndClues(promptContext)
        break
      case 'scenes':
        result = await this.structureScenes(promptContext)
        break
      case 'endings':
        result = await this.designEndings(promptContext)
        break
    }

    const regenerated = { ...scenario, ...contextToScenarioPatch(result) }
    const { scenario: repaired, report } = repairAfterRegeneration(scenario, regenerated, section)
    if (report.remapped || report.removed) {
      this.log(`参照を${report.remapped}件付け替え、無効な参照を${report.removed}件取り除きました`)
    }

    const patch: Partial<TRPGScenario> = {
      ...contextToScenarioPatch(result),
      clues: repaired.clues,
      scenes: repaired.scenes
    }
    return { patch: { ...patch, ...this.validate({ ...repaired, request: scenario.request }) }, report }
  }

  /**
   * 検証で手がかり不足と判定された重要情報に、手がかりを追加する。
   */
  async reinforceClues(scenario: TRPGScenario): Promise<Partial<TRPGScenario>> {
    const context = scenarioToContext(scenario)
    const validation = ScenarioValidator.validate(scenario)
    if (!validation.needsRepair) return { validation }

    const result = await this.repairClues({ ...context, request: scenario.request }, validation.revelationsNeedingClues)
    return { ...result, ...this.validate({ ...context, ...result }) }
  }

  /**
   * AIにシナリオ全体を読ませ、構造検証では分からない内容の矛盾を指摘させる。
   */
  async reviewContent(scenario: TRPGScenario): Promise<ScenarioContentReview> {
    this.log('内容の矛盾をチェックしています...')
    const data = await this.callJSON(scenario.request, buildContentReviewPrompt(scenario), 0.2)
    const review: ScenarioContentReview = {
      summary: typeof data.summary === 'string' ? data.summary : '',
      issues: normalizeContentIssues(data.issues),
      reviewedAt: new Date(),
      model: this.aiSettings.model
    }
    this.log(`内容チェックで${review.issues.length}件の指摘がありました`)
    return review
  }

  // 生成フローの最後に実行する。失敗してもシナリオ自体は完成しているので、警告だけ出して続ける
  private async reviewContentStep(context: FlowContext): Promise<FlowContext> {
    try {
      const scenario = { ...context, aiSettings: this.aiSettings } as TRPGScenario
      return { review: await this.reviewContent(scenario) }
    } catch (error: any) {
      this.log(`内容チェックに失敗しました（${error?.message ?? error}）。検証タブから再実行できます`, 'warning')
      return {}
    }
  }

  private async designConcept(ctx: ScenarioPromptContext): Promise<FlowContext> {
    this.log('シナリオの概要と真相を設計しています...')
    const data = await this.callJSON(ctx.request, buildConceptPrompt(ctx), this.aiSettings.temperature)
    const overview = normalizeOverview(data.overview, ctx.request.workingTitle)
    const truth = normalizeTruth(data.truth)
    if (truth.keyRevelations.length === 0) {
      throw new Error('重要情報（keyRevelations）が生成されませんでした')
    }
    this.log(`「${overview.title}」: 重要情報${truth.keyRevelations.length}件を設定しました`)
    return { overview, truth }
  }

  private async createNPCs(ctx: ScenarioPromptContext): Promise<FlowContext> {
    this.log('NPCを作成しています...')
    const data = await this.callJSON(ctx.request, buildNPCPrompt(ctx), this.aiSettings.temperature)
    const npcs = normalizeNPCs(data.npcs)
    this.log(`${npcs.length}人のNPCを作成しました`)
    return { npcs }
  }

  private async designLocationsAndClues(ctx: ScenarioPromptContext): Promise<FlowContext> {
    this.log('探索場所と手がかりを設計しています...')
    const data = await this.callJSON(ctx.request, buildLocationsAndCluesPrompt(ctx), this.structuralTemperature())
    const locations = normalizeLocations(data.locations)
    const clues = normalizeClues(data.clues)
    this.log(`場所${locations.length}箇所、手がかり${clues.length}個を配置しました`)
    return { locations, clues }
  }

  private async structureScenes(ctx: ScenarioPromptContext): Promise<FlowContext> {
    this.log('シーンを構成しています...')
    const data = await this.callJSON(ctx.request, buildScenesPrompt(ctx), this.structuralTemperature())
    const scenes = normalizeScenes(data.scenes)
    this.log(`${scenes.length}個のシーンを構成しました`)
    return { scenes }
  }

  private async designEndings(ctx: ScenarioPromptContext): Promise<FlowContext> {
    this.log('エンディングと運営ガイドを作成しています...')
    const data = await this.callJSON(ctx.request, buildEndingsPrompt(ctx), this.aiSettings.temperature)
    const endings = normalizeEndings(data.endings)
    const gmGuide = normalizeGMGuide(data.gmGuide)
    this.log(`${endings.length}種類のエンディングを作成しました`)
    return { endings, gmGuide }
  }

  private validate(context: FlowContext): FlowContext {
    const validation = ScenarioValidator.validate({
      request: context.request,
      truth: context.truth,
      npcs: context.npcs ?? [],
      locations: context.locations ?? [],
      clues: context.clues ?? [],
      scenes: context.scenes ?? [],
      endings: context.endings ?? []
    })
    const errors = validation.issues.filter(i => i.severity === 'error').length
    const warnings = validation.issues.filter(i => i.severity === 'warning').length
    this.log(
      `検証スコア ${validation.score}点（エラー${errors}件 / 警告${warnings}件）`,
      errors > 0 ? 'warning' : 'info'
    )
    return { validation }
  }

  private async repairClues(ctx: ScenarioPromptContext, revelationIds: string[]): Promise<FlowContext> {
    this.log(`${revelationIds.length}件の重要情報について手がかりを補強しています...`)
    const data = await this.callJSON(
      ctx.request,
      buildClueRepairPrompt(ctx, revelationIds),
      this.structuralTemperature()
    )
    const { clues, scenes, added } = mergeRepairClues(ctx.clues ?? [], ctx.scenes ?? [], data.clues)
    this.log(`手がかりを${added.length}個追加しました`)
    return { clues, scenes }
  }

  // 構造的な整合性が重要なステップは創造性より安定性を優先する
  private structuralTemperature(): number {
    return Math.min(this.aiSettings.temperature, 0.6)
  }

  private async callJSON(request: ScenarioRequest, prompt: string, temperature: number): Promise<any> {
    const messages: AIMessage[] = [
      { role: 'system', content: buildSystemPrompt(request) },
      { role: 'user', content: prompt }
    ]

    // JSONの解析に失敗した場合は1回だけ再試行する
    for (let attempt = 1; attempt <= 2; attempt++) {
      let received = ''
      const onStream = this.options.onStream
      onStream?.('')
      const response = await aiClient.complete(
        {
          provider: this.aiSettings.provider,
          model: this.aiSettings.model,
          messages,
          temperature,
          maxTokens: this.aiSettings.maxTokens
        },
        onStream
          ? {
              onDelta: delta => {
                received += delta
                onStream(received)
              }
            }
          : {}
      )

      const parsed = extractJSON(response.content)
      if (parsed && typeof parsed === 'object') return parsed

      this.log(`AIの応答をJSONとして解析できませんでした（${attempt}回目）`, 'warning')
      if (response.finishReason === 'length') {
        this.log('応答が最大出力トークン数で打ち切られています。シナリオ作成時の詳細設定で最大出力トークン数を増やしてください', 'warning')
      }
    }

    throw new Error('AIの応答をJSONとして解析できませんでした')
  }

  private log(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.flowEngine?.log(message, type)
  }
}
