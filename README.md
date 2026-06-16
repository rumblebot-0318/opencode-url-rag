# opencode-url-rag

Small experiments for using OpenCode with free models, SDK calls, JSON event streaming, URL-based lightweight/chunked RAG, and LangGraph orchestration.

## Architecture docs

- [`CURRENT_ARCHITECTURE.md`](./CURRENT_ARCHITECTURE.md) — current end-to-end design and responsibility split
- [`NEXT_STEPS.md`](./NEXT_STEPS.md) — near-term roadmap and validation checklist

## Included scripts

- `examples-opencode-sdk.mjs` — minimal SDK example
- `opencode-prompt.mjs` — simple CLI wrapper for one prompt
- `opencode-stream-jsonl.mjs` — stream `opencode run --format json` events
- `opencode-url-rag.mjs` — fetch one URL and answer from extracted text
- `opencode-url-rag-chunked.mjs` — chunk long URL content and summarize with multi-step SDK calls
- `langgraph-opencode-demo.mjs` — minimal LangGraph orchestration demo where LangGraph coordinates and an OpenCode skill would own domain logic
- `langgraph-opencode-sdk-demo.mjs` — LangGraph node that actually calls OpenCode SDK as a skill-like worker and requests structured JSON citations with evidence paths
- `test-langgraph-opencode-sdk.mjs` — simple executable test for the SDK-backed LangGraph demo

- `langgraph-retriever-opencode-demo.mjs` — LangGraph demo that consumes retriever-shaped output and passes it to an OpenCode grounded answer skill

- `cli/ingest-url-to-chroma.mjs` — fetch a URL, chunk it, embed it, and store it in Chroma
- `cli/run-rag-demo.mjs` — retrieve from Chroma and send grounded context to OpenCode SDK
- `cli/ingest-url-to-postgres.mjs` — fetch a URL, chunk it, embed it, and store it in Postgres/pgvector
- `cli/run-rag-demo-postgres.mjs` — retrieve from Postgres/pgvector and send grounded context to OpenCode SDK
- `opencode-plugin/pgvector-retriever.ts` — Postgres/pgvector retriever for OpenCode plugin flow
- `sql/pgvector-schema.sql` — minimal pgvector schema for chunk storage
- `LANGGRAPH_OPENCODE_SPLIT.md` — guide for what belongs in LangGraph vs OpenCode Skills

## Default model

These scripts default to:

- `opencode/deepseek-v4-flash-free`

You can override with `--model`.

## Requirements

- `opencode` installed and working
- Node.js 22+
- OpenCode free model access via local `opencode`

## Examples

```bash
node examples-opencode-sdk.mjs
node opencode-prompt.mjs "한 줄로 인사해줘"
node opencode-stream-jsonl.mjs "테스트 성공이라고 말해줘"
node opencode-url-rag.mjs --url https://example.com "이 페이지를 요약해줘"
node opencode-url-rag-chunked.mjs --url https://example.com "이 문서를 자세히 정리해줘"
node langgraph-opencode-demo.mjs "이 문서의 핵심 쟁점을 요약해줘"
node langgraph-opencode-sdk-demo.mjs "이 문서의 핵심 쟁점을 요약해줘"
node test-langgraph-opencode-sdk.mjs
node langgraph-retriever-opencode-demo.mjs "이 문서의 핵심 쟁점을 요약해줘"
npm run ingest:url -- --url https://example.com --notebook demo
npm run rag:demo -- --notebook demo "이 문서를 요약해줘"
export DATABASE_URL=postgres://user:pass@host:5432/dbname
psql "$DATABASE_URL" -f sql/pgvector-schema.sql
npm run ingest:pg -- --url https://example.com --notebook demo
npm run rag:pg -- --notebook demo "이 문서를 요약해줘"
```

## Notes

- `opencode serve` / SSE verification was unstable on this Android/Termux environment.
- `opencode run --format json` works as a practical streaming fallback.
- URL RAG scripts here are lightweight context injection, not a full vector database pipeline.
- The LangGraph demo is intentionally thin: orchestration in LangGraph, domain logic in OpenCode Skills.


## Chroma retriever plugin draft

Added a draft OpenCode plugin retriever at:

- `opencode-plugin/chroma-retriever.ts`

It demonstrates:
- local embeddings via `@xenova/transformers`
- Chroma query using `queryEmbeddings`
- notebook scoping via metadata filter
- structured retrieval output with `context`, `sources`, and citation `path`

## Final answer skill example

Added examples for a grounded answer writer:

- `examples/final-answer-skill-schema.json`
- `examples/final-answer-skill-prompt.md`

## Postgres / pgvector direction

Chroma proved awkward on this Android/Termux environment, so the recommended path is now Postgres + pgvector.

This repo now includes:
- `sql/pgvector-schema.sql`
- `opencode-plugin/pgvector-retriever.ts`
- `cli/ingest-url-to-postgres.mjs`
- `cli/run-rag-demo-postgres.mjs`
- `lib/pg.js`
