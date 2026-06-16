import { embedDocument } from '../opencode-plugin/pgvector-retriever.ts'
import { getPool } from '../lib/pg.js'

const args = process.argv.slice(2)
let url = ''
let notebookId = 'default'
let title = ''
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) url = args[++i]
  else if (args[i] === '--notebook' && args[i + 1]) notebookId = args[++i]
  else if (args[i] === '--title' && args[i + 1]) title = args[++i]
}
if (!url) throw new Error('Usage: node cli/ingest-url-to-postgres.mjs --url https://example.com [--notebook demo] [--title title]')

function htmlToText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<noscript[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
}
function chunkText(text, size = 1200, overlap = 150) {
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
function vectorLiteral(values) {
  return `[${values.join(',')}]`
}

const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 OpenCode-PG-Ingest' } })
if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
const html = await res.text()
const text = htmlToText(html)
const docId = new URL(url).pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/, '') || `doc-${Date.now()}`
const resolvedTitle = title || text.slice(0, 80) || url
const chunks = chunkText(text)

const pool = getPool()
try {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await embedDocument(chunk)
    await pool.query(
      `insert into document_chunks (notebook_id, doc_id, title, page, chunk_id, path, source_url, content, embedding)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)`,
      [notebookId, docId, resolvedTitle, 1, i + 1, `${docId}/p1#chunk-${i + 1}`, url, chunk, vectorLiteral(embedding)]
    )
  }
  console.log(JSON.stringify({ ok: true, notebookId, docId, title: resolvedTitle, chunkCount: chunks.length }, null, 2))
} finally {
  await pool.end()
}
