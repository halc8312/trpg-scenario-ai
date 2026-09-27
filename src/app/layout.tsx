import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/lib/toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'TRPGシナリオAI',
  description: 'AIでTRPGシナリオの真相・NPC・手がかり・シーン・エンディングを設計し、構造を自動検証します'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
