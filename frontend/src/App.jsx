import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, DEMO_USERS } from './context/AuthContext';
import CatalogTab from './components/CatalogTab';
import BarterTab from './components/BarterTab';
import QuestionsTab from './components/QuestionsTab';
import MentorsTab from './components/MentorsTab';
import ExchangesTab from './components/ExchangesTab';
import ChatTab from './components/ChatTab';
import ProfileTab from './components/ProfileTab';
import VideosTab from './components/VideosTab';

const SIDEBAR_ITEMS = [
  { group: 'EXPLORE & DISCOVER', items: [
    { id: 'catalog', icon: '🔍', label: 'Explore Teachers & Skills' },
    { id: 'barter', icon: '🤝', label: '2-Way Barter Matcher', badge: '$0' },
    { id: 'questions', icon: '📚', label: 'Interview Question Bank' },
    { id: 'mentors', icon: '🏢', label: 'Company Mentors' },
    { id: 'videos', icon: '🎬', label: 'Course Videos & Resources', badge: 'Perks' },
  ]},
  { group: 'MY WORKSPACE', items: [
    { id: 'exchanges', icon: '📬', label: 'My Exchanges & Sessions' },
    { id: 'chat', icon: '💬', label: 'Community Lounge & Chat' },
  ]},
  { group: 'SETTINGS & SUPPORT', items: [
    { id: 'profile', icon: '⚙️', label: 'My Profile & Privacy' },
  ]}
];

