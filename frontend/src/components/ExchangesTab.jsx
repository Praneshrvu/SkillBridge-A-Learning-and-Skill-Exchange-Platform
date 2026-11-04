import React, { useState, useEffect, useCallback } from 'react';
import { exchangesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';
import Modal from './Modal';

export default function ExchangesTab() {
  const { currentUser, token } = useAuth();
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await exchangesApi.list();
      setExchanges(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message, 'error');
      setExchanges([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    try {
      await exchangesApi.updateStatus(id, status);
      showToast(`Exchange ${status.toLowerCase()}`);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function paymentAction(id, action) {
    try {
      await exchangesApi.payment(id, action);
      showToast(`Payment action completed!`);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function submitReview() {
    try {
      await exchangesApi.review(reviewModal, reviewForm.rating, reviewForm.comment);
      showToast('Review submitted! Thank you.');
      setReviewModal(null);
      load();
    } catch (err) { showToast(err.message, 'error'); }
  }

  if (!token) return <div style={{ padding: '2rem', color: '#64748b' }}>Please log in to view your exchanges.</div>;
  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading exchanges...</div>;

  return (
    <div>
      <div className="page-intro">
        <div>
          <h2>My Skill Exchanges &amp; Tutoring Sessions</h2>
          <p>Track your incoming and outgoing exchange proposals, escrow payments, and completed learning sessions.</p>
        </div>
      </div>

      {exchanges.length === 0 ? (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>No Exchange Requests Yet</h3>
          <p style={{ color: '#64748b' }}>Browse the catalog or barter matcher to initiate a skill swap or tutoring session!</p>
        </div>
      ) : exchanges.map(ex => {
        const isSender  = currentUser && currentUser.id === ex.sender_id;
        const otherUser = isSender ? ex.receiver : ex.sender;

        // Payment status strings from backend: NOT_APPLICABLE, PAYMENT_PENDING, PAID_ESCROW, RELEASED_TO_TEACHER, REFUNDED
        const statusColors = {
          PENDING:     'badge-free',
          ACCEPTED:    'badge-barter',
          IN_PROGRESS: 'badge-barter',
          COMPLETED:   'badge-barter',
          REJECTED:    'badge-paid',
          CANCELLED:   'badge-paid',
        };
        const statusBadge = (
          <span className={`badge-tag ${statusColors[ex.status] || 'badge-free'}`}>
            {ex.status}
          </span>
        );

        // sender_offered_skill and receiver_requested_skill are SkillResponse objects (with .name)
        const offeredName   = ex.sender_offered_skill?.name   || '—';
        const requestedName = ex.receiver_requested_skill?.name || '—';

        return (
          <div key={ex.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{isSender ? 'Sent to' : 'Received from'}: </span>
                <strong style={{ color: '#1e293b', fontSize: '1.05rem' }}>{otherUser?.display_name || 'User'}</strong>
                {otherUser?.is_confidential && (
                  <span className="confidential-pill active" style={{ marginLeft: '4px' }}>🔒 Confidential</span>
                )}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Type: {ex.exchange_type}
                </div>
              </div>
              <div>{statusBadge}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', margin: '0.75rem 0', fontSize: '0.9rem' }}>
              {ex.exchange_type === 'BARTER' ? (
                <div><strong>Barter Swap:</strong> {offeredName} ⇄ {requestedName}</div>
              ) : (
                <>
                  <div><strong>Tutoring:</strong> Learning {requestedName} • <strong>Fee:</strong> ${ex.monetary_amount}</div>
                  <div>
                    <strong>Payment Escrow:</strong>{' '}
                    <span style={{ fontWeight: 600, color: '#4338ca' }}>{ex.payment_status}</span>
                  </div>
                </>
              )}
              {ex.session_details && (
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                  Details: {ex.session_details}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {/* Receiver can accept/reject pending requests */}
              {!isSender && ex.status === 'PENDING' && (
                <>
                  <button className="btn btn-success btn-sm" onClick={() => updateStatus(ex.id, 'ACCEPTED')}>Accept</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(ex.id, 'REJECTED')}>Decline</button>
                </>
              )}

              {/* Sender pays escrow for paid sessions */}
              {isSender && ex.monetary_amount > 0 && ex.payment_status === 'PAYMENT_PENDING' && (
                <button className="btn btn-primary btn-sm" onClick={() => paymentAction(ex.id, 'PAY_ESCROW')}>
                  💳 Pay ${ex.monetary_amount} into Escrow
                </button>
              )}

              {/* Sender releases funds after session */}
              {isSender && ex.payment_status === 'PAID_ESCROW' && (
                <button className="btn btn-success btn-sm" onClick={() => paymentAction(ex.id, 'RELEASE_TO_TEACHER')}>
                  ✅ Release Funds to Teacher (${ex.monetary_amount})
                </button>
              )}

              {/* Either party can mark as completed */}
              {(ex.status === 'ACCEPTED' || ex.status === 'IN_PROGRESS') && (
                <button className="btn btn-outline btn-sm" onClick={() => updateStatus(ex.id, 'COMPLETED')}>
                  Mark Session Completed
                </button>
              )}

              {ex.status === 'COMPLETED' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setReviewModal(ex.id); setReviewForm({ rating: 5, comment: '' }); }}
                >
                  ⭐ Leave Review &amp; Rating
                </button>
              )}
            </div>
          </div>
        );
      })}

      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="⭐ Leave a Review">
        <div>
          <div className="form-group">
            <label>Star Rating (1–5)</label>
            <input
              type="number" min={1} max={5}
              value={reviewForm.rating}
              onChange={e => setReviewForm(f => ({ ...f, rating: parseInt(e.target.value) || 5 }))}
            />
          </div>
          <div className="form-group">
            <label>Your Comment</label>
            <textarea
              placeholder="Share your experience with this exchange..."
              value={reviewForm.comment}
              onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitReview}>
            Submit Review
          </button>
        </div>
      </Modal>
    </div>
  );
}
