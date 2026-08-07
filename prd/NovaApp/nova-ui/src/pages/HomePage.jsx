import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useTaskStore from '../store/taskStore';
import useChatStore from '../store/chatStore';
import './HomePage.css';

const QUICK_ACTIONS = [
  { icon: '💻', label: 'Coding', desc: 'Debug & write code', mode: 'coding' },
  { icon: '📚', label: 'Learning', desc: 'Learn new concepts', mode: 'learning' },
  { icon: '🔍', label: 'Research', desc: 'Find information', mode: 'research' },
  { icon: '✍️', label: 'Writing', desc: 'Draft & edit text', mode: 'writing' },
  { icon: '🔒', label: 'Security', desc: 'Cybersecurity help', mode: 'cybersecurity' },
  { icon: '💬', label: 'General', desc: 'Chat about anything', mode: 'general' },
];

export default function HomePage() {
  const { user } = useAuthStore();
  const { tasks, loadTasks } = useTaskStore();
  const { conversations, loadConversations, setMode, newConversation } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
    loadConversations();
  }, []);

  const greeting = getGreeting();
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  );

  const handleQuickAction = (mode) => {
    setMode(mode);
    newConversation();
    navigate('/chat');
  };

  return (
    <div className="home-page">
      {/* Greeting */}
      <div className="home-greeting animate-fade-in">
        <h1>
          {greeting}, <span className="home-name">{user?.display_name || 'there'}</span>! 👋
        </h1>
        <p className="home-date">{formatDate()}</p>
      </div>

      {/* Quick Actions */}
      <section className="home-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h2 className="home-section-title">Quick Actions</h2>
        <div className="home-actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.mode}
              className="home-action-card"
              onClick={() => handleQuickAction(action.mode)}
            >
              <span className="home-action-icon">{action.icon}</span>
              <span className="home-action-label">{action.label}</span>
              <span className="home-action-desc">{action.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Today's Overview */}
      <section className="home-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <h2 className="home-section-title">Today's Overview</h2>
        <div className="home-overview-grid">
          <div className="home-stat-card" onClick={() => navigate('/tasks')}>
            <div className="home-stat-value">{pendingTasks.length}</div>
            <div className="home-stat-label">Pending Tasks</div>
          </div>
          <div className={`home-stat-card ${overdueTasks.length > 0 ? 'home-stat-alert' : ''}`} onClick={() => navigate('/tasks')}>
            <div className="home-stat-value">{overdueTasks.length}</div>
            <div className="home-stat-label">Overdue</div>
          </div>
          <div className="home-stat-card" onClick={() => navigate('/chat')}>
            <div className="home-stat-value">{conversations.length}</div>
            <div className="home-stat-label">Conversations</div>
          </div>
        </div>
      </section>

      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <section className="home-section animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="home-section-title">Recent Conversations</h2>
          <div className="home-recent-list">
            {conversations.slice(0, 3).map((conv) => (
              <button
                key={conv.conversation_id}
                className="home-recent-item"
                onClick={() => {
                  useChatStore.getState().loadConversation(conv.conversation_id);
                  navigate('/chat');
                }}
              >
                <span className="home-recent-icon">💬</span>
                <div className="home-recent-info">
                  <span className="home-recent-title">{conv.title}</span>
                  <span className="home-recent-meta">
                    {conv.message_count} messages · {new Date(conv.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="home-recent-arrow">→</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
