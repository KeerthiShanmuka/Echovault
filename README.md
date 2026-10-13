# EchoVault AI — Multi-Agent Voice Memory Assistant

> **A production-grade, voice-powered memory intelligence platform that captures spoken conversations, maintains persistent semantic memories, extracts actionable tasks, and coordinates multi-agent reasoning to answer user questions.**

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Ingestion & Voice Streams
        OMI["Omi Mobile App / Wearable"] -->|POST /omi/conversation| FASTAPI["FastAPI Core (:8000)"]
        OMI -->|POST /omi/realtime| FASTAPI
        WEB["React Dashboard UI"] -->|POST /api/transcripts| FASTAPI
    end

    subgraph FastAPI Core
        FASTAPI --> ORCH["Agent Orchestrator"]
        ORCH --> CORR["Correlation ID & Tracing Engine"]
    end

    subgraph Multi-Agent Network (Lyzr)
        ORCH --> MGR["1. Manager Agent"]
        MGR --> SUM["2. Summarizer Agent"]
        MGR --> TSK["3. Task Extractor Agent"]
        MGR --> MEM["4. Memory Assistant Agent"]
    end

    subgraph Vector & State Storage
        ORCH --> EMB["FastEmbed / BAAI Engine"]
        EMB --> QDR["Qdrant Cloud Vector Database"]
        ORCH --> STORE["Local State Store (JSON / DB)"]
    end

    subgraph Frontend Application (:5173)
        DASH["Overview Dashboard"] <--> FASTAPI
        CHAT["AI Memory Assistant (RAG)"] <--> FASTAPI
        VAULT["Voice Memory Vault"] <--> FASTAPI
        TASKS["Tasks & Action Items"] <--> FASTAPI
        AGENTS["Agent Control Center"] <--> FASTAPI
        INTS["Integration Diagnostics"] <--> FASTAPI
        PRIV["Settings & Privacy"] <--> FASTAPI
    end
```

---

## 2. Key Features

- **Voice Ingestion Pipeline**: Ingest conversations via Omi phone app webhooks (`/omi/conversation`, `/omi/realtime`) or the built-in manual transcript studio with 1-click test presets.
- **Lyzr Multi-Agent Network**:
  1. **Manager Agent**: Evaluates request classification (ingestion vs query) and routes execution to worker agents.
  2. **Summarizer Agent**: Condenses spoken transcripts into executive summaries, key topics, and verified facts.
  3. **Task Extractor Agent**: Parses dialogue for commitments, assignees, priorities, and deadlines.
  4. **Memory Assistant Agent**: RAG contextual reasoner delivering grounded answers with memory citations and similarity scores.
- **Qdrant Cloud Vector Storage**: Semantic vector retrieval filtered strictly by `user_id`, guaranteeing tenant isolation.
- **Telemetry & Tracing**: Every workflow tracks a unique **Correlation ID**, duration in milliseconds (`ms`), and step-by-step agent input/output payloads.
- **Hybrid Live / Demo Mode**: The frontend operates seamlessly with realistic sample data when offline, and automatically links to the live FastAPI backend when running.

---

## 3. Directory Layout

```
echovault-ai/
├── frontend/                     # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Sidebar, TopNav, NewMemoryModal
│   │   ├── pages/                # 7 Dashboard Pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ChatAssistant.tsx
│   │   │   ├── VoiceMemories.tsx
│   │   │   ├── TasksPage.tsx
│   │   │   ├── AgentControlCenter.tsx
│   │   │   ├── IntegrationsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/             # Unified API client & mock dataset
│   │   ├── types/                # Shared TypeScript schemas
│   │   ├── App.tsx
│   │   └── index.css             # Dark charcoal & purple/cyan theme
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py             # Pydantic Settings
│   │   ├── main.py               # FastAPI entry point & CORS
│   │   ├── models/schemas.py     # Pydantic models
│   │   ├── services/
│   │   │   ├── storage.py        # Persistent store
│   │   │   ├── embedding_service.py # FastEmbed / OpenAI vectors
│   │   │   ├── qdrant_service.py # Qdrant Cloud client
│   │   │   ├── lyzr_service.py   # Lyzr multi-agent API caller
│   │   │   ├── agent_orchestrator.py # Multi-agent workflow logic
│   │   │   └── omi_service.py    # Omi webhook receiver & parser
│   │   └── routers/              # REST & Webhook endpoints
│   ├── tests/                    # Automated pytest suite
│   ├── requirements.txt
│   └── .env                      # Kept private, gitignored
├── .env.example                  # Environment template
├── .gitignore
└── README.md
```

---

## 4. Beginner-Friendly Windows Quick Start

### Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **Git**

### Step 1: Environment Setup
Copy the environment template:
```powershell
Copy-Item .env.example backend\.env
```
Open `backend\.env` in your editor and enter your credentials:
```env
# Lyzr Studio (https://studio.lyzr.ai)
LYZR_API_KEY=your_lyzr_api_key
LYZR_MANAGER_AGENT_ID=your_manager_agent_id
LYZR_SUMMARIZER_AGENT_ID=your_summarizer_agent_id
LYZR_TASK_AGENT_ID=your_task_agent_id
LYZR_MEMORY_AGENT_ID=your_memory_agent_id

