export type NavigationTab = 
  | 'dashboard' 
  | 'chat' 
  | 'memories' 
  | 'tasks' 
  | 'agents' 
  | 'settings';

export type StepStatus = 'waiting' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentStepEvent {
  key?: string;
  agent_name: string;
  role: string;
  is_lyzr_agent?: boolean;
  status: StepStatus;
  started_at?: string;
  finished_at?: string;
  timestamp?: string;
  duration_ms?: number;
  input_preview?: string;
  output_preview?: string;
  error_message?: string;
}

export interface WorkflowError {
  code: string;
  message: string;
  step_key?: string;
}

export interface WorkflowExecution {
  execution_id: string;
  correlation_id: string;
  user_id?: string;
  workflow_type: 'transcript_ingestion' | 'chat_query';
  status: 'queued' | 'running' | 'completed' | 'failed';
  label?: string;
  created_at?: string;
  start_time?: string;
  end_time?: string;
  total_duration_ms?: number;
  steps: AgentStepEvent[];
  error?: WorkflowError;
  result?: Record<string, any>;
}

export interface MemoryCitation {
  memory_id: string;
  conversation_id?: string;
  title: string;
  timestamp: string;
  source: string;
  excerpt: string;
  similarity_score: number;
}

export interface MemoryItem {
  id: string;
  user_id: string;
  conversation_id: string;
  title: string;
  summary: string;
  raw_transcript?: string;
  transcript?: string;
  key_facts?: string[];
  facts?: string[];
  topics?: string[];
  participants?: string[];
  duration_seconds?: number;
  source: 'manual' | 'omi' | 'voice';
  status?: 'indexed' | 'pending' | 'failed';
  vector_id?: string;
  embedding_model?: string;
  correlation_id?: string;
  created_at: string;
  timestamp?: string;
  task_ids?: string[];
}

export interface TaskItem {
  id: string;
  user_id?: string;
  memory_id?: string;
  conversation_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_owner?: string;
  is_user_edited: boolean;
  edited_fields?: string[];
  extracted?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AgentInfo {
  key: string;
  name: string;
  role: string;
  configured: boolean;
  runs: number;
  last_status?: StepStatus;
  last_run_at?: string;
  last_error?: string;
  avg_duration_ms?: number;
}

export interface IntegrationServiceStatus {
  service: string;
  status: 'connected' | 'error' | 'unconfigured';
  message: string;
  details?: Record<string, any>;
}

export interface IntegrationsHealthResponse {
  services?: IntegrationServiceStatus[];
  all_healthy?: boolean;
  backend_ok?: boolean;
  [key: string]: any;
}

export interface StatsResponse {
  memories: number;
  conversations: number;
  tasks_total: number;
  tasks_pending: number;
  tasks_completed: number;
  questions_answered: number;
  workflows_failed: number;
}

export interface ChatResponse {
  answer: string;
  citations: MemoryCitation[];
  execution: WorkflowExecution;
  correlation_id: string;
  no_match: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: MemoryCitation[];
  steps?: AgentStepEvent[];
  correlation_id?: string;
  execution_id?: string;
  error?: string;
  isRetrying?: boolean;
}
