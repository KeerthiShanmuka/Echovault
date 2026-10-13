import { MemoryItem, TaskItem, WorkflowExecution, IntegrationsHealthResponse } from '../types';

export const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-101',
    user_id: 'default_user',
    conversation_id: 'conv-892',
    title: 'Product Strategy Sync with Sarah',
    source: 'omi',
    timestamp: '2026-10-12T14:30:00Z',
    transcript: "Sarah and I reviewed the Q4 roadmap. We agreed that EchoVault's voice query latency must be under 800ms. Sarah will finalize the Qdrant Cloud indexing specs by Thursday, and I need to email David regarding the Lyzr production rate limits. We also discussed migrating from OpenAI to FastEmbed for default offline vectors.",
    summary: 'Q4 roadmap alignment on EchoVault voice query latency target (<800ms). Allocated tasks for Qdrant Cloud indexing specs and Lyzr rate limit review.',
    topics: ['Product Roadmap', 'Latency Optimization', 'Lyzr API', 'Qdrant Cloud'],
    facts: [
      'Latency goal set to under 800ms for voice queries',
      'Sarah finalizing Qdrant indexing specs by Thursday',
      'Decision made to support FastEmbed offline embeddings'
    ],
    task_ids: ['task-201', 'task-202'],
    created_at: '2026-10-12T14:32:15Z'
  },
  {
    id: 'mem-102',
    user_id: 'default_user',
    conversation_id: 'conv-893',
    title: 'Coffee Catchup: Omi Hardware Wearable Notes',
    source: 'voice',
    timestamp: '2026-10-11T16:15:00Z',
    transcript: "Testing Omi necklace microphone outdoors in windy conditions. Noise reduction performs surprisingly well, but whisper mode requires gain adjustment. Action item: add an audio threshold filter in the FastAPI webhook parser so incomplete short clips are flagged.",
    summary: 'Field test analysis of Omi necklace microphone. Evaluated ambient noise cancellation and decided to implement webhook audio threshold validation in FastAPI.',
    topics: ['Omi Wearable', 'Hardware Testing', 'Audio Processing'],
    facts: [
      'Outdoor noise cancellation tested positive',
      'FastAPI webhook requires audio duration/threshold validation'
    ],
    task_ids: ['task-203'],
    created_at: '2026-10-11T16:17:40Z'
  },
  {
    id: 'mem-103',
    user_id: 'default_user',
    conversation_id: 'conv-894',
    title: 'Architecture Review: Multi-Agent Delegation',
    source: 'manual',
    timestamp: '2026-10-10T11:00:00Z',
    transcript: "Architecture team brainstorm: Manager Agent should act as a lightweight semantic router. If a transcript arrives, delegate concurrently to Summarizer and Task Extractor. If user asks a question, first perform vector search in Qdrant, then supply top 3 chunks to Memory Assistant Agent.",
    summary: 'Multi-agent orchestration workflow established: concurrent delegation for transcripts and RAG pipeline for conversational question answering.',
    topics: ['Architecture', 'Multi-Agent Systems', 'Lyzr Orchestration', 'RAG'],
    facts: [
      'Manager Agent routes based on request classification',
      'Summarizer and Task Extractor execute concurrently',
      'Top 3 Qdrant semantic chunks fed into Memory Assistant'
    ],
    task_ids: [],
    created_at: '2026-10-10T11:05:00Z'
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-201',
    memory_id: 'mem-101',
    conversation_id: 'conv-892',
    title: 'Finalize Qdrant Cloud vector indexing specs',
    description: 'Ensure 384-dim BAAI/bge-small and 1536-dim OpenAI payloads are mapped correctly in the schema.',
    deadline: '2026-10-15',
    status: 'in_progress',
    priority: 'high',
    assigned_owner: 'Sarah Chen',
    is_user_edited: false,
    created_at: '2026-10-12T14:32:15Z',
    updated_at: '2026-10-12T14:32:15Z'
  },
  {
    id: 'task-202',
    memory_id: 'mem-101',
    conversation_id: 'conv-892',
    title: 'Email David regarding Lyzr production tier rate limits',
    description: 'Verify tier quotas for 4 parallel agent invocations during high-concurrency voice streams.',
    deadline: '2026-10-14',
    status: 'pending',
    priority: 'medium',
    assigned_owner: 'Alex (Self)',
    is_user_edited: false,
    created_at: '2026-10-12T14:32:15Z',
    updated_at: '2026-10-12T14:32:15Z'
  },
  {
    id: 'task-203',
    memory_id: 'mem-102',
    conversation_id: 'conv-893',
    title: 'Add audio threshold filter in FastAPI Omi webhook parser',
    description: 'Ignore micro-segments under 1.5 seconds to prevent spamming the vector index.',
    deadline: '2026-10-16',
    status: 'completed',
    priority: 'low',
    assigned_owner: 'Alex (Self)',
    is_user_edited: true,
    created_at: '2026-10-11T16:17:40Z',
    updated_at: '2026-10-12T10:00:00Z'
  }
];

