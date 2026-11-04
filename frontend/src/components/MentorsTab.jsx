import React, { useState, useEffect } from 'react';
import { mentorsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';
import Modal from './Modal';

export default function MentorsTab({ openChatWith }) {
  const { currentUser } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [askModal, setAskModal] = useState(null);
  const [askForm, setAskForm] = useState({ title: '', question_text: '', is_private: false });

  async function loadAll() {
    setLoading(true);
    try {
      const [m, q] = await Promise.all([mentorsApi.list(), mentorsApi.questions()]);
      setMentors(Array.isArray(m) ? m : []);
      setQuestions(Array.isArray(q) ? q : []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function submitQuestion() {
    if (!askForm.title.trim() || !askForm.question_text.trim()) {
      showToast('Please provide a title and details', 'error');
      return;
    }
    try {
      await mentorsApi.ask({ mentor_user_id: askModal.mentorId, ...askForm });
      showToast('Question sent to company professional!');
      setAskModal(null);
      setAskForm({ title: '', question_text: '', is_private: false });
      const q = await mentorsApi.questions();
      setQuestions(Array.isArray(q) ? q : []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function submitReply(qid, response) {
    if (!response.trim()) return;
    try {
      await mentorsApi.reply(qid, response);
      showToast('Answer posted!');
      const q = await mentorsApi.questions();
      setQuestions(Array.isArray(q) ? q : []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading company mentors...</div>;

  return (
    <div>
      <div className="page-intro">
        <div>
          <h2>Connect Directly with Company Professionals</h2>
          <p>Verified software engineers and architects from major tech firms available for 1-on-1 direct Q&amp;A, mock interviews, and career coaching.</p>
        </div>
      </div>

      <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '1rem' }}>Featured Company Mentors</h3>
      <div className="cards-grid" style={{ marginBottom: '2.5rem' }}>
        {mentors.length === 0 ? (
          <div style={{ padding: '2rem', color: '#64748b' }}>No company mentors currently listed.</div>
        ) : mentors.map(m => {
          const isMe = currentUser && currentUser.id === m.user_id;
          // CompanyMentorProfileResponse uses hourly_fee (not hourly_rate)
          const feeLabel = m.hourly_fee > 0
            ? <>${m.hourly_fee} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>/hr</span></>
            : <span style={{ color: '#059669' }}>Free Q&amp;A / AMA</span>;

          return (
            <div className="card" key={m.id}>
              <div>
                <div className="card-header">
                  <div className="author-info">
                    <h4>{m.user?.display_name || 'Mentor'}</h4>
                    <span className="author-company">🏢 {m.company_name}</span>
                  </div>
                  {m.can_give_referral && <span className="badge-tag badge-barter">🎯 Can Refer</span>}
                </div>
                <div className="card-body">
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.25rem' }}>{m.job_title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    {m.department ? `${m.department} • ` : ''}{m.years_of_experience} yrs in company
                  </div>
                  <div className="card-desc">
                    <strong>Topics Open for Q&amp;A:</strong><br />
                    {m.topics_open_for_questions || 'Interviews, system design, corporate training, career guidance.'}
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <div className="price-tag">{feeLabel}</div>
                {isMe ? (
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Your Profile)</span>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openChatWith(m.user_id, m.user?.display_name || 'Mentor')}
                    >
                      💬 Chat
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setAskModal({ mentorId: m.user_id, mentorName: m.user?.display_name, companyName: m.company_name })}
                    >
                      Ask Direct Question
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="page-intro">
        <div>
          <h3>Community Direct Q&amp;A Showcase</h3>
          <p>Browse real advice and answers provided directly by industry professionals.</p>
        </div>
      </div>

      {questions.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
          No direct Q&amp;A threads yet. Be the first to ask a company mentor!
        </div>
      ) : questions.map(q => (
        <QACard key={q.id} q={q} currentUser={currentUser} onReply={submitReply} />
      ))}

      {/* Ask Mentor Modal */}
      <Modal open={!!askModal} onClose={() => { setAskModal(null); setAskForm({ title: '', question_text: '', is_private: false }); }} title="Ask a Direct Question">
        {askModal && (
          <div>
            <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <strong>Asking:</strong> {askModal.mentorName} ({askModal.companyName})
            </div>
            <div className="form-group">
              <label>Question Title *</label>
              <input
                placeholder="Short summary of your question..."
                value={askForm.title}
                onChange={e => setAskForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Full Question Details *</label>
              <textarea
                placeholder="Provide full context, what you've tried, etc."
                value={askForm.question_text}
                onChange={e => setAskForm(f => ({ ...f, question_text: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="ask-private"
                checked={askForm.is_private}
                onChange={e => setAskForm(f => ({ ...f, is_private: e.target.checked }))}
              />
              <label htmlFor="ask-private" style={{ margin: 0 }}>
                🔒 Keep this Q&amp;A private (only visible to you and the mentor)
              </label>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitQuestion}>
              Send Question
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function QACard({ q, currentUser, onReply }) {
  const [replyText, setReplyText] = useState('');
  // DirectQuestionResponse: status is "PENDING_REPLY" | "ANSWERED" | "CLOSED"
  const isMentor    = currentUser && currentUser.id === q.mentor_user_id;
  const isAnswered  = q.status === 'ANSWERED' && q.mentor_response;

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Question for: </span>
          <strong style={{ color: '#4338ca' }}>{q.mentor?.display_name || 'Mentor'}</strong>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}> • Asked by {q.asker?.display_name || 'User'}</span>
        </div>
        <span className={`badge-tag ${isAnswered ? 'badge-barter' : 'badge-free'}`}>
          {isAnswered ? '✓ Answered by Mentor' : '⏳ Waiting for Reply'}
        </span>
      </div>

      <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.4rem' }}>{q.title}</h4>
      <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem', lineHeight: 1.45 }}>{q.question_text}</p>

      {isAnswered && (
        <div style={{ background: '#f8fafc', borderLeft: '4px solid #10b981', padding: '0.9rem', borderRadius: '0 8px 8px 0', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065f46', marginBottom: '0.25rem' }}>
            Official Response from {q.mentor?.display_name}:
          </div>
          <div style={{ fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.45 }}>{q.mentor_response}</div>
        </div>
      )}

      {!isAnswered && isMentor && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <input
            className="search-input"
            placeholder="Type your professional reply here..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
          <button className="btn btn-success btn-sm" onClick={() => onReply(q.id, replyText)}>
            Send Reply
          </button>
        </div>
      )}
    </div>
  );
}
