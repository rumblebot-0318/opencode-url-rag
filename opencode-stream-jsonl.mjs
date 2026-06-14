import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
let model = 'opencode/deepseek-v4-flash-free'
let promptParts = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' && args[i + 1]) model = args[++i]
  else promptParts.push(args[i])
}
const prompt = promptParts.join(' ').trim()
if (!prompt) {
  console.error('Usage: node opencode-stream-jsonl.mjs [--model provider/model] "prompt"')
  process.exit(1)
}

const child = spawn('opencode', ['run', '--format', 'json', '-m', model, prompt], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
})

let buf = ''
let textParts = []
let rawEvents = []

function collectTextFrom(value) {
  if (!value) return
  if (Array.isArray(value)) {
    for (const item of value) collectTextFrom(item)
    return
  }
  if (typeof value !== 'object') return

  if (value.type === 'text' && typeof value.text === 'string') {
    textParts.push(value.text)
    console.log('[text]', value.text)
  }

  for (const key of Object.keys(value)) {
    const child = value[key]
    if (child && typeof child === 'object') collectTextFrom(child)
  }
}

child.stdout.on('data', (chunk) => {
  buf += chunk.toString()
  let idx
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (!line) continue
    try {
      const evt = JSON.parse(line)
      rawEvents.push(evt)
      if (evt.type === 'step_start') console.log('[step_start]', evt.sessionID)
      if (evt.type === 'tool_use') console.log('[tool_use]', evt.part?.tool || 'unknown')
      collectTextFrom(evt)
      if (evt.type === 'step_finish') console.log('[step_finish]', JSON.stringify(evt.tokens || {}))
    } catch {
      console.log('[raw]', line)
    }
  }
})

child.stderr.on('data', (chunk) => {
  const s = chunk.toString().trim()
  if (s) console.error('[stderr]', s)
})

child.on('close', (code) => {
  const deduped = []
  const seen = new Set()
  for (const t of textParts) {
    const s = String(t).trim()
    if (!s) continue
    if (seen.has(s)) continue
    seen.add(s)
    deduped.push(s)
  }

  console.log('--- FINAL TEXT ---')
  console.log(deduped.join('\n'))
  console.log('EVENT_COUNT', rawEvents.length)
  console.log('EXIT_CODE', code)
})
