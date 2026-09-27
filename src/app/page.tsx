'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import ScenarioCard from '@/components/scenario/ScenarioCard'
import CreateScenarioModal from '@/components/scenario/CreateScenarioModal'
import { TRPGScenarioService } from '@/lib/services/scenario-service'
import { ScenarioAISettings, ScenarioRequest, TRPGScenario } from '@/lib/types'
import { loadFromFile } from '@/lib/utils'
import { useToast } from '@/lib/toast'

export default function TRPGScenariosPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [scenarios, setScenarios] = useState<TRPGScenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadScenarios = () => {
    setScenarios(TRPGScenarioService.getAll())
    setIsLoading(false)
  }

  useEffect(() => {
    loadScenarios()
  }, [])

  const handleCreate = (request: ScenarioRequest, aiSettings: ScenarioAISettings) => {
    const scenario = TRPGScenarioService.create(request, aiSettings)
    setShowCreateModal(false)
    router.push(`/scenarios/${scenario.id}?autostart=1`)
  }

  const handleImport = async () => {
    try {
      const data = await loadFromFile()
      const scenario = TRPGScenarioService.import(data)
      addToast(`「${scenario.overview?.title ?? 'シナリオ'}」を読み込みました`, 'success')
      loadScenarios()
    } catch (error: any) {
      if (error?.message !== 'No file selected') {
        addToast(error?.message || 'シナリオの読み込みに失敗しました', 'error')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <div className="flex-grow max-w-7xl mx-auto px-4 py-6 sm:py-8 w-full">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">TRPGシナリオ</h1>
            <div className="flex gap-2 sm:gap-3">
              <Button variant="secondary" size="sm" onClick={handleImport}>
                JSONを読み込む
              </Button>
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                新規シナリオ
              </Button>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            条件を入力するだけで、真相・NPC・手がかり・シーン・エンディングまで揃ったシナリオをAIが設計します。
            重要な情報に複数の手がかりがあるかを自動検証し、足りなければ補強します。AIは右上の「AI設定」で切り替えられます。
          </p>
        </div>

        {isLoading ? null : scenarios.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
            <div className="text-5xl mb-4" aria-hidden="true">🎲</div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              シナリオがありません
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
              クトゥルフ神話TRPG、D&D、ソード・ワールド2.5、またはシステム非依存のシナリオを作成できます。
            </p>
            <Button onClick={() => setShowCreateModal(true)}>最初のシナリオを作成</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {scenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onDelete={id => {
                  TRPGScenarioService.delete(id)
                  loadScenarios()
                }}
                onDuplicate={id => {
                  TRPGScenarioService.duplicate(id)
                  loadScenarios()
                }}
              />
            ))}
          </div>
        )}

        <CreateScenarioModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      </div>
    </div>
  )
}
