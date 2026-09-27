// Optional manual recovery utility. Normal hosted generation uses QStash.
// Do not configure a paid scheduler; see docs/BACKGROUND_GENERATION.md.
// DeepSeek keys and scenario contents remain in the private Sites app.
const origin = process.env.SITE_ORIGIN
const siteToken = process.env.SITES_AUTH_TOKEN
const runnerSecret = process.env.SCENARIO_RUNNER_SECRET
if (!origin || !siteToken || !runnerSecret) throw new Error('Required runner environment is not configured')
const url = new URL('/api/generation/runner', origin)
if (url.protocol !== 'https:' || url.hostname !== 'trpg-scenario-workbench.halcy.chatgpt.site') {
  throw new Error('Unexpected Site origin')
}
const deadline = Date.now() + 9 * 60 * 1000
let stopping = false
process.on('SIGTERM', () => { stopping = true })
for (let step = 0; step < 32 && !stopping && Date.now() < deadline; step++) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'OAI-Sites-Authorization': `Bearer ${siteToken}`, 'x-scenario-runner-secret': runnerSecret },
    redirect: 'manual',
    signal: AbortSignal.timeout(285000)
  })
  if (!response.ok) throw new Error(`Runner request failed (${response.status})`)
  if (!response.headers.get('content-type')?.includes('application/x-ndjson') || !response.body) throw new Error('Unexpected runner response')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', result
  try {
    while (!result) {
      const chunk = await reader.read()
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, {stream:true})
      let end
      while ((end = buffer.indexOf('\n')) >= 0) {
        const event = JSON.parse(buffer.slice(0, end))
        buffer = buffer.slice(end + 1)
        if (event.type === 'error') throw new Error('Site runner could not execute this step')
        if (event.type === 'result') result = event
      }
      if (buffer.length > 10000) throw new Error('Invalid runner response')
    }
  } finally { await reader.cancel().catch(() => {}) }
  if (!result) throw new Error('Runner connection interrupted before confirmation')
  if (result.worked !== true) break
  console.log(`Completed one scenario step: ${result.status === 'error' ? 'needs retry' : 'saved'}`)
}
