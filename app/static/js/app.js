// SkillBridge Frontend Application Logic

const API_BASE = '/api';

// Current State
let currentUser = null;
let currentToken = localStorage.getItem('skillbridge_token') || null;
let masterSkills = [];

// Demo accounts for instant 1-click evaluation
const DEMO_USERS = {
  alice: { email: 'alice@skillbridge.dev', pass: 'pass123', label: 'Alice Chen (Knows C++, Wants Java)' },
  bob: { email: 'bob@skillbridge.dev', pass: 'pass123', label: 'Bob Smith (Knows Java, Wants C++)' },
  confidential: { email: 'anonymous_guru@skillbridge.dev', pass: 'pass123', label: 'StealthCodeExpert (Confidential Mode ON)' },
  sarah: { email: 'sarah.google@skillbridge.dev', pass: 'pass123', label: 'Sarah Jenkins (Google Staff Eng - Free AMA)' },
  rahul: { email: 'rahul.amazon@skillbridge.dev', pass: 'pass123', label: 'Rahul Sharma (Amazon Solutions Arch - $25/hr)' }
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  await loadMasterSkills();
  await checkAuthStatus();
  loadTeacherCatalog();
  loadBarterMatches();
  loadQuestionBank();
  loadCompanyMentors();
  loadMentorQuestions();
});

// Navigation Handling
function setupNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add('active');

      // Refresh data when navigating
      if (tab.dataset.target === 'tab-catalog') loadTeacherCatalog();
      if (tab.dataset.target === 'tab-barter') loadBarterMatches();
      if (tab.dataset.target === 'tab-questions') loadQuestionBank();
      if (tab.dataset.target === 'tab-mentors') { loadCompanyMentors(); loadMentorQuestions(); }
      if (tab.dataset.target === 'tab-exchanges') loadMyExchanges();
      if (tab.dataset.target === 'tab-profile') loadMyProfile();
    });
  });
}

// Master Skills Fetch
async function loadMasterSkills() {
  try {
    const res = await fetch(`${API_BASE}/skills`);
    masterSkills = await res.json();
    populateSkillSelects();
  } catch (err) {
    console.error('Failed to load master skills:', err);
  }
}

function populateSkillSelects() {
  const selects = ['filter-skill-select', 'req-offer-skill', 'req-want-skill', 'profile-skill-select'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value;
    el.innerHTML = id.includes('filter') ? '<option value="">All Skills</option>' : '<option value="">-- Select Skill --</option>';
    masterSkills.forEach(s => {
      el.innerHTML += `<option value="${s.id}">${s.name} (${s.category})</option>`;
    });
    if (currentVal) el.value = currentVal;
  });
}

// Authentication & Persona Switching
async function checkAuthStatus() {
  if (!currentToken) {
    // Auto-login as Alice by default for seamless instant demo!
    await switchDemoPersona('alice');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      currentUser = await res.json();
      updateHeaderUserUI();
    } else {
      localStorage.removeItem('skillbridge_token');
      currentToken = null;
      await switchDemoPersona('alice');
    }
  } catch (err) {
    console.error('Auth check error:', err);
  }
}

async function switchDemoPersona(key) {
  const demo = DEMO_USERS[key];
  if (!demo) return;
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demo.email, password: demo.pass })
    });
    const data = await res.json();
    if (res.ok) {
      currentToken = data.access_token;
      localStorage.setItem('skillbridge_token', currentToken);
      
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      currentUser = await meRes.json();
      updateHeaderUserUI();
      showToast(`Switched active persona to ${currentUser.display_name}`);
      
      // Refresh views
      loadTeacherCatalog();
      loadBarterMatches();
      loadMyExchanges();
      loadMyProfile();
    }
  } catch (err) {
    console.error('Error switching persona:', err);
  }
}

function updateHeaderUserUI() {
  const container = document.getElementById('user-header-info');
  if (!container || !currentUser) return;

  const confBadge = currentUser.is_confidential
    ? `<span class="confidential-pill active" title="Your identity is confidential. Only display name and teaching abilities are public.">🔒 Confidential Mode: ON</span>`
    : `<span class="confidential-pill inactive" title="Your full name, bio, and company are visible publicly.">👁️ Public Identity</span>`;

  container.innerHTML = `
    <div style="text-align: right; line-height: 1.2;">
      <div style="font-weight: 700; font-size: 0.95rem;">${currentUser.display_name}</div>
      <div style="font-size: 0.75rem; color: #94a3b8;">${currentUser.email}</div>
    </div>
    ${confBadge}
  `;
}

