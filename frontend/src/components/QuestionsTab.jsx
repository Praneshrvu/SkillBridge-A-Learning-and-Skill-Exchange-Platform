import React, { useState, useEffect, useCallback } from 'react';
import { questionsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';
import Modal from './Modal';

function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:#1e293b;color:#f8fafc;padding:0.75rem;border-radius:6px;overflow-x:auto;margin:0.5rem 0"><code>${code}</code></pre>`
  );
  // bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // newlines
  html = html.replace(/\n/g, '<br>');
  return html;
}

export default function QuestionsTab() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ company: '', difficulty: '', search: '' });
  const [openSolutions, setOpenSolutions] = useState({});
  const [contributeOpen, setContributeOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: '', role: '', category: '', round_type: '',
    difficulty: 'Medium', question_text: '', answer_explanation: '', tags: '',
  });

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.company)    params.company    = filters.company;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search)     params.search     = filters.search;
      const data = await questionsApi.list(params);
      setQuestions(Array.isArray(data) ? data : []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  function toggleSolution(id) {
    setOpenSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function upvote(id) {
    if (!token) { showToast('Please log in to upvote', 'error'); return; }
    try {
      const data = await questionsApi.vote(id);
      setQuestions(qs => qs.map(q => q.id === id ? { ...q, upvotes_count: data.upvotes_count } : q));
      showToast(data.user_voted ? 'Upvoted!' : 'Removed upvote');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function contribute() {
    if (!form.company_name || !form.question_text || !form.answer_explanation) {
      showToast('Please fill all required fields', 'error'); return;
    }
    try {
      await questionsApi.contribute(form);
      showToast('Question contributed!');
      setContributeOpen(false);
      setForm({ company_name: '', role: '', category: '', round_type: '', difficulty: 'Medium', question_text: '', answer_explanation: '', tags: '' });
      loadQuestions();
    } catch (err) { showToast(err.message, 'error'); }
  }

  return (
    <div>
      <div className="page-intro">
        <div>
          <h2>Company Interview &amp; Corporate Training Question Bank</h2>
          <p>Explore real questions asked during recruitment drives at Google, Amazon, Microsoft, TCS, Infosys, and more.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setContributeOpen(true)}>➕ Contribute Question</button>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search keywords, topics, or tags..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select
          className="select-input"
          value={filters.company}
          onChange={e => setFilters(f => ({ ...f, company: e.target.value }))}
        >
          <option value="">All Companies</option>
          {['Google', 'Amazon', 'Microsoft', 'TCS', 'Infosys'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="select-input"
          value={filters.difficulty}
          onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))}
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={loadQuestions}>Filter</button>
      </div>

      {loading && <div style={{ padding: '2rem', color: '#64748b' }}>Loading company questions...</div>}

      {!loading && questions.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          No interview questions found. Be the first to contribute one!
        </div>
      )}

      {!loading && questions.map(q => (
        <div className="question-card" key={q.id}>
          <div className="question-meta">
            <span className="company-tag">🏢 {q.company_name}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{q.role}</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>• {q.round_type}</span>
            <span
              className={`difficulty-tag ${q.difficulty}`}
              style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}
            >
              {q.difficulty}
            </span>
          </div>

          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.75rem', lineHeight: 1.4 }}>
            {q.question_text}
          </h3>

          {/* tags is a plain comma-separated string, not an array */}
          {q.tags && (
            <div style={{ marginBottom: '0.75rem' }}>
              {q.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} style={{ display: 'inline-block', background: '#eef2ff', color: '#4338ca', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', marginRight: '4px' }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => toggleSolution(q.id)}>
              💡 Toggle Solution &amp; Explanation
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => upvote(q.id)}>
                👍 Upvote ({q.upvotes_count})
              </button>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Contributed by: {q.author?.display_name || 'Anonymous'}
              </span>
            </div>
          </div>

          {openSolutions[q.id] && (
            <div className="solution-box open">
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Comprehensive Explanation &amp; Solution:
              </div>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(q.answer_explanation) }} />
            </div>
          )}
        </div>
      ))}

      {/* Contribute Question Modal */}
      <Modal open={contributeOpen} onClose={() => setContributeOpen(false)} title="➕ Contribute Interview Question">
        <div>
          <div className="form-group">
            <label>Company Name *</label>
            <input placeholder="e.g. Google, Amazon, TCS..." value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Role / Position</label>
            <input placeholder="e.g. Software Engineer, Data Analyst" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Category</label>
            <input placeholder="e.g. Algorithms, System Design, HR" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Round Type</label>
            <input placeholder="e.g. Technical Round 1, HR Interview" value={form.round_type} onChange={e => setForm(f => ({ ...f, round_type: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Difficulty</label>
            <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} style={{ width: '100%' }}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="form-group">
            <label>Question Text *</label>
            <textarea placeholder="Write the interview question..." value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Answer / Explanation *</label>
            <textarea
              placeholder="Provide a comprehensive explanation or model answer (supports **bold** and ```code``` blocks)..."
              value={form.answer_explanation}
              onChange={e => setForm(f => ({ ...f, answer_explanation: e.target.value }))}
              rows={5}
            />
          </div>
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input placeholder="e.g. arrays, dynamic programming, STAR method" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={contribute}>
            Submit Question
          </button>
        </div>
      </Modal>
    </div>
  );
}
