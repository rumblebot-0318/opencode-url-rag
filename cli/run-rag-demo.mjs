import { createOpencode } from '@opencode-ai/sdk'
import { ChromaClient } from 'chromadb'
import { embedQuery } from '../opencode-plugin/chroma-retriever.ts'

const args = process.argv.slice(2)
let question = ''
let notebookId = 'default'
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--notebook' && args[i + 1]) notebookId = args[++i]
  else question += (question ? ' ' : '') + args[i]
}
if (!question) {
  console.error('Usage: node cli/run-rag-demo.mjs [--notebook demo] "질문"')
  process.exit(1)
}

const CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8000'
const COLLECTION = process.env.CHROMA_COLLECTION ?? 'korean-docs'
const TOP_K = Number(process.env.TOP_K ?? 4)
const chroma = new ChromaClient({ path: CHROMA_URL })
const collection = await chroma.getCollection({ name: COLLECTION })
const vector = await embedQuery(question)
const res = await collection.query({
  queryEmbeddings: [vector],
  nResults: TOP_K,
  where: notebookId ? { notebook_id: notebookId } : undefined,
})

const docs = res.documents?.[0] ?? []
const metas = res.metadatas?.[0] ?? []
const dists = res.distances?.[0] ?? []
if (docs.length === 0) {
  console.log(JSON.stringify({ empty: true, message: '검색 결과 없음' }, null, 2))
  process.exit(0)
}

const retrieval = {
  context: docs.map((text, i) => `[${i + 1}] ${text}`).join('\n\n'),
  sources: docs.map((text, i) => ({
    marker: i + 1,
    docId: metas[i]?.doc_id,
    title: metas[i]?.title,
    page: metas[i]?.page,
    chunkId: metas[i]?.chunk_id,
    path: metas[i]?.path,
    distance: dists[i],
  })),
  empty: false,
}

const opencode = await createOpencode({ config: { model: process.env.OPENCODE_MODEL || 'opencode/deepseek-v4-flash-free' } })
try {
  const session = await opencode.client.session.create({ body: { title: 'run-rag-demo' } })
  const prompt = [
    'You are a grounded Korean answerer.',
    'Use ONLY the retrieved context.',
    'Return JSON only with answer, citations, confidence.',
    '',
    `Question: ${question}`,
    '',
    'Retrieved context:',
    retrieval.context,
    '',
    'Retrieved sources:',
    JSON.stringify(retrieval.sources, null, 2),
  ].join('\n')
  const result = await opencode.client.session.prompt({
    path: { id: session.data.id },
    body: { parts: [{ type: 'text', text: prompt }] },
  })
  const answer = (result.data.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n').trim()
  console.log(JSON.stringify({ retrieval, answer }, null, 2))
} finally {
  await opencode.server.close()
}