// 1. TEACHER CATALOG
async function loadTeacherCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="padding: 2rem; color: #64748b;">Loading skill catalog...</div>';

  const skillFilter = document.getElementById('filter-skill-select')?.value || '';
  const modeFilter = document.getElementById('filter-mode-select')?.value || '';
  const confidentialFilter = document.getElementById('filter-confidential-select')?.value || '';
  const search = document.getElementById('catalog-search')?.value || '';

  let url = `${API_BASE}/skills/catalog?`;
  if (skillFilter) url += `skill_id=${skillFilter}&`;
  if (modeFilter) url += `exchange_mode=${modeFilter}&`;
  if (confidentialFilter !== '') url += `confidential_only=${confidentialFilter}&`;
  if (search) url += `skill_name=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url);
    const catalog = await res.json();
    if (!catalog.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #64748b;">No teachers found matching your filters.</div>';
      return;
    }

    grid.innerHTML = catalog.map(item => {
      const isMe = currentUser && currentUser.id === item.user_id;
      const privacyBadge = item.is_confidential 
        ? `<span class="confidential-pill active" title="Identity protected: only alias & skills shown">🔒 Anonymous Mentor</span>` 
        : (item.company ? `<span class="author-company">🏢 ${item.company}</span>` : `<span style="font-size: 0.8rem; color: #64748b;">Verified Peer</span>`);

      let modeBadge = '';
      if (item.exchange_preference === 'BARTER_ONLY') {
        modeBadge = '<span class="badge-tag badge-barter">Skill Barter (Free Swap)</span>';
      } else if (item.exchange_preference === 'PAID_ONLY') {
        modeBadge = `<span class="badge-tag badge-paid">Paid Tutoring ($${item.hourly_rate}/hr)</span>`;
      } else if (item.exchange_preference === 'VOLUNTEER_FREE') {
        modeBadge = '<span class="badge-tag badge-free">Free Mentorship</span>';
      } else {
        modeBadge = `<span class="badge-tag badge-barter">Barter</span> <span class="badge-tag badge-paid">$${item.hourly_rate}/hr</span>`;
      }

      return `
        <div class="card">
          <div>
            <div class="card-header">
              <div class="author-info">
                <h4>${item.display_name}</h4>
                ${privacyBadge}
              </div>
              <span style="font-size: 0.8rem; background: #f1f5f9; padding: 2px 8px; border-radius: 6px;">
                ${item.proficiency_level}
              </span>
            </div>
            
            <div class="card-body">
              <h3>${item.skill_name}</h3>
              <p style="font-size: 0.8rem; color: #6366f1; font-weight: 600; margin-bottom: 0.5rem;">${item.category}</p>
              <div class="card-desc">
                <strong>Explaining Style:</strong> ${item.explanation_style || 'Explains concepts clearly with real-world examples.'}
              </div>
              <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.75rem;">
                ⏳ <strong>Experience:</strong> ${item.years_of_experience} yrs
              </div>
              <div>${modeBadge}</div>
            </div>
          </div>

          <div class="card-footer">
            <div class="price-tag">
              ${item.hourly_rate > 0 ? `$${item.hourly_rate} <span style="font-size: 0.75rem; font-weight: normal; color: #64748b;">/hr</span>` : `<span style="color: #059669;">Free / Barter</span>`}
            </div>
            ${isMe 
              ? `<span style="font-size: 0.8rem; color: #64748b; font-weight: 600;">(Your Listing)</span>` 
              : `<button class="btn btn-primary btn-sm" onclick="openExchangeModal(${item.user_id}, '${escapeHtml(item.display_name)}', '${escapeHtml(item.skill_name)}', ${item.hourly_rate}, '${item.exchange_preference}')">
                  Exchange / Request
                </button>`
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = '<div style="color: #ef4444; padding: 2rem;">Error loading catalog.</div>';
  }
}

