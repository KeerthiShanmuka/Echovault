import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { NewMemoryModal } from './components/NewMemoryModal';
import { Dashboard } from './pages/Dashboard';
import { ChatAssistant } from './pages/ChatAssistant';
import { VoiceMemories } from './pages/VoiceMemories';
import { TasksPage } from './pages/TasksPage';
import { AgentControlCenter } from './pages/AgentControlCenter';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { NavigationTab, MemoryItem, TaskItem, WorkflowExecution, StatsResponse } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isNewMemoryModalOpen, setIsNewMemoryModalOpen] = useState<boolean>(false);
  const [directQuery, setDirectQuery] = useState<string>('');

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const health = await api.checkHealth();
      setIsBackendLive(health.online);

      const [mems, tsks, execs, st] = await Promise.all([
        api.getMemories().catch(() => []),
        api.getTasks().catch(() => []),
        api.getExecutions().catch(() => []),
        api.getStats().catch(() => null),
      ]);

      setMemories(mems);
      setTasks(tsks);
      setExecutions(execs);
      setStats(st);
    } catch (err) {
      console.error('Error refreshing app data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(async () => {
      const health = await api.checkHealth();
      setIsBackendLive(health.online);
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTask(taskId, { status: nextStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus as any } : t));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<TaskItem>) => {
    try {
      const updated = await api.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await api.deleteMemory(memoryId);
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAllMemories = async () => {
    try {
      await api.deleteAllMemories();
      setMemories([]);
      setTasks([]);
      setStats(null);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendLive={isBackendLive}
        memoriesCount={memories.length}
        tasksCount={tasks.length}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <TopNav
          activeTab={activeTab}
          onOpenNewMemoryModal={() => setIsNewMemoryModalOpen(true)}
          onRefreshData={refreshAllData}
          isRefreshing={isRefreshing}
          isBackendLive={isBackendLive}
          pendingTasksCount={pendingTasksCount}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              memories={memories}
              tasks={tasks}
              executions={executions}
              isBackendLive={isBackendLive}
              onNavigate={(tab) => setActiveTab(tab)}
              onToggleTask={handleToggleTask}
              onOpenNewMemoryModal={() => setIsNewMemoryModalOpen(true)}
              onDirectAsk={(query) => {
                setDirectQuery(query);
                setActiveTab('chat');
              }}
            />
          )}

          {activeTab === 'chat' && (
            <ChatAssistant
              initialQuery={directQuery}
              onClearInitialQuery={() => setDirectQuery('')}
              onNavigateToMemory={(_memId: string) => {
                setActiveTab('memories');
              }}
            />
          )}

          {activeTab === 'memories' && (
            <VoiceMemories
              memories={memories}
              onDeleteMemory={handleDeleteMemory}
              onOpenNewMemoryModal={() => setIsNewMemoryModalOpen(true)}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksPage
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
            />
          )}

          {activeTab === 'agents' && (
            <AgentControlCenter
              executions={executions}
              isBackendLive={isBackendLive}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              memories={memories}
              onClearAllMemories={handleClearAllMemories}
              isBackendLive={isBackendLive}
            />
          )}
        </main>
      </div>

      <NewMemoryModal
        isOpen={isNewMemoryModalOpen}
        onClose={() => setIsNewMemoryModalOpen(false)}
        onSuccess={refreshAllData}
      />
    </div>
  );
}

export default App;
