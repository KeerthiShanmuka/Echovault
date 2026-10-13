import {
  AgentInfo,
  ChatMessage,
  ChatResponse,
  MemoryCitation,
  MemoryItem,
  StatsResponse,
  TaskItem,
  WorkflowExecution
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class ApiService {
  private isBackendOnline: boolean = false;

  async checkHealth(): Promise<{ online: boolean; data?: any }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        this.isBackendOnline = true;
        const data = await res.json();
        return { online: true, data };
      }
    } catch {
      // Backend offline or unreachable
    }
    this.isBackendOnline = false;
    return { online: false };
  }

  isOnline(): boolean {
    return this.isBackendOnline;
  }

  async getStats(): Promise<StatsResponse> {
    const res = await fetch(`${API_BASE_URL}/api/stats`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`Failed to load stats: ${res.statusText}`);
    this.isBackendOnline = true;
    return await res.json();
  }

  async getMemories(): Promise<MemoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/memories`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`Failed to load memories: ${res.statusText}`);
    this.isBackendOnline = true;
    return await res.json();
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/memories/${memoryId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`Failed to delete memory: ${res.statusText}`);
    return true;
  }

  async deleteAllMemories(): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/memories`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`Failed to purge memories: ${res.statusText}`);
    const data = await res.json();
    return data.count || 0;
  }

  async getTasks(): Promise<TaskItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`Failed to load tasks: ${res.statusText}`);
    this.isBackendOnline = true;
    return await res.json();
  }

  async updateTask(taskId: string, updates: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`Failed to update task: ${res.statusText}`);
    return await res.json();
  }

  async getAgents(): Promise<AgentInfo[]> {
    const res = await fetch(`${API_BASE_URL}/api/agents`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`Failed to load agent info: ${res.statusText}`);
    return await res.json();
  }

  async getExecutions(limit: number = 50): Promise<WorkflowExecution[]> {
    const res = await fetch(`${API_BASE_URL}/api/agents/activity?limit=${limit}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`Failed to load activity: ${res.statusText}`);
    this.isBackendOnline = true;
    return await res.json();
  }

  async ingestTranscript(data: { transcript: string; title?: string; source?: string }): Promise<WorkflowExecution> {
    const res = await fetch(`${API_BASE_URL}/api/transcripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(120000) // Lyzr multi-agent processing can take 15-30s
    });
    if (!res.ok) {
      let errDetail = 'Failed to ingest transcript';
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errDetail;
      } catch {}
      throw new Error(errDetail);
    }
    return await res.json();
  }

  async sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal: AbortSignal.timeout(90000)
    });
    if (!res.ok) {
      let errDetail = 'Failed to query memory assistant';
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errDetail;
      } catch {}
      throw new Error(errDetail);
    }
    return await res.json();
  }
}

export const api = new ApiService();