// 2. SMART BARTER MATCHER
async function loadBarterMatches() {
  const container = document.getElementById('barter-matches-container');
  if (!container) return;

  if (!currentToken) {
    container.innerHTML = '<div style="padding: 2rem; color: #64748b;">Log in to discover 2-way barter matches.</div>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/skills/match`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    
    if (!data.matches || !data.matches.length) {
      container.innerHTML = `
        <div style="background: #fff; padding: 2rem; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
          <h3 style="color: #0f172a; margin-bottom: 0.5rem;">No Direct 2-Way Barter Matches Right Now</h3>
          <p style="color: #64748b; max-width: 600px; margin: 0 auto 1.5rem;">
            A 2-way barter match occurs when another person teaches what you want to learn AND wants to learn what you teach (for instance, <strong>Alice knows C++ and wants Java</strong>, while <strong>Bob knows Java and wants C++</strong>!).
          </p>
          <button class="btn btn-primary" onclick="document.querySelector('[data-target=\\'tab-profile\\']').click()">
            Manage Your Teach & Learn Skills
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = data.matches.map(m => `
      <div class="match-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="color: #4338ca; font-size: 1.2rem;">🤝 Perfect 2-Way Skill Barter Match!</h3>
            <p style="color: #64748b; font-size: 0.9rem;">Zero cost ($0). Teach each other what you know best.</p>
          </div>
          <span class="badge-tag badge-barter">100% Barter Match</span>
        </div>

        <div class="match-swap-box">
          <div style="text-align: center;">
            <div style="font-size: 0.8rem; color: #64748b;">YOU TEACH</div>
            <div style="font-size: 1.1rem; color: #065f46; font-weight: 700;">${m.peer_wants_to_learn}</div>
          </div>
          <div style="font-size: 1.5rem; color: #4f46e5;">⇄</div>
          <div style="text-align: center;">
            <div style="font-size: 0.8rem; color: #64748b;">${m.peer_display_name} TEACHES YOU</div>
            <div style="font-size: 1.1rem; color: #1e40af; font-weight: 700;">${m.peer_teaches}</div>
          </div>
        </div>

        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 1rem;">
          <strong>Peer Explanation Style:</strong> ${m.peer_explanation_style || 'Direct code walkthroughs and diagrams.'}
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" onclick="openBarterRequestModal(${m.peer_user_id}, '${escapeHtml(m.peer_display_name)}', '${escapeHtml(m.peer_wants_to_learn)}', '${escapeHtml(m.peer_teaches)}')">
            Initiate $0 Skill Barter Swap
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444;">Error finding barter matches.</div>';
  }
}

// 3. COMPANY INTERVIEW & TRAINING QUESTION BANK
async function loadQuestionBank() {
  const container = document.getElementById('questions-list-container');
  if (!container) return;
  container.innerHTML = '<div style="padding: 2rem; color: #64748b;">Loading company questions...</div>';

  const company = document.getElementById('filter-company-select')?.value || '';
  const difficulty = document.getElementById('filter-difficulty-select')?.value || '';
  const search = document.getElementById('question-search')?.value || '';

  let url = `${API_BASE}/questions?`;
  if (company) url += `company=${encodeURIComponent(company)}&`;
  if (difficulty) url += `difficulty=${encodeURIComponent(difficulty)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url);
    const questions = await res.json();
    if (!questions.length) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #64748b;">No interview questions found. Be the first to contribute one!</div>';
      return;
    }

    container.innerHTML = questions.map(q => `
      <div class="question-card" id="q-card-${q.id}">
        <div class="question-meta">
          <span class="company-tag">🏢 ${q.company_name}</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #475569;">${q.role}</span>
          <span style="font-size: 0.8rem; color: #64748b;">• ${q.round_type}</span>
          <span class="difficulty-tag ${q.difficulty}" style="font-size: 0.75rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
            ${q.difficulty}
          </span>
        </div>

        <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 0.75rem; line-height: 1.4;">
          ${escapeHtml(q.question_text)}
        </h3>

        ${q.tags ? `<div style="margin-bottom: 0.75rem;">
          ${q.tags.split(',').map(t => `<span style="display: inline-block; background: #eef2ff; color: #4338ca; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; margin-right: 4px;">#${t.trim()}</span>`).join('')}
        </div>` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="toggleSolution(${q.id})">
            💡 Toggle Solution & Explanation
          </button>
          
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button class="btn btn-outline btn-sm" onclick="upvoteQuestion(${q.id})" id="vote-btn-${q.id}">
              👍 Upvote (<span id="upvote-count-${q.id}">${q.upvotes_count}</span>)
            </button>
            <span style="font-size: 0.75rem; color: #94a3b8;">
              Contributed by: ${q.author ? q.author.display_name : 'Anonymous'}
            </span>
          </div>
        </div>

        <div class="solution-box" id="sol-box-${q.id}">
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Comprehensive Explanation & Solution:</div>
          <div>${renderMarkdown(q.answer_explanation)}</div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444;">Error loading questions.</div>';
  }
}

function toggleSolution(qid) {
  const el = document.getElementById(`sol-box-${qid}`);
  if (el) el.classList.toggle('open');
}

async function upvoteQuestion(qid) {
  if (!currentToken) {
    showToast('Please log in to upvote questions', 'error');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/questions/${qid}/vote`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById(`upvote-count-${qid}`).innerText = data.upvotes_count;
      showToast(data.user_voted ? 'Upvoted question!' : 'Removed upvote');
    }
  } catch (err) {
    console.error('Vote error:', err);
  }
}

