import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "🔥", "🤯", "👏"];

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, padding: "14px 18px", alignItems: "center" }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: "50%",
        background: "linear-gradient(135deg, #f59e0b, #ef4444)",
        animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
      }} />
    ))}
  </div>
);

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} title="Copy" style={{
      background: "transparent", border: "none", cursor: "pointer",
      color: copied ? "#34d399" : "rgba(255,255,255,0.3)",
      fontSize: 15, padding: "3px 6px", borderRadius: 4, transition: "color 0.2s",
    }}>
      {copied ? "✓" : "⎘"}
    </button>
  );
};

const Message = ({ msg, isNew, onReact }) => {
  const isUser = msg.role === "user";
  const [showActions, setShowActions] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false); }}
      style={{
        display: "flex", flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 22,
        animation: isNew ? "msgIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexDirection: isUser ? "row-reverse" : "row" }}>
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: isUser ? "linear-gradient(135deg, #1e293b, #334155)" : "linear-gradient(135deg, #f59e0b, #ef4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, boxShadow: isUser ? "none" : "0 0 16px rgba(245,158,11,0.4)",
          border: isUser ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}>
          {isUser ? "🧑" : "✦"}
        </div>

        {/* Bubble */}
        <div style={{ maxWidth: "68%", position: "relative" }}>
          <div style={{
            padding: "13px 17px",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isUser ? "linear-gradient(135deg, #1d4ed8, #2563eb)" : "rgba(255,255,255,0.07)",
            border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
            color: "#f8fafc", fontSize: 14, lineHeight: 1.65,
            boxShadow: isUser ? "0 4px 24px rgba(37,99,235,0.35)" : "0 2px 16px rgba(0,0,0,0.25)",
            backdropFilter: "blur(12px)",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {msg.content}
          </div>

          {msg.reactions && msg.reactions.length > 0 && (
            <div style={{
              position: "absolute", bottom: -16,
              ...(isUser ? { left: 0 } : { right: 0 }),
              display: "flex", gap: 3,
            }}>
              {msg.reactions.map((r, i) => (
                <span key={i} style={{
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10, padding: "1px 6px", fontSize: 13,
                  backdropFilter: "blur(8px)",
                }}>{r}</span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: showActions ? 1 : 0, transition: "opacity 0.15s" }}>
          <CopyBtn text={msg.content} />
          <button onClick={() => setShowEmojis(!showEmojis)} style={{
            background: "transparent", border: "none", cursor: "pointer",
            fontSize: 14, color: "rgba(255,255,255,0.3)", padding: "3px 5px",
          }} title="React">😊</button>
        </div>
      </div>

      {showEmojis && (
        <div style={{
          display: "flex", gap: 6, marginTop: 8,
          ...(isUser ? { marginRight: "44px" } : { marginLeft: "44px" }),
          background: "rgba(10,12,22,0.95)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20, padding: "6px 12px",
          backdropFilter: "blur(16px)", boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.15s ease",
        }}>
          {EMOJI_REACTIONS.map((e) => (
            <button key={e} onClick={() => { onReact(e); setShowEmojis(false); }} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 19, transition: "transform 0.15s", padding: 2,
            }}
              onMouseEnter={(ev) => ev.target.style.transform = "scale(1.35)"}
              onMouseLeave={(ev) => ev.target.style.transform = "scale(1)"}
            >{e}</button>
          ))}
        </div>
      )}

      <span style={{
        fontSize: 10, color: "rgba(255,255,255,0.2)",
        marginTop: msg.reactions?.length > 0 ? 22 : 7,
        ...(isUser ? { marginRight: "44px" } : { marginLeft: "44px" }),
        letterSpacing: 0.4,
      }}>
        {msg.sender} · {formatTime(msg.time)}
      </span>
    </div>
  );
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [newMsgIdx, setNewMsgIdx] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 500;
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || charCount > MAX_CHARS) return;

    const userMsg = { role: "user", content: text, time: Date.now(), sender: "You", reactions: [] };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setNewMsgIdx(updated.length - 1);
    setInput(""); setCharCount(0); setLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const initialAssistantMsg = { role: "assistant", content: "", time: Date.now(), sender: "Nova", reactions: [] };
      setMessages((prev) => [...prev, initialAssistantMsg]);
      setNewMsgIdx(updated.length);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: newMsgs[lastIdx].content + chunk };
            return newMsgs;
          });
        }
      }
    } catch (error) {
      setMessages((prev) => {
        // If we already added the assistant message placeholder, update it
        if (prev.length > updated.length) {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = "⚠️ Connection error. Please try again.";
          return newMsgs;
        }
        return [...updated, { role: "assistant", content: "⚠️ Connection error. Please try again.", time: Date.now(), sender: "Nova", reactions: [] }];
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReact = (idx, emoji) => {
    setMessages((prev) => prev.map((m, i) => {
      if (i !== idx) return m;
      const r = m.reactions || [];
      return { ...m, reactions: r.includes(emoji) ? r.filter((x) => x !== emoji) : [...r, emoji] };
    }));
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    setCharCount(e.target.value.length);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const suggestions = [
    { icon: "🎲", text: "Tell me something surprising" },
    { icon: "💡", text: "Give me a creative idea" },
    { icon: "🌍", text: "Explain quantum physics simply" },
    { icon: "✍️", text: "Write a haiku about AI" },
  ];

  return (
    <>
      <Head>
        <title>Nova — AI Assistant</title>
        <meta name="description" content="Nova: Your intelligent AI companion powered by Groq" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>" />
      </Head>

      <div style={{
        minHeight: "100vh", background: "#080b14",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, position: "relative", overflow: "hidden",
      }}>

        {/* Background orbs */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", top: "-10%", left: "-10%", animation: "orb1 12s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)", bottom: "-5%", right: "-5%", animation: "orb2 10s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)", top: "40%", right: "20%", animation: "orb1 15s ease-in-out 3s infinite" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        </div>

        {/* Chat window */}
        <div style={{
          width: "100%", maxWidth: 700, height: "90vh",
          display: "flex", flexDirection: "column",
          background: "rgba(8,11,20,0.88)",
          border: "1px solid rgba(245,158,11,0.18)",
          borderRadius: 22, overflow: "hidden",
          backdropFilter: "blur(28px)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 90px rgba(0,0,0,0.75), 0 0 100px rgba(245,158,11,0.05)",
          position: "relative",
        }}>

          {/* Header */}
          <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 0 24px rgba(245,158,11,0.4)" }}>✦</div>
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, borderRadius: "50%", background: "#22c55e", border: "2px solid #080b14", animation: "pulse 2.5s ease-in-out infinite" }} />
            </div>
            <div>
              <div style={{ color: "#fef3c7", fontWeight: 700, fontSize: 18 }}>Nova</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>AI Assistant · Powered by Groq ⚡</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {messages.length > 0 && (
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 20, padding: "4px 10px", color: "#f59e0b", fontSize: 12 }}>
                  {messages.length} msg{messages.length !== 1 ? "s" : ""}
                </div>
              )}
              {messages.length > 0 && !showClearConfirm && (
                <button onClick={() => setShowClearConfirm(true)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "6px 12px", color: "#f87171", fontSize: 12, cursor: "pointer" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                >🗑 Clear</button>
              )}
              {showClearConfirm && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setMessages([]); setShowClearConfirm(false); }} style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "6px 10px", color: "#f87171", fontSize: 12, cursor: "pointer" }}>Sure?</button>
                  <button onClick={() => setShowClearConfirm(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Nah</button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 30, animation: "fadeIn 0.4s ease" }}>
                <div style={{ width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px", background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, boxShadow: "0 0 40px rgba(245,158,11,0.3)" }}>✦</div>
                <div style={{ color: "#fef3c7", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Hey, I'm Nova ✦</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
                  Sharp, curious, and always ready to help.<br />What&apos;s on your mind?
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                  {suggestions.map((s) => (
                    <button key={s.text} className="sug-btn"
                      onClick={() => { setInput(s.text); setCharCount(s.text.length); inputRef.current?.focus(); }}
                      style={{ padding: "10px 16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, color: "#fcd34d", fontSize: 13, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{s.icon}</span> {s.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <Message key={i} msg={msg} isNew={i === newMsgIdx} onReact={(emoji) => handleReact(i, emoji)} />
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, animation: "msgIn 0.3s ease" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, boxShadow: "0 0 16px rgba(245,158,11,0.4)" }}>✦</div>
                <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px 18px 18px 4px", backdropFilter: "blur(12px)" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${charCount > MAX_CHARS ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.2)"}`,
              borderRadius: 14, padding: "10px 12px", transition: "border-color 0.2s",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask Nova anything..."
                rows={1}
                style={{ flex: 1, background: "transparent", border: "none", color: "#f8fafc", fontSize: 14, lineHeight: 1.55, maxHeight: 120, overflowY: "auto", fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                {input.length > 0 && (
                  <span style={{ fontSize: 10, color: charCount > MAX_CHARS ? "#f87171" : "rgba(255,255,255,0.2)", letterSpacing: 0.3 }}>{charCount}/{MAX_CHARS}</span>
                )}
                <button className="send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || charCount > MAX_CHARS}
                  style={{
                    width: 38, height: 38, borderRadius: 11, border: "none",
                    background: input.trim() && !loading && charCount <= MAX_CHARS ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "rgba(255,255,255,0.08)",
                    cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: loading ? 15 : 18, transition: "all 0.2s", color: "#fff",
                    boxShadow: input.trim() && !loading ? "0 0 20px rgba(245,158,11,0.35)" : "none",
                  }}>
                  {loading
                    ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                    : "↑"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, paddingInline: 2 }}>
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>Shift + Enter for new line</span>
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>Nova · Powered by Groq ⚡</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
