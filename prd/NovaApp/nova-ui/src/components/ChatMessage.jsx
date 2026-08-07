import './ChatMessage.css';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'} animate-fade-in`}>
      {!isUser && (
        <div className="chat-message-avatar">
          <div className="chat-message-avatar-orb" />
        </div>
      )}
      <div className={`chat-message-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
        <div className="chat-message-content" dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />
        <span className="chat-message-time">{time}</span>
      </div>
    </div>
  );
}

/**
 * Simple markdown-like formatting for chat messages.
 */
function formatContent(text) {
  if (!text) return '';

  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```lang\n...\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="chat-code-block"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code: `...`
  html = html.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>');

  // Bold: **...**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *...*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}
