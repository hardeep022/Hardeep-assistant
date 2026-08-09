import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../i18n/I18nContext';
import { useToast } from './Toast';
import type { TaskItem, NoteItem, ReminderItem, TaskPriority, TaskStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductivityModal({ isOpen, onClose }: Props) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'tasks' | 'reminders' | 'notes'>('tasks');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');

  // Task form state
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskRecurring, setTaskRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [taskTag, setTaskTag] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');

  // Reminder form state
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [reminderRecurring, setReminderRecurring] = useState<'none' | 'daily' | 'weekly'>('none');

  // Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTag, setNoteTag] = useState('');
  const [noteSensitive, setNoteSensitive] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState('');

  const { tasks = [], reminders = [], notes = [] } = state;

  // Task filtering logic
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return tasks.filter(task => {
      if (filterStatus === 'completed') return task.status === 'completed';
      if (filterStatus === 'all') return true;
      if (task.status === 'completed') return false;
      if (!task.dueDate) return false;

      if (filterStatus === 'today') return task.dueDate === todayStr;
      if (filterStatus === 'overdue') return task.dueDate < todayStr;
      if (filterStatus === 'upcoming') return task.dueDate > todayStr;
      return true;
    });
  }, [tasks, filterStatus]);

  const completedCount = tasks.filter(item => item.status === 'completed').length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (!isOpen) return null;

  // ─── Task Handlers ───────────────────────────────────────────────────────────
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDesc.trim()) return;

    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      description: taskDesc.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      recurring: taskRecurring,
      tags: taskTag.trim() ? [taskTag.trim()] : [],
      status: 'pending',
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_TASK', task: newTask });
    setTaskDesc('');
    setTaskTag('');
    setTaskDueDate('');
    setTaskRecurring('none');
    toast.success('Task created successfully');
  };

  const handleSetTaskStatus = (id: string, status: TaskStatus) => {
    dispatch({ type: 'SET_TASK_STATUS', taskId: id, status });
  };

  const handleDeleteTask = (id: string) => {
    dispatch({ type: 'DELETE_TASK', taskId: id });
    toast.info('Task deleted');
  };

  // ─── Reminder Handlers ───────────────────────────────────────────────────────
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderDateTime) {
      toast.error('Please provide a title and due time for the reminder');
      return;
    }

    const dueTimestamp = new Date(reminderDateTime).getTime();
    if (isNaN(dueTimestamp)) {
      toast.error('Invalid date/time format');
      return;
    }

    const newReminder: ReminderItem = {
      id: crypto.randomUUID(),
      title: reminderTitle.trim(),
      dueTimestamp,
      recurring: reminderRecurring,
      active: true,
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_REMINDER', reminder: newReminder });
    setReminderTitle('');
    setReminderDateTime('');
    setReminderRecurring('none');
    toast.success('Reminder scheduled');
  };

  const handleToggleReminder = (id: string) => {
    dispatch({ type: 'TOGGLE_REMINDER', reminderId: id });
  };

  const handleDeleteReminder = (id: string) => {
    dispatch({ type: 'DELETE_REMINDER', reminderId: id });
    toast.info('Reminder deleted');
  };

  // ─── Note Handlers ───────────────────────────────────────────────────────────
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    if (editingNoteId) {
      const existing = notes.find(item => item.id === editingNoteId);
      if (existing) {
        dispatch({
          type: 'UPDATE_NOTE',
          note: {
            ...existing,
            title: noteTitle.trim(),
            content: noteContent.trim(),
            tags: noteTag.trim() ? [noteTag.trim()] : existing.tags,
            sensitive: noteSensitive,
            updatedAt: Date.now(),
          },
        });
        toast.success('Note updated');
      }
      setEditingNoteId(null);
    } else {
      const newNote: NoteItem = {
        id: crypto.randomUUID(),
        title: noteTitle.trim(),
        content: noteContent.trim(),
        tags: noteTag.trim() ? [noteTag.trim()] : [],
        sensitive: noteSensitive,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: 'ADD_NOTE', note: newNote });
      toast.success('Note created');
    }

    setNoteTitle('');
    setNoteContent('');
    setNoteTag('');
    setNoteSensitive(false);
  };

  const handleEditNote = (note: NoteItem) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTag(note.tags.join(', '));
    setNoteSensitive(Boolean(note.sensitive));
  };

  const handleDeleteNote = (id: string) => {
    dispatch({ type: 'DELETE_NOTE', noteId: id });
    toast.info('Note deleted');
  };

  const handleExportNote = (note: NoteItem) => {
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^a-z0-9_-]/gi, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported note as Markdown (.md)');
  };

  const filteredNotes = notes.filter(item => {
    if (!noteSearch.trim()) return true;
    const query = noteSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    const colors: Record<TaskPriority, { bg: string; color: string }> = {
      low: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
      medium: { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308' },
      high: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
      urgent: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    };
    const c = colors[priority] || colors.medium;
    return (
      <span style={{ padding: '2px 6px', borderRadius: '4px', background: c.bg, color: c.color, fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
        {t(`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}` as any) || priority}
      </span>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 9995,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: '920px',
          height: '84vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-input)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>⚡</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('productivity')} Suite
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                Tasks, Scheduled Reminders, and Encrypted Notes
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveTab('tasks')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-xs)',
                border: 'none',
                background: activeTab === 'tasks' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'tasks' ? '#fff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✅ {t('tasks')} ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-xs)',
                border: 'none',
                background: activeTab === 'reminders' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'reminders' ? '#fff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⏰ {t('reminders')} ({reminders.filter(item => item.active).length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-xs)',
                border: 'none',
                background: activeTab === 'notes' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'notes' ? '#fff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📝 {t('notes')} ({notes.length})
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ═══════════ TASKS TAB ═══════════ */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Task Creation Form */}
              <form
                onSubmit={handleAddTask}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <input
                  type="text"
                  placeholder="What needs to be done? (e.g. Prepare system security audit report)"
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    width: '100%',
                  }}
                />

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-xs)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-xs)',
                      padding: '5px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />

                  <select
                    value={taskRecurring}
                    onChange={e => setTaskRecurring(e.target.value as any)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-xs)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Repeat Daily</option>
                    <option value="weekly">Repeat Weekly</option>
                    <option value="monthly">Repeat Monthly</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Tag (e.g. Work, Security)"
                    value={taskTag}
                    onChange={e => setTaskTag(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-xs)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      flex: 1,
                      minWidth: '120px',
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      padding: '6px 16px',
                      borderRadius: 'var(--r-xs)',
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {t('addTask')}
                  </button>
                </div>
              </form>

              {/* Progress & Controls Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{completedCount} of {tasks.length} done ({progressPct}%)</span>
                  </div>
                  <div style={{ width: '120px', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Filter Pills */}
                  {(['all', 'today', 'upcoming', 'overdue', 'completed'] as const).map(filterItem => (
                    <button
                      key={filterItem}
                      onClick={() => setFilterStatus(filterItem)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--r-xs)',
                        border: 'none',
                        background: filterStatus === filterItem ? 'var(--accent)' : 'var(--bg-input)',
                        color: filterStatus === filterItem ? '#fff' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {filterItem}
                    </button>
                  ))}

                  <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

                  {/* View Mode Toggle */}
                  <button
                    onClick={() => setTaskViewMode('list')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border)',
                      background: taskViewMode === 'list' ? 'var(--accent)' : 'transparent',
                      color: taskViewMode === 'list' ? '#fff' : 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                    title="List View"
                  >
                    ☰ {t('listView')}
                  </button>
                  <button
                    onClick={() => setTaskViewMode('kanban')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border)',
                      background: taskViewMode === 'kanban' ? 'var(--accent)' : 'transparent',
                      color: taskViewMode === 'kanban' ? '#fff' : 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                    title="Kanban Board"
                  >
                    ▦ {t('kanbanBoard')}
                  </button>
                </div>
              </div>

              {/* LIST VIEW */}
              {taskViewMode === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredTasks.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '40px 0' }}>
                      No tasks found in this view.
                    </p>
                  ) : (
                    filteredTasks.map(task => (
                      <div
                        key={task.id}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r-md)',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => handleSetTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: '13px',
                                color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                              }}
                            >
                              {task.description}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                              {getPriorityBadge(task.priority)}
                              {task.dueDate && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  📅 {task.dueDate}
                                </span>
                              )}
                              {task.recurring && task.recurring !== 'none' && (
                                <span style={{ fontSize: '11px', color: 'var(--accent)' }}>
                                  🔁 {task.recurring}
                                </span>
                              )}
                              {task.tags?.map(tag => (
                                <span key={tag} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            value={task.status}
                            onChange={e => handleSetTaskStatus(task.id, e.target.value as TaskStatus)}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--r-xs)',
                              padding: '3px 6px',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <option value="pending">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Done</option>
                          </select>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                            title="Delete Task"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* KANBAN BOARD VIEW */}
              {taskViewMode === 'kanban' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {(['pending', 'in_progress', 'completed'] as const).map(columnStatus => {
                    const colTasks = tasks.filter(item => item.status === columnStatus);
                    const colLabels = {
                      pending: { title: 'To Do', icon: '📋', color: '#3b82f6' },
                      in_progress: { title: 'In Progress', icon: '⏳', color: '#eab308' },
                      completed: { title: 'Completed', icon: '✅', color: '#22c55e' },
                    };
                    const colInfo = colLabels[columnStatus];

                    return (
                      <div
                        key={columnStatus}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r-md)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          minHeight: '260px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: colInfo.color }}>
                            {colInfo.icon} {colInfo.title}
                          </span>
                          <span style={{ fontSize: '11px', background: 'var(--bg-card)', padding: '1px 6px', borderRadius: '10px', color: 'var(--text-muted)' }}>
                            {colTasks.length}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                          {colTasks.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', margin: 'auto 0' }}>
                              No tasks
                            </p>
                          ) : (
                            colTasks.map(task => (
                              <div
                                key={task.id}
                                style={{
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--r-xs)',
                                  padding: '10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                }}
                              >
                                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {task.description}
                                </span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  {getPriorityBadge(task.priority)}
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {columnStatus !== 'pending' && (
                                      <button
                                        onClick={() => handleSetTaskStatus(task.id, columnStatus === 'completed' ? 'in_progress' : 'pending')}
                                        style={{ background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)', borderRadius: '2px', padding: '2px 4px', fontSize: '10px', cursor: 'pointer' }}
                                        title="Move Left"
                                      >
                                        ◀
                                      </button>
                                    )}
                                    {columnStatus !== 'completed' && (
                                      <button
                                        onClick={() => handleSetTaskStatus(task.id, columnStatus === 'pending' ? 'in_progress' : 'completed')}
                                        style={{ background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)', borderRadius: '2px', padding: '2px 4px', fontSize: '10px', cursor: 'pointer' }}
                                        title="Move Right"
                                      >
                                        ▶
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ REMINDERS TAB ═══════════ */}
          {activeTab === 'reminders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Add Reminder Form */}
              <form
                onSubmit={handleAddReminder}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <input
                  type="text"
                  placeholder="Reminder title (e.g. Team Standup meeting, Review PRD notes)"
                  value={reminderTitle}
                  onChange={e => setReminderTitle(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    width: '100%',
                  }}
                />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="datetime-local"
                    value={reminderDateTime}
                    onChange={e => setReminderDateTime(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-xs)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />

                  <select
                    value={reminderRecurring}
                    onChange={e => setReminderRecurring(e.target.value as any)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-xs)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="none">One-time</option>
                    <option value="daily">Repeat Daily</option>
                    <option value="weekly">Repeat Weekly</option>
                  </select>

                  <button
                    type="submit"
                    style={{
                      padding: '6px 18px',
                      borderRadius: 'var(--r-xs)',
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {t('addReminder')}
                  </button>
                </div>
              </form>

              {/* Reminders List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reminders.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '40px 0' }}>
                    No scheduled reminders. Add one above!
                  </p>
                ) : (
                  reminders.map(rem => {
                    const isOverdue = rem.dueTimestamp < Date.now();
                    return (
                      <div
                        key={rem.id}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '18px' }}>{rem.active ? '⏰' : '🔕'}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: rem.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {rem.title}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px' }}>
                              <span style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
                                {new Date(rem.dueTimestamp).toLocaleString()}
                              </span>
                              {rem.recurring && rem.recurring !== 'none' && (
                                <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '1px 6px', borderRadius: '3px' }}>
                                  🔁 {rem.recurring}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleToggleReminder(rem.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--r-xs)',
                              border: '1px solid var(--border)',
                              background: rem.active ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                              color: rem.active ? '#22c55e' : 'var(--text-muted)',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            {rem.active ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => handleDeleteReminder(rem.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ═══════════ NOTES TAB ═══════════ */}
          {activeTab === 'notes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', height: '100%' }}>
              {/* Note Editor Form */}
              <form
                onSubmit={handleSaveNote}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {editingNoteId ? 'Edit Note' : 'Create Note'}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={noteSensitive}
                      onChange={e => setNoteSensitive(e.target.checked)}
                    />
                    🔒 Sensitive / Private
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Note Title"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    width: '100%',
                  }}
                />

                <input
                  type="text"
                  placeholder="Tags (comma separated, e.g. Work, Ideas)"
                  value={noteTag}
                  onChange={e => setNoteTag(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-xs)',
                    padding: '6px 10px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '100%',
                  }}
                />

                <textarea
                  placeholder="Write your note in Markdown..."
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  rows={8}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    resize: 'none',
                    flex: 1,
                    fontFamily: 'inherit',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {editingNoteId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(null);
                        setNoteTitle('');
                        setNoteContent('');
                        setNoteTag('');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--r-xs)',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {t('cancel')}
                    </button>
                  )}
                  <button
                    type="submit"
                    style={{
                      padding: '6px 18px',
                      borderRadius: 'var(--r-xs)',
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {editingNoteId ? 'Update Note' : '+ ' + t('addNote')}
                  </button>
                </div>
              </form>

              {/* Note Search & List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={e => setNoteSearch(e.target.value)}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '100%',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                  {filteredNotes.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '40px 0' }}>
                      No notes found.
                    </p>
                  ) : (
                    filteredNotes.map(note => (
                      <div
                        key={note.id}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r-md)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {note.sensitive && <span>🔒</span>}
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {note.title}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleExportNote(note)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                              title="Export Markdown"
                            >
                              📥
                            </button>
                            <button
                              onClick={() => handleEditNote(note)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden' }}>
                          {note.content}
                        </p>

                        {note.tags && note.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            {note.tags.map(tag => (
                              <span key={tag} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
