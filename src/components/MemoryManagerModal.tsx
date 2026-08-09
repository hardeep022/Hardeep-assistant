import { useEffect, useState } from 'react';
import { memoryService } from '../services/memoryService';
import type { MemoryItem, MemoryType } from '../types';

interface Props {
  onClose: () => void;
}

export function MemoryManagerModal({ onClose }: Props) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<MemoryType>('long_term');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await memoryService.getMemories();
    setMemories(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    await memoryService.saveMemory({
      key: newKey.trim(),
      value: newValue.trim(),
      type: newType,
      category: newType === 'user_preference' ? 'Preference' : 'General',
    });
    setNewKey('');
    setNewValue('');
    await load();
  };

  const handleDelete = async (id: string) => {
    await memoryService.deleteMemory(id);
    await load();
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all stored memories?')) {
      await memoryService.clearMemories();
      await load();
    }
  };

  const filtered = memories.filter(m => {
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesSearch =
      m.key.toLowerCase().includes(search.toLowerCase()) ||
      m.value.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🧠</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Nova Real Memory Engine
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Long-Term Memory & User Preferences Store ({memories.length} items)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add New Memory Bar */}
          <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-light)', display: 'block', marginBottom: '8px' }}>
              + Add Custom Memory Item
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as MemoryType)}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-xs)',
                  padding: '6px 10px',
                  fontSize: '12px',
                }}
              >
                <option value="long_term">Long Term Fact</option>
                <option value="user_preference">User Preference</option>
                <option value="project">Project Memory</option>
                <option value="task">Task Context</option>
              </select>

              <input
                type="text"
                placeholder="Key (e.g. Preferred Language)"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-xs)',
                  padding: '6px 10px',
                  fontSize: '12px',
                }}
              />

              <input
                type="text"
                placeholder="Value (e.g. TypeScript / Punjabi)"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '160px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-xs)',
                  padding: '6px 10px',
                  fontSize: '12px',
                }}
              />

              <button
                onClick={handleAdd}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r-xs)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: '8px 12px',
                fontSize: '13px',
              }}
            />

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: '8px 12px',
                fontSize: '13px',
              }}
            >
              <option value="all">All Categories</option>
              <option value="long_term">Long Term</option>
              <option value="user_preference">Preferences</option>
              <option value="project">Project</option>
              <option value="task">Task</option>
            </select>
          </div>

          {/* Memory Item Cards */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading memories...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No memory items stored yet. Teach Nova using chat (e.g. <em>"Remember that..."</em>) or add one above!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: m.type === 'user_preference' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)',
                          color: m.type === 'user_preference' ? '#ec4899' : '#3b82f6',
                        }}
                      >
                        {m.type}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{m.key}</strong>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '2px' }}>{m.value}</span>
                  </div>

                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' }}
                    title="Delete Memory"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <button
            onClick={handleClearAll}
            disabled={memories.length === 0}
            style={{
              background: 'none',
              border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--error)',
              borderRadius: 'var(--r-xs)',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              opacity: memories.length === 0 ? 0.5 : 1,
            }}
          >
            Clear All Memories
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r-xs)',
              padding: '6px 18px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
