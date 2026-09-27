'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import { getGameSystem } from '@/data/game-systems'
import { GMAssistantService } from '@/lib/services/gm-assistant-service'
import { GMChatMessage, TRPGScenario } from '@/lib/types'
import { TokenUsage } from '@/lib/ai/usage'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  'PLが想定外の場所を調べたいと言い出した。どう対応する？',
  '手がかりを見逃して行き詰まっている。自然な救済策は？',
  '黒幕の手先が襲撃してくる即興シーンを作って',
  'このシナリオに合う、PCが休息する場面の描写を書いて'
]

export default function GMAssistantPanel({
  scenario,
  onUsage
}: {
  scenario: TRPGScenario
  onUsage?: (usage: TokenUsage | undefined) => void
}) {
  const storageKey = `trpg-gm-chat-${scenario.id}`
  const gmTitle = getGameSystem(scenario.request.systemId).gmTitle
  const [messages, setMessages] = useState<GMChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [partialAnswer, setPartialAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setMessages(JSON.parse(stored))
    } catch {
      // 読み込めない履歴は無視する
    }
  }, [storageKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, isLoading, partialAnswer])

  const saveMessages = (next: GMChatMessage[]) => {
    setMessages(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const send = async (question: string) => {
    const text = question.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)
    setIsLoading(true)
    setPartialAnswer('')
    const history = messages
    saveMessages([...history, { role: 'user', content: text }])

    try {
      const answer = await GMAssistantService.ask(scenario, history, text, setPartialAnswer, onUsage)
      saveMessages([...history, { role: 'user', content: text }, { role: 'assistant', content: answer }])
    } catch (e: any) {
      setError(e.message || '回答の取得に失敗しました')
    } finally {
      setIsLoading(false)
      setPartialAnswer('')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col h-[70vh]">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{gmTitle}アシスタント</h3>
          <p className="text-xs text-gray-500">シナリオの真相を踏まえて、セッション中の即興対応を相談できます。</p>
        </div>
        {messages.length > 0 && (
          <button
            className="text-xs text-gray-500 hover:underline"
            onClick={() => {
              if (confirm('会話履歴を消去しますか？')) saveMessages([])
            }}
          >
            履歴を消去
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">例えばこんな相談ができます:</p>
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                className="block w-full text-left text-sm rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => send(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap',
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100">
              {partialAnswer || <span className="text-gray-500 animate-pulse">考えています...</span>}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2"
        onSubmit={e => {
          e.preventDefault()
          send(input)
        }}
      >
        <textarea
          className="flex-grow resize-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="PLの行動や困っていることを入力（Ctrl+Enterで送信）"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          送信
        </Button>
      </form>
    </div>
  )
}
