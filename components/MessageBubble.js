import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="code-block-wrap">
      <div className="code-header">
        <span className="code-lang">{language || 'code'}</span>
        <button className={`code-copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 12px 12px',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: 'none',
          fontSize: 13,
          lineHeight: 1.6,
        }}
        showLineNumbers={code.split('\n').length > 4}
        lineNumberStyle={{ color: 'rgba(255,255,255,0.2)', minWidth: '2.5em' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    const lang = (className || '').replace('language-', '');
    if (inline) return <code className={className} {...props}>{children}</code>;
    return <CodeBlock language={lang}>{children}</CodeBlock>;
  },
  a({ href, children }) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
};

export default function MessageBubble({
  msg, isNew, isStreaming, isLast,
  onCopy, onRegenerate,
}) {
  const [btnCopied, setBtnCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copyMsg = async () => {
    await navigator.clipboard.writeText(msg.content);
    setBtnCopied(true);
    setTimeout(() => setBtnCopied(false), 1800);
    if (onCopy) onCopy();
  };

  return (
    <motion.div
      className={`msg-row ${isUser ? 'user' : 'assistant'}`}
      initial={isNew ? { opacity: 0, y: 16, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      layout="position"
    >
      {/* Avatar */}
      <div className={`msg-avatar ${isUser ? 'user-av' : 'nova-av'}`}>
        {isUser ? '🧑' : '✦'}
      </div>

      {/* Content */}
      <div className="msg-content-wrap">
        <div className={`msg-bubble ${isUser ? 'user-bubble' : 'nova-bubble'}`}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
          ) : (
            <div className="md-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={mdComponents}
              >
                {msg.content || ''}
              </ReactMarkdown>
              {/* Streaming cursor */}
              {isStreaming && isLast && (
                <span className="stream-cursor" />
              )}
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="msg-meta">
          <span className="msg-time">
            {msg.time ? formatTime(msg.time) : ''}
          </span>

          <div className="msg-actions">
            <button
              className={`msg-action-btn${btnCopied ? ' copied' : ''}`}
              onClick={copyMsg}
              title="Copy"
            >
              {btnCopied ? '✓' : '⎘'}
            </button>

            {!isUser && isLast && !isStreaming && onRegenerate && (
              <button
                className="msg-action-btn"
                onClick={onRegenerate}
                title="Regenerate"
              >
                ↻
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
