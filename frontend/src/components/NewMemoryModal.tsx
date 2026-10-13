import React, { useState } from 'react';
import { X, Mic, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { WorkflowExecution } from '../types';

interface NewMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (execution: WorkflowExecution) => void;
}

const PRESET_TRANSCRIPTS = [
  {
    title: 'Sprint Planning: Latency & Quantization Sync',
    source: 'manual',
    text: "During the sprint planning, David and Elena committed to reducing vector retrieval latency to sub-300ms using Qdrant's binary quantization. I must submit the updated Lyzr prompt template by Friday morning, and David needs to review the FastAPI webhook signature middleware."
  },
  {
    title: 'Enterprise Architecture & Tenant Privacy Review',
    source: 'manual',
    text: "Had a 30-minute sync with Marcus from FinCorp. He emphasized that all audio transcripts must remain strictly isolated per tenant. No external training on customer transcripts. Follow-up action: draft the SOC-2 compliance checklist for memory vector storage by October 20th."
  },
  {
    title: 'Omi Wearable Field Test: Mic Noise Reduction',
    source: 'omi',
    text: "Field test log for Omi necklace. Battery lasted 14 hours during active continuous listening. Microphones captured conversation across a noisy cafe clearly. Action item: calibrate silence padding threshold in the FastAPI /omi/conversation handler."
  }
];

export const NewMemoryModal: React.FC<NewMemoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<'manual' | 'omi' | 'voice'>('manual');
  const [transcript, setTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_TRANSCRIPTS[0]) => {
    setTitle(preset.title);
    setSource(preset.source as any);
    setTranscript(preset.text);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const execution = await api.ingestTranscript({
        title: title.trim() || undefined,
        source,
        transcript: transcript.trim()
      });

      onSuccess(execution);
      onClose();
      // Reset
      setTitle('');
      setTranscript('');
    } catch (err: any) {
      console.error('Ingestion failed:', err);
      setError(err?.message || 'Failed to process transcript with multi-agent pipeline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Ingest Voice Transcript</h2>
              <p className="text-xs text-slate-500">Run Lyzr Manager, Summarizer & Task Extractor over speech text</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Presets:
          </span>
          {PRESET_TRANSCRIPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleApplyPreset(p)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-indigo-300 transition-all shrink-0 whitespace-nowrap shadow-2xs"
            >
              {p.title.split(':')[0]}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Conversation Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Product Strategy Sync with Team"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Source Channel
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="manual">Manual Entry</option>
                <option value="omi">Omi Wearable</option>
                <option value="voice">Voice Note</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Spoken Transcript <span className="text-indigo-600">*</span>
            </label>
            <textarea
              required
              rows={6}
              placeholder="Paste or type raw dialogue transcript here (minimum 5 words)..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none leading-relaxed"
            />
            <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-400">
              <span>Word count: {transcript.trim() ? transcript.trim().split(/\s+/).length : 0}</span>
              <span>FastAPI: POST /api/transcripts</span>
            </div>
          </div>

          {/* Processing progress display */}
          {isSubmitting && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-indigo-900">Coordinating Lyzr Multi-Agent Pipeline</div>
                <div className="text-indigo-700">Manager routing, Summarizer, Task Extractor, and Qdrant Cloud indexing...</div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !transcript.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <span>Process with Multi-Agent</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
