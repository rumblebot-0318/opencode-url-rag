# General Knowledge Harness

## Purpose

This harness is for **read/query-oriented user workflows**, not developer workflows.

It is intended for:
- question answering
- document / PDF / URL summarization
- retrieval-based grounded answers
- web result comparison
- wiki-style knowledge organization
- structured JSON outputs with citations

It is **not** intended for:
- code editing
- package installation
- git workflows
- build/test/dev-server tasks
- shell-heavy developer automation

---

## Core principle

The harness should behave like a **grounded knowledge assistant**, not like a coding agent.

That means:
- prefer retrieval over guessing
- prefer source-backed answers
- keep outputs concise and structured
- avoid coding actions unless explicitly enabled in a separate harness

---

## Three modes

## 1. Web Mode

### Purpose
For live / external / latest knowledge.

### Examples
- "오늘 나온 뉴스 정리해줘"
- "이 주제에 대한 공식 문서 찾아줘"
- "웹에서 여러 출처 비교해줘"

### Primary engine
- **OpenCode direct web-oriented flow**

### Why
Web tasks are agentic:
- reformulating search queries
- following links
- reading pages
- selecting useful sources
- comparing results

This is better handled by OpenCode directly than by vector retrieval.

### Expected output
- concise answer
- optional structured JSON
- citations if source metadata is available

---

## 2. Vector Mode

### Purpose
For stored internal knowledge.

### Examples
- "저장된 문서에서 이 내용 찾아줘"
- "업로드한 자료 기준으로 정리해줘"
- "이 질문에 대해 내부 문서 근거로만 답해줘"

### Primary engine
- **LangGraph orchestration**
- **Postgres + pgvector retrieval**
- **OpenCode final grounded answer generation**

### Why
Stored-document workflows need:
- reproducible retrieval
- metadata filters
- evidence traceability
- citation paths

### Retriever contract

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
      "distance": 0.12,
      "quoteSnippet": "..."
    }
  ],
  "empty": false
}
```

### Final answer contract

```json
{
  "answer": "최종 한국어 답변",
  "citations": [
    {
      "marker": 1,
      "docId": "doc-1",
      "title": "...",
      "page": 1,
      "path": "doc-1/p1#chunk-1",
      "quote": "근거 문장",
      "quoteSnippet": "핵심 인용 일부"
    }
  ],
  "confidence": 0.82
}
```

---

## 3. Wiki Mode

### Purpose
For long-lived knowledge organization.

### Examples
- "이 문서를 위키 항목으로 만들어줘"
- "같은 주제 문서들을 합쳐서 요약 위키 만들어줘"
- "새 자료를 기존 위키에 반영해줘"

### Primary engine
- **OpenCode structured extraction / summarization flow**

### Expected artifacts
- document wiki entry
- topic wiki entry
- timeline
- key points
- open questions
- source list / citation map

### Why
Wiki mode is about:
- compressing source text into reusable knowledge
- keeping a human-readable layer above evidence chunks
- reducing repeated raw-document injection

---

## Tool policy

### Allowed by default
- retrieval tools
- read-style tools
- web-style query tools
- structured JSON output
- wiki generation skills

### Avoid or disable by default
- edit
- write
- bash
- package install
- git actions

If coding must be allowed, it should happen in a separate developer harness.

---

## Short base system prompt (candidate)

```text
You are a grounded knowledge assistant running inside an OpenCode harness.

You help users with:
- answering questions
- summarizing documents and URLs
- retrieving information from stored knowledge
- organizing knowledge into wiki-style notes
- comparing sources
- returning structured JSON when requested

Rules:
- Be concise and clear.
- Prefer retrieval and evidence over guessing.
- Use only the available tools and provided context.
- Do not perform coding or developer-only tasks unless explicitly enabled.
- When evidence is provided, answer only from that evidence.
- Include citations when source metadata is available.
- If uncertain, say so clearly.
```

---

## Why this harness exists

OpenCode is flexible enough to be used as either:
- a coding/developer agent
- a general-purpose knowledge agent

This harness explicitly chooses the second path.
