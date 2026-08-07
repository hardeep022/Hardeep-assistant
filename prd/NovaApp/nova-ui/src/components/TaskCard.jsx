import './TaskCard.css';

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export default function TaskCard({ task, onComplete, onDelete }) {
  const isCompleted = task.status === 'completed';
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`task-card ${isCompleted ? 'task-card-completed' : ''} ${isOverdue ? 'task-card-overdue' : ''} animate-fade-in`}>
      <button
        className={`task-checkbox ${isCompleted ? 'task-checkbox-done' : ''}`}
        onClick={() => onComplete(task.task_id)}
        title={isCompleted ? 'Completed' : 'Mark as complete'}
      >
        {isCompleted && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div className="task-card-body">
        <p className={`task-description ${isCompleted ? 'task-description-done' : ''}`}>
          {task.description}
        </p>
        <div className="task-meta">
          <span className={`badge badge-${task.priority}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.due_date && (
            <span className={`task-due ${isOverdue ? 'task-due-overdue' : ''}`}>
              📅 {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <button
        className="task-delete"
        onClick={() => onDelete(task.task_id)}
        title="Delete task"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
