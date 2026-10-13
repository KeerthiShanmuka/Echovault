import React from 'react';
import { Plus, Bell, RefreshCw, User } from 'lucide-react';
import { NavigationTab } from '../types';

interface TopNavProps {
  activeTab: NavigationTab;
  onOpenNewMemoryModal: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isBackendLive: boolean;
  pendingTasksCount: number;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Overview Dashboard', subtitle: 'Voice memory intelligence, multi-agent operations, and live metrics' },
  chat: { title: 'AI Memory Assistant', subtitle: 'Semantic Q&A grounded in past voice conversations and Qdrant Cloud' },
  memories: { title: 'Voice Memory Vault', subtitle: 'Searchable archive of spoken transcripts, summaries, and verified facts' },
  tasks: { title: 'Tasks & Action Items', subtitle: 'Deliverables and deadlines extracted by the Task Extractor Agent' },
  agents: { title: 'Agent Activity & Telemetry', subtitle: 'Manager, Summarizer, Task Extractor & Memory Assistant execution trace' },
  settings: { title: 'Settings & Data Governance', subtitle: 'Memory retention policy, Qdrant vector isolation, and account controls' },
};

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onOpenNewMemoryModal,
  onRefreshData,
  isRefreshing,
  isBackendLive,
  pendingTasksCount
}) => {
  const current = TAB_TITLES[activeTab] || { title: 'EchoVault AI', subtitle: 'Voice Memory Assistant' };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {current.title}
          {!isBackendLive && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Connecting...
            </span>
          )}
        </h1>
        <p className="text-xs text-slate-500 font-normal">{current.subtitle}</p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Refresh Sync Button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          title="Refresh memory and task states"
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* Action Item Notification Icon */}
        <div className="relative">
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
            <Bell className="w-3.5 h-3.5" />
          </div>
          {pendingTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
              {pendingTasksCount}
            </span>
          )}
        </div>

        {/* Primary CTA: Ingest Voice Transcript */}
        <button
          onClick={onOpenNewMemoryModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all hover:shadow active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ingest Transcript</span>
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs">
            AR
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold text-slate-800">Alex Reed</div>
            <div className="text-[10px] text-slate-400">Personal Workspace</div>
          </div>
        </div>
      </div>
    </header>
  );
};
