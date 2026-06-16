# Current Architecture

## Goal

Build a practical Node.js-based knowledge workflow around OpenCode SDK.

The current direction is:

- **OpenCode** handles generation, web-oriented reasoning, and skill-like document understanding
- **LangGraph** handles orchestration for internal document RAG flows
- **Postgres + pgvector** stores chunked internal knowledge
- **Structured JSON with citation paths** is the default response contract

SSE is **not required** in the current design.

---

## High-level split

### 1. OpenCode responsibilities

OpenCode is used for:
- grounded final answer generation
- wiki-like summarization / extraction / document understanding
- web-style search workflows (preferred over vector retrieval for live web exploration)
- structured JSON output generation

Typical OpenCode output shape:

```json
{
  "answer": "최종 한국어 답변",
  "citations": [
    {
      "marker": 1,
      "docId": "demo-doc",
      "page": 1,
      "path": "demo-doc/p1#chunk-1",
      "quote": "근거 문장"
    }
  ],
  "confidence": 0.82
}
```

### 2. LangGraph responsibilities

LangGraph is kept thin and only handles orchestration:
- question routing
- retrieval mode selection
- retrieval execution ordering
- retry / fallback logic
- skill invocation ordering
- answer validation branches

LangGraph does **not** own domain prompts or business rules.

### 3. Vector storage responsibilities

Vector storage is now planned around **Postgres + pgvector**.

It stores:
- document chunks
- notebook / document metadata
- citation paths
- embeddings

This replaces the earlier Chroma-based direction, which proved awkward on the current Android/Termux environment.

---

## Routing model

The current design separates **web knowledge** from **internal stored knowledge**.

### Web / live knowledge
Use **OpenCode directly**.

Why:
- web search is agentic
- repeated reformulation / page following is often needed
- OpenCode handles that better than static retrieval

### Internal / indexed knowledge
Use **LangGraph + pgvector retrieval + OpenCode final answering**.

Why:
- internal documents are chunked and stored
- metadata filtering matters
- retrieval must be reproducible and grounded
- citations should map back to stored evidence

---

## Current pipeline

## A. Ingest pipeline (Node CLI)

Current direction:

1. Fetch document / URL
2. Extract text
3. Split into chunks
4. Generate embeddings
5. Store chunks in Postgres/pgvector

Current files:
- `cli/ingest-url-to-postgres.mjs`
- `opencode-plugin/pgvector-retriever.ts`
- `sql/pgvector-schema.sql`

### Stored row concept

Each chunk row contains:
- `notebook_id`
- `doc_id`
- `title`
- `page`
- `chunk_id`
- `path`
- `source_url`
- `content`
- `embedding`

Citation path format recommendation:
- `docId`
- `docId/p12`
- `docId/p12#section-slug`
- `docId/p12#chunk-3`

---

## B. Retrieval pipeline

Current retrieval shape is standardized as:

```json
{
  "context": "[1] ...\n\n[2] ...",
  "sources": [
    {
      "marker": 1,
      "docId": "doc-1",
      "title": "...",
      "page": 1,
      "chunkId": 1,
      "path": "doc-1/p1#chunk-1",
      "distance": 0.12
    }
  ],
  "empty": false
}
```

This shape is important because:
- LangGraph can pass it forward as workflow state
- OpenCode can use it directly in grounded answer prompts
- citations can be generated without losing evidence traceability

Current files:
- `opencode-plugin/pgvector-retriever.ts`
- `cli/run-rag-demo-postgres.mjs`
- `langgraph-retriever-opencode-demo.mjs`

---

## C. Answer generation pipeline

Current answer generation strategy:

1. retrieve top-k chunks
2. build `context + sources`
3. send both to OpenCode
4. request **JSON-only grounded answer**
5. require citations with `path`

OpenCode should not invent evidence beyond retrieved context.

---

## Current file map

### Core docs
- `README.md`
- `LANGGRAPH_OPENCODE_SPLIT.md`
- `CURRENT_ARCHITECTURE.md`

### OpenCode / LangGraph demos
- `langgraph-opencode-demo.mjs`
- `langgraph-opencode-sdk-demo.mjs`
- `langgraph-retriever-opencode-demo.mjs`
- `test-langgraph-opencode-sdk.mjs`

### Retrieval backends
- `opencode-plugin/chroma-retriever.ts` *(legacy draft; not preferred now)*
- `opencode-plugin/pgvector-retriever.ts` *(current preferred direction)*

### Ingest / RAG CLIs
- `cli/ingest-url-to-chroma.mjs` *(legacy draft)*
- `cli/run-rag-demo.mjs` *(legacy draft)*
- `cli/ingest-url-to-postgres.mjs` *(current preferred direction)*
- `cli/run-rag-demo-postgres.mjs` *(current preferred direction)*

### DB assets
- `sql/pgvector-schema.sql`
- `lib/pg.js`

### Structured answer examples
- `examples/final-answer-skill-schema.json`
- `examples/final-answer-skill-prompt.md`

---

## Why Chroma was deprioritized

Chroma was explored first, but on this machine/environment:
- Python package installation was problematic
- standalone Linux binary did not execute cleanly on Android/Termux
- Ubuntu proot path was possible but messy enough to justify a backend switch

Because of that, **Postgres + pgvector** is now the preferred backend direction.

---

## Current model choices

### Generation model
Default practical choice:
- `opencode/deepseek-v4-flash-free`

Why:
- already verified with OpenCode
- free tier path exists
- fast enough for prototyping

### Embedding model
Current direction:
- `Xenova/bge-m3`

Why:
- multilingual retrieval use case
- Korean document handling
- works with the current local embedding direction

This may later be replaced with a lighter alternative if runtime cost becomes too high.

---

## Current design principles

1. **SSE is optional and currently not part of the core plan**
2. **Web knowledge and stored internal knowledge are handled differently**
3. **LangGraph should stay thin**
4. **OpenCode should own actual business/document reasoning**
5. **All grounded answers should carry citation paths**
6. **Backend storage should be replaceable without changing answer-generation contracts**

---

## Immediate next steps

1. Validate PostgreSQL + pgvector end-to-end
2. Test `ingest:pg` against a real DB
3. Test `rag:pg` with real stored chunks
4. Tighten structured JSON parsing / schema validation
5. Decide whether LLM Wiki management should be introduced as a parallel OpenCode workflow

---

## Short summary

The current architecture is:

- **Node.js CLI-first**
- **OpenCode for generation and web-like reasoning**
- **LangGraph for orchestration of internal RAG flows**
- **Postgres + pgvector for internal chunk storage**
- **Structured JSON with citation paths as the answer contract**
