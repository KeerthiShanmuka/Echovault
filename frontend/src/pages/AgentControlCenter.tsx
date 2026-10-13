import React, { useState } from 'react';
import { 
  Cpu, 
  Workflow, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
  FileCode,
  Terminal,
  ExternalLink,
  Bot,
  Zap,
  Check
} from 'lucide-react';
import { WorkflowExecution, AgentStepEvent } from '../types';

interface AgentControlCenterProps {
  executions: WorkflowExecution[];
  isBackendLive: boolean;
}

const AGENTS_MANIFEST = [
  {
    name: 'Manager Agent',
    role: 'Workflow Coordinator & Router',
    description: 'Receives user requests, classifies intent (query vs ingestion), and delegates execution to worker agents.',
    status: 'Active',
    envKey: 'MANAGER_AGENT_ID',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    iconColor: 'text-violet-600'
  },
  {
    name: 'Summarizer Agent',
    role: 'Transcript Synthesis & Facts',
    description: 'Compresses long spoken dialogue into concise high-density summaries, key discussion topics, and verified facts.',
    status: 'Active',
    envKey: 'SUMMARIZER_AGENT_ID',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconColor: 'text-cyan-600'
  },
  {
    name: 'Task Extractor Agent',
    role: 'Action Item & Deadline Parser',
    description: 'Scans transcripts for explicit and implicit commitments, assigns owners, and flags completion due dates.',
    status: 'Active',
    envKey: 'TASK_AGENT_ID',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600'
  },
  {
    name: 'Memory Assistant Agent',
    role: 'Contextual RAG Synthesizer',
    description: 'Performs semantic reasoning over top vector chunks retrieved from Qdrant Cloud to deliver grounded answers.',
    status: 'Active',
    envKey: 'MEMORY_AGENT_ID',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600'
  }
];

export const AgentControlCenter: React.FC<AgentControlCenterProps> = ({ executions, isBackendLive }) => {
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(executions[0] || null);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Topology Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-sm">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Lyzr Multi-Agent Observability</h1>
              <p className="text-xs text-slate-500">
                Four decoupled AI agents orchestrated via FastAPI with real-time execution telemetry and tracing.
              </p>
            </div>
          </div>
          <span className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border flex items-center gap-1.5 self-start sm:self-auto ${
            isBackendLive 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isBackendLive ? 'Lyzr v3 API Live' : 'Backend Connecting...'}
          </span>
        </div>

        {/* 4 Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {AGENTS_MANIFEST.map((agent, i) => (
            <div
              key={i}
              className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5 transition-all hover:border-violet-300 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Bot className={`w-3.5 h-3.5 ${agent.iconColor}`} />
                  {agent.name}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${agent.badgeColor}`}>
                  {agent.status}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-700">{agent.role}</div>
              <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                {agent.description}
              </p>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Ref: {agent.envKey}</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Ready
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution History and Step Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 Col): Executions List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-600" />
              Workflow Traces ({executions.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Recent runs</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {executions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No workflow executions recorded yet. Ingest a transcript or chat to trigger agents.
              </div>
            ) : (
              executions.map((exec) => {
                const isSelected = selectedExecution?.execution_id === exec.execution_id;
                return (
                  <div
                    key={exec.execution_id}
                    onClick={() => setSelectedExecution(exec)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-violet-50/70 border-violet-400 text-slate-900 shadow-sm'
                        : 'bg-slate-50/50 border-slate-200/80 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        {exec.workflow_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">
                        {exec.total_duration_ms || 0}ms
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 truncate mb-2">
                      Corr: {exec.correlation_id}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-medium text-slate-600">{exec.steps.length} Agent Steps</span>
                      <span>{new Date(exec.created_at || exec.start_time || Date.now()).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (2 Cols): Detail Step Inspector */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          {selectedExecution ? (
            <>
              {/* Selected Run Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Workflow Trace: {selectedExecution.workflow_type.replace('_', ' ').toUpperCase()}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    Correlation ID: {selectedExecution.correlation_id}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">
                    Total: {selectedExecution.total_duration_ms || 0}ms
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                    ID: {selectedExecution.execution_id.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Execution Steps Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pipeline Execution Steps ({selectedExecution.steps.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">FastAPI Orchestration</span>
                </div>

                <div className="space-y-3">
                  {selectedExecution.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2.5 transition-all hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{step.agent_name}</span>
                          <span className="text-[11px] text-slate-500 font-medium">({step.role})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-cyan-600 font-bold">
                            {step.duration_ms || 0}ms
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            step.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : step.status === 'running'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : step.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                      </div>

                      {/* Input preview */}
                      {step.input_preview && (
                        <div className="text-[11px] text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80 font-mono shadow-sm">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">Payload Input:</span>
                          <div className="line-clamp-2">{step.input_preview}</div>
                        </div>
                      )}

                      {/* Output preview */}
                      {step.output_preview && (
                        <div className="text-[11px] text-slate-800 bg-violet-50/50 p-3 rounded-lg border border-violet-200/60 font-mono shadow-sm">
                          <span className="text-violet-600 font-semibold block text-[10px] uppercase mb-1">Agent Response:</span>
                          <div className="line-clamp-3">{step.output_preview}</div>
                        </div>
                      )}

                      {step.error_message && (
                        <div className="text-[11px] text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
                          <span className="font-bold">Error:</span> {step.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-xs text-slate-500">
              Select an execution trace from the left panel to inspect detailed multi-agent steps.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
