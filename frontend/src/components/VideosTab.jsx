import React, { useState, useEffect } from 'react';

export default function VideosTab() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    fetch('/api/courses/resources')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Loading course reference videos...</div>;
  }

  const modules = data?.modules || [];
  const filtered = filter === 'ALL' ? modules : modules.filter(m => m.category === filter);
  const isPaid = Boolean(data?.is_paid_learner);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#0f172a', margin: '0 0 4px 0' }}>Course Reference Videos & Special Resources 🎬</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            Watch high-yield conceptual lessons, code walkthroughs, and unlock exclusive curated blueprints & cheat sheets for paid sessions.
          </p>
        </div>
        <div className="system-status-pill" style={{ background: isPaid ? '#ecfdf5' : '#fef3c7', color: isPaid ? '#065f46' : '#92400e', borderColor: isPaid ? '#a7f3d0' : '#fde68a' }}>
          {isPaid ? '⭐ Verified Paid Learner: All Perks Unlocked!' : '⭐ Free Preview Active'}
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#312e81', fontSize: '1.05rem', margin: '0 0 4px 0' }}>⭐ Special Perks for Paid Mentorship Learners</h3>
        <p style={{ color: '#4338ca', fontSize: '0.85rem', margin: 0 }}>
          Learners who enroll in paid 1-on-1 tutoring sessions unlock permanent lifetime access to our downloadable architecture blueprints, FAANG cheat sheets, and practice problem sets!
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['ALL', 'Programming', 'System Design', 'Interview Prep'].map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(cat)}
          >
            {cat === 'ALL' ? 'All Courses' : cat}
          </button>
        ))}
      </div>

      <div>
        {filtered.map(mod => (
          <div key={mod.id} className="course-module-card">
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#4338ca', fontWeight: 700 }}>{mod.category}</span>
            <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: '0.2rem 0 0.4rem 0' }}>{mod.skill_name}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>{mod.overview}</p>

            <h4 style={{ fontSize: '0.92rem', color: '#334155', marginBottom: '0.75rem' }}>🎥 Reference Videos ({mod.reference_videos.length})</h4>
            <div className="video-card-grid">
              {mod.reference_videos.map(v => (
                <div key={v.id} className="reference-video-card">
                  <div>
                    <div className="video-thumb-preview" onClick={() => setActiveVideo(v)}>
                      <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{v.thumbnail_icon || '💻'}</div>
                      <div className="video-thumb-play-icon">▶</div>
                      <span className="video-duration-pill">⏱️ {v.duration}</span>
                    </div>
                    <h5 style={{ fontSize: '0.92rem', color: '#0f172a', margin: '0 0 4px 0' }}>{v.title}</h5>
                    <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, marginBottom: '6px' }}>By {v.instructor}</div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 8px 0' }}>{v.summary}</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {v.topics.map(t => (
                        <span key={t} style={{ fontSize: '0.7rem', background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveVideo(v)}>▶ Watch Video</button>
                </div>
              ))}
            </div>

            <div className="paid-perk-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="paid-perk-badge">Special Perks</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isPaid ? '#059669' : '#b45309' }}>
                  {isPaid ? '✅ Unlocked for your account' : '🔒 Unlocked with paid tutoring'}
                </span>
              </div>
              <div className="resource-list-grid">
                {mod.special_resources.map(r => (
                  <div key={r.id} className="resource-item-card">
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700 }}>{r.perk_category}</span>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', margin: '2px 0 4px 0' }}>{r.title}</div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px 0' }}>{r.description}</p>
                    </div>
                    <button
                      className={`btn btn-sm ${isPaid ? 'btn-success' : 'btn-outline'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => alert(isPaid ? `Downloading ${r.title}` : '🔒 Enrolling in any paid tutoring session unlocks this resource!')}
                    >
                      {isPaid ? '📥 Download' : '🔒 View Perk'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeVideo && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setActiveVideo(null)}>
          <div className="modal-content" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeVideo.title}</h3>
              <button className="close-modal-btn" onClick={() => setActiveVideo(null)}>&times;</button>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', background: '#000', marginBottom: '1rem' }}>
              <iframe
                src={`${activeVideo.video_url}?autoplay=1`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{activeVideo.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
