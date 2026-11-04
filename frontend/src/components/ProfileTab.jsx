import React, { useState, useEffect } from 'react';
import { skillsApi, authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';

export default function ProfileTab() {
  const { currentUser, fetchMe } = useAuth();
  const [form, setForm] = useState({
    display_name: '', full_name: '', phone: '', company: '', job_title: '', bio: '',
    is_confidential: false, is_confidential_teacher: false, is_confidential_learner: false,
    show_phone: false, show_email: false, show_real_name: true, show_company: true,
  });
  const [masterSkills, setMasterSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [skillForm, setSkillForm] = useState({
    skill_id: '', skill_type: 'TEACH', proficiency_level: 'INTERMEDIATE',
    hourly_rate: 0, exchange_preference: 'BARTER_ONLY',
    explanation_style: '', learning_goal: '', is_confidential: false,
  });

  useEffect(() => {
    skillsApi.masterList().then(setMasterSkills).catch(() => {});
    loadMySkills();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setForm({
        display_name:           currentUser.display_name          || '',
        full_name:              currentUser.full_name             || '',
        phone:                  currentUser.phone                 || '',
        company:                currentUser.company               || '',
        job_title:              currentUser.job_title             || '',
        bio:                    currentUser.bio                   || '',
        is_confidential:        !!currentUser.is_confidential,
        is_confidential_teacher: !!currentUser.is_confidential_teacher,
        is_confidential_learner: !!currentUser.is_confidential_learner,
        show_phone:             !!currentUser.show_phone,
        show_email:             !!currentUser.show_email,
        show_real_name:         currentUser.show_real_name  !== undefined ? !!currentUser.show_real_name  : true,
        show_company:           currentUser.show_company    !== undefined ? !!currentUser.show_company    : true,
      });
    }
  }, [currentUser]);

  async function loadMySkills() {
    try {
      // UserSkillResponse has nested skill object: s.skill.name
      const s = await skillsApi.mySkills();
      setMySkills(Array.isArray(s) ? s : []);
    } catch { setMySkills([]); }
  }

  async function saveProfile() {
    try {
      await authApi.updateMe(form);
      await fetchMe();
      showToast('Profile & privacy settings saved!');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function addSkill() {
    if (!skillForm.skill_id) { showToast('Please select a skill', 'error'); return; }
    try {
      await skillsApi.addSkill({
        skill_id:          parseInt(skillForm.skill_id),
        skill_type:        skillForm.skill_type,
        is_confidential:   skillForm.is_confidential,
        proficiency_level: skillForm.proficiency_level,
        hourly_rate:       parseFloat(skillForm.hourly_rate) || 0,
        exchange_preference: skillForm.exchange_preference,
        explanation_style: skillForm.explanation_style || null,
        learning_goal:     skillForm.learning_goal     || null,
        years_of_experience: 2.0,
      });
      showToast('Skill added to profile!');
      setSkillForm(f => ({ ...f, skill_id: '', explanation_style: '', learning_goal: '' }));
      loadMySkills();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function removeSkill(id) {
    try {
      await skillsApi.deleteSkill(id);
      showToast('Skill removed');
      loadMySkills();
    } catch (err) { showToast(err.message, 'error'); }
  }

  const isMasterConf  = form.is_confidential;
  const isTeacherConf = isMasterConf || form.is_confidential_teacher;
  const isLearnerConf = isMasterConf || form.is_confidential_learner;

  return (
    <div>
      <div className="page-intro">
        <div>
          <h2>Profile &amp; Confidentiality Settings</h2>
          <p>Manage your public identity, toggle anonymous mode, and maintain the list of skills you teach or want to learn.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

        {/* ── Privacy & Profile Card ── */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginBottom: '0.75rem' }}>Identity &amp; Role Confidentiality Options</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              Decide whether to reveal your real identity or remain anonymous when offering to teach or seeking to learn.
            </p>

            {/* Live Privacy Preview */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.9rem', fontSize: '0.85rem', lineHeight: 1.45, marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Live Privacy Status:</div>
              <div style={{ marginBottom: '0.25rem' }}>
                👨‍🏫 <strong>Teaching Profile:</strong>{' '}
                {isTeacherConf
                  ? <span style={{ color: '#92400e', fontWeight: 600 }}>🔒 Confidential (identity masked)</span>
                  : <span style={{ color: '#1e40af', fontWeight: 600 }}>👁️ Public (full profile visible)</span>}
              </div>
              <div style={{ marginBottom: '0.25rem' }}>
                🎓 <strong>Learner Profile:</strong>{' '}
                {isLearnerConf
                  ? <span style={{ color: '#92400e', fontWeight: 600 }}>🔒 Confidential (identity masked)</span>
                  : <span style={{ color: '#1e40af', fontWeight: 600 }}>👁️ Public (full profile visible)</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem', marginTop: '0.35rem' }}>
                📞 Phone: <strong>{form.show_phone ? '👁️ Shown' : '🔒 Hidden'}</strong> &nbsp;•&nbsp;
                ✉️ Email: <strong>{form.show_email ? '👁️ Shown' : '🔒 Hidden'}</strong>
              </div>
            </div>

            {/* Master confidential */}
            <ConfToggle id="is_confidential" label="Master Anonymous Mode (All Roles)"
              sub="Keep identity 100% confidential everywhere on SkillBridge."
              bg="#f8fafc" border="#e2e8f0" color="#64748b"
              checked={form.is_confidential}
              onChange={v => setForm(f => ({ ...f, is_confidential: v }))} />

            {/* Teacher confidential */}
            <ConfToggle id="is_confidential_teacher" label="👨‍🏫 Teacher Confidentiality"
              sub="When offering to teach, hide real name, company, and bio."
              bg="#fefce8" border="#fef08a" color="#854d0e"
              checked={form.is_confidential_teacher}
              onChange={v => setForm(f => ({ ...f, is_confidential_teacher: v }))} />

            {/* Learner confidential */}
            <ConfToggle id="is_confidential_learner" label="🎓 Learner Confidentiality"
              sub="When seeking to be taught, hide real name and personal info."
              bg="#eff6ff" border="#bfdbfe" color="#1e40af"
              checked={form.is_confidential_learner}
              onChange={v => setForm(f => ({ ...f, is_confidential_learner: v }))} />

            {/* Granular visibility */}
            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>📋 Selective Personal Details Control</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Choose exactly which items are visible to people browsing the catalog:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  ['show_phone',     '📞 Show Phone Number'],
                  ['show_email',     '✉️ Show Email Address'],
                  ['show_real_name', '👤 Show Real Full Name (uncheck to show only Display Name)'],
                  ['show_company',   '🏢 Show Current Company & Job Title'],
                ].map(([field, label]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.checked }))}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Profile fields */}
            <div className="form-group">
              <label>Public Display Name / Alias (Always Visible):</label>
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Full Real Name (Hidden in confidential mode):</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Email Address (Always Private):</label>
              <input value={currentUser?.email || ''} disabled style={{ background: '#f1f5f9' }} />
            </div>
            <div className="form-group">
              <label>Phone Number:</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Company:</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Job Title:</label>
                <input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Bio / Background:</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveProfile}>
              💾 Save Profile &amp; Privacy Settings
            </button>
          </div>
        </div>

        {/* ── Skills Management Card ── */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginBottom: '0.75rem' }}>My Skills (Teaching &amp; Learning)</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              List what you can teach and what you want to learn to enable automatic barter matching.
            </p>

            {/* Existing skills */}
            <div style={{ marginBottom: '1.25rem' }}>
              {mySkills.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>You haven't added any skills yet.</div>
              ) : mySkills.map(s => {
                const isTeacher = s.skill_type === 'TEACH';
                // UserSkillResponse has nested skill object: s.skill.name
                const skillName = s.skill?.name || `Skill #${s.skill_id}`;
                return (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className={`badge-tag ${isTeacher ? 'badge-barter' : 'badge-free'}`}>
                        {isTeacher ? '👨‍🏫 TEACH' : '🎓 LEARN'}
                      </span>
                      <span
                        className="badge-tag"
                        style={{ background: s.is_confidential ? '#fef3c7' : '#eff6ff', color: s.is_confidential ? '#92400e' : '#1e40af', marginLeft: '4px' }}
                      >
                        {s.is_confidential ? '🔒 Confidential' : '👁️ Public'}
                      </span>
                      <strong style={{ marginLeft: '0.4rem', color: '#1e293b' }}>{skillName}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.4rem' }}>({s.proficiency_level})</span>
                      {s.hourly_rate > 0 && <span style={{ fontSize: '0.8rem', color: '#991b1b', marginLeft: '0.4rem' }}>Fee: ${s.hourly_rate}/hr</span>}
                      {isTeacher && s.explanation_style && (
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px' }}><strong>Style:</strong> {s.explanation_style}</div>
                      )}
                      {!isTeacher && s.learning_goal && (
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px' }}><strong>Goal:</strong> {s.learning_goal}</div>
                      )}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => removeSkill(s.id)}>✕ Remove</button>
                  </div>
                );
              })}
            </div>

            {/* Add skill form */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.75rem' }}>➕ Add Skill to Profile</h4>

              <div className="form-group">
                <label>Select Master Skill:</label>
                <select
                  className="select-input" style={{ width: '100%' }}
                  value={skillForm.skill_id}
                  onChange={e => setSkillForm(f => ({ ...f, skill_id: e.target.value }))}
                >
                  <option value="">-- Select Skill --</option>
                  {masterSkills.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Role:</label>
                  <select
                    className="select-input" style={{ width: '100%' }}
                    value={skillForm.skill_type}
                    onChange={e => setSkillForm(f => ({ ...f, skill_type: e.target.value }))}
                  >
                    <option value="TEACH">👨‍🏫 I want to TEACH this</option>
                    <option value="LEARN">🎓 I want to get TAUGHT this</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Proficiency:</label>
                  <select
                    className="select-input" style={{ width: '100%' }}
                    value={skillForm.proficiency_level}
                    onChange={e => setSkillForm(f => ({ ...f, proficiency_level: e.target.value }))}
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
              </div>

              {skillForm.skill_type === 'TEACH' ? (
                <div className="form-group">
                  <label>What are you good at explaining? (Teaching Style):</label>
                  <input
                    placeholder="e.g. Explains pointer memory, live debugging, visual analogies..."
                    value={skillForm.explanation_style}
                    onChange={e => setSkillForm(f => ({ ...f, explanation_style: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>What do you want explained? (Learning Goal):</label>
                  <input
                    placeholder="e.g. Need help with multithreading, system design interview prep..."
                    value={skillForm.learning_goal}
                    onChange={e => setSkillForm(f => ({ ...f, learning_goal: e.target.value }))}
                  />
                </div>
              )}

              {/* Per-listing confidentiality */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: '#fff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '0.75rem' }}>
                <input
                  type="checkbox" id="skill-conf"
                  checked={skillForm.is_confidential}
                  onChange={e => setSkillForm(f => ({ ...f, is_confidential: e.target.checked }))}
                  style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer' }}
                />
                <label htmlFor="skill-conf" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <strong>🔒 Keep Identity Confidential for this listing</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                    Only your alias and this skill will be visible. Your name and personal details will be hidden.
                  </span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Exchange Preference:</label>
                  <select
                    className="select-input" style={{ width: '100%' }}
                    value={skillForm.exchange_preference}
                    onChange={e => setSkillForm(f => ({ ...f, exchange_preference: e.target.value }))}
                  >
                    <option value="BARTER_ONLY">Barter Only (Free)</option>
                    <option value="PAID_ONLY">Demands Payment</option>
                    <option value="BOTH">Open to Both</option>
                    <option value="VOLUNTEER_FREE">Volunteer (Free)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Hourly Rate Demanded ($):</label>
                  <input
                    type="number" min={0} step={1}
                    value={skillForm.hourly_rate}
                    onChange={e => setSkillForm(f => ({ ...f, hourly_rate: e.target.value }))}
                  />
                </div>
              </div>

              <button className="btn btn-success" style={{ width: '100%' }} onClick={addSkill}>
                Add Skill to Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfToggle({ id, label, sub, bg, border, color, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: bg, padding: '0.75rem 0.85rem', borderRadius: '8px', border: `1px solid ${border}`, marginBottom: '0.5rem' }}>
      <input
        type="checkbox" id={id} checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 20, height: 20, marginTop: 2, cursor: 'pointer' }}
      />
      <label htmlFor={id} style={{ margin: 0, cursor: 'pointer' }}>
        <strong>{label}</strong>
        <span style={{ display: 'block', fontSize: '0.75rem', color, fontWeight: 'normal' }}>{sub}</span>
      </label>
    </div>
  );
}
