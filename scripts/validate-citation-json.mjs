const fs = await import('node:fs/promises')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/validate-citation-json.mjs <json-file>')
  process.exit(1)
}

const raw = await fs.readFile(file, 'utf8')
const data = JSON.parse(raw)

function fail(msg) {
  console.error(`INVALID: ${msg}`)
  process.exit(1)
}

if (typeof data.answer !== 'string' || !data.answer.trim()) fail('answer missing')
if (!Array.isArray(data.citations)) fail('citations must be an array')
if (typeof data.confidence !== 'number') fail('confidence must be a number')

for (const [i, c] of data.citations.entries()) {
  if (typeof c.marker !== 'number') fail(`citations[${i}].marker missing`)
  if (typeof c.docId !== 'string' || !c.docId) fail(`citations[${i}].docId missing`)
  if (typeof c.title !== 'string' || !c.title) fail(`citations[${i}].title missing`)
  if (typeof c.page !== 'number') fail(`citations[${i}].page missing`)
  if (typeof c.path !== 'string' || !c.path) fail(`citations[${i}].path missing`)
  if (typeof c.quote !== 'string' || !c.quote) fail(`citations[${i}].quote missing`)
}

console.log('VALID')
