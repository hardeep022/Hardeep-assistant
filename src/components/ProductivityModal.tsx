import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import type { TaskItem, NoteItem, TaskPriority } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductivityModal({ isOpen, onClose }: Props) {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');

  // Task form state
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskTag, setTaskTag] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');

  // Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTag, setNoteTag] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState('');

  const { tasks = [], notes = [] } = state;

  // Task filtering logic
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return tasks.filter(t => {
      if (filterStatus === 'completed') return t.status === 'completed';
      if (filterStatus === 'all') return true;
      if (t.status === 'completed') return false; // for today/upcoming/overdue only show non-completed
      if (!t.dueDate) return filterStatus === 'all';

      if (filterStatus === 'today') return t.dueDate === todayStr;
      if (filterStatus === 'overdue') return t.dueDate < todayStr;
      if (filterStatus === 'upcoming') return t.dueDate > todayStr;
      return true;
    });
  }, [tasks, filterStatus]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDesc.trim()) return;

    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      description: taskDesc.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      tags: taskTag.trim() ? [taskTag.trim()] : [],
      status: 'pending',
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_TASK', task: newTask });
    setTaskDesc('');
    setTaskTag('');
    setTaskDueDate('');
    toast.success('Task created');
  };

  const handleToggleTask = (id: string) => {
    dispatch({ type: 'TOGGLE_TASK', taskId: id });
  };

  const handleDeleteTask = (id: string) => {
    dispatch({ type: 'DELETE_TASK', taskId: id });
    toast.info('Task deleted');
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    if (editingNoteId) {
      const existing = notes.find(n => n.id === editingNoteId);
      if (existing) {
        dispatch({
          type: 'UPDATE_NOTE',
          note: {
            ...existing,
            title: noteTitle.trim(),
            content: noteContent.trim(),
            tags: noteTag.trim() ? [noteTag.trim()] : existing.tags,
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: 'ADD_NOTE', note: newNote });
      toast.success('Note created');
    }

    setNoteTitle('');
    setNoteContent('');
    setNoteTag('');
  };

  const startEditNote = (note: NoteItem) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTag(note.tags[0] || '');
  };

  const handleDeleteNote = (id: string) => {
    dispatch({ type: 'DELETE_NOTE', noteId: id });
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setNoteTitle('');
      setNoteContent('');
    }
    toast.info('Note deleted');
  };

  const filteredNotes = notes.filter(n => {
    if (!noteSearch.trim()) return true;
    const q = noteSearch.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q));
  });

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content productivity-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Productivity Hub</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Tasks, reminders, and notes organized in one place
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <button
            className={`btn-secondary${activeTab === 'tasks' ? ' active' : ''}`}
            onClick={() => setActiveTab('tasks')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-xs)',
              background: activeTab === 'tasks' ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === 'tasks' ? 'var(--accent-light)' : 'var(--text-secondary)',
              border: activeTab === 'tasks' ? '1px solid var(--border-active)' : '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            📋 Tasks ({pendingCount})
          </button>
          <button
            className={`btn-secondary${activeTab === 'notes' ? ' active' : ''}`}
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-xs)',
              background: activeTab === 'notes' ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === 'notes' ? 'var(--accent-light)' : 'var(--text-secondary)',
              border: activeTab === 'notes' ? '1px solid var(--border-active)' : '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            📝 Notes ({notes.length})
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {activeTab === 'tasks' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Progress Card */}
              <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Overall Completion</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{progressPct}% ({completedCount}/{tasks.length})</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Add Task Form */}
              <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--r-xs)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="low">🟢 Low Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="high">🟠 High Priority</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>

                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Tag (e.g. Work, Study)"
                    value={taskTag}
                    onChange={e => setTaskTag(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      flex: 1,
                      minWidth: '120px',
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 16px',
                      borderRadius: 'var(--r-xs)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Task
                  </button>
                </div>
              </form>

              {/* Task Filters */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'today', 'upcoming', 'overdue', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterStatus(tab)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--r-full)',
                      border: '1px solid ' + (filterStatus === tab ? 'var(--accent)' : 'var(--border)'),
                      background: filterStatus === tab ? 'var(--accent-dim)' : 'transparent',
                      color: filterStatus === tab ? 'var(--accent-light)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Task List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '13px' }}>
                    No tasks in this view.
                  </div>
                ) : (
                  filteredTasks.map(task => {
                    const isDone = task.status === 'completed';
                    const priorityColors: Record<TaskPriority, string> = {
                      low: '#38bdf8',
                      medium: '#facc15',
                      high: '#fb923c',
                      urgent: '#f87171',
                    };

                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--border)',
                          opacity: isDone ? 0.65 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleTask(task.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                              {task.description}
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px' }}>
                              <span style={{ color: priorityColors[task.priority], fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                                ● {task.priority}
                              </span>
                              {task.dueDate && (
                                <span style={{ color: 'var(--text-secondary)' }}>📅 {task.dueDate}</span>
                              )}
                              {task.tags.map(t => (
                                <span key={t} style={{ background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Notes Tab */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Note Editor */}
              <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editingNoteId ? 'Edit Note' : 'Create New Note'}
                </div>
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--r-xs)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
                <input
                  type="text"
                  placeholder="Tag (e.g. Ideas, Project)"
                  value={noteTag}
                  onChange={e => setNoteTag(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--r-xs)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <textarea
                  placeholder="Write your note content here (markdown supported)..."
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  rows={6}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--r-xs)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {editingNoteId && (
                    <button
                      type="button"
                      onClick={() => { setEditingNoteId(null); setNoteTitle(''); setNoteContent(''); setNoteTag(''); }}
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: 'var(--r-xs)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 'var(--r-xs)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {editingNoteId ? 'Update Note' : 'Save Note'}
                  </button>
                </div>
              </form>

              {/* Note List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={e => setNoteSearch(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--r-xs)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                  {filteredNotes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '12px' }}>
                      No notes created yet.
                    </div>
                  ) : (
                    filteredNotes.map(note => (
                      <div
                        key={note.id}
                        onClick={() => startEditNote(note)}
                        style={{
                          padding: '10px',
                          background: editingNoteId === note.id ? 'var(--accent-dim)' : 'var(--bg-card)',
                          borderRadius: 'var(--r-xs)',
                          border: '1px solid ' + (editingNoteId === note.id ? 'var(--accent)' : 'var(--border)'),
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{note.title}</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                            title="Delete note"
                          >
                            🗑️
                          </button>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {note.content || 'Empty note'}
                        </p>
                        {note.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                            {note.tags.map(t => (
                              <span key={t} style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                                #{t}
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
