import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProviderModelPicker from '@/components/settings/ProviderModelPicker'
import { aiClient } from '@/lib/ai/client'
import { AIProviderStatus } from '@/lib/ai/types'

jest.mock('@/lib/ai/client', () => ({ aiClient: { getModels: jest.fn() } }))

const statuses: AIProviderStatus[] = [
  { id: 'openai', name: 'OpenAI', configured: false, defaultModel: 'gpt-6-sol' },
  { id: 'anthropic', name: 'Claude (Anthropic)', configured: true, defaultModel: 'claude-opus-5' },
  { id: 'gemini', name: 'Gemini (Google)', configured: false, defaultModel: 'gemini-3.8-flash' },
  { id: 'deepseek', name: 'DeepSeek', configured: true, defaultModel: 'deepseek-v4-pro' }
]

describe('ProviderModelPicker', () => {
  it('switches to the default model of the selected provider', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<ProviderModelPicker provider="anthropic" model="claude-opus-5" statuses={statuses} onChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('AIプロバイダー'), 'deepseek')
    // サーバーの環境変数で上書きされた既定モデルを使う
    expect(onChange).toHaveBeenCalledWith('deepseek', 'deepseek-v4-pro')
  })

  it('warns when the API key is missing and disables fetching models', () => {
    render(<ProviderModelPicker provider="openai" model="gpt-6-sol" statuses={statuses} onChange={() => {}} />)
    expect(screen.getByText('OPENAI_API_KEY')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'OpenAI（APIキー未設定）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '一覧を取得' })).toBeDisabled()
  })

  it('fetches the live model list', async () => {
    const user = userEvent.setup()
    ;(aiClient.getModels as jest.Mock).mockResolvedValue(['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'])
    render(<ProviderModelPicker provider="anthropic" model="claude-opus-5" statuses={statuses} onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '一覧を取得' }))
    expect(await screen.findByText('3件のモデルを取得しました。入力欄から選べます。')).toBeInTheDocument()
    expect(aiClient.getModels).toHaveBeenCalledWith('anthropic')
  })
})
