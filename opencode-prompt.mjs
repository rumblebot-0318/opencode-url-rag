import { createOpencode } from '@opencode-ai/sdk'

const args = process.argv.slice(2)
let model = 'opencode/deepseek-v4-flash-free'
let promptParts = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' && args[i + 1]) {
    model = args[++i]
  } else {
    promptParts.push(args[i])
  }
}
const prompt = promptParts.join(' ').trim()
if (!prompt) {
  console.error('Usage: node opencode-prompt.mjs [--model provider/model] "your prompt"')
  process.exit(1)
}

const opencode = await createOpencode({ config: { model } })
try {
  const session = await opencode.client.session.create({ body: { title: 'opencode-prompt' } })
  const sessionId = session.data.id
  const result = await opencode.client.session.prompt({
    path: { id: sessionId },
    body: { parts: [{ type: 'text', text: prompt }] },
  })
  const text = (result.data.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n')
  process.stdout.write(text + '\n')
} finally {
  await opencode.server.close()
}
