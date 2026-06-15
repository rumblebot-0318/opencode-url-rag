import { StateGraph, START, END } from '@langchain/langgraph'
import { createOpencode } from '@opencode-ai/sdk'

const GraphState = {
  question: null,
  retrievalMode: null,
  retrieved: null,
  answer: null,
  citations: null,
}

function classifyQuestion(state) {
  const q = state.question || ''
  const mode = /근거|출처|페이지|원문/.test(q) ? 'evidence' : 'briefing'
  return { ...state, retrievalMode: mode }
}

function retrieveEvidenceChunks(state) {
  const fakeRetrieved = [
    {
      docId: 'demo-doc',
      page: 1,
      text: '미국과 이란은 종전 MOU를 앞두고 핵 규제와 제재 완화 조건을 놓고 줄다리기를 벌이고 있다.'
    },
    {
      docId: 'demo-doc',
      page: 2,
      text: '향후 60일 협상에서 고농축 우라늄 처리, 제재 해제 범위, 호르무즈해협 관련 조항이 쟁점으로 꼽힌다.'
    }
  ]
  return { ...state, retrieved: fakeRetrieved }
}

async function invokeOpenCodeSkill(state) {
  const model = process.env.OPENCODE_MODEL || 'opencode/deepseek-v4-flash-free'
  const opencode = await createOpencode({ config: { model } })
  try {
    const session = await opencode.client.session.create({ body: { title: 'langgraph-opencode-sdk-demo' } })
    const context = (state.retrieved || [])
      .map(x => `[${x.docId} p${x.page}] ${x.text}`)
      .join('\n')

    const prompt = [
      'You are an OpenCode skill named grounded_answer_writer.',
      'Answer in Korean using ONLY the retrieved evidence.',
      'Return concise JSON matching this shape:',
      '{"answer":"...","citations":[{"docId":"...","page":1}],"confidence":0.0}',
      'If evidence is weak, still answer briefly and set lower confidence.',
      '',
      `retrievalMode: ${state.retrievalMode}`,
      `question: ${state.question}`,
      '',
      'retrieved evidence:',
      context,
    ].join('\n')

    const result = await opencode.client.session.prompt({
      path: { id: session.data.id },
      body: { parts: [{ type: 'text', text: prompt }] },
    })

    const text = (result.data.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n').trim()
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = {
        answer: text,
        citations: (state.retrieved || []).map(x => ({ docId: x.docId, page: x.page })),
        confidence: 0.5,
      }
    }

    return {
      ...state,
      answer: parsed.answer || text,
      citations: parsed.citations || [],
    }
  } finally {
    await opencode.server.close()
  }
}

const graph = new StateGraph({ channels: GraphState })
  .addNode('classifyQuestion', classifyQuestion)
  .addNode('retrieveEvidenceChunks', retrieveEvidenceChunks)
  .addNode('invokeOpenCodeSkill', invokeOpenCodeSkill)
  .addEdge(START, 'classifyQuestion')
  .addEdge('classifyQuestion', 'retrieveEvidenceChunks')
  .addEdge('retrieveEvidenceChunks', 'invokeOpenCodeSkill')
  .addEdge('invokeOpenCodeSkill', END)
  .compile()

const question = process.argv.slice(2).join(' ') || '이 문서의 핵심 쟁점을 요약해줘'
const result = await graph.invoke({ question })
console.log(JSON.stringify(result, null, 2))
