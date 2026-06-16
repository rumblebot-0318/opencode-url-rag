import { ChromaClient } from 'chromadb'
import { embedDocument } from '../opencode-plugin/chroma-retriever.ts'

const args = process.argv.slice(2)
let url = ''
let notebookId = 'default'
let title = ''
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) url = args[++i]
  else if (args[i] === '--notebook' && args[i + 1]) notebookId = args[++i]
  else if (args[i] === '--title' && args[i + 1]) title = args[++i]
}
if (!url) {
  console.error('Usage: node cli/ingest-url-to-chroma.mjs --url https://example.com [--notebook demo] [--title title]')
  process.exit(1)
}

const CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8000'
const COLLECTION = process.env.CHROMA_COLLECTION ?? 'korean-docs'
const chroma = new ChromaClient({ path: CHROMA_URL })

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 OpenCode-Chroma-Ingest' } })
if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
const html = await res.text()
const text = htmlToText(html)
const docId = new URL(url).pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/, '') || `doc-${Date.now()}`
const resolvedTitle = title || (text.slice(0, 80) || url)
const chunks = chunkText(text)

let collection
try {
  collection = await chroma.getCollection({ name: COLLECTION })
} catch {
  collection = await chroma.createCollection({ name: COLLECTION })
}

const ids = []
const documents = []
const embeddings = []
const metadatas = []
for (let i = 0; i < chunks.length; i++) {
  const chunk = chunks[i]
  ids.push(`${docId}-chunk-${i + 1}`)
  documents.push(chunk)
  embeddings.push(await embedDocument(chunk))
  metadatas.push({
    notebook_id: notebookId,
    doc_id: docId,
    title: resolvedTitle,
    page: 1,
    chunk_id: i + 1,
    path: `${docId}/p1#chunk-${i + 1}`,
    source_url: url,
  })
}

await collection.add({ ids, documents, embeddings, metadatas })
console.log(JSON.stringify({ ok: true, url, notebookId, docId, title: resolvedTitle, chunkCount: chunks.length }, null, 2))
