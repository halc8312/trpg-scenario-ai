'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import AISettingsModal from '@/components/settings/AISettingsModal'

export default function Header() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
          <span aria-hidden="true">🎲</span>
          TRPGシナリオAI
        </Link>
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
          AI設定
        </Button>
      </div>
      <AISettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </header>
  )
}
