import { createOpencode } from '@opencode-ai/sdk'
import { embedQuery } from '../opencode-plugin/pgvector-retriever.ts'
import { getPool } from '../lib/pg.js'

const args = process.argv.slice(2)
let question = ''
let notebookId = 'default'
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--notebook' && args[i + 1]) notebookId = args[++i]
  else question += (question ? ' ' : '') + args[i]
}
if (!question) throw new Error('Usage: node cli/run-rag-demo-postgres.mjs [--notebook demo] "질문"')

function vectorLiteral(values) {
  return `[${values.join(',')}]`
}

const pool = getPool()
let retrieval
try {
  const vector = await embedQuery(question)
  const res = await pool.query(
    `select doc_id, title, page, chunk_id, path, content, embedding <=> $1::vector as distance
       from document_chunks
      where notebook_id = $2
      order by embedding <=> $1::vector asc
      limit 4`,
    [vectorLiteral(vector), notebookId]
  )
  if (res.rows.length === 0) {
    console.log(JSON.stringify({ empty: true, message: '검색 결과 없음' }, null, 2))
    process.exit(0)
  }
  retrieval = {
    context: res.rows.map((row, i) => `[${i + 1}] ${row.content}`).join('\n\n'),
    sources: res.rows.map((row, i) => ({ marker: i + 1, docId: row.doc_id, title: row.title, page: row.page, chunkId: row.chunk_id, path: row.path, distance: row.distance })),
    empty: false,
  }
} finally {
  await pool.end()
}

const opencode = await createOpencode({ config: { model: process.env.OPENCODE_MODEL || 'opencode/deepseek-v4-flash-free' } })
try {
  const session = await opencode.client.session.create({ body: { title: 'run-rag-demo-postgres' } })
  const prompt = [
    'You are a grounded Korean answerer.',
    'Use ONLY the retrieved context.',
    'Return JSON only with answer, citations, confidence.',
    'Each citation must include marker, docId, page, path, quote.',
    '',
    `Question: ${question}`,
    '',
    'Retrieved context:',
    retrieval.context,
    '',
    'Retrieved sources:',
    JSON.stringify(retrieval.sources, null, 2),
  ].join('\n')
  const result = await opencode.client.session.prompt({ path: { id: session.data.id }, body: { parts: [{ type: 'text', text: prompt }] } })
  const answer = (result.data.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n').trim()
  console.log(JSON.stringify({ retrieval, answer }, null, 2))
} finally {
  await opencode.server.close()
}
