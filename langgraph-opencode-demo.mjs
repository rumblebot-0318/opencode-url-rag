import { StateGraph, START, END } from '@langchain/langgraph'

const GraphState = {
  question: null,
  retrievalMode: null,
  retrieved: null,
  answer: null,
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
  // Here LangGraph only orchestrates.
  // In real usage, this node would call an OpenCode SDK-backed skill.
  const snippets = (state.retrieved || []).map(x => `- (${x.docId} p${x.page}) ${x.text}`).join('\n')
  const answer = [
    '[Skill: grounded_answer_writer]',
    `mode=${state.retrievalMode}`,
    '요약:',
    snippets,
  ].join('\n')
  return { ...state, answer }
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