// 4. COMPANY MENTORS & DIRECT Q&A
async function loadCompanyMentors() {
  const container = document.getElementById('company-mentors-grid');
  if (!container) return;
  container.innerHTML = '<div style="padding: 2rem; color: #64748b;">Loading company mentors...</div>';

  try {
    const res = await fetch(`${API_BASE}/company-mentors`);
    const mentors = await res.json();
    if (!mentors.length) {
      container.innerHTML = '<div style="padding: 2rem; color: #64748b;">No company mentors currently listed.</div>';
      return;
    }

    container.innerHTML = mentors.map(m => {
      const isMe = currentUser && currentUser.id === m.user_id;
      return `
        <div class="card">
          <div>
            <div class="card-header">
              <div class="author-info">
                <h4>${m.user.display_name}</h4>
                <span class="author-company">🏢 ${m.company_name}</span>
              </div>
              ${m.can_give_referral ? `<span class="badge-tag badge-barter">🎯 Can Refer</span>` : ''}
            </div>

            <div class="card-body">
              <div style="font-weight: 600; font-size: 0.95rem; color: #1e293b; margin-bottom: 0.25rem;">
                ${m.job_title}
              </div>
              <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.75rem;">
                ${m.department ? `${m.department} • ` : ''}${m.years_of_experience} yrs in company
              </div>

              <div class="card-desc">
                <strong>Topics Open for Q&A:</strong><br>
                ${m.topics_open_for_questions || 'Interviews, system design, corporate training, career guidance.'}
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="price-tag">
              ${m.hourly_fee > 0 ? `$${m.hourly_fee} <span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">/hr</span>` : '<span style="color: #059669;">Free Q&A / AMA</span>'}
            </div>
            ${isMe 
              ? `<span style="font-size: 0.8rem; color: #64748b;">(Your Profile)</span>`
              : `<button class="btn btn-primary btn-sm" onclick="openAskMentorModal(${m.user_id}, '${escapeHtml(m.user.display_name)}', '${escapeHtml(m.company_name)}')">
                  Ask Direct Question
                </button>`
            }
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444;">Error loading company mentors.</div>';
  }
}

async function loadMentorQuestions() {
  const container = document.getElementById('mentor-qa-feed');
  if (!container) return;

  try {
    const headers = currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {};
    const res = await fetch(`${API_BASE}/company-mentors/questions`, { headers });
    const questions = await res.json();

    if (!questions.length) {
      container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #64748b;">No direct Q&A threads yet. Be the first to ask a company mentor!</div>';
      return;
    }

    container.innerHTML = questions.map(q => {
      const isMentor = currentUser && currentUser.id === q.mentor_user_id;
      const isAnswered = q.status === 'ANSWERED' && q.mentor_response;

      return `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="font-size: 0.8rem; color: #64748b;">Question for:</span>
              <strong style="color: #4338ca;">${q.mentor.display_name}</strong>
              <span style="font-size: 0.75rem; color: #94a3b8;">• Asked by ${q.asker.display_name}</span>
            </div>
            <span class="badge-tag ${isAnswered ? 'badge-barter' : 'badge-free'}">
              ${isAnswered ? '✓ Answered by Mentor' : '⏳ Waiting for Reply'}
            </span>
          </div>

          <h4 style="font-size: 1.05rem; color: #0f172a; margin-bottom: 0.4rem;">${escapeHtml(q.title)}</h4>
          <p style="font-size: 0.9rem; color: #475569; margin-bottom: 0.75rem; line-height: 1.45;">
            ${escapeHtml(q.question_text)}
          </p>

          ${isAnswered ? `
            <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 0.9rem; border-radius: 0 8px 8px 0; margin-top: 0.5rem;">
              <div style="font-size: 0.8rem; font-weight: 700; color: #065f46; margin-bottom: 0.25rem;">
                Official Response from ${q.mentor.display_name}:
              </div>
              <div style="font-size: 0.9rem; color: #1e293b; line-height: 1.45;">
                ${escapeHtml(q.mentor_response)}
              </div>
            </div>
          ` : ''}

          ${(!isAnswered && isMentor) ? `
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
              <input type="text" id="mentor-reply-input-${q.id}" class="search-input" placeholder="Type your professional reply here..." style="font-size: 0.85rem;">
              <button class="btn btn-success btn-sm" onclick="submitMentorReply(${q.id})">Send Reply</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444;">Error loading Q&A feed.</div>';
  }
}

async function submitMentorReply(qid) {
  const input = document.getElementById(`mentor-reply-input-${qid}`);
  if (!input || !input.value.trim()) return;

  try {
    const res = await fetch(`${API_BASE}/company-mentors/questions/${qid}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ mentor_response: input.value.trim() })
    });
    if (res.ok) {
      showToast('Answer posted successfully!');
      loadMentorQuestions();
    }
  } catch (err) {
    console.error('Reply error:', err);
  }
}

// 5. MY EXCHANGES & SESSIONS
async function loadMyExchanges() {
  const container = document.getElementById('my-exchanges-container');
  if (!container) return;

  if (!currentToken) {
    container.innerHTML = '<div style="padding: 2rem; color: #64748b;">Please log in to view your exchanges.</div>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/exchanges`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const exchanges = await res.json();

    if (!exchanges.length) {
      container.innerHTML = `
        <div style="background: #fff; padding: 2rem; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
          <h3 style="color: #0f172a; margin-bottom: 0.5rem;">No Exchange Requests Yet</h3>
          <p style="color: #64748b;">Browse the catalog or barter matcher to initiate a skill swap or tutoring session!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = exchanges.map(ex => {
      const isSender = currentUser.id === ex.sender_id;
      const otherUser = isSender ? ex.receiver : ex.sender;
      const roleText = isSender ? 'Sent to' : 'Received from';

      let statusBadge = '';
      if (ex.status === 'PENDING') statusBadge = '<span class="badge-tag badge-free">Pending</span>';
      else if (ex.status === 'ACCEPTED') statusBadge = '<span class="badge-tag badge-barter">Accepted</span>';
      else if (ex.status === 'IN_PROGRESS') statusBadge = '<span class="badge-tag badge-barter">In Progress</span>';
      else if (ex.status === 'COMPLETED') statusBadge = '<span class="badge-tag badge-barter">Completed</span>';
      else statusBadge = '<span class="badge-tag badge-paid">Cancelled</span>';

      return `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="font-size: 0.8rem; color: #64748b;">${roleText}:</span>
              <strong style="color: #1e293b; font-size: 1.05rem;">${otherUser.display_name}</strong>
              ${otherUser.is_confidential ? `<span class="confidential-pill active" style="margin-left: 4px;">🔒 Confidential</span>` : ''}
              <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">Type: ${ex.exchange_type}</div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div style="background: #f8fafc; padding: 0.75rem 1rem; border-radius: 8px; margin: 0.75rem 0; font-size: 0.9rem;">
            ${ex.exchange_type === 'BARTER' ? `
              <div><strong>Barter Swap:</strong> ${ex.sender_offered_skill ? ex.sender_offered_skill.name : 'Skill'} ⇄ ${ex.receiver_requested_skill ? ex.receiver_requested_skill.name : 'Skill'}</div>
            ` : `
              <div><strong>Tutoring:</strong> Learning ${ex.receiver_requested_skill ? ex.receiver_requested_skill.name : 'Skill'} • <strong>Fee:</strong> $${ex.monetary_amount}</div>
              <div><strong>Payment Escrow Status:</strong> <span style="font-weight: 600; color: #4338ca;">${ex.payment_status}</span></div>
            `}
            ${ex.session_details ? `<div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Details: ${escapeHtml(ex.session_details)}</div>` : ''}
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
            ${(!isSender && ex.status === 'PENDING') ? `
              <button class="btn btn-success btn-sm" onclick="updateExchangeStatus(${ex.id}, 'ACCEPTED')">Accept</button>
              <button class="btn btn-secondary btn-sm" onclick="updateExchangeStatus(${ex.id}, 'REJECTED')">Decline</button>
            ` : ''}

            ${(isSender && ex.monetary_amount > 0 && ex.payment_status === 'PAYMENT_PENDING') ? `
              <button class="btn btn-primary btn-sm" onclick="triggerPaymentAction(${ex.id}, 'PAY_ESCROW')">
                💳 Pay $${ex.monetary_amount} into Escrow
              </button>
            ` : ''}

            ${(isSender && ex.payment_status === 'PAID_ESCROW') ? `
              <button class="btn btn-success btn-sm" onclick="triggerPaymentAction(${ex.id}, 'RELEASE_TO_TEACHER')">
                ✅ Release Funds to Teacher ($${ex.monetary_amount})
              </button>
            ` : ''}

            ${(ex.status === 'ACCEPTED' || ex.status === 'IN_PROGRESS') ? `
              <button class="btn btn-outline btn-sm" onclick="updateExchangeStatus(${ex.id}, 'COMPLETED')">
                Mark Session Completed
              </button>
            ` : ''}

            ${ex.status === 'COMPLETED' ? `
              <button class="btn btn-secondary btn-sm" onclick="openReviewModal(${ex.id})">
                ⭐ Leave Review & Rating
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444;">Error loading exchanges.</div>';
  }
}

async function updateExchangeStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/exchanges/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Exchange marked as ${newStatus}`);
      loadMyExchanges();
    }
  } catch (err) {
    console.error('Update status error:', err);
  }
}

async function triggerPaymentAction(id, action) {
  try {
    const res = await fetch(`${API_BASE}/exchanges/${id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ action: action, payment_method: 'WALLET_ESCROW' })
    });
    if (res.ok) {
      showToast(`Payment action '${action}' completed successfully!`);
      loadMyExchanges();
    }
  } catch (err) {
    console.error('Payment error:', err);
  }
}

// 6. MY PROFILE & PRIVACY CONTROLS
async function loadMyProfile() {
  if (!currentUser) return;

  // Form fields
  document.getElementById('prof-display-name').value = currentUser.display_name;
  document.getElementById('prof-full-name').value = currentUser.full_name;
  document.getElementById('prof-email').value = currentUser.email;
  document.getElementById('prof-phone').value = currentUser.phone || '';
  document.getElementById('prof-company').value = currentUser.company || '';
  document.getElementById('prof-job-title').value = currentUser.job_title || '';
  document.getElementById('prof-bio').value = currentUser.bio || '';
  document.getElementById('prof-confidential-toggle').checked = currentUser.is_confidential;

  updatePrivacyPreview(currentUser.is_confidential);
  loadMyUserSkills();
}

function updatePrivacyPreview(isConfidential) {
  const preview = document.getElementById('privacy-preview-box');
  if (!preview) return;

  if (isConfidential) {
    preview.innerHTML = `
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 1rem; color: #92400e;">
        <strong>🔒 Confidential Profile Mode Active:</strong><br>
        Other users and the public will <strong>ONLY</strong> see your display name (<em>${currentUser.display_name}</em>) and what skills you teach or explain.<br>
        Your real name (<em>${currentUser.full_name}</em>), email, phone, company, and personal biography are <strong>hidden and masked</strong>.
      </div>
    `;
  } else {
    preview.innerHTML = `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1rem; color: #1e40af;">
        <strong>👁️ Public Profile Mode:</strong><br>
        Your full profile details (Full Name: <em>${currentUser.full_name}</em>, Company: <em>${currentUser.company || 'None'}</em>, Bio) are visible to members.
      </div>
    `;
  }
}

async function saveProfileSettings() {
  const isConfidential = document.getElementById('prof-confidential-toggle').checked;
  const payload = {
    display_name: document.getElementById('prof-display-name').value.trim(),
    full_name: document.getElementById('prof-full-name').value.trim(),
    phone: document.getElementById('prof-phone').value.trim(),
    company: document.getElementById('prof-company').value.trim(),
    job_title: document.getElementById('prof-job-title').value.trim(),
    bio: document.getElementById('prof-bio').value.trim(),
    is_confidential: isConfidential
  };

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      currentUser = await res.json();
      updateHeaderUserUI();
      updatePrivacyPreview(currentUser.is_confidential);
      showToast('Profile and privacy settings saved!');
    }
  } catch (err) {
    console.error('Error saving profile:', err);
  }
}

async function loadMyUserSkills() {
  const container = document.getElementById('my-skills-list');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/skills/my-skills`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const skills = await res.json();

    if (!skills.length) {
      container.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">You have not added any skills to teach or learn yet.</div>';
      return;
    }

    container.innerHTML = skills.map(s => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.5rem;">
        <div>
          <span class="badge-tag ${s.skill_type === 'TEACH' ? 'badge-barter' : 'badge-free'}">
            ${s.skill_type}
          </span>
          <strong style="margin-left: 0.5rem; color: #1e293b;">${s.skill.name}</strong>
          <span style="font-size: 0.8rem; color: #64748b; margin-left: 0.5rem;">(${s.proficiency_level})</span>
          ${s.hourly_rate > 0 ? `<span style="font-size: 0.8rem; color: #991b1b; margin-left: 0.5rem;">Fee: $${s.hourly_rate}/hr</span>` : ''}
          ${s.explanation_style ? `<div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">Style: ${escapeHtml(s.explanation_style)}</div>` : ''}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="deleteUserSkill(${s.id})">✕ Remove</button>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444;">Error loading your skills.</div>';
  }
}

async function addSkillToProfile() {
  const skillId = document.getElementById('profile-skill-select').value;
  const skillType = document.getElementById('profile-skill-type').value;
  const proficiency = document.getElementById('profile-skill-prof').value;
  const rate = parseFloat(document.getElementById('profile-skill-rate').value) || 0.0;
  const pref = document.getElementById('profile-skill-pref').value;
  const expStyle = document.getElementById('profile-skill-style').value.trim();

  if (!skillId) {
    showToast('Please select a skill', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/skills/my-skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        skill_id: parseInt(skillId),
        skill_type: skillType,
        proficiency_level: proficiency,
        hourly_rate: rate,
        exchange_preference: pref,
        explanation_style: expStyle,
        years_of_experience: 2.0
      })
    });
    if (res.ok) {
      showToast('Skill successfully added to profile!');
      loadMyUserSkills();
      loadTeacherCatalog();
      loadBarterMatches();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Could not add skill', 'error');
    }
  } catch (err) {
    console.error('Add skill error:', err);
  }
}

async function deleteUserSkill(id) {
  try {
    const res = await fetch(`${API_BASE}/skills/my-skills/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast('Skill removed');
      loadMyUserSkills();
      loadTeacherCatalog();
      loadBarterMatches();
    }
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// MODALS HANDLING
function openExchangeModal(userId, displayName, skillName, hourlyRate, pref) {
  document.getElementById('exchange-modal').classList.add('active');
  document.getElementById('req-receiver-id').value = userId;
  document.getElementById('req-teacher-display').innerText = displayName;
  document.getElementById('req-skill-display').innerText = skillName;
  document.getElementById('req-price-display').innerText = hourlyRate > 0 ? `$${hourlyRate}/hr` : 'Free / Barter';

  // Find requested skill id from masterSkills
  const foundSkill = masterSkills.find(s => s.name === skillName);
  if (foundSkill) {
    document.getElementById('req-requested-skill-id').value = foundSkill.id;
  }

  // Pre-set rate
  document.getElementById('req-monetary-amount').value = hourlyRate;
  toggleExchangeModeFields();
}

function openBarterRequestModal(peerId, peerName, iTeach, peerTeaches) {
  document.getElementById('exchange-modal').classList.add('active');
  document.getElementById('req-receiver-id').value = peerId;
  document.getElementById('req-teacher-display').innerText = peerName;
  document.getElementById('req-skill-display').innerText = peerTeaches;
  document.getElementById('req-price-display').innerText = '0$ Barter Swap';

  const sTeach = masterSkills.find(s => s.name === iTeach);
  const sLearn = masterSkills.find(s => s.name === peerTeaches);
  if (sTeach) document.getElementById('req-offer-skill').value = sTeach.id;
  if (sLearn) document.getElementById('req-requested-skill-id').value = sLearn.id;

  document.getElementById('req-exchange-type').value = 'BARTER';
  document.getElementById('req-monetary-amount').value = 0.0;
  document.getElementById('req-session-details').value = `Direct Barter: I will teach you ${iTeach} in exchange for learning ${peerTeaches}.`;
  toggleExchangeModeFields();
}

function toggleExchangeModeFields() {
  const type = document.getElementById('req-exchange-type').value;
  const barterBox = document.getElementById('barter-specific-group');
  const paidBox = document.getElementById('paid-specific-group');

  if (type === 'BARTER') {
    barterBox.style.display = 'block';
    paidBox.style.display = 'none';
  } else if (type === 'PAID_ONE_WAY') {
    barterBox.style.display = 'none';
    paidBox.style.display = 'block';
  } else {
    barterBox.style.display = 'none';
    paidBox.style.display = 'none';
  }
}

async function submitExchangeRequest() {
  const receiverId = parseInt(document.getElementById('req-receiver-id').value);
  const type = document.getElementById('req-exchange-type').value;
  const requestedSkillId = parseInt(document.getElementById('req-requested-skill-id').value) || null;
  const offeredSkillId = (type === 'BARTER') ? (parseInt(document.getElementById('req-offer-skill').value) || null) : null;
  const amount = (type === 'PAID_ONE_WAY') ? parseFloat(document.getElementById('req-monetary-amount').value) || 0.0 : 0.0;
  const details = document.getElementById('req-session-details').value.trim();

  try {
    const res = await fetch(`${API_BASE}/exchanges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        receiver_id: receiverId,
        exchange_type: type,
        receiver_requested_skill_id: requestedSkillId,
        sender_offered_skill_id: offeredSkillId,
        monetary_amount: amount,
        session_details: details
      })
    });
    if (res.ok) {
      closeModals();
      showToast('Exchange request sent successfully!');
      loadMyExchanges();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to submit request', 'error');
    }
  } catch (err) {
    console.error('Exchange submit error:', err);
  }
}

function openAskMentorModal(mentorId, mentorName, companyName) {
  document.getElementById('ask-mentor-modal').classList.add('active');
  document.getElementById('ask-mentor-id').value = mentorId;
  document.getElementById('ask-mentor-target').innerText = `${mentorName} (${companyName})`;
}

async function submitDirectQuestion() {
  const mentorId = parseInt(document.getElementById('ask-mentor-id').value);
  const title = document.getElementById('ask-q-title').value.trim();
  const text = document.getElementById('ask-q-text').value.trim();
  const isPrivate = document.getElementById('ask-q-private').checked;

  if (!title || !text) {
    showToast('Please provide a title and details', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/company-mentors/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        mentor_user_id: mentorId,
        title: title,
        question_text: text,
        is_private: isPrivate
      })
    });
    if (res.ok) {
      closeModals();
      showToast('Direct question sent to company professional!');
      loadMentorQuestions();
    }
  } catch (err) {
    console.error('Ask mentor error:', err);
  }
}

