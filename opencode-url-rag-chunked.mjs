import { createOpencode } from '@opencode-ai/sdk'

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
  console.error('Usage: node opencode-url-rag-chunked.mjs --url https://example.com "질문" [--model provider/model]')
  process.exit(1)
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function chunkText(text, size = 4000, overlap = 500) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(text.length, start + size)
    chunks.push(text.slice(start, end))
    if (end >= text.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return chunks
}

const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 OpenCode-Chunked-RAG' } })
if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
const html = await res.text()
const text = htmlToText(html)
const chunks = chunkText(text)

const opencode = await createOpencode({ config: { model } })
try {
  const extracts = []
  for (let i = 0; i < chunks.length; i++) {
    const session = await opencode.client.session.create({ body: { title: `chunk-${i + 1}` } })
    const chunkPrompt = [
      'You are extracting only information relevant to the user question from the provided web article chunk.',
      'Return concise bullet points in Korean.',
      'If nothing relevant is found, return exactly: 관련 내용 없음',
      '',
      `Question: ${question}`,
      `Source URL: ${url}`,
      `Chunk ${i + 1}/${chunks.length}:`,
      chunks[i],
    ].join('\n')
    const result = await opencode.client.session.prompt({
      path: { id: session.data.id },
      body: { parts: [{ type: 'text', text: chunkPrompt }] },
    })
    const out = (result.data.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n').trim()
    extracts.push({ index: i + 1, text: out || '관련 내용 없음' })
  }

  const mergedContext = extracts
    .filter(x => x.text && x.text !== '관련 내용 없음')
    .map(x => `[Chunk ${x.index}]\n${x.text}`)
    .join('\n\n')

  const finalSession = await opencode.client.session.create({ body: { title: 'chunk-merge' } })
  const finalPrompt = [
    'You are answering in Korean using only the extracted notes from webpage chunks.',
    'Write a clean news summary with these sections:',
    '1. 핵심 요약',
    '2. 주요 내용',
    '3. 한줄 정리',
    'If the notes are insufficient, say so plainly.',
    '',
    `Question: ${question}`,
    `Source URL: ${url}`,
    '',
    'Extracted notes:',
    mergedContext || '관련 내용 없음',
  ].join('\n')

  const finalResult = await opencode.client.session.prompt({
    path: { id: finalSession.data.id },
    body: { parts: [{ type: 'text', text: finalPrompt }] },
  })
  const answer = (finalResult.data.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n').trim()

  console.log(JSON.stringify({
    model,
    url,
    question,
    fetchedChars: text.length,
    chunkCount: chunks.length,
    extracts,
    answer,
  }, null, 2))
} finally {
  await opencode.server.close()
}
