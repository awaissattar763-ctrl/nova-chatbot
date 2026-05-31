import { motion } from 'framer-motion';

export default function SettingsModal({ onClose, onClearAll, totalConversations, totalMessages }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      >
        <div className="modal-header">
          <span className="modal-title">⚙️ Settings</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* About */}
          <div className="modal-section">
            <div className="modal-label">About Nova</div>
            <div className="modal-info">
              <strong style={{ color: 'var(--text)' }}>Nova v2.0</strong><br />
              AI-powered by <span style={{ color: '#f59e0b' }}>Groq ⚡</span> using <code style={{ fontSize: 12 }}>llama-3.3-70b-versatile</code>.<br />
              Premium interface with streaming responses and local chat history.
            </div>
          </div>

          {/* Stats */}
          <div className="modal-section">
            <div className="modal-label">Your Data</div>
            <div className="modal-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>{totalConversations}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Conversations</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--blue)' }}>{totalMessages}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Messages</div>
              </div>
            </div>
          </div>

          {/* Storage note */}
          <div className="modal-section">
            <div className="modal-label">Storage</div>
            <div className="modal-info" style={{ fontSize: 12 }}>
              All conversations are stored locally in your browser via <code style={{ fontSize: 11 }}>localStorage</code>.
              Nothing is sent to any server except your messages to the Groq API.
            </div>
          </div>

          {/* Danger zone */}
          <div className="modal-section">
            <div className="modal-label">Danger Zone</div>
            <button
              className="modal-btn danger"
              onClick={() => {
                if (confirm('Delete all conversations? This cannot be undone.')) {
                  onClearAll();
                  onClose();
                }
              }}
            >
              🗑 Clear All Conversations
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
