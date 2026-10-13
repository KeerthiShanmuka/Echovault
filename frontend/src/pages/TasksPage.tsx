import React, { useState } from 'react';
import { 
  CheckSquare, 
  Search, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Edit2, 
  X,
  Filter,
  Sparkles,
  ArrowUpDown,
  Tag,
  Check
} from 'lucide-react';
import { TaskItem } from '../types';

interface TasksPageProps {
  tasks: TaskItem[];
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ tasks, onUpdateTask }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.assigned_owner && t.assigned_owner.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const highPriorityCount = tasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length;

  const handleNextStatus = (task: TaskItem) => {
    let nextStatus: TaskItem['status'] = 'pending';
    if (task.status === 'pending') nextStatus = 'in_progress';
    else if (task.status === 'in_progress') nextStatus = 'completed';
    else nextStatus = 'pending';

    onUpdateTask(task.id, { status: nextStatus });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    onUpdateTask(editingTask.id, {
      title: editingTask.title,
      description: editingTask.description,
      priority: editingTask.priority,
      deadline: editingTask.deadline,
      assigned_owner: editingTask.assigned_owner,
      status: editingTask.status,
      is_user_edited: true,
    });
    setEditingTask(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Metric Counter Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-violet-600" />
            Action Items & Commitments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tasks extracted automatically from conversations by the Lyzr Task Agent with real-time status management.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            {tasks.length}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Tasks</div>
            <div className="text-sm font-bold text-slate-900">Captured</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            {pendingCount}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Pending</div>
            <div className="text-sm font-bold text-slate-900">Awaiting Action</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            {inProgressCount}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">In Progress</div>
            <div className="text-sm font-bold text-slate-900">Underway</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            {completedCount}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Completed</div>
            <div className="text-sm font-bold text-slate-900">Resolved</div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search action items or owners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200/60'
              }`}
            >
              {st === 'all' ? 'All Tasks' : st.replace('_', ' ')}
            </button>
          ))}

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-violet-500 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No action items found</h3>
          <p className="text-xs text-slate-500">Every task matches your query or no commitments are pending.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                task.status === 'completed'
                  ? 'border-emerald-200/70 bg-emerald-50/20'
                  : 'border-slate-200/80 hover:border-violet-300'
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Status Toggle Button */}
                <button
                  onClick={() => handleNextStatus(task)}
                  title={`Status: ${task.status}. Click to cycle.`}
                  className="mt-0.5 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : task.status === 'in_progress' ? (
                    <Clock className="w-5 h-5 text-amber-500 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 hover:text-violet-600 transition-colors" />
                  )}
                </button>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className={`text-sm font-bold ${
                      task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}>
                      {task.title}
                    </h4>

                    {/* Extraction Provenance Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      task.is_user_edited
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-violet-50 text-violet-700 border-violet-200'
                    }`}>
                      {task.is_user_edited ? 'User Edited' : 'AI Extracted'}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${
                      task.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : task.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 flex-wrap">
                    {task.assigned_owner && (
                      <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <User className="w-3 h-3 text-cyan-600" /> {task.assigned_owner}
                      </span>
                    )}
                    {task.deadline && (
                      <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3 text-violet-600" /> Due {task.deadline}
                      </span>
                    )}
                    <span className="text-slate-400 font-mono text-[10px]">ID: {task.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>

              {/* Priority and Edit Button */}
              <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg border ${
                  task.priority === 'high' 
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : task.priority === 'medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {task.priority} Priority
                </span>

                <button
                  onClick={() => setEditingTask(task)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
                  title="Edit task details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-violet-600" />
                Edit Action Item Details
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Owner</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah"
                    value={editingTask.assigned_owner || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, assigned_owner: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={editingTask.deadline || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-all"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
