import { createOpencode } from '@opencode-ai/sdk'

const model = process.argv[2] || 'opencode/deepseek-v4-flash-free'
const prompt = process.argv.slice(3).join(' ') || 'Reply in one short line: examples ready.'

const opencode = await createOpencode({ config: { model } })
try {
  const session = await opencode.client.session.create({ body: { title: 'examples-sdk' } })
  const sessionId = session.data.id
  const result = await opencode.client.session.prompt({
    path: { id: sessionId },
    body: { parts: [{ type: 'text', text: prompt }] },
  })
  const text = (result.data.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n')
  console.log(JSON.stringify({ model, sessionId, text, raw: result.data }, null, 2))
} finally {
  await opencode.server.close()
}
