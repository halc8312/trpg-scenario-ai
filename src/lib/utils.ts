import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function saveTextToFile(filename: string, text: string, type = 'text/plain'): void {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function saveToFile(filename: string, data: unknown): void {
  saveTextToFile(filename, JSON.stringify(data, null, 2), 'application/json')
}

export function loadFromFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // 前回キャンセルされて残った入力欄を片付ける
    document.querySelectorAll('input[data-file-loader]').forEach(el => el.remove())

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.style.display = 'none'
    input.dataset.fileLoader = 'true'
    // ブラウザによってはページに追加していないと選択結果が通知されない
    document.body.appendChild(input)

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      try {
        resolve(JSON.parse(await file.text()))
      } catch {
        reject(new Error('JSONファイルを読み込めませんでした'))
      }
    })
    input.click()
  })
}
