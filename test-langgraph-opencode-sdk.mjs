import { spawnSync } from 'node:child_process'

const result = spawnSync('node', ['langgraph-opencode-sdk-demo.mjs', '이 문서의 핵심 쟁점을 요약해줘'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 10 * 1024 * 1024,
})

if (result.error) {
  console.error('TEST_ERROR', result.error.message)
  process.exit(1)
}

if (result.status !== 0) {
  console.error('TEST_EXIT', result.status)
  console.error(result.stderr)
  process.exit(result.status || 1)
}

const output = result.stdout.trim()
console.log(output)

let parsed
try {
  parsed = JSON.parse(output)
} catch (e) {
  console.error('TEST_PARSE_ERROR', e.message)
  process.exit(1)
}

if (!parsed.answer || typeof parsed.answer !== 'string') {
  console.error('TEST_ASSERT_FAIL: answer missing')
  process.exit(1)
}

if (!Array.isArray(parsed.citations)) {
  console.error('TEST_ASSERT_FAIL: citations missing')
  process.exit(1)
}

console.log('\nTEST_OK')
