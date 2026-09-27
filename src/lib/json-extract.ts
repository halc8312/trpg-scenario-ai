/**
 * AIの応答テキストからJSONを取り出す。
 * ```json フェンス → 任意のコードフェンス → 最初の { / [ から対応する閉じ括弧まで、の順に試す。
 */
export function extractJSON<T = any>(content: string): T | null {
  if (!content) return null

  const candidates: string[] = []

  const fenced = content.match(/```json\s*\n?([\s\S]*?)```/i)
  if (fenced) candidates.push(fenced[1])

  const anyFence = content.match(/```\w*\s*\n?([\s\S]*?)```/)
  if (anyFence) candidates.push(anyFence[1])

  const balanced = findBalancedJSON(content)
  if (balanced) candidates.push(balanced)

  candidates.push(content)

  for (const candidate of candidates) {
    const parsed = tryParse<T>(candidate.trim())
    if (parsed !== null) return parsed
  }

  return null
}

function tryParse<T>(text: string): T | null {
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    // 末尾カンマはAIがよく出力するので除去して再試行
    try {
      return JSON.parse(text.replace(/,\s*([}\]])/g, '$1')) as T
    } catch {
      return null
    }
  }
}

function findBalancedJSON(content: string): string | null {
  const start = content.search(/[{[]/)
  if (start === -1) return null

  const stack: string[] = []
  let inString = false
  let escaped = false

  for (let i = start; i < content.length; i++) {
    const char = content[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{' || char === '[') {
      stack.push(char === '{' ? '}' : ']')
    } else if (char === '}' || char === ']') {
      if (stack.pop() !== char) return null
      if (stack.length === 0) return content.slice(start, i + 1)
    }
  }

  return null
}
