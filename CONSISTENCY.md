# LLM-level Consistency Strategy

## Goal

Maximize grounded consistency **at the LLM layer** without relying on coding-heavy workflows.

This document assumes the current harness direction:
- OpenCode for generation
- retrieval-provided evidence
- structured JSON output
- citation paths required

The key idea is:

**Do not ask the model to do everything in one pass.**

Instead use a multi-step flow:
1. extract grounded facts
2. compose answer from those facts
3. check consistency
4. repair unsupported claims

---

## Why single-pass answers drift

A single generation pass tends to:
- over-generalize beyond evidence
- fill gaps with plausible but unsupported statements
- omit citation details
- mix summary with inference

Consistency improves when the model is forced to separate:
- evidence extraction
- answer composition
- verification
- repair

---

## Recommended 4-step flow

## 1. extract_grounded_facts

### Purpose
Extract only evidence-backed claims from retrieved context.

### Input
- user question
- retrieved `context`
- retrieved `sources`

### Output schema
```json
{
  "facts": [
    {
      "claim": "미국과 이란은 제재 완화 조건을 두고 협상 중이다.",
      "citations": [
        {
          "marker": 1,
          "docId": "doc-1",
          "title": "...",
          "page": 1,
          "path": "doc-1/p1#chunk-1",
          "quote": "..."
        }
      ]
    }
  ],
  "insufficientEvidence": false
}
```

### Prompt draft
```text
You are extracting grounded facts from retrieved evidence.

Rules:
- Use only the provided context and sources.
- Do not infer beyond what is directly supported.
- Prefer omission over hallucination.
- Return JSON only.
- Every fact must carry at least one citation.
- If evidence is insufficient, set insufficientEvidence to true.

Output JSON schema:
{
  "facts": [
    {
      "claim": "...",
      "citations": [
        {
          "marker": 1,
          "docId": "...",
          "title": "...",
          "page": 1,
          "path": "...",
          "quote": "..."
        }
      ]
    }
  ],
  "insufficientEvidence": false
}
```

---

## 2. compose_grounded_answer

### Purpose
Write the final user-facing answer using only extracted facts.

### Input
- user question
- fact list from step 1

### Output schema
```json
{
  "answer": "최종 한국어 답변",
  "claims": [
    {
      "text": "핵심 주장",
      "citations": [
        {
          "marker": 1,
          "docId": "doc-1",
          "title": "...",
          "page": 1,
          "path": "doc-1/p1#chunk-1",
          "quote": "..."
        }
      ]
    }
  ],
  "confidence": 0.82,
  "insufficientEvidence": false
}
```

### Prompt draft
```text
You are writing a grounded Korean answer.

Rules:
- Use only the extracted facts.
- Do not add any new information.
- Keep the answer concise and clear.
- Return JSON only.
- Every claim in the answer must have supporting citations.
- Confidence should reflect how fully the answer is supported by the facts.

Output JSON schema:
{
  "answer": "...",
  "claims": [
    {
      "text": "...",
      "citations": [
        {
          "marker": 1,
          "docId": "...",
          "title": "...",
          "page": 1,
          "path": "...",
          "quote": "..."
        }
      ]
    }
  ],
  "confidence": 0.0,
  "insufficientEvidence": false
}
```

---

## 3. check_answer_consistency

### Purpose
Verify whether every answer claim is supported by the extracted facts.

### Input
- extracted facts
- composed answer JSON

### Output schema
```json
{
  "valid": false,
  "unsupportedClaims": [
    "제재 해제 시점이 이미 확정됐다는 문장"
  ],
  "weakClaims": [
    "호르무즈해협 관련 해석"
  ],
  "notes": [
    "직접적 근거보다 해석이 앞선 표현이 있음"
  ]
}
```

### Prompt draft
```text
You are checking consistency between extracted facts and a drafted answer.

Rules:
- Compare the drafted answer only against the provided facts.
- Mark claims unsupported if they are absent from the facts.
- Mark claims weak if they overstate partial evidence.
- Return JSON only.
- Be strict.

Output JSON schema:
{
  "valid": true,
  "unsupportedClaims": [],
  "weakClaims": [],
  "notes": []
}
```

---

## 4. repair_answer

### Purpose
Rewrite the answer after removing unsupported or weakly supported claims.

### Input
- original answer JSON
- checker output
- extracted facts

### Output schema
```json
{
  "answer": "수정된 최종 한국어 답변",
  "claims": [
    {
      "text": "근거가 남아 있는 주장",
      "citations": [
        {
          "marker": 1,
          "docId": "doc-1",
          "title": "...",
          "page": 1,
          "path": "doc-1/p1#chunk-1",
          "quote": "..."
        }
      ]
    }
  ],
  "confidence": 0.74,
  "insufficientEvidence": false
}
```

### Prompt draft
```text
You are repairing a grounded answer.

Rules:
- Remove unsupported claims.
- Rewrite weak claims more cautiously.
- Do not add any new information.
- Use only the provided facts.
- Return JSON only.

Keep the answer concise and evidence-backed.
```

---

## Claim-based answer schema

Recommended final schema:

```json
{
  "answer": "최종 한국어 답변",
  "claims": [
    {
      "text": "주장 문장",
      "citations": [
        {
          "marker": 1,
          "docId": "doc-1",
          "title": "문서 제목",
          "page": 1,
          "path": "doc-1/p1#chunk-1",
          "quote": "직접 근거 문장",
          "quoteSnippet": "짧은 인용 일부"
        }
      ]
    }
  ],
  "confidence": 0.82,
  "insufficientEvidence": false
}
```

Why this schema helps:
- answer is user-facing
- claims are auditable
- citations stay attached to each claim
- path stays mandatory
- quoteSnippet remains UI-friendly

---

## OpenCode-only consistency limits

OpenCode-only can improve:
- grounding discipline
- omission of unsupported content
- citation completeness
- answer repair quality

OpenCode-only cannot fully guarantee:
- retrieval quality
- deterministic correctness
- schema-perfect output in every run
- evidence ranking quality

So the best practical design is:

- OpenCode for extract / compose / check / repair
- runtime for schema validation and retries

---

## Practical rule set

If you want LLM-level consistency to be as strong as possible, enforce all of these:

1. JSON-only outputs
2. path required in every citation
3. quote required in every citation
4. claim-based answer structure
5. omission preferred over guessing
6. explicit insufficient-evidence path
7. checker pass before final answer
8. repair pass when checker fails

---

## Short summary

To maximize consistency at the LLM layer:
- do not use a single-pass answer
- extract facts first
- compose from facts only
- check consistency strictly
- repair unsupported claims

This is the strongest OpenCode-centered consistency pattern currently recommended for this repo.
