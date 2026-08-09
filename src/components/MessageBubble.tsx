import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../types';
import { ThinkingDots } from './ThinkingDots';
import { CodePreviewModal } from './CodePreviewModal';
import { useTTS } from '../hooks/useTTS';

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
  onRegenerate?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
}

const RUNNABLE_LANGS = ['html', 'css', 'js', 'javascript', 'ts', 'typescript', 'svg', 'xml', 'python', 'py'];

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const langLower = (language || '').toLowerCase();
  const isRunnable = RUNNABLE_LANGS.includes(langLower);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{language || 'text'}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRunnable && (
            <button
              className="copy-btn"
              onClick={() => setShowPreview(true)}
              style={{ color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(124,58,237,0.15)' }}
              title="Run and preview output"
            >
              ▶ Run / Preview
            </button>
          )}

          <button
            className={`copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? (
              <>✓ Copied</>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 var(--r-sm) var(--r-sm)',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
      >
        {code}
      </SyntaxHighlighter>

      {showPreview && (
        <CodePreviewModal
          code={code}
          language={language}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MessageBubble = memo(function MessageBubble({ message, isStreaming, streamingContent, onRegenerate, onEdit, onDelete }: Props) {
  const isUser = message.role === 'user';
  const isThinking = !isUser && isStreaming && !streamingContent;
  const content = (!isUser && isStreaming) ? streamingContent || '' : message.content;
  const { speakingId, speak } = useTTS();

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const isSpeaking = speakingId === message.id;

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) return;
    setIsEditing(false);
    onEdit?.(message.id, editValue.trim());
  };

  return (
    <div className={`msg-row ${message.role}`}>
      {/* Avatar */}
      <div className={`msg-avatar ${message.role}`}>
        {isUser ? '👤' : '✦'}
      </div>

      {/* Body */}
      <div className="msg-body">
        <div className={`msg-bubble${message.isError ? ' error' : ''}`}>
          {isThinking ? (
            <ThinkingDots />
          ) : isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: '280px' }}>
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--r-sm)',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '60px',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setIsEditing(false); setEditValue(message.content); }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 'var(--r-xs)', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: 'var(--r-xs)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : isUser ? (
            <span className="msg-content">{content}</span>
          ) : (
            <div className="msg-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const code = String(children).replace(/\n$/, '');
                    const isMultiline = code.includes('\n');
                    if (!inline && (match || isMultiline)) {
                      return <CodeBlock language={match ? match[1] : ''} code={code} />;
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '14px',
                    background: 'var(--accent-light)',
                    marginLeft: '2px',
                    borderRadius: '1px',
                    animation: 'cursor-blink 1s ease infinite',
                    verticalAlign: 'text-bottom',
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Meta & Action Controls */}
        {!isStreaming && !isEditing && (
          <div className="msg-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span>{formatTime(message.timestamp)}</span>
            {message.model && (
              <>
                <span>·</span>
                <span>{message.model}</span>
              </>
            )}

            {/* Read Aloud */}
            {!isUser && content && (
              <>
                <span>·</span>
                <button
                  onClick={() => speak(message.id, content)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isSpeaking ? 'var(--accent-light)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  }}
                  title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                >
                  {isSpeaking ? '🔊 Speaking…' : '🔈 Read'}
                </button>
              </>
            )}

            {/* Copy Action */}
            {content && (
              <>
                <span>·</span>
                <button
                  onClick={handleCopyText}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copied ? 'var(--success)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  }}
                  title="Copy message content"
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </>
            )}

            {/* Edit User Message */}
            {isUser && onEdit && (
              <>
                <span>·</span>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
                  title="Edit prompt and resend"
                >
                  ✏️ Edit
                </button>
              </>
            )}

            {/* Regenerate Assistant Message */}
            {!isUser && onRegenerate && (
              <>
                <span>·</span>
                <button
                  onClick={() => onRegenerate(message.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
                  title="Regenerate AI response"
                >
                  🔄 Regenerate
                </button>
              </>
            )}

            {/* Delete Message */}
            {onDelete && (
              <>
                <span>·</span>
                <button
                  onClick={() => onDelete(message.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
                  title="Delete message"
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
});
