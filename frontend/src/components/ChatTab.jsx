import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';
import Modal from './Modal';

const COMMUNITY_CHANNELS = [
  { id: 'general',       label: '🌐 General',       desc: 'All topics welcome' },
  { id: 'code-and-tech', label: '💻 Code & Tech',    desc: 'Technical discussions' },
  { id: 'interview-prep',label: '🎯 Interview Prep', desc: 'Interview tips & questions' },
  { id: 'barter-hub',    label: '🤝 Barter Hub',     desc: 'Find barter partners' },
];

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatChatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatTab({ initialTarget, onClearTarget, onUnreadChange }) {
  const { currentUser, token } = useAuth();
  const [mode, setMode] = useState('community'); // 'community' | 'direct'
  const [activeChannel, setActiveChannel] = useState('general');
  const [communityMessages, setCommunityMessages] = useState([]);
  const [communityInput, setCommunityInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const [activeChatName, setActiveChatName] = useState('');
  const [directMessages, setDirectMessages] = useState([]);
  const [directInput, setDirectInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [directory, setDirectory] = useState([]);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const communityMsgRef = useRef(null);
  const directMsgRef = useRef(null);
  const pollTimerRef = useRef(null);

  // ── Load community messages when channel changes ──────────────────────────
  const loadCommunityMessages = useCallback(async (channel = activeChannel) => {
    try {
      const msgs = await chatApi.communityMessages(channel);
      setCommunityMessages(msgs);
      setTimeout(() => {
        if (communityMsgRef.current) communityMsgRef.current.scrollTop = communityMsgRef.current.scrollHeight;
      }, 50);
    } catch {}
  }, [activeChannel]);

  useEffect(() => { loadCommunityMessages(activeChannel); }, [activeChannel]);

  // ── Load conversations sidebar ────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await chatApi.conversations();
      setConversations(data);
      const total = data.reduce((s, c) => s + (c.unread_count || 0), 0);
      onUnreadChange(total);
    } catch {}
  }, [token, onUnreadChange]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── If parent passed a chat target (from catalog/barter), open it ─────────
  useEffect(() => {
    if (initialTarget) {
      setMode('direct');
      selectConversation(initialTarget.userId, initialTarget.displayName);
      onClearTarget?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTarget]);

  // ── Polling for direct messages ───────────────────────────────────────────
  const loadDirectMessages = useCallback(async (userId, silent = false) => {
    if (!userId) return;
    try {
      const msgs = await chatApi.thread(userId);
      setDirectMessages(msgs);
      setConversations(prev =>
        prev.map(c => c.other_user.id === userId ? { ...c, unread_count: 0 } : c)
      );
      if (!silent) {
        setTimeout(() => {
          if (directMsgRef.current) directMsgRef.current.scrollTop = directMsgRef.current.scrollHeight;
        }, 50);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (mode === 'direct' && activeChatUserId) {
      pollTimerRef.current = setInterval(() => {
        loadDirectMessages(activeChatUserId, true);
      }, 4000);
    }
    return () => clearInterval(pollTimerRef.current);
  }, [mode, activeChatUserId, loadDirectMessages]);

  function selectConversation(userId, displayName) {
    setActiveChatUserId(userId);
    setActiveChatName(displayName);
    loadDirectMessages(userId);
  }

  async function sendCommunityMessage(e) {
    e.preventDefault();
    if (!communityInput.trim()) return;
    try {
      await chatApi.sendCommunity(activeChannel, communityInput.trim());
      setCommunityInput('');
      loadCommunityMessages(activeChannel);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function sendDirectMessage(e) {
    e.preventDefault();
    if (!directInput.trim() || !activeChatUserId) return;
    try {
      await chatApi.send(activeChatUserId, directInput.trim());
      setDirectInput('');
      loadDirectMessages(activeChatUserId);
      loadConversations();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function openDirectory() {
    try {
      const users = await chatApi.directory();
      setDirectory(users);
      setDirectoryOpen(true);
    } catch { showToast('Could not load user directory', 'error'); }
  }

  const filteredConvs = chatSearch
    ? conversations.filter(c =>
        c.other_user.display_name.toLowerCase().includes(chatSearch.toLowerCase()) ||
        (c.last_message || '').toLowerCase().includes(chatSearch.toLowerCase())
      )
    : conversations;

  return (
    <div>
      <div className="page-intro">
        <div>
          <h2>💬 SkillBridge Chatting Place &amp; Community Lounge</h2>
          <p>Join open community rooms or message any teacher or peer 1-on-1.</p>
        </div>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`btn ${mode === 'community' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('community')}>
          🌐 Community Lounge
        </button>
        <button className={`btn ${mode === 'direct' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('direct')}>
          💬 Direct Messages (1-on-1)
        </button>
        <button className="btn btn-secondary" onClick={openDirectory} style={{ marginLeft: 'auto' }}>
          👥 Directory: Chat with Anyone
        </button>
      </div>

      {/* ── COMMUNITY VIEW ───────────────────────────────────────────────── */}
      {mode === 'community' && (
        <div className="chat-workspace">
          {/* Channels sidebar */}
          <div className="chat-sidebar">
            <div className="chat-sidebar-header">
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>Chat Channels</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Chat openly with all peers &amp; mentors</div>
            </div>
            <div className="chat-conversation-list">
              {COMMUNITY_CHANNELS.map(ch => (
                <div key={ch.id} className={`channel-item ${activeChannel === ch.id ? 'active' : ''}`} onClick={() => setActiveChannel(ch.id)}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ch.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ch.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Community messages */}
          <div className="chat-main">
            <div className="chat-header">
              <div className="chat-header-user">
                <div className="chat-avatar">🌐</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    {COMMUNITY_CHANNELS.find(c => c.id === activeChannel)?.label || activeChannel}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Chat with anyone across SkillBridge</div>
                </div>
              </div>
              <span className="badge-tag badge-barter" style={{ fontSize: '0.75rem' }}>🟢 Live Room</span>
            </div>

            <div className="chat-messages" ref={communityMsgRef}>
              {communityMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
                  <div>No messages yet in this channel. Be the first!</div>
                </div>
              ) : communityMessages.map((m, i) => {
                const isMe       = currentUser && m.sender_id === currentUser.id;
                // CommunityMessageResponse: sender is a UserPublic object
                const senderName = m.sender?.display_name || 'User';
                const isConf     = m.sender?.is_confidential || false;
                return (
                  <div className="community-msg-row" key={m.id || i}>
                    <div className={`chat-avatar ${isConf ? 'confidential' : ''}`} style={{ flexShrink: 0, width: 36, height: 36, fontSize: '0.85rem' }}>
                      {isConf ? '🔒' : senderName.charAt(0).toUpperCase()}
                    </div>
                    <div className="community-msg-body">
                      <div className="community-msg-header">
                        <span className="community-author-name">{isMe ? 'You' : senderName}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.4 }}>{m.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form className="chat-input-bar" onSubmit={sendCommunityMessage}>
              <input
                type="text"
                placeholder="Chat with everyone in this channel... (Press Enter to send)"
                value={communityInput}
                onChange={e => setCommunityInput(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary">Post 🚀</button>
            </form>
          </div>
        </div>
      )}

      {/* ── DIRECT MESSAGES VIEW ─────────────────────────────────────────── */}
      {mode === 'direct' && (
        <div className="chat-workspace">
          {/* Conversations sidebar */}
          <div className="chat-sidebar">
            <div className="chat-sidebar-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Direct Messages</span>
                <button className="btn btn-primary btn-sm" onClick={openDirectory} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>➕ New Chat</button>
              </div>
              <input
                className="search-input"
                placeholder="Search conversations..."
                value={chatSearch}
                onChange={e => setChatSearch(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
              />
            </div>
            <div className="chat-conversation-list">
              {filteredConvs.length === 0 ? (
                <div className="chat-empty-state" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>No messages yet</div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Click "💬 Chat" on any teacher or learner to begin!</p>
                </div>
              ) : filteredConvs.map(c => {
                const u = c.other_user;
                const isActive = activeChatUserId === u.id;
                return (
                  <div key={u.id} className={`chat-conversation-item ${isActive ? 'active' : ''}`} onClick={() => selectConversation(u.id, u.display_name)}>
                    <div className={`chat-avatar ${u.is_confidential ? 'confidential' : ''}`}>
                      {u.is_confidential ? '🔒' : u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-conv-info">
                      <div className="chat-conv-title">
                        <span className="chat-conv-name">{u.display_name}</span>
                        <span className="chat-conv-time">{formatChatTime(c.last_message_time)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="chat-conv-snippet">{c.last_message || ''}</span>
                        {c.unread_count > 0 && <span className="chat-unread-count">{c.unread_count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active chat area */}
          <div className="chat-main">
            {!activeChatUserId ? (
              <div className="chat-empty-state" id="chat-placeholder">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                <h3 style={{ marginBottom: '0.5rem' }}>Select a conversation to start chatting</h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '340px', color: '#64748b' }}>
                  Pick a conversation from the left, click <strong>➕ New Chat</strong> to pick anyone, or click <strong>💬 Chat</strong> on any teacher card!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="chat-header">
                  <div className="chat-header-user">
                    <div className="chat-avatar">{activeChatName.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{activeChatName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Direct Chat</div>
                    </div>
                  </div>
                </div>

                <div className="chat-messages" ref={directMsgRef}>
                  {directMessages.length === 0 ? (
                    <div className="chat-empty-state" style={{ padding: '2rem' }}>
                      <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>👋</div>
                      <div style={{ fontWeight: 600, color: '#475569' }}>No messages yet with {activeChatName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Say hello and ask about learning or teaching!</div>
                    </div>
                  ) : directMessages.map(m => {
                    const isSent = currentUser && m.sender_id === currentUser.id;
                    const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={m.id} className={`chat-bubble ${isSent ? 'sent' : 'received'}`}>
                        <div style={{ fontWeight: 600, fontSize: '0.72rem', marginBottom: '3px', opacity: 0.85 }}>
                          {isSent ? 'You' : m.sender?.display_name}
                        </div>
                        <div>{m.content}</div>
                        <div className="chat-bubble-time">
                          {timeStr} {isSent ? (m.is_read ? '✓✓' : '✓') : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form className="chat-input-bar" onSubmit={sendDirectMessage}>
                  <input
                    type="text"
                    placeholder="Type your message... (Press Enter to send)"
                    value={directInput}
                    onChange={e => setDirectInput(e.target.value)}
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn-primary">Send 🚀</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Directory Modal */}
      <Modal open={directoryOpen} onClose={() => setDirectoryOpen(false)} title="👥 Member Directory — Start a Chat">
        <div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
            Click any member to open a direct conversation.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto' }}>
            {directory.map(u => (
              <div key={u.id} className="directory-user-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={`chat-avatar ${u.is_confidential ? 'confidential' : ''}`} style={{ width: 36, height: 36, fontSize: '0.85rem', flexShrink: 0 }}>
                    {u.is_confidential ? '🔒' : u.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{u.display_name}</div>
                    {u.company && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>🏢 {u.company}</div>}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setDirectoryOpen(false);
                    setMode('direct');
                    selectConversation(u.id, u.display_name);
                  }}
                >
                  💬 Chat
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
