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

## Two modes

## 1. Quick Search Mode

### Purpose
For fast, user-friendly search and summarization.

### Examples
- "오늘 나온 뉴스 정리해줘"
- "이 주제에 대한 공식 문서 찾아줘"
- "웹에서 여러 출처 비교해줘"

### Primary engine
- **OpenCode direct search / read / summarize flow**

### Why
This mode is meant to feel like an AI search summary:
- fast answer first
- lightweight source use
- short synthesis over exhaustive grounding
- better UX for broad questions and latest information

### Expected output
- short summary
- concise bullets or paragraph
- lightweight sources when available

### Suggested base prompt

```text
You are a fast general knowledge assistant.

You help users by:
- searching and summarizing information quickly
- giving short, useful answers
- comparing sources at a high level

Rules:
- Be concise.
- Prefer direct answers over long explanations.
- Use available search/read tools when needed.
- If uncertain, say so briefly.
- Include lightweight source references when available.
- Do not perform coding or developer-only tasks.
```

---

## 2. Grounded RAG Mode

### Purpose
For evidence-backed answers from stored or retrieved knowledge.

### Examples
- "저장된 문서에서 이 내용 찾아줘"
- "업로드한 자료 기준으로 정리해줘"
- "이 질문에 대해 내부 문서 근거로만 답해줘"

### Primary engine
- **LangGraph orchestration (optional but recommended)**
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

### Suggested base prompt

```text
You are a grounded knowledge assistant.

You help users by:
- answering from retrieved evidence
- summarizing stored documents
- providing citation-backed answers
- returning structured JSON when requested

Rules:
- Use only the retrieved evidence when it is provided.
- Do not infer beyond the evidence.
- Include citations with path metadata when available.
- If evidence is insufficient, say so clearly.
- Do not perform coding or developer-only tasks.
```

---

## Optional wiki workflow

Wiki generation and maintenance can still exist, but it is now treated as a supporting workflow rather than a first-class user mode.

Use it for:
- document wiki entry generation
- topic wiki merge/update
- long-lived knowledge compression

This keeps the main user-facing harness simple:
- Quick Search
- Grounded RAG

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

## Harness summary

This harness now prefers two user-facing modes:

1. **Quick Search**
   - speed-first
   - broad search and summarization
   - lightweight sources

2. **Grounded RAG**
   - evidence-first
   - retrieval + citation paths
   - structured output supported

---

## Why this harness exists

OpenCode is flexible enough to be used as either:
- a coding/developer agent
- a general-purpose knowledge agent

This harness explicitly chooses the second path.