export const INITIAL_EXECUTIONS: WorkflowExecution[] = [
  {
    execution_id: 'exec-901',
    correlation_id: 'corr-7112-a8f',
    workflow_type: 'transcript_ingestion',
    status: 'completed',
    start_time: '2026-10-12T14:32:10Z',
    end_time: '2026-10-12T14:32:15Z',
    total_duration_ms: 4850,
    steps: [
      {
        agent_name: 'Manager Agent',
        role: 'Orchestrator',
        status: 'completed',
        duration_ms: 420,
        input_preview: 'Incoming Omi transcript (78 words)',
        output_preview: 'Delegated parallel execution to Summarizer and Task Extractor',
        timestamp: '2026-10-12T14:32:10Z'
      },
      {
        agent_name: 'Summarizer Agent',
        role: 'Synthesis',
        status: 'completed',
        duration_ms: 1820,
        input_preview: 'Transcript: Sarah and I reviewed the Q4 roadmap...',
        output_preview: 'Summary generated with 4 key topics and 3 verified facts',
        timestamp: '2026-10-12T14:32:11Z'
      },
      {
        agent_name: 'Task Extractor Agent',
        role: 'Action Item Extraction',
        status: 'completed',
        duration_ms: 1950,
        input_preview: 'Transcript text for action items',
        output_preview: 'Extracted 2 actionable items with owners and deadlines',
        timestamp: '2026-10-12T14:32:11Z'
      },
      {
        agent_name: 'Vector Pipeline',
        role: 'Qdrant Embedding & Store',
        status: 'completed',
        duration_ms: 660,
        input_preview: 'Generated 384-dim BAAI/bge-small vector',
        output_preview: 'Upserted point mem-101 into echovault_memories collection',
        timestamp: '2026-10-12T14:32:14Z'
      }
    ]
  },
  {
    execution_id: 'exec-902',
    correlation_id: 'corr-8921-b4c',
    workflow_type: 'chat_query',
    status: 'completed',
    start_time: '2026-10-12T15:10:00Z',
    end_time: '2026-10-12T15:10:03Z',
    total_duration_ms: 3120,
    steps: [
      {
        agent_name: 'Qdrant Retrieval',
        role: 'Semantic Search',
        status: 'completed',
        duration_ms: 380,
        input_preview: 'Query: "What did Sarah say about Qdrant?"',
        output_preview: 'Retrieved 1 highly relevant memory (Score: 0.89)',
        timestamp: '2026-10-12T15:10:00Z'
      },
      {
        agent_name: 'Memory Assistant Agent',
        role: 'Contextual RAG Reasoning',
        status: 'completed',
        duration_ms: 2740,
        input_preview: 'Query + Grounding Memory: mem-101',
        output_preview: 'Formulated answer citing Sarah Chen and Thursday deadline',
        timestamp: '2026-10-12T15:10:01Z'
      }
    ]
  }
];

export const INITIAL_INTEGRATIONS_HEALTH: IntegrationsHealthResponse = {
  backend_ok: true,
  mode: 'demo',
  lyzr: {
    name: 'Lyzr Multi-Agent AI',
    status: 'demo_mode',
    is_live: false,
    details: '4 agents configured in demo simulation. Ready for LYZR_API_KEY.',
    last_tested: '2026-10-12T18:00:00Z'
  },
  qdrant: {
    name: 'Qdrant Cloud Vector DB',
    status: 'demo_mode',
    is_live: false,
    details: 'Local memory index active. Ready for QDRANT_URL and API Key.',
    last_tested: '2026-10-12T18:00:00Z'
  },
  omi: {
    name: 'Omi Wearable Webhook',
    status: 'connected',
    is_live: true,
    details: 'Endpoints /omi/conversation and /omi/realtime ready to accept webhooks.',
    last_tested: '2026-10-12T18:05:00Z'
  },
  embedding: {
    name: 'FastEmbed / Vector Model',
    status: 'connected',
    is_live: true,
    details: 'BAAI/bge-small-en-v1.5 (384 dims) ready for on-device vector generation.',
    last_tested: '2026-10-12T18:05:00Z'
  },
  timestamp: '2026-10-12T18:10:00Z'
};
