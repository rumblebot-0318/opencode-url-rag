import { StateGraph, START, END } from '@langchain/langgraph'
import { createOpencode } from '@opencode-ai/sdk'

const GraphState = {
  question: null,
  retrieval: null,
  answer: null,
}

async function retrieveWithPluginShape(state) {
  // This mirrors the structured shape returned by opencode-plugin/chroma-retriever.ts.
  // Swap this node with a real plugin/tool invocation later.
  const retrieval = {
    context: [
      '[1] 미국과 이란은 종전 MOU를 앞두고 핵 규제와 제재 완화 조건을 놓고 줄다리기를 벌이고 있다.',
      '[2] 향후 60일 협상에서 고농축 우라늄 처리, 제재 해제 범위, 호르무즈해협 관련 조항이 쟁점으로 꼽힌다.'
    ].join('\n\n'),
    sources: [
      { marker: 1, docId: 'demo-doc', title: 'Demo Article', page: 1, chunkId: 1, path: 'demo-doc/p1#chunk-1', distance: 0.12 },
      { marker: 2, docId: 'demo-doc', title: 'Demo Article', page: 2, chunkId: 1, path: 'demo-doc/p2#chunk-1', distance: 0.18 },
    ],
    empty: false,
  }
  return { ...state, retrieval }
}

async function groundedAnswerWriter(state) {
  const model = process.env.OPENCODE_MODEL || 'opencode/deepseek-v4-flash-free'
  const opencode = await createOpencode({ config: { model } })
  try {
    const session = await opencode.client.session.create({ body: { title: 'langgraph-retriever-opencode-demo' } })
    const prompt = [
      'You are an OpenCode skill named grounded_answer_writer.',
      'Answer in Korean using ONLY the retrieved context.',
      'Return JSON only.',
      'Every citation must include marker, docId, page, path, quote.',
      'If evidence is weak, lower confidence.',
      '',
      'Question:',
      state.question,
      '',
      'Retrieved context:',
      state.retrieval?.context || '',
      '',
      'Retrieved sources:',
      JSON.stringify(state.retrieval?.sources || [], null, 2),
      '',
      'Output schema:',
      JSON.stringify({
        answer: '최종 한국어 답변',
        citations: [
          { marker: 1, docId: 'demo-doc', page: 1, path: 'demo-doc/p1#chunk-1', quote: '근거 문장' }
        ],
        confidence: 0.82,
      }, null, 2),
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
        citations: state.retrieval?.sources?.map((s) => ({
          marker: s.marker,
          docId: s.docId,
          page: s.page,
          path: s.path,
          quote: `See ${s.path}`,
        })) || [],
        confidence: 0.5,
      }
    }

    return { ...state, answer: parsed }
  } finally {
    await opencode.server.close()
  }
}

const graph = new StateGraph({ channels: GraphState })
  .addNode('retrieveWithPluginShape', retrieveWithPluginShape)
  .addNode('groundedAnswerWriter', groundedAnswerWriter)
  .addEdge(START, 'retrieveWithPluginShape')
  .addEdge('retrieveWithPluginShape', 'groundedAnswerWriter')
  .addEdge('groundedAnswerWriter', END)
  .compile()

const question = process.argv.slice(2).join(' ') || '이 문서의 핵심 쟁점을 요약해줘'
const result = await graph.invoke({ question })
console.log(JSON.stringify(result, null, 2))
