import React, { useState, useEffect, useCallback } from 'react';
import { skillsApi, exchangesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';
import Modal from './Modal';

export default function CatalogTab({ openChatWith }) {
  const { currentUser } = useAuth();
  const [catalogType, setCatalogType] = useState('TEACH');
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    skill_id: '', exchange_mode: '', confidential_only: '', skill_name: '',
  });
  const [masterSkills, setMasterSkills] = useState([]);

  // Exchange modal state
  const [exchangeModal, setExchangeModal] = useState(null);
  const [exchangeType, setExchangeType] = useState('BARTER');
  const [offerSkillId, setOfferSkillId] = useState('');
  const [requestedSkillId, setRequestedSkillId] = useState('');
  const [monetaryAmount, setMonetaryAmount] = useState(0);
  const [sessionDetails, setSessionDetails] = useState('');

  useEffect(() => {
    skillsApi.masterList().then(setMasterSkills).catch(() => {});
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { skill_type: catalogType };
      if (filters.skill_id)        params.skill_id        = filters.skill_id;
      if (filters.exchange_mode)   params.exchange_mode   = filters.exchange_mode;
      if (filters.skill_name)      params.skill_name      = filters.skill_name;
      if (filters.confidential_only !== '') params.confidential_only = filters.confidential_only;
      const data = await skillsApi.catalog(params);
      setCatalog(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [catalogType, filters]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  function openExchangeModal(item) {
    // SkillCatalogItem has flat skill_name, NOT nested skill object
    const foundSkill = masterSkills.find(s => s.name === item.skill_name);
    setRequestedSkillId(foundSkill ? String(foundSkill.id) : '');
    setOfferSkillId('');
    setMonetaryAmount(item.hourly_rate || 0);
    setSessionDetails('');
    setExchangeType(item.exchange_preference === 'PAID_ONLY' ? 'PAID_ONE_WAY' : 'BARTER');
    setExchangeModal(item);
  }

  async function submitExchange() {
    if (!exchangeModal) return;
    try {
      await exchangesApi.create({
        receiver_id: exchangeModal.user_id,
        exchange_type: exchangeType,
        receiver_requested_skill_id: requestedSkillId ? parseInt(requestedSkillId) : null,
        sender_offered_skill_id: (exchangeType === 'BARTER' && offerSkillId) ? parseInt(offerSkillId) : null,
        monetary_amount: exchangeType === 'PAID_ONE_WAY' ? parseFloat(monetaryAmount) || 0 : 0,
        session_details: sessionDetails || null,
      });
      showToast('Exchange request sent!');
      setExchangeModal(null);
    } catch (err) {
      showToast(err.message || 'Failed to send request', 'error');
    }
  }

  return (
    <div>
      {/* Type toggle */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${catalogType === 'TEACH' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setCatalogType('TEACH')}
        >
          👨‍🏫 Browse Teachers (People Offering to Teach)
        </button>
        <button
          className={`btn ${catalogType === 'LEARN' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setCatalogType('LEARN')}
        >
          🎓 Browse Learners (People Looking to be Taught)
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by skill name (e.g. C++, Java, Python)..."
          value={filters.skill_name}
          onChange={e => setFilters(f => ({ ...f, skill_name: e.target.value }))}
        />
        <select
          className="select-input"
          value={filters.skill_id}
          onChange={e => setFilters(f => ({ ...f, skill_id: e.target.value }))}
        >
          <option value="">All Skills</option>
          {masterSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          className="select-input"
          value={filters.exchange_mode}
          onChange={e => setFilters(f => ({ ...f, exchange_mode: e.target.value }))}
        >
          <option value="">All Exchange Modes</option>
          <option value="BARTER_ONLY">Skill Barter Only ($0)</option>
          <option value="PAID_ONLY">Paid Mentorship</option>
          <option value="VOLUNTEER_FREE">Free Volunteer</option>
        </select>
        <select
          className="select-input"
          value={filters.confidential_only}
          onChange={e => setFilters(f => ({ ...f, confidential_only: e.target.value }))}
        >
          <option value="">All Identities</option>
          <option value="true">🔒 Anonymous / Confidential Only</option>
          <option value="false">👁️ Public Profiles Only</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={loadCatalog}>Refresh</button>
      </div>

      {loading && <div style={{ padding: '2rem', color: '#64748b' }}>Loading {catalogType === 'TEACH' ? 'teachers' : 'learners'} catalog...</div>}
      {error   && <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>}
      {!loading && !error && catalog.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          No {catalogType === 'TEACH' ? 'teachers' : 'learners'} found matching your filters.
        </div>
      )}

      {!loading && !error && catalog.length > 0 && (
        <div className="cards-grid">
          {catalog.map(item => {
            // item is SkillCatalogItem — flat fields: skill_name, category, hourly_rate
            const isMe      = currentUser && currentUser.id === item.user_id;
            const isTeacher = item.skill_type === 'TEACH';

            const privacyBadge = item.is_confidential
              ? <span className="confidential-pill active">🔒 Confidential {isTeacher ? 'Teacher' : 'Learner'}</span>
              : <span className="confidential-pill inactive">👁️ Public Profile{item.company ? ` • 🏢 ${item.company}` : ''}</span>;

            let modeBadge;
            if (item.exchange_preference === 'BARTER_ONLY')
              modeBadge = <span className="badge-tag badge-barter">Skill Barter (Free Swap)</span>;
            else if (item.exchange_preference === 'PAID_ONLY')
              modeBadge = <span className="badge-tag badge-paid">Paid Mentorship (${item.hourly_rate}/hr)</span>;
            else if (item.exchange_preference === 'VOLUNTEER_FREE')
              modeBadge = <span className="badge-tag badge-free">Free Mentorship</span>;
            else
              modeBadge = <><span className="badge-tag badge-barter">Barter</span> <span className="badge-tag badge-paid">${item.hourly_rate}/hr</span></>;

            return (
              <div className="card" key={`${item.user_id}-${item.user_skill_id}`}>
                <div>
                  <div className="card-header">
                    <div className="author-info">
                      <h4>{item.display_name}</h4>
                      {privacyBadge}
                    </div>
                    <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                      {item.proficiency_level}
                    </span>
                  </div>

                  <div className="card-body">
                    <div style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                      {isTeacher ? 'Offering to Teach' : 'Wants to Learn'}
                    </div>
                    {/* skill_name and category are FLAT on SkillCatalogItem */}
                    <h3>{item.skill_name}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {item.category}
                    </p>

                    {isTeacher ? (
                      <>
                        <div className="card-desc">
                          <strong>Good at Explaining:</strong>{' '}
                          {item.explanation_style || 'Explains concepts clearly with real-world examples.'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                          ⏳ <strong>Experience:</strong> {item.years_of_experience} yrs
                        </div>
                      </>
                    ) : (
                      <div className="card-desc">
                        <strong>Learning Objective:</strong>{' '}
                        {item.learning_goal || item.explanation_style || 'Seeking peer guidance and conceptual explanations.'}
                      </div>
                    )}

                    <div>{modeBadge}</div>

                    {/* Contact visibility */}
                    {item.is_confidential ? (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', marginTop: '0.5rem' }}>
                        🔒 <em>Contact &amp; personal details protected by user choice</em>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {item.show_phone && item.phone && <div>📞 <strong>Phone:</strong> {item.phone}</div>}
                        {item.show_email && item.email && <div>✉️ <strong>Email:</strong> {item.email}</div>}
                        {!item.show_phone && !item.show_email && (
                          <div>🔒 <em>Phone &amp; email kept private by {isTeacher ? 'teacher' : 'learner'}</em></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-footer">
                  <div className="price-tag">
                    {isTeacher
                      ? (item.hourly_rate > 0
                          ? <>${item.hourly_rate} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>/hr</span></>
                          : <span style={{ color: '#059669' }}>Free / Barter</span>)
                      : <span style={{ color: '#4338ca', fontSize: '0.9rem' }}>Learner Seeking Mentor</span>
                    }
                  </div>
                  {isMe ? (
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>(Your Listing)</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openChatWith(item.user_id, item.display_name)}
                      >
                        💬 Chat
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openExchangeModal(item)}
                      >
                        {isTeacher ? 'Request Tutoring' : 'Offer to Teach'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exchange Request Modal */}
      <Modal open={!!exchangeModal} onClose={() => setExchangeModal(null)} title="Request Skill Exchange / Tutoring">
        {exchangeModal && (
          <div>
            <div style={{ background: '#f1f5f9', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Teacher:</strong> {exchangeModal.display_name}</div>
              <div><strong>Subject:</strong> {exchangeModal.skill_name}</div>
              <div><strong>Standard Fee:</strong> {exchangeModal.hourly_rate > 0 ? `$${exchangeModal.hourly_rate}/hr` : 'Free / Barter'}</div>
            </div>

            <div className="form-group">
              <label>Exchange Mode:</label>
              <select className="select-input" style={{ width: '100%' }} value={exchangeType} onChange={e => setExchangeType(e.target.value)}>
                <option value="BARTER">Skill-for-Skill Barter ($0 Swap)</option>
                <option value="PAID_ONE_WAY">Paid Tutoring (pay teacher demanded fee)</option>
                <option value="FREE">Free Community Mentorship</option>
              </select>
            </div>

            {exchangeType === 'BARTER' && (
              <div className="form-group">
                <label>Select Skill You Will Teach in Return:</label>
                <select className="select-input" style={{ width: '100%' }} value={offerSkillId} onChange={e => setOfferSkillId(e.target.value)}>
                  <option value="">-- Select Skill --</option>
                  {masterSkills.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                </select>
                <small>Example: You teach C++ in return for learning Java.</small>
              </div>
            )}

            {exchangeType === 'PAID_ONE_WAY' && (
              <div className="form-group">
                <label>Proposed Fee ($ USD):</label>
                <input type="number" value={monetaryAmount} min={0} step={5} onChange={e => setMonetaryAmount(e.target.value)} style={{ width: '100%' }} />
                <small>You will deposit into secure escrow once accepted.</small>
              </div>
            )}

            <div className="form-group">
              <label>Learning Objectives &amp; Schedule Notes:</label>
              <textarea
                value={sessionDetails}
                onChange={e => setSessionDetails(e.target.value)}
                placeholder="Describe what you want to learn, your availability, preferred meeting format..."
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitExchange}>
              Send Exchange Request
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
