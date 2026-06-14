const args = process.argv.slice(2)
let model = 'opencode/deepseek-v4-flash-free'
let url = ''
let question = ''
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' && args[i + 1]) model = args[++i]
  else if (args[i] === '--url' && args[i + 1]) url = args[++i]
  else question += (question ? ' ' : '') + args[i]
}
if (!url || !question) {
  console.error('Usage: node opencode-url-rag.mjs --url https://example.com "질문" [--model provider/model]')
  process.exit(1)
}

const page = await fetch(url, {
  headers: { 'user-agent': 'Mozilla/5.0 OpenCode-URL-RAG' },
})
if (!page.ok) {
  console.error(`Failed to fetch URL: ${page.status} ${page.statusText}`)
  process.exit(2)
}
const html = await page.text()
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 20000)

const prompt = [
  'You are answering ONLY from the provided webpage text.',
  `Source URL: ${url}`,
  'If the answer is not in the text, say so plainly.',
  '',
  'Question:',
  question,
  '',
  'Webpage text:',
  text,
].join('\n')

const { spawnSync } = await import('node:child_process')
const result = spawnSync('opencode', ['run', '--format', 'json', '-m', model, prompt], {
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 10 * 1024 * 1024,
})

if (result.error) {
  console.error(result.error.message)
  process.exit(3)
}
if (result.stderr?.trim()) {
  console.error(result.stderr.trim())
}

const lines = result.stdout.split('\n').map(s => s.trim()).filter(Boolean)
let texts = []
for (const line of lines) {
  try {
    const evt = JSON.parse(line)
    const walk = (v) => {
      if (!v) return
      if (Array.isArray(v)) return v.forEach(walk)
      if (typeof v !== 'object') return
      if (v.type === 'text' && typeof v.text === 'string') texts.push(v.text)
      for (const k of Object.keys(v)) walk(v[k])
    }
    walk(evt)
  } catch {}
}

const final = [...new Set(texts.map(s => s.trim()).filter(Boolean))].join('\n')
console.log(JSON.stringify({ model, url, question, answer: final, fetchedChars: text.length }, null, 2))