# Qdrant Cloud (https://cloud.qdrant.io)
QDRANT_URL=https://your-cluster-id.us-east-1-0.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=mindflow_memories

# Embedding Provider (fastembed requires zero external keys)
EMBEDDING_PROVIDER=fastembed
```

### Step 2: Start the FastAPI Backend
Open a PowerShell terminal:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Verify the backend is live:
- Swagger Interactive Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### Step 3: Start the React Frontend
Open a second PowerShell terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The UI will automatically detect the backend and switch to **FastAPI Live** mode.

---

## 5. API Reference & Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & system version metadata |
| `GET` | `/api/integrations/status` | Real-time connection status for Lyzr, Qdrant & Omi |
| `POST` | `/api/integrations/test/{service}` | Diagnostics ping for an individual service |
| `POST` | `/api/chat` | Semantic Q&A with memory citations and agent steps |
| `GET` | `/api/memories` | List all indexed voice conversations |
| `POST` | `/api/memories/search` | Vector similarity search across memories |
| `DELETE` | `/api/memories/{id}` | Delete an individual memory point |
| `DELETE` | `/api/memories` | Purge all memories for the authenticated tenant |
| `POST` | `/api/transcripts` | Manual voice transcript ingestion studio |
| `GET` | `/api/tasks` | List extracted tasks and deadlines |
| `PATCH` | `/api/tasks/{id}` | Update task status, priority, or assignee |
| `GET` | `/api/agents/activity` | List multi-agent workflow executions |
| `POST` | `/omi/conversation` | Omi phone app webhook for completed conversations |
| `POST` | `/omi/realtime` | Omi webhook for streaming speech segments |

---

## 6. Testing Omi Webhooks Locally

You can test Omi webhook deliveries without wearable hardware using PowerShell:

```powershell
# Send a test conversation to the Omi webhook:
Invoke-RestMethod -Uri "http://localhost:8000/omi/conversation" `
  -Method Post `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{
    "session_id": "omi-sample-test-01",
    "transcript": "Had a conversation with Sarah regarding EchoVault. We must ensure query latency is sub-800ms and finalize the Qdrant Cloud cluster setup by Friday.",
    "structured": { "title": "Coffee Catchup with Sarah" }
  }'
```

---

## 7. Troubleshooting

### 1. Lyzr Agents
- **Issue**: Agent execution returns non-200 or timeout.
- **Fix**: Verify your `LYZR_API_KEY` in `backend/.env`. Check that the agent IDs correspond to agents configured in Lyzr Studio. If unconfigured, EchoVault runs in simulated fallback mode without crashing.

### 2. Qdrant Cloud
- **Issue**: Connection refused or cluster error.
- **Fix**: Verify `QDRANT_URL` includes the port `:6333` if required, and `QDRANT_API_KEY` has read/write permissions. EchoVault automatically connects to the configured collection (e.g. `mindflow_memories` or `echovault_memories`) with 384 dimensions on first launch.

### 3. Omi Webhooks
- **Issue**: 401 Unauthorized.
- **Fix**: If you configured `OMI_WEBHOOK_SECRET` in `backend/.env`, pass the header `x-omi-secret: <your_secret>` in your webhook request. Leave blank to disable auth in development.

---

## 8. Security & Privacy Guarantees

1. **No Frontend Secrets**: API keys never reach browser bundles.
2. **Tenant Isolation**: Qdrant vectors and storage records are strictly segmented by `user_id`.
3. **No External Training**: Speech transcripts are processed strictly for real-time memory retrieval.
4. **Git Protection**: `backend/.env` is ignored by default in `.gitignore`.