function Shell() {
  const { currentUser, switchDemoPersona, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('catalog');
  const [chatTarget, setChatTarget] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // AI Assistant state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'bot',
      text: "👋 **Hi! I'm your SkillBridge AI Assistant.**\n\nI can help you understand how $0 Barter or Escrow payments work, configure confidential stealth mode, and troubleshoot any website errors.",
      suggestions: ["How does $0 Barter work?", "How does Escrow payment work?", "How to use Anonymous Mode?", "Where are course reference videos?"]
    }
  ]);
  const [aiThinking, setAiThinking] = useState(false);

  const token = localStorage.getItem('skillbridge_token');

  // Load notifications
  const loadNotifications = () => {
    if (!token) return;
    fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => {
        setNotifications(d.notifications || []);
        setNotifUnreadCount(d.unread_count || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 25000);
    return () => clearInterval(interval);
  }, [token]);

  const markAllNotifsRead = () => {
    if (!token) return;
    fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(() => loadNotifications());
  };

  const handleNotifClick = (n) => {
    if (!token) return;
    fetch(`/api/notifications/${n.id}/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(() => loadNotifications());
    setShowNotifDropdown(false);
    if (n.link_tab) {
      const tabKey = n.link_tab.replace('tab-', '');
      setActiveTab(tabKey);
    }
  };

  // AI Assistant send
  const sendAIMessage = (text) => {
    const query = text || aiInput;
    if (!query.trim()) return;

    setAiMessages(prev => [...prev, { sender: 'user', text: query }]);
    setAiInput('');
    setAiThinking(true);

    fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    })
      .then(res => res.json())
      .then(data => {
        setAiThinking(false);
        setAiMessages(prev => [...prev, {
          sender: 'bot',
          text: data.reply,
          suggestions: data.suggestions,
          action_link: data.action_link
        }]);
      })
      .catch(() => {
        setAiThinking(false);
        setAiMessages(prev => [...prev, {
          sender: 'bot',
          text: "I encountered a connection issue. Please ensure the SkillBridge server is running."
        }]);
      });
  };

  const openChatWith = (userId, displayName) => {
    setChatTarget({ userId, displayName });
    setActiveTab('chat');
  };

  const getActiveTitle = () => {
    for (const g of SIDEBAR_ITEMS) {
      const match = g.items.find(i => i.id === activeTab);
      if (match) return match.label;
    }
    return 'Dashboard';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>
        Loading SkillBridge...
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Left-Hand Vertical Sidebar ── */}
      <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ minWidth: sidebarCollapsed ? '72px' : '260px' }}>
        <div className="sidebar-brand">
          <div className="brand-icon">🌉</div>
          {!sidebarCollapsed && (
            <div className="brand-info">
              <h2>SkillBridge</h2>
              <span>The learning platform and skill exchange</span>
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Toggle Sidebar"
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {SIDEBAR_ITEMS.map((group) => (
            <div key={group.group}>
              {!sidebarCollapsed && <div className="nav-group-title">{group.group}</div>}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`tab-btn sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  {!sidebarCollapsed && <span className="nav-item-text">{item.label}</span>}
                  {item.badge && !sidebarCollapsed && <span className="nav-pill-badge">{item.badge}</span>}
                  {item.id === 'chat' && unreadCount > 0 && !sidebarCollapsed && (
                    <span className="chat-unread-count" style={{ marginLeft: 'auto' }}>{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {currentUser && !sidebarCollapsed && (
          <div className="sidebar-user-pill">
            <div className="chat-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
              {currentUser.display_name ? currentUser.display_name.substring(0, 2).toUpperCase() : 'ME'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.display_name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.email}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Layout (Topbar + Content) ── */}
      <div className="app-main-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>☰</button>
            <h1 className="topbar-title">{getActiveTitle()}</h1>
          </div>

          <div className="topbar-right">
            {/* Notifications Bell & Dropdown */}
            <div className="notification-wrapper">
              <button
                className="btn btn-outline btn-sm notification-bell-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                title="Notifications"
                style={{ fontSize: '0.95rem', padding: '4px 10px', position: 'relative' }}
              >
                🔔
                {notifUnreadCount > 0 && (
                  <span className="notification-badge">{notifUnreadCount > 99 ? '99+' : notifUnreadCount}</span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="notification-dropdown" style={{ display: 'block' }}>
                  <div className="notif-header">
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>🔔 Notifications</div>
                    <button className="notif-mark-all-btn" onClick={markAllNotifsRead}>Mark all read</button>
                  </div>
                  <div className="notif-list">
                    {!notifications.length ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`notif-item ${n.is_read ? '' : 'unread'}`}
                          onClick={() => handleNotifClick(n)}
                        >
                          <div className="notif-item-icon">
                            {n.notification_type === 'EXCHANGE_REQUEST' ? '📩' :
                             n.notification_type === 'EXCHANGE_ACCEPTED' ? '🎉' :
                             n.notification_type === 'PAYMENT_ESCROW' ? '💳' :
                             n.notification_type === 'SESSION_COMPLETED' ? '🏆' : '🔔'}
                          </div>
                          <div className="notif-item-body">
                            <div className="notif-item-title">{n.title}</div>
                            <div className="notif-item-msg">{n.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Persona:</span>
              <select
                className="persona-switcher"
                onChange={(e) => switchDemoPersona(e.target.value)}
                defaultValue="alice"
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="alice">Alice (C++ Teacher - Barter)</option>
                <option value="bob">Bob (Java Guru - Barter)</option>
                <option value="confidential">Stealth Mentor (Anonymous)</option>
                <option value="maya">Maya Lin (Learner)</option>
                <option value="sarah">Sarah (Google Staff Eng)</option>
                <option value="rahul">Rahul (Amazon AWS Arch)</option>
              </select>
            </div>

            {currentUser && (
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <span className={`confidential-pill ${currentUser.is_confidential_teacher ? 'active' : 'inactive'}`}>
                  {currentUser.is_confidential_teacher ? '🔒 Teacher: Hidden' : '👁️ Teacher: Public'}
                </span>
                <span className={`confidential-pill ${currentUser.is_confidential_learner ? 'active' : 'inactive'}`}>
                  {currentUser.is_confidential_learner ? '🔒 Learner: Hidden' : '👁️ Learner: Public'}
                </span>
              </div>
            )}

            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
              ⚡ API Docs
            </a>
          </div>
        </header>

        {/* Tab Content Panes */}
        <main className="app-content-body" style={{ flex: 1, padding: '1.5rem', background: '#f8fafc', overflowY: 'auto' }}>
          {activeTab === 'catalog'    && <CatalogTab openChatWith={openChatWith} />}
          {activeTab === 'barter'     && <BarterTab openChatWith={openChatWith} />}
          {activeTab === 'questions'  && <QuestionsTab />}
          {activeTab === 'mentors'    && <MentorsTab openChatWith={openChatWith} />}
          {activeTab === 'videos'     && <VideosTab />}
          {activeTab === 'exchanges'  && <ExchangesTab />}
          {activeTab === 'chat'       && (
            <ChatTab
              initialTarget={chatTarget}
              onClearTarget={() => setChatTarget(null)}
              onUnreadChange={setUnreadCount}
            />
          )}
          {activeTab === 'profile'    && <ProfileTab />}
        </main>
      </div>

      {/* ── FLOATING AI ASSISTANT CHATBOT (BOTTOM RIGHT) ── */}
      <div className="ai-widget">
        <button className="ai-trigger-btn" onClick={() => setAiOpen(!aiOpen)} title="SkillBridge AI Assistant">
          <span className="ai-trigger-icon">🤖</span>
          <span className="ai-trigger-label">AI Assistant</span>
          <span className="ai-pulse-dot"></span>
        </button>

        {aiOpen && (
          <div className="ai-chat-window">
            <div className="ai-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="ai-avatar-badge">🤖</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>SkillBridge AI Assistant</div>
                  <div style={{ fontSize: '0.72rem', color: '#a5b4fc' }}>Online • Platform Help & FAQs</div>
                </div>
              </div>
              <button className="ai-close-btn" onClick={() => setAiOpen(false)}>&times;</button>
            </div>

            <div className="ai-chat-body">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`ai-msg ai-msg-${msg.sender}`}>
                  <div className="ai-bubble" style={{ whiteSpace: 'pre-line' }}>
                    {msg.text}
                    {msg.action_link && (
                      <div style={{ marginTop: '8px' }}>
                        <button
                          className="ai-action-btn"
                          onClick={() => {
                            const tabKey = msg.action_link.tab.replace('tab-', '');
                            setActiveTab(tabKey);
                          }}
                        >
                          🚀 {msg.action_link.label}
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.suggestions && (
                    <div className="ai-quick-chips">
                      {msg.suggestions.map((s, idx) => (
                        <button key={idx} className="ai-chip" onClick={() => sendAIMessage(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {aiThinking && (
                <div className="ai-msg ai-msg-bot">
                  <div className="ai-bubble" style={{ color: '#64748b', fontStyle: 'italic' }}>
                    SkillBridge Assistant is thinking... ⏳
                  </div>
                </div>
              )}
            </div>

            <form
              className="ai-chat-footer"
              onSubmit={(e) => {
                e.preventDefault();
                sendAIMessage();
              }}
            >
              <input
                type="text"
                placeholder="Ask about barter, escrow, privacy, or website issues..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button type="submit" className="ai-send-btn">➤</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
