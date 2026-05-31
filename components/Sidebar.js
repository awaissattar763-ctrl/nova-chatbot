import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const sidebarVariants = {
  open:   { x: 0,    opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 220 } },
  closed: { x: -260, opacity: 0, transition: { type: 'spring', damping: 28, stiffness: 220 } },
};

export default function Sidebar({
  isOpen, conversations, activeId, searchQuery,
  onNew, onSelect, onDelete, onRename, onSettings, onSearch, onClose,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal,  setRenameVal]  = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (c, e) => {
    e.stopPropagation();
    setRenamingId(c.id);
    setRenameVal(c.title);
  };

  const commitRename = (id) => {
    if (renameVal.trim()) onRename(id, renameVal.trim());
    setRenamingId(null);
  };

  const groupedConvs = (() => {
    const now = Date.now();
    const day  = 86400000;
    const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };
    filtered.forEach((c) => {
      const diff = now - c.updatedAt;
      if (diff < day)       groups['Today'].push(c);
      else if (diff < 2*day)  groups['Yesterday'].push(c);
      else if (diff < 7*day)  groups['Last 7 Days'].push(c);
      else                  groups['Older'].push(c);
    });
    return groups;
  })();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ zIndex: 40 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.div
        className="sidebar"
        key="sidebar-panel"
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -260, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        style={{ zIndex: 50 }}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">✦</div>
          <span className="sidebar-title">Nova</span>
          <button className="sidebar-close-btn" onClick={onClose} title="Close sidebar">✕</button>
        </div>

        {/* New Chat */}
        <button className="new-chat-btn" onClick={onNew}>
          <span style={{ fontSize: 18 }}>＋</span> New Chat
        </button>

        {/* Search */}
        <input
          className="sidebar-search"
          type="text"
          placeholder="🔍  Search conversations…"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />

        {/* Conversation list */}
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No conversations yet.<br />Start a new chat above!
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No results for "{searchQuery}"
            </div>
          ) : (
            Object.entries(groupedConvs).map(([group, items]) =>
              items.length > 0 ? (
                <div key={group}>
                  <div className="sidebar-section-label">{group}</div>
                  <AnimatePresence initial={false}>
                    {items.map((c) => (
                      <motion.div
                        key={c.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`conv-item${c.id === activeId ? ' active' : ''}`}
                        onClick={() => onSelect(c.id)}
                      >
                        <span className="conv-item-icon">💬</span>

                        {renamingId === c.id ? (
                          <input
                            className="conv-item-title-input"
                            value={renameVal}
                            autoFocus
                            onChange={(e) => setRenameVal(e.target.value)}
                            onBlur={() => commitRename(c.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(c.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="conv-item-title" title={c.title}>{c.title}</span>
                        )}

                        <div className="conv-actions">
                          <button
                            className="conv-action-btn"
                            onClick={(e) => startRename(c, e)}
                            title="Rename"
                          >✏️</button>
                          <button
                            className="conv-action-btn delete"
                            onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                            title="Delete"
                          >🗑</button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : null
            )
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="settings-btn" onClick={onSettings}>
            <span>⚙️</span> Settings
          </button>
        </div>
      </motion.div>
    </>
  );
}
