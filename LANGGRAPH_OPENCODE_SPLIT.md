# LangGraph 노드 / OpenCode Skill 분리 기준표

## 핵심 원칙

- **LangGraph**: 흐름 제어, 상태 전이, 분기, 재시도, 검색 파이프라인 orchestration
- **OpenCode Skill**: 실제 비즈니스 판단, 요약, 추출, 구조화, 최종 응답 생성
- **Spring Boot**: API, 인증, 업로드, DB, 작업 요청/상태 관리

---

## 1. 무엇을 LangGraph에 둘까?

LangGraph에 두는 로직은 다음 조건을 만족하는 것들이다.

### LangGraph 담당
- 질문 분류
- 문서 후보 검색 순서 결정
- wiki layer 우선 조회 / evidence layer 우선 조회 분기
- retrieval top-k 조절
- 결과 부족 시 재검색
- 스킬 호출 순서 제어
- 실패 fallback
- human-in-the-loop 분기
- 최종 응답 검증 단계 호출 여부 결정

### LangGraph에 두면 좋은 이유
- 상태 머신처럼 다뤄야 함
- 재시도/조건 분기/루프가 중요함
- 여러 스킬을 조합함
- 모델이 아니라 시스템이 결정해야 함

---

## 2. 무엇을 OpenCode Skill에 둘까?

### OpenCode Skill 담당
- 검색된 chunk 해석
- 도메인 정책 적용
- 문서 요약
- 구조화된 JSON 추출
- wiki entry 생성
- evidence-grounded answer 작성
- 뉴스/계약/정책문 특화 포맷 생성
- 비교 요약 / 위험 포인트 추출

### Skill에 두면 좋은 이유
- 프롬프트/도메인 규칙이 핵심
- 모델의 판단/표현 능력이 중요함
- 추후 교체/튜닝이 쉬움
- 같은 기능을 여러 워크플로에서 재사용 가능함

---

## 3. 분리 기준표

| 작업 | LangGraph | OpenCode Skill |
|---|---|---|
| 질문이 요약형인지 근거형인지 분류 | ✅ | |
| 위키 먼저 볼지 raw evidence 먼저 볼지 결정 | ✅ | |
| BM25 / vector 검색 실행 | ✅ | |
| top-k chunk를 받아 핵심 포인트 추출 | | ✅ |
| 긴 기사/문서를 wiki entry로 정리 | | ✅ |
| 답변 품질이 낮으면 재검색할지 판단 | ✅ | |
| 정책 문서에서 예외조항만 추출 | | ✅ |
| retrieved chunk 기반 최종 답변 생성 | | ✅ |
| confidence 낮으면 fallback flow로 이동 | ✅ | |
| 최종 답변에 citation 포맷 입히기 | | ✅ |

---

## 4. 추천 노드 구조

### LangGraph 노드
1. `classifyQuestion`
2. `selectRetrievalMode`
3. `retrieveWikiCandidates`
4. `retrieveEvidenceChunks`
5. `invokeSkillExtract`
6. `invokeSkillAnswer`
7. `validateAnswer`
8. `fallbackOrFinish`

### OpenCode Skill 예시
- `wiki_entry_builder`
- `evidence_extractor`
- `briefing_writer`
- `grounded_answer_writer`
- `document_comparator`
- `risk_point_extractor`

---

## 5. 입출력 규칙

Skill은 자연어만 던지지 말고 가능하면 구조화해서 반환한다.

### 예시: `evidence_extractor`
```json
{
  "summary": "핵심 내용 요약",
  "keyPoints": ["...", "..."],
  "entities": ["미국", "이란"],
  "needsMoreContext": false,
  "confidence": 0.86
}
```

### 예시: `grounded_answer_writer`
```json
{
  "answer": "최종 답변",
  "citations": [
    { "docId": "hani-1263449", "page": 1, "quote": "..." }
  ],
  "confidence": 0.82
}
```

---

## 6. 설계 원칙

### LangGraph에 넣지 말 것
- 긴 프롬프트 본문
- 도메인 규칙 상세 내용
- 한국어 출력 포맷 세부 규칙
- 뉴스 요약 스타일 가이드
- 계약 해석 규칙 자체

### Skill에 넣지 말 것
- 재시도 루프 제어
- 검색 순서 결정
- 상태 전이
- fallback routing
- 워크플로 분기 정책

---

## 7. MVP 추천

### MVP에서 최소로 필요한 LangGraph 노드
- `classifyQuestion`
- `retrieveEvidenceChunks`
- `invokeSkillAnswer`
- `validateAnswer`

### MVP에서 최소로 필요한 Skill
- `grounded_answer_writer`
- `wiki_entry_builder`
- `briefing_writer`

---

## 한 줄 정리

- **LangGraph는 제어권을 가진다**
- **OpenCode Skill은 판단과 생성을 맡는다**
- **Spring Boot는 서비스 껍데기를 맡는다**
