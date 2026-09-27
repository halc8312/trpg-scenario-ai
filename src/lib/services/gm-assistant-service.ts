import { aiClient } from '@/lib/ai/client'
import { AIMessage } from '@/lib/ai/types'
import { GMChatMessage, TRPGScenario } from '@/lib/types'
import { buildGMAssistantSystemPrompt } from './scenario-prompts'

// 直近の会話のみを送ってトークン数を抑える
const MAX_HISTORY_MESSAGES = 12

/**
 * セッション中のGM/KPの相談相手。シナリオの真相を踏まえて即興の提案を行う。
 */
export class GMAssistantService {
  static async ask(scenario: TRPGScenario, history: GMChatMessage[], question: string): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'system', content: buildGMAssistantSystemPrompt(scenario) },
      ...history.slice(-MAX_HISTORY_MESSAGES).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: question }
    ]

    const response = await aiClient.complete({
      provider: scenario.aiSettings.provider,
      model: scenario.aiSettings.model,
      messages,
      temperature: 0.7,
      // 思考トークンを含むモデルもあるため余裕を持たせる
      maxTokens: Math.min(scenario.aiSettings.maxTokens, 16000)
    })

    return response.content.trim()
  }
}
