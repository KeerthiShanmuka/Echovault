import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  FileText, 
  Cpu, 
  Sparkles, 
  CheckSquare, 
  Database, 
  Search, 
  Bot, 
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { WorkflowExecution, StepStatus } from '../types';

interface WorkflowVisualizationProps {
  currentExecution?: WorkflowExecution | null;
  className?: string;
}

interface StepNodeDef {
  key: string;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const PIPELINE_NODES: StepNodeDef[] = [
  { key: 'voice_input', name: '1. Voice Input', subtitle: 'Omi phone app or manual speech transcript', icon: Mic, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { key: 'transcript_processing', name: '2. Transcript Processing', subtitle: 'Sanitization & structure validation', icon: FileText, color: 'text-slate-700 bg-slate-50 border-slate-200' },
  { key: 'manager', name: '3. Manager Agent', subtitle: 'Lyzr intent routing & agent coordination', icon: Cpu, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { key: 'summarizer', name: '4. Summarizer Agent', subtitle: 'Executive synthesis & key takeaways', icon: Sparkles, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { key: 'task_extractor', name: '5. Task Extractor', subtitle: 'Action items, deadlines & assignees', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { key: 'qdrant_memory', name: '6. Qdrant Memory', subtitle: '384-dim dense vectors & tenant index', icon: Database, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'qdrant_retrieval', name: '7. Memory Retrieval', subtitle: 'Semantic vector similarity match', icon: Search, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'memory_assistant', name: '8. Memory Assistant', subtitle: 'Contextual RAG synthesis with citations', icon: Bot, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { key: 'final_response', name: '9. Final Response', subtitle: 'Grounded output, evidence & telemetry', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
];

export const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({ currentExecution, className = '' }) => {
  // Determine if this is a live execution or empty preview
  const isLive = Boolean(currentExecution && currentExecution.steps && currentExecution.steps.length > 0);

  const getStepStatus = (stepKey: string): StepStatus => {
    if (!isLive || !currentExecution) return 'waiting';
    const match = currentExecution.steps.find(s => s.key === stepKey);
    return match ? match.status : 'skipped';
  };

  const getStepDuration = (stepKey: string): number | undefined => {
    if (!isLive || !currentExecution) return undefined;
    const match = currentExecution.steps.find(s => s.key === stepKey);
    return match?.duration_ms;
  };

  const getStepError = (stepKey: string): string | undefined => {
    if (!isLive || !currentExecution) return undefined;
    const match = currentExecution.steps.find(s => s.key === stepKey);
    return match?.error_message;
  };

  return (
    <div className={`saas-card rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">How EchoVault Works</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isLive
                ? currentExecution?.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : currentExecution?.status === 'failed'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {isLive ? `Live Run (${currentExecution?.status?.toUpperCase()})` : 'Architecture Preview'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real multi-agent processing pipeline connecting Omi speech, Lyzr orchestration, and Qdrant Cloud memory.
          </p>
        </div>

        {isLive && currentExecution && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>Corr: <strong className="text-slate-700">{currentExecution.correlation_id}</strong></span>
            {currentExecution.total_duration_ms !== undefined && (
              <span>• <strong className="text-indigo-600">{currentExecution.total_duration_ms}ms</strong></span>
            )}
          </div>
        )}
      </div>

      {/* 9-Node Grid Pipeline with Moving Animation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-5">
        {PIPELINE_NODES.map((node, index) => {
          const Icon = node.icon;
          const status = getStepStatus(node.key);
          const duration = getStepDuration(node.key);
          const errorMsg = getStepError(node.key);

          // Status Badge UI
          let statusBadge = (
            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Ready
            </span>
          );
          if (isLive) {
            if (status === 'completed') {
              statusBadge = (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done {duration ? `(${duration}ms)` : ''}
                </span>
              );
            } else if (status === 'running') {
              statusBadge = (
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" /> Running...
                </span>
              );
            } else if (status === 'failed') {
              statusBadge = (
                <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600" /> Failed
                </span>
              );
            } else if (status === 'skipped') {
              statusBadge = (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                  Skipped
                </span>
              );
            }
          }

          return (
            <motion.div
              key={node.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className={`p-3.5 rounded-xl border transition-all ${
                status === 'running'
                  ? 'border-indigo-400 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-300'
                  : status === 'failed'
                  ? 'border-rose-300 bg-rose-50/30'
                  : status === 'completed'
                  ? 'border-emerald-200 bg-white hover:border-emerald-300'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${node.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{node.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">{node.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                {statusBadge}
                <span className="text-[10px] font-mono text-slate-400">Step {index + 1}/9</span>
              </div>

              {errorMsg && (
                <div className="mt-2 p-1.5 bg-rose-50 rounded text-[10px] text-rose-700 border border-rose-200">
                  {errorMsg}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Caption note */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Nodes light up in real-time as tasks execute across Lyzr and Qdrant.</span>
        <span className="text-indigo-600 font-medium">Lyzr v3 Orchestration • Qdrant Cloud Cosine</span>
      </div>
    </div>
  );
};
