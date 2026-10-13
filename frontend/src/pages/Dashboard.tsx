import React, { useState } from 'react';
import { 
  Database, 
  Mic, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  ArrowUpRight, 
  Search, 
  Calendar, 
  Activity,
  Plus,
  ArrowRight,
  Send
} from 'lucide-react';
import { MemoryItem, TaskItem, WorkflowExecution, StatsResponse } from '../types';
import { WorkflowVisualization } from '../components/WorkflowVisualization';

interface DashboardProps {
  stats: StatsResponse | null;
  memories: MemoryItem[];
  tasks: TaskItem[];
  executions: WorkflowExecution[];
  isBackendLive: boolean;
  onNavigate: (tab: any) => void;
  onToggleTask: (taskId: string, currentStatus: string) => void;
  onOpenNewMemoryModal: () => void;
  onDirectAsk: (query: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  memories,
  tasks,
  executions,
  isBackendLive,
  onNavigate,
  onToggleTask,
  onOpenNewMemoryModal,
  onDirectAsk
}) => {
  const [askInput, setAskInput] = useState('');

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const latestExecution = executions[0] || null;

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    onDirectAsk(askInput.trim());
  };

  const statCards = [
    {
      label: 'Indexed Memories',
      value: stats ? stats.memories : (isBackendLive ? '0' : '—'),
      change: 'Persistent in Qdrant Cloud',
      icon: Database,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Conversations Processed',
      value: stats ? stats.conversations : (isBackendLive ? '0' : '—'),
      change: 'Voice & text ingestion',
      icon: Mic,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    },
    {
      label: 'Extracted Tasks',
      value: stats ? stats.tasks_total : (isBackendLive ? '0' : '—'),
      change: stats ? `${stats.tasks_pending} pending` : 'AI parsed commitments',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'AI Questions Answered',
      value: stats ? stats.questions_answered : (isBackendLive ? '0' : '—'),
      change: 'Grounded RAG answers',
      icon: Sparkles,
      color: 'text-violet-600 bg-violet-50 border-violet-100',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome to EchoVault AI
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your voice memory assistant powered by Lyzr multi-agents and Qdrant Cloud vectors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNewMemoryModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingest Transcript</span>
          </button>
        </div>
      </div>

      {/* Prominent "Ask EchoVault" Search Input */}
      <div className="saas-card rounded-2xl p-4 bg-gradient-to-r from-indigo-50/50 via-white to-cyan-50/30 border-indigo-100 shadow-sm">
        <form onSubmit={handleAskSubmit} className="relative flex items-center">
          <Search className="w-4 h-4 text-indigo-500 absolute left-3.5" />
          <input
            type="text"
            placeholder="Ask EchoVault anything about past conversations, decisions, or action items..."
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            className="w-full pl-10 pr-24 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          />
          <button
            type="submit"
            disabled={!askInput.trim()}
            className="absolute right-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <span>Ask</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] text-slate-400">
          <span>Retrieves top chunks from Qdrant Cloud and synthesizes answers via Lyzr Memory Assistant.</span>
          <span className="text-indigo-600 font-medium">Press Enter to query</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="saas-card p-5 rounded-2xl border flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <div className={`p-2 rounded-xl border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</div>
                <div className="text-[11px] text-slate-500 mt-1">{stat.change}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dedicated "How EchoVault Works" Workflow Visualization */}
      <WorkflowVisualization currentExecution={latestExecution} />

      {/* Grid: Recent Conversations & Pending Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Stored Conversations */}
        <div className="lg:col-span-2 saas-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Stored Conversations</h3>
            </div>
            <button
              onClick={() => onNavigate('memories')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View Vault</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {memories.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No conversations stored yet. Click <strong>"Ingest Transcript"</strong> above to capture your first memory.
              </div>
            ) : (
              memories.slice(0, 3).map((mem) => (
                <div
                  key={mem.id}
                  onClick={() => onNavigate('memories')}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {mem.title}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                          mem.source === 'omi' 
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {mem.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {mem.summary || mem.transcript}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(mem.created_at || mem.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Topics chips */}
                  {mem.topics && mem.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
                      {mem.topics.slice(0, 3).map((topic, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          #{topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Pending Action Items */}
        <div className="saas-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Action Items</h3>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                All action items completed or none extracted yet.
              </div>
            ) : (
              pendingTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 hover:border-slate-300 transition-colors"
                >
                  <button
                    onClick={() => onToggleTask(task.id, task.status)}
                    className="mt-0.5 w-4 h-4 rounded border border-slate-300 hover:border-emerald-500 flex items-center justify-center shrink-0 transition-colors bg-white"
                  >
                    {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 line-clamp-2">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span className={`px-1.5 py-0.2 rounded font-semibold ${
                        task.priority === 'high' ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-amber-700 bg-amber-50 border border-amber-200'
                      }`}>
                        {task.priority.toUpperCase()}
                      </span>
                      {task.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> Due {task.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Execution Timeline */}
      <div className="saas-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Multi-Agent Executions</h3>
          </div>
          <button
            onClick={() => onNavigate('agents')}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1"
          >
            <span>Activity Log</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {executions.length === 0 ? (
            <div className="col-span-2 p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              No executions recorded yet. Submit a transcript or ask a question to trigger the pipeline.
            </div>
          ) : (
            executions.slice(0, 2).map((exec) => (
              <div key={exec.execution_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${exec.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {exec.workflow_type.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{exec.correlation_id}</span>
                </div>
                
                <div className="space-y-1.5">
                  {exec.steps.slice(0, 4).map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/60">
                      <span className="font-medium text-slate-700">{step.agent_name}</span>
                      <div className="flex items-center gap-2">
                        {step.duration_ms !== undefined && (
                          <span className="text-[10px] text-slate-500 font-mono">{step.duration_ms}ms</span>
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          step.status === 'completed' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  <span>Duration: <strong className="text-slate-800">{exec.total_duration_ms || 0}ms</strong></span>
                  <span>{exec.created_at ? new Date(exec.created_at).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
