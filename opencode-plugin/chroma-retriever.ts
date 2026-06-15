import { tool } from "@opencode-ai/plugin"
import { pipeline } from "@xenova/transformers"
import { ChromaClient } from "chromadb"

const EMBED_MODEL = process.env.EMBED_MODEL ?? "Xenova/bge-m3"
const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000"
const COLLECTION = process.env.CHROMA_COLLECTION ?? "korean-docs"
const TOP_K = Number(process.env.TOP_K ?? 4)

let _embedder: any = null
async function getEmbedder() {
  if (!_embedder) _embedder = await pipeline("feature-extraction", EMBED_MODEL)
  return _embedder
}

async function embedInternal(text: string): Promise<number[]> {
  const out = await (await getEmbedder())(text, { pooling: "cls", normalize: true })
  return Array.from(out.data as Float32Array)
}

export async function embedQuery(text: string): Promise<number[]> {
  return embedInternal(text)
}

export async function embedDocument(text: string): Promise<number[]> {
  return embedInternal(text)
}

const chroma = new ChromaClient({ path: CHROMA_URL })

export default tool({
  description: "등록된 notebook 자료에서 질의와 유사한 청크를 검색한다. 한국어 RAG 조회 전용.",
  args: {
    query: tool.schema.string().describe("검색할 한국어 질의"),
    notebookId: tool.schema.string().optional().describe("시스템이 주입. 모델이 지정 금지."),
  },
  async execute(args, ctx) {
    const vector = await embedQuery(args.query)
    const collection = await chroma.getCollection({ name: COLLECTION })
    const scoped = args.notebookId ?? (ctx as any)?.sessionNotebookId

    const res = await collection.query({
      queryEmbeddings: [vector],
      nResults: TOP_K,
      where: scoped ? { notebook_id: scoped } : undefined,
    })

    const docs = res.documents?.[0] ?? []
    const metas = res.metadatas?.[0] ?? []
    const dists = res.distances?.[0] ?? []

    if (docs.length === 0) {
      return {
        context: "",
        sources: [],
        empty: true,
        message: "검색 결과 없음. 자료에서 해당 정보를 찾을 수 없음.",
      }
    }

    const chunks = docs.map((text: string, i: number) => {
      const m = (metas[i] ?? {}) as Record<string, any>
      return {
        marker: i + 1,
        text,
        source: {
          docId: m.doc_id,
          title: m.title,
          page: m.page,
          chunkId: m.chunk_id,
          path: m.path ?? `${m.doc_id}/p${m.page ?? "?"}#chunk-${m.chunk_id ?? i + 1}`,
          distance: dists[i],
        },
      }
    })

    return {
      context: chunks.map((c) => `[${c.marker}] ${c.text}`).join("\n\n"),
      sources: chunks.map((c) => ({ marker: c.marker, ...c.source })),
      empty: false,
    }
  },
})