function openContributeQuestionModal() {
  document.getElementById('contribute-question-modal').classList.add('active');
}

async function submitInterviewQuestion() {
  const payload = {
    company_name: document.getElementById('add-q-company').value.trim(),
    role: document.getElementById('add-q-role').value.trim(),
    category: document.getElementById('add-q-category').value.trim(),
    round_type: document.getElementById('add-q-round').value.trim(),
    difficulty: document.getElementById('add-q-difficulty').value,
    question_text: document.getElementById('add-q-text').value.trim(),
    answer_explanation: document.getElementById('add-q-ans').value.trim(),
    tags: document.getElementById('add-q-tags').value.trim()
  };

  if (!payload.company_name || !payload.question_text || !payload.answer_explanation) {
    showToast('Please fill out all required fields', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeModals();
      showToast('Interview question contributed to question bank!');
      loadQuestionBank();
    }
  } catch (err) {
    console.error('Contribute error:', err);
  }
}

function openReviewModal(exchangeId) {
  document.getElementById('review-modal').classList.add('active');
  document.getElementById('review-exchange-id').value = exchangeId;
}

async function submitReview() {
  const exId = parseInt(document.getElementById('review-exchange-id').value);
  const rating = parseInt(document.getElementById('review-rating').value);
  const comment = document.getElementById('review-comment').value.trim();

  try {
    const res = await fetch(`${API_BASE}/exchanges/${exId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ rating, comment })
    });
    if (res.ok) {
      closeModals();
      showToast('Review submitted! Thank you.');
      loadMyExchanges();
    }
  } catch (err) {
    console.error('Review error:', err);
  }
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// Utility: Markdown & HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: #1e293b; color: #f8fafc; padding: 0.75rem; border-radius: 6px; overflow-x: auto; margin: 0.5rem 0;"><code>$1</code></pre>');
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Newlines
  html = html.replace(/\n/g, '<br>');
  return html;
}

// Toast notification
function showToast(message, type = 'success') {
  let toast = document.getElementById('skillbridge-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'skillbridge-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9rem';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2)';
    toast.style.transition = 'all 0.3s ease';
    document.body.appendChild(toast);
  }

  toast.style.background = (type === 'error') ? '#ef4444' : '#10b981';
  toast.innerText = message;
  toast.style.display = 'block';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3200);
}
