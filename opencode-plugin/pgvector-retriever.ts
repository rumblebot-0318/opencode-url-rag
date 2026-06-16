import { tool } from '@opencode-ai/plugin'
import { pipeline } from '@xenova/transformers'
import pg from 'pg'

const EMBED_MODEL = process.env.EMBED_MODEL ?? 'Xenova/bge-m3'
const TOP_K = Number(process.env.TOP_K ?? 4)
const { Pool } = pg

let _embedder: any = null
async function getEmbedder() {
  if (!_embedder) _embedder = await pipeline('feature-extraction', EMBED_MODEL)
  return _embedder
}

async function embedInternal(text: string): Promise<number[]> {
  const out = await (await getEmbedder())(text, { pooling: 'cls', normalize: true })
  return Array.from(out.data as Float32Array)
}

export async function embedQuery(text: string): Promise<number[]> {
  return embedInternal(text)
}

export async function embedDocument(text: string): Promise<number[]> {
  return embedInternal(text)
}

function vectorLiteral(values: number[]) {
  return `[${values.join(',')}]`
}

export default tool({
  description: 'Postgres/pgvector 기반 한국어 RAG 조회 전용 retriever.',
  args: {
    query: tool.schema.string().describe('검색할 한국어 질의'),
    notebookId: tool.schema.string().optional().describe('시스템이 주입. 모델이 지정 금지.'),
  },
  async execute(args, ctx) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is required')
    const pool = new Pool({ connectionString })
    const scoped = args.notebookId ?? (ctx as any)?.sessionNotebookId
    try {
      const vector = await embedQuery(args.query)
      const params = [vectorLiteral(vector)]
      let sql = `
        select notebook_id, doc_id, title, page, chunk_id, path, content,
               embedding <=> $1::vector as distance
        from document_chunks
      `
      if (scoped) {
        params.push(scoped)
        sql += ` where notebook_id = $2`
      }
      sql += ` order by embedding <=> $1::vector asc limit ${TOP_K}`

      const res = await pool.query(sql, params)
      if (res.rows.length === 0) {
        return { context: '', sources: [], empty: true, message: '검색 결과 없음. 자료에서 해당 정보를 찾을 수 없음.' }
      }

      const chunks = res.rows.map((row: any, i: number) => ({
        marker: i + 1,
        text: row.content,
        source: {
          docId: row.doc_id,
          title: row.title,
          page: row.page,
          chunkId: row.chunk_id,
          path: row.path,
          distance: row.distance,
          quoteSnippet: String(row.content || '').slice(0, 160),
        }
      }))

      return {
        context: chunks.map((c) => `[${c.marker}] ${c.text}`).join('\n\n'),
        sources: chunks.map((c) => ({ marker: c.marker, ...c.source })),
        empty: false,
      }
    } finally {
      await pool.end()
    }
  },
})
