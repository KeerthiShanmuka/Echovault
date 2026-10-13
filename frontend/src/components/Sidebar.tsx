import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  Mic, 
  CheckSquare, 
  Activity, 
  Settings, 
  Sparkles,
  ChevronRight,
  Radio
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isBackendLive: boolean;
  memoriesCount: number;
  tasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isBackendLive,
  memoriesCount,
  tasksCount
}) => {
  const navItems = [
    { id: 'dashboard' as NavigationTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'chat' as NavigationTab, label: 'AI Assistant', icon: MessageSquareCode, badge: 'RAG' },
    { id: 'memories' as NavigationTab, label: 'Voice Memories', icon: Mic, count: memoriesCount },
    { id: 'tasks' as NavigationTab, label: 'Tasks & Action Items', icon: CheckSquare, count: tasksCount },
    { id: 'agents' as NavigationTab, label: 'Agent Activity', icon: Activity, badge: '4 Agents' },
    { id: 'settings' as NavigationTab, label: 'Settings & Privacy', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen shrink-0 sticky top-0 select-none z-20 shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1px] flex items-center justify-center shadow-sm">
          <div className="w-full h-full bg-white rounded-[11px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-slate-900">
              EchoVault
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              AI
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Voice Memory Assistant</p>
        </div>
      </div>

      {/* Backend Status Pill */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border ${
          isBackendLive 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isBackendLive ? 'FastAPI Live' : 'Backend Reconnecting'}</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">{isBackendLive ? (import.meta.env.PROD ? 'Cloud' : ':8000') : 'Offline'}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Core Workflows
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-100 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {item.count !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-semibold border border-cyan-100">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-500 ml-0.5" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info: Omi Webhook Listener Indicator */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            <Radio className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800">Omi Webhook</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-500 truncate">Listening on /omi/conversation</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
