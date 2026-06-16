# Next Steps

## Immediate priorities

### 1. PostgreSQL + pgvector live validation
Goal: prove the current Postgres direction works end-to-end.

Checklist:
- [ ] Prepare a PostgreSQL instance
- [ ] Install / enable `pgvector`
- [ ] Apply schema:
  ```bash
  psql "$DATABASE_URL" -f sql/pgvector-schema.sql
  ```
- [ ] Run URL ingest:
  ```bash
  npm run ingest:pg -- --url https://example.com --notebook demo
  ```
- [ ] Run grounded RAG query:
  ```bash
  npm run rag:pg -- --notebook demo "이 문서를 요약해줘"
  ```
- [ ] Verify citation `path` values in output

### 2. Structured JSON hardening
Goal: reduce parsing ambiguity from OpenCode output.

Checklist:
- [ ] Add JSON schema validation for final answer objects
- [ ] Reject / repair malformed citations
- [ ] Ensure `path` is always present in citations
- [ ] Add optional `quote` fallback when model omits it

### 3. Retriever / answer contract freeze
Goal: lock the interface before adding more features.

Current target contract:

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

Checklist:
- [ ] Make all demos consume the same retrieval shape
- [ ] Keep `path` mandatory
- [ ] Keep `marker` stable for answer generation

---

## Near-term architecture tasks

### 4. LLM Wiki path definition
Goal: decide how OpenCode-managed wiki artifacts will coexist with pgvector.

Questions to answer:
- Will wiki entries be stored as Markdown, JSON, or both?
- Will topic wiki and document wiki be separate stores?
- Will wiki updates be automatic or review-based?
- When should query flow stop at wiki vs fall through to evidence chunks?

### 5. LangGraph branch growth
Goal: expand orchestration only where useful.

Possible additions:
- [ ] `web` route
- [ ] `vector` route
- [ ] `hybrid` route
- [ ] answer validation / retry node
- [ ] confidence-based fallback

### 6. Skill catalog definition
Goal: clarify what OpenCode should own as reusable skill logic.

Candidate skills:
- `grounded_answer_writer`
- `wiki_entry_builder`
- `wiki_topic_merger`
- `document_briefing_writer`
- `risk_point_extractor`

---

## Deferred / optional

### 7. Replace local embedding model if runtime cost is too high
Current candidate:
- `Xenova/bge-m3`

Fallback possibilities:
- smaller BGE variant
- multilingual E5 variant

### 8. Add proper unit / integration test split
Current demos are executable prototypes.

Future split:
- unit tests: schema, contract, prompt builders
- integration tests: OpenCode SDK + live DB

### 9. Spring Boot integration
Not needed right now.
Later use it for:
- API wrapper
- auth
- background job control
- persistent operational workflows

---

## Current success criteria

The current direction is considered validated if all of the following become true:

- [ ] Postgres + pgvector ingest works
- [ ] Retrieval returns `context + sources + path`
- [ ] OpenCode returns structured grounded answers with citations
- [ ] LangGraph can orchestrate retrieval + answer generation cleanly
- [ ] Web/live flows remain separate from stored-document flows
