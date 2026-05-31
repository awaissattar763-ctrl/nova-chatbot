import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import SettingsModal from '../components/SettingsModal';

/* ─── Helpers ──────────────────────────────────────────────────────── */
const genId = () => Math.random().toString(36).slice(2, 10);

const makeTitle = (text) => {
  const clean = text.trim().replace(/\n/g, ' ');
  return clean.length > 36 ? clean.slice(0, 36) + '…' : clean;
};

const STORAGE_KEY = 'nova_v2_conversations';

const loadConversations = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveConversations = (convs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch {}
};

const SUGGESTIONS = [
  { icon: '🎲', text: 'Tell me something surprising' },
  { icon: '💡', text: 'Give me a creative idea' },
  { icon: '🌍', text: 'Explain quantum entanglement simply' },
  { icon: '✍️', text: 'Write a haiku about the future of AI' },
];

/* ─── Typing Indicator ─────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <motion.div
      className="msg-row assistant"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="msg-avatar nova-av">✦</div>
      <div className="msg-bubble nova-bubble">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Aurora Background ────────────────────────────────────────────── */
function AuroraBackground() {
  return (
    <div className="aurora-wrap">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="aurora-blob aurora-blob-5" />
      <div className="aurora-grid" />
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */
export default function Home() {
  const [conversations, setConversations] = useState([]);
  const [activeId,      setActiveId]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [isStreaming,   setIsStreaming]   = useState(false);
  const [newMsgIdx,     setNewMsgIdx]     = useState(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [showSettings,  setShowSettings]  = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [charCount,     setCharCount]     = useState(0);

  const MAX_CHARS   = 2000;
  const abortRef    = useRef(null);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /* ── Load from localStorage ── */
  useEffect(() => {
    const saved = loadConversations();
    setConversations(saved);
    if (saved.length > 0) {
      setActiveId(saved[0].id);
      setMessages(saved[0].messages);
    }
    // Default sidebar open on desktop, closed on mobile
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  /* ── Persist to localStorage ── */
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* ── Sync messages into active conversation ── */
  const syncMessages = useCallback((msgs, convId) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: msgs, updatedAt: Date.now() } : c
      )
    );
  }, []);

  /* ─── Conversation Management ─────────────────────────────────── */
  const createNewChat = () => {
    const id   = genId();
    const conv = { id, title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    setMessages([]);
    setInput(''); setCharCount(0);
    if (window.innerWidth < 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectConversation = (id) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setActiveId(id);
    setMessages(conv.messages);
    setInput(''); setCharCount(0);
    if (window.innerWidth < 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteConversation = (id) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConversations(next);
      return next;
    });
    if (id === activeId) {
      const rest = conversations.filter((c) => c.id !== id);
      if (rest.length > 0) {
        setActiveId(rest[0].id);
        setMessages(rest[0].messages);
      } else {
        setActiveId(null);
        setMessages([]);
      }
    }
  };

  const renameConversation = (id, title) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  };

  const clearAll = () => {
    setConversations([]);
    setActiveId(null);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  /* ─── Send / Stream ───────────────────────────────────────────── */
  const sendMessage = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || isLoading || charCount > MAX_CHARS) return;

    // Ensure there's an active conversation
    let convId = activeId;
    if (!convId) {
      const id   = genId();
      const conv = { id, title: makeTitle(text), messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(id);
      convId = id;
    }

    const userMsg = {
      id: genId(), role: 'user', content: text,
      time: Date.now(),
    };

    const updatedMsgs = [...messagesRef.current, userMsg];
    setMessages(updatedMsgs);
    setNewMsgIdx(updatedMsgs.length - 1);
    setInput(''); setCharCount(0);
    setIsLoading(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Update conversation title from first user message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId && c.title === 'New Chat'
          ? { ...c, title: makeTitle(text), messages: updatedMsgs, updatedAt: Date.now() }
          : c.id === convId
          ? { ...c, messages: updatedMsgs, updatedAt: Date.now() }
          : c
      )
    );

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Create assistant placeholder
      const assistantMsg = { id: genId(), role: 'assistant', content: '', time: Date.now() };
      const withAssistant = [...updatedMsgs, assistantMsg];
      setMessages(withAssistant);
      setNewMsgIdx(withAssistant.length - 1);
      setIsLoading(false);
      setIsStreaming(true);

      // Read stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next    = [...prev];
            const lastIdx = next.length - 1;
            next[lastIdx] = { ...next[lastIdx], content: next[lastIdx].content + chunk };
            return next;
          });
        }
      }

      // Persist final messages
      setMessages((final) => {
        syncMessages(final, convId);
        return final;
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        // User stopped — keep whatever was streamed
        setMessages((current) => {
          syncMessages(current, convId);
          return current;
        });
      } else {
        const errMsg = {
          id: genId(), role: 'assistant',
          content: `⚠️ **Error:** ${err.message}\n\nPlease try again.`,
          time: Date.now(),
        };
        setMessages((prev) => {
          const withErr = prev.length > updatedMsgs.length
            ? prev.map((m, i) => i === prev.length - 1 ? errMsg : m)
            : [...prev, errMsg];
          syncMessages(withErr, convId);
          return withErr;
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const regenerate = () => {
    // Find last user message
    const userMsgs = messages.filter((m) => m.role === 'user');
    if (userMsgs.length === 0) return;
    const lastUserMsg = userMsgs[userMsgs.length - 1];
    // Remove last assistant message if present
    const trimmed = messages[messages.length - 1]?.role === 'assistant'
      ? messages.slice(0, -1) : messages;
    setMessages(trimmed);
    sendMessage(lastUserMsg.content);
  };

  /* ─── Input Handlers ──────────────────────────────────────────── */
  const handleInput = (e) => {
    setInput(e.target.value);
    setCharCount(e.target.value.length);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ─── Derived ─────────────────────────────────────────────────── */
  const totalMessages = conversations.reduce((s, c) => s + c.messages.length, 0);
  const currentConv   = conversations.find((c) => c.id === activeId);

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <>
      <Head>
        <title>Nova — Premium AI Assistant</title>
        <meta name="description" content="Nova: Your intelligent AI companion powered by Groq. Premium chat experience with streaming responses." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>"
        />
      </Head>

      <AuroraBackground />

      <div className="nova-layout">
        {/* ── Sidebar ── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <Sidebar
              isOpen={sidebarOpen}
              conversations={conversations}
              activeId={activeId}
              searchQuery={searchQuery}
              onNew={createNewChat}
              onSelect={selectConversation}
              onDelete={deleteConversation}
              onRename={renameConversation}
              onSettings={() => setShowSettings(true)}
              onSearch={setSearchQuery}
              onClose={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Chat Area ── */}
        <div className="chat-area">
          {/* Header */}
          <div className="chat-header">
            <button
              className="chat-header-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              title="Toggle sidebar"
            >
              ☰
            </button>

            <div className="chat-header-avatar">✦</div>

            <div className="chat-header-info">
              <div className="chat-header-name">
                {currentConv?.title && currentConv.title !== 'New Chat'
                  ? currentConv.title
                  : 'Nova'}
              </div>
              <div className="chat-header-sub">
                Powered by Groq ⚡ · llama-3.3-70b-versatile
              </div>
            </div>

            <div className="chat-header-status" title="Online" />

            {messages.length > 0 && (
              <div className="msg-count-badge">
                {messages.length} msg{messages.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="messages-area" id="messages-scroll">
            {messages.length === 0 ? (
              <motion.div
                className="welcome-screen"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="welcome-icon">✦</div>
                <h1 className="welcome-title">Hey, I'm Nova ✦</h1>
                <p className="welcome-sub">
                  Sharp, curious, and always ready to help.<br />
                  What's on your mind?
                </p>
                <div className="suggestions-grid">
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s.text}
                      className="suggestion-card"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInput(s.text);
                        setCharCount(s.text.length);
                        inputRef.current?.focus();
                      }}
                    >
                      <span className="suggestion-icon">{s.icon}</span>
                      <span className="suggestion-text">{s.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id || i}
                    msg={msg}
                    isNew={i === newMsgIdx}
                    isStreaming={isStreaming}
                    isLast={i === messages.length - 1}
                    onRegenerate={i === messages.length - 1 ? regenerate : undefined}
                  />
                ))}
              </AnimatePresence>
            )}

            {/* Typing indicator (before stream starts) */}
            <AnimatePresence>
              {isLoading && !isStreaming && <TypingIndicator />}
            </AnimatePresence>

            <div ref={bottomRef} style={{ height: 1 }} />
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-wrap">
              <textarea
                ref={inputRef}
                id="chat-input"
                className="input-textarea"
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask Nova anything…"
                rows={1}
                disabled={isLoading}
              />

              <div className="input-right">
                {input.length > 0 && (
                  <span className={`char-counter${charCount > MAX_CHARS ? ' over' : ''}`}>
                    {charCount}/{MAX_CHARS}
                  </span>
                )}

                {isStreaming ? (
                  <motion.button
                    className="stop-btn"
                    onClick={stopGeneration}
                    title="Stop generation"
                    whileTap={{ scale: 0.9 }}
                  >
                    ■
                  </motion.button>
                ) : (
                  <motion.button
                    id="send-btn"
                    className="send-btn"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading || charCount > MAX_CHARS}
                    title="Send message"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                  >
                    {isLoading
                      ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                      : '↑'}
                  </motion.button>
                )}
              </div>
            </div>

            <div className="input-footer">
              <span className="input-hint">Shift + Enter for new line</span>
              <span className="input-hint">Nova · Groq ⚡</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onClearAll={clearAll}
            totalConversations={conversations.length}
            totalMessages={totalMessages}
          />
        )}
      </AnimatePresence>
    </>
  );
}
