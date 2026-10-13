import React, { useState } from 'react';
import { 
  Search, 
  Mic, 
  Trash2, 
  Calendar, 
  FileText, 
  ChevronRight, 
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';
import { MemoryItem } from '../types';

interface VoiceMemoriesProps {
  memories: MemoryItem[];
  onDeleteMemory: (memoryId: string) => void;
  onOpenNewMemoryModal: () => void;
}

export const VoiceMemories: React.FC<VoiceMemoriesProps> = ({
  memories,
  onDeleteMemory,
  onOpenNewMemoryModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'omi' | 'manual'>('all');
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null);

  const filteredMemories = memories.filter((mem) => {
    const matchesSearch = 
      mem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mem.summary && mem.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mem.transcript || mem.raw_transcript || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mem.topics && mem.topics.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesSource = sourceFilter === 'all' || mem.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Filter & Search Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search transcripts, topics, or summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>

        {/* Source Filter Tabs & Ingest CTA */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(['all', 'omi', 'manual'] as const).map((source) => (
            <button
              key={source}
              onClick={() => setSourceFilter(source)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                sourceFilter === source
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {source === 'all' ? 'All Sources' : source}
            </button>
          ))}

          <button
            onClick={onOpenNewMemoryModal}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shrink-0 hover:bg-indigo-700 transition-colors ml-2 shadow-2xs"
          >
            + Ingest
          </button>
        </div>
      </div>

      {/* Grid of Memory Cards */}
      {filteredMemories.length === 0 ? (
        <div className="saas-card p-12 text-center rounded-2xl space-y-3">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No memories match your query</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or ingest a new spoken conversation transcript.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMemories.map((mem) => (
            <div
              key={mem.id}
              className="saas-card p-5 rounded-2xl border flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header & Source */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    mem.source === 'omi' 
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' 
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {mem.source}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(mem.created_at || mem.timestamp || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {mem.title}
                </h4>

                {/* Summary */}
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {mem.summary || mem.transcript}
                </p>

                {/* Topics */}
                {mem.topics && mem.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                    {mem.topics.slice(0, 3).map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedMemory(mem)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Inspect Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setMemoryToDelete(mem.id)}
                  title="Delete memory"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedMemory.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{selectedMemory.source} capture</span>
                    <span>•</span>
                    <span>{new Date(selectedMemory.created_at || selectedMemory.timestamp || Date.now()).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Summary */}
              {selectedMemory.summary && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Executive Summary
                  </h4>
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 leading-relaxed">
                    {selectedMemory.summary}
                  </div>
                </div>
              )}

              {/* Facts Extracted */}
              {selectedMemory.facts && selectedMemory.facts.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-cyan-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Factual Takeaways
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {selectedMemory.facts.map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 mt-1.5 shrink-0" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Transcript */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Full Dialogue Transcript
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {selectedMemory.transcript}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">ID: {selectedMemory.id}</span>
              <button
                onClick={() => setSelectedMemory(null)}
                className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {memoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-rose-200 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Confirm Memory Deletion
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this conversation? This will purge the transcript and its vectors from Qdrant Cloud.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setMemoryToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 bg-white border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteMemory(memoryToDelete);
                  setMemoryToDelete(null);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
