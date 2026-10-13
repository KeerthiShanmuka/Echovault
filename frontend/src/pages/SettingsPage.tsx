import React, { useState } from 'react';
import { 
  Settings, 
  Trash2, 
  ShieldCheck, 
  Lock, 
  Info, 
  AlertTriangle, 
  Check, 
  Database, 
  HardDrive, 
  Cpu, 
  FileCheck,
  Server,
  KeyRound,
  EyeOff
} from 'lucide-react';
import { MemoryItem } from '../types';

interface SettingsPageProps {
  memories: MemoryItem[];
  onClearAllMemories: () => void;
  isBackendLive: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  memories,
  onClearAllMemories,
  isBackendLive
}) => {
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isCleared, setIsCleared] = useState(false);

  const handleConfirmClear = () => {
    if (confirmInput.trim().toUpperCase() === 'DELETE') {
      onClearAllMemories();
      setShowClearConfirmModal(false);
      setConfirmInput('');
      setIsCleared(true);
      setTimeout(() => setIsCleared(false), 4000);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-violet-600" />
          Settings & Memory Governance
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage privacy policies, tenant boundary isolation, runtime configurations, and memory retention.
        </p>
      </div>

      {/* Privacy & Security Architecture Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Privacy & Isolated Memory Governance</h2>
            <p className="text-xs text-slate-500">EchoVault AI guarantees tenant isolation and vector boundary integrity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zero Model Retraining</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Spoken dialogue transcripts and memory records are never used to train base foundation LLMs. Payloads are processed solely by designated Lyzr inference agents.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Database className="w-4 h-4 text-cyan-600" />
              <span>Vector Tenant Filtering</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Dense vector embeddings in Qdrant Cloud are indexed and searched with strict tenant payload filters, ensuring zero cross-user information leakage.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <EyeOff className="w-4 h-4 text-violet-600" />
              <span>Zero Browser Secrets</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              API tokens for Lyzr and Qdrant reside strictly within backend/.env. Client browsers never receive, store, or transmit secret credentials.
            </p>
          </div>
        </div>
      </div>

      {/* System Telemetry & Runtime Specs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          Runtime Environment Telemetry
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">FastAPI Backend</span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5 pt-0.5">
              <span className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isBackendLive ? 'Online (:8000)' : 'Connecting...'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Local Embeddings</span>
            <div className="font-bold text-slate-900 pt-0.5">BAAI/bge-small-en-v1.5</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Vector Space</span>
            <div className="font-bold text-slate-900 pt-0.5">384 Dimensions (Cosine)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Indexed Memory Points</span>
            <div className="font-bold text-violet-700 pt-0.5">{memories.length} Stored Points</div>
          </div>
        </div>
      </div>

      {/* Success Notification if Cleared */}
      {isCleared && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>All memories and extracted action items have been successfully purged.</span>
        </div>
      )}

      {/* Danger Zone: Purge All Memories */}
      <div className="p-6 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Destructive Operation: Purge Memory Store
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Permanently delete all recorded voice conversations, AI summaries, extracted tasks, and vector points from Qdrant Cloud. This action cannot be reversed.
            </p>
          </div>

          <button
            onClick={() => setShowClearConfirmModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all shrink-0"
          >
            Purge All Memories
          </button>
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Permanently Purge Memory?</h3>
                <p className="text-xs text-slate-500">Irreversible destructive action</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              This will erase all <strong>{memories.length} stored conversations</strong> and associated vector embeddings in Qdrant Cloud. To confirm, please type <strong className="text-rose-600 font-mono">DELETE</strong> below:
            </p>

            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white font-mono"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowClearConfirmModal(false);
                  setConfirmInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                disabled={confirmInput.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 transition-all shadow-sm"
              >
                Permanently Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
