import React, { useState } from 'react';
import { AuthProvider, useAuth, DEMO_USERS } from './context/AuthContext';
import CatalogTab from './components/CatalogTab';
import BarterTab from './components/BarterTab';
import QuestionsTab from './components/QuestionsTab';
import MentorsTab from './components/MentorsTab';
import ExchangesTab from './components/ExchangesTab';
import ChatTab from './components/ChatTab';
import ProfileTab from './components/ProfileTab';

const SIDEBAR_ITEMS = [
  { group: 'EXPLORE & DISCOVER', items: [
    { id: 'catalog', icon: '🔍', label: 'Explore Teachers & Skills' },
    { id: 'barter', icon: '🤝', label: '2-Way Barter Matcher', badge: '$0' },
    { id: 'questions', icon: '📚', label: 'Interview Question Bank' },
    { id: 'mentors', icon: '🏢', label: 'Company Mentors' },
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
