import React, { useState, useEffect } from 'react';
import { skillsApi, exchangesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';

export default function BarterTab({ openChatWith }) {
  const { currentUser, token } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    skillsApi.barterMatches()
      .then(data => {
        // Response: { count: int, matches: [...] }
        setMatches(Array.isArray(data?.matches) ? data.matches : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function initiateSwap(match) {
    try {
      await exchangesApi.create({
        receiver_id: match.peer_user_id,
        exchange_type: 'BARTER',
        session_details: `Direct Barter: I will teach you ${match.peer_wants_to_learn} in exchange for learning ${match.peer_teaches}.`,
      });
      showToast('Barter swap request sent!');
    } catch (err) {
      showToast(err.message || 'Failed to create swap', 'error');
    }
  }

  return (
    <div>
      <div className="match-hero">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Smart Peer-to-Peer Barter Algorithm</h2>
        <p style={{ fontSize: '0.95rem', opacity: 0.95 }}>
          SkillBridge automatically pairs you with community members where a perfect mutual learning exchange exists!
          For example, if you know <strong>C++</strong> and want to learn <strong>Java</strong>, and another person
          knows <strong>Java</strong> and wants to learn <strong>C++</strong>, you can exchange your knowledge completely free.
        </p>
      </div>

      {!token && (
        <div style={{ padding: '2rem', color: '#64748b' }}>Log in to discover 2-way barter matches.</div>
      )}

      {token && loading && (
        <div style={{ padding: '2rem', color: '#64748b' }}>Finding barter matches...</div>
      )}

      {token && error && (
        <div style={{ padding: '2rem', color: '#ef4444' }}>Error loading matches: {error}</div>
      )}

      {token && !loading && !error && matches.length === 0 && (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>No Direct 2-Way Barter Matches Right Now</h3>
          <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            A 2-way barter match occurs when another person teaches what you want to learn AND wants to learn what you teach.
            For instance, <strong>Alice knows C++ and wants Java</strong>, while <strong>Bob knows Java and wants C++</strong>!
          </p>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Go to <strong>⚙️ My Profile &amp; Privacy Control</strong> to add your teach &amp; learn skills.
          </p>
        </div>
      )}

      {token && !loading && !error && matches.map((m, i) => (
        <div className="match-card" key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ color: '#4338ca', fontSize: '1.2rem' }}>🤝 Perfect 2-Way Skill Barter Match!</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Zero cost ($0). Teach each other what you know best.</p>
            </div>
            <span className="badge-tag badge-barter">100% Barter Match</span>
          </div>

          <div className="match-swap-box">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>YOU TEACH</div>
              <div style={{ fontSize: '1.1rem', color: '#065f46', fontWeight: 700 }}>{m.peer_wants_to_learn}</div>
            </div>
            <div style={{ fontSize: '1.5rem', color: '#4f46e5' }}>⇄</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.peer_display_name} TEACHES YOU</div>
              <div style={{ fontSize: '1.1rem', color: '#1e40af', fontWeight: 700 }}>{m.peer_teaches}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
            <strong>Peer Explanation Style:</strong>{' '}
            {m.peer_explanation_style || 'Direct code walkthroughs and diagrams.'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openChatWith(m.peer_user_id, m.peer_display_name)}
            >
              💬 Chat with {m.peer_display_name}
            </button>
            <button className="btn btn-primary" onClick={() => initiateSwap(m)}>
              Initiate $0 Skill Barter Swap
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
