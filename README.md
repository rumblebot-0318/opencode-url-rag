# opencode-url-rag

Small experiments for using OpenCode with free models, SDK calls, JSON event streaming, and URL-based lightweight/chunked RAG.

## Included scripts

- `examples-opencode-sdk.mjs` — minimal SDK example
- `opencode-prompt.mjs` — simple CLI wrapper for one prompt
- `opencode-stream-jsonl.mjs` — stream `opencode run --format json` events
- `opencode-url-rag.mjs` — fetch one URL and answer from extracted text
- `opencode-url-rag-chunked.mjs` — chunk long URL content and summarize with multi-step SDK calls

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
```

## Notes

- `opencode serve` / SSE verification was unstable on this Android/Termux environment.
- `opencode run --format json` works as a practical streaming fallback.
- URL RAG scripts here are lightweight context injection, not a full vector database pipeline.
