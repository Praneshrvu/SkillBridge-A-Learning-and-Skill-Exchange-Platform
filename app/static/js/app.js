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
  confidential: { email: 'anonymous_guru@skillbridge.dev', pass: 'pass123', label: 'StealthCodeExpert (Confidential Teacher Mode)' },
  maya: { email: 'maya.learner@skillbridge.dev', pass: 'pass123', label: 'Maya Lin (Confidential Learner Mode)' },
  sarah: { email: 'sarah.google@skillbridge.dev', pass: 'pass123', label: 'Sarah Jenkins (Google Staff Eng - Free AMA)' },
  rahul: { email: 'rahul.amazon@skillbridge.dev', pass: 'pass123', label: 'Rahul Sharma (Amazon Solutions Arch - $25/hr)' }
};

let currentCatalogType = 'TEACH'; // 'TEACH' (browse teachers) or 'LEARN' (browse learners)

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  await loadMasterSkills();
  await checkAuthStatus();
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

      const titleEl = document.getElementById('topbar-current-section');
      if (titleEl) {
        const textSpan = tab.querySelector('.nav-item-text');
        titleEl.innerText = textSpan ? textSpan.innerText : tab.innerText.trim();
      }

      // Close mobile drawer if open
      const sidebar = document.getElementById('app-sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');

      // Refresh data when navigating
      if (tab.dataset.target === 'tab-catalog') loadTeacherCatalog();
      if (tab.dataset.target === 'tab-barter') loadBarterMatches();
      if (tab.dataset.target === 'tab-questions') loadQuestionBank();
      if (tab.dataset.target === 'tab-mentors') { loadCompanyMentors(); loadMentorQuestions(); }
      if (tab.dataset.target === 'tab-exchanges') loadMyExchanges();
      if (tab.dataset.target === 'tab-chat') loadChatHub();
      if (tab.dataset.target === 'tab-support') { loadSupportFAQs(); loadSupportTickets(); }
      if (tab.dataset.target === 'tab-profile') loadMyProfile();
      if (tab.dataset.target === 'tab-videos') loadCourseResources();
    });
  });
}

function toggleSidebarMenu() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (window.innerWidth <= 900) {
    if (sidebar) sidebar.classList.toggle('mobile-open');
    if (backdrop) backdrop.classList.toggle('active');
  } else {
    if (sidebar) sidebar.classList.toggle('collapsed');
  }
}

function toggleDemoPersonas() {
  const container = document.getElementById('demo-personas-container');
  const btn = document.getElementById('btn-toggle-personas');
  if (!container) return;
  const isHidden = container.style.display === 'none';
  container.style.display = isHidden ? 'block' : 'none';
  if (btn) btn.innerText = isHidden ? '🔼 Hide Personas' : '🔽 Show Personas';
}

function toggleTopbarPersona() {
  const box = document.getElementById('topbar-persona-box');
  if (!box) return;
  box.style.display = (box.style.display === 'none') ? 'flex' : 'none';
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
  const selects = [
    'filter-skill-select', 'req-offer-skill', 'req-want-skill',
    'profile-skill-select', 'modal-teach-skill-id', 'modal-learn-skill-id'
  ];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value;
    el.innerHTML = id.includes('filter') ? '<option value="">All Skills</option>' : '<option value="">-- Select Skill --</option>';
    masterSkills.forEach(s => {
      el.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.category)})</option>`;
    });
    if (currentVal) el.value = currentVal;
  });
}

// ==================== AUTHENTICATION & LOGIN GATE ====================
async function checkAuthStatus() {
  const portal = document.getElementById('auth-portal');
  const dash = document.getElementById('app-dashboard');

  if (!currentToken) {
    if (portal) portal.style.display = 'flex';
    if (dash) dash.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      currentUser = await res.json();
      if (portal) portal.style.display = 'none';
      if (dash) dash.style.display = 'flex';
      updateHeaderUserUI();
      loadDashboardData();
    } else {
      localStorage.removeItem('skillbridge_token');
      currentToken = null;
      currentUser = null;
      if (portal) portal.style.display = 'flex';
      if (dash) dash.style.display = 'none';
    }
  } catch (err) {
    console.error('Auth check error:', err);
    if (portal) portal.style.display = 'flex';
    if (dash) dash.style.display = 'none';
  }
}

function loadDashboardData() {
  loadTeacherCatalog();
  loadBarterMatches();
  loadQuestionBank();
  loadCompanyMentors();
  loadMentorQuestions();
  loadSupportFAQs();
  loadSupportTickets();
  loadNotifications();
  loadCourseResources();
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const btnLogin = document.getElementById('auth-tab-login-btn');
  const btnReg = document.getElementById('auth-tab-register-btn');
  const errBox = document.getElementById('auth-error-alert');
  if (errBox) errBox.style.display = 'none';

  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (regForm) regForm.style.display = 'none';
    if (btnLogin) btnLogin.classList.add('active');
    if (btnReg) btnReg.classList.remove('active');
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (regForm) regForm.style.display = 'block';
    if (btnLogin) btnLogin.classList.remove('active');
    if (btnReg) btnReg.classList.add('active');
  }
}

async function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('auth-error-alert');

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentToken = data.access_token;
      localStorage.setItem('skillbridge_token', currentToken);
      showToast('Login successful! Welcome to SkillBridge.');
      await checkAuthStatus();
    } else {
      if (errBox) {
        errBox.innerText = data.detail || 'Invalid email or password.';
        errBox.style.display = 'block';
      }
    }
  } catch (err) {
    if (errBox) {
      errBox.innerText = 'Network error connecting to SkillBridge backend.';
      errBox.style.display = 'block';
    }
  }
}

async function handleUserRegister(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-fullname').value.trim();
  const display_name = document.getElementById('reg-displayname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const phone = document.getElementById('reg-phone')?.value.trim() || null;
  const company = document.getElementById('reg-company')?.value.trim() || null;

  const is_confidential = document.getElementById('reg-conf-master')?.checked || false;
  const is_confidential_teacher = document.getElementById('reg-conf-teacher')?.checked || false;
  const is_confidential_learner = document.getElementById('reg-conf-learner')?.checked || false;

  const errBox = document.getElementById('auth-error-alert');

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        full_name,
        display_name,
        phone,
        company,
        is_confidential,
        is_confidential_teacher,
        is_confidential_learner,
        show_phone: false,
        show_email: false,
        show_real_name: !is_confidential,
        show_company: !is_confidential
      })
    });
    const data = await res.json();
    if (res.ok) {
      currentToken = data.access_token;
      localStorage.setItem('skillbridge_token', currentToken);
      showToast('Registration successful! Welcome to SkillBridge.');
      await checkAuthStatus();
    } else {
      if (errBox) {
        errBox.innerText = data.detail || 'Registration failed. Please check inputs.';
        errBox.style.display = 'block';
      }
    }
  } catch (err) {
    if (errBox) {
      errBox.innerText = 'Network error during registration.';
      errBox.style.display = 'block';
    }
  }
}

async function quickLoginPersona(key) {
  await switchDemoPersona(key);
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
      
      const portal = document.getElementById('auth-portal');
      const dash = document.getElementById('app-dashboard');
      if (portal) portal.style.display = 'none';
      if (dash) dash.style.display = 'flex';

      updateHeaderUserUI();
      showToast(`Logged in as ${currentUser.display_name}`);
      loadDashboardData();
    }
  } catch (err) {
    console.error('Persona switch error:', err);
  }
}

function logoutUser() {
  localStorage.removeItem('skillbridge_token');
  currentToken = null;
  currentUser = null;
  showToast('Signed out of SkillBridge.');
  checkAuthStatus();
}

function updateHeaderUserUI() {
  const container = document.getElementById('user-header-info');
  const heroName = document.getElementById('hero-user-name');
  if (heroName && currentUser) {
    heroName.innerText = currentUser.display_name;
  }

  // Update left-hand sidebar user card
  const sideName = document.getElementById('sidebar-user-name');
  const sideEmail = document.getElementById('sidebar-user-email');
  const sideAvatar = document.getElementById('sidebar-user-avatar');
  if (sideName && currentUser) sideName.innerText = currentUser.display_name;
  if (sideEmail && currentUser) {
    sideEmail.innerText = currentUser.is_confidential ? '🔒 Identity Masked' : currentUser.email;
  }
  if (sideAvatar && currentUser) {
    sideAvatar.innerText = currentUser.is_confidential ? '🔒' : (currentUser.display_name.charAt(0).toUpperCase() || 'U');
  }

  // Synchronize persona switcher dropdown
  const personaSelect = document.getElementById('topbar-persona-select');
  if (personaSelect && currentUser) {
    for (const [key, demo] of Object.entries(DEMO_USERS)) {
      if (demo.email.toLowerCase() === currentUser.email.toLowerCase()) {
        personaSelect.value = key;
        break;
      }
    }
  }

  if (!container || !currentUser) return;

  let badges = '';
  if (currentUser.is_confidential) {
    badges = '<span class="confidential-pill active" title="Master Confidentiality Active">🔒 100% Anonymous</span>';
  } else {
    const tBadge = currentUser.is_confidential_teacher
      ? `<span class="confidential-pill active" title="Teacher profile confidential">🔒 Teacher: Hidden</span>`
      : `<span class="confidential-pill inactive" title="Teacher profile public">👁️ Teacher: Public</span>`;
    const lBadge = currentUser.is_confidential_learner
      ? `<span class="confidential-pill active" title="Learner profile confidential">🔒 Learner: Hidden</span>`
      : `<span class="confidential-pill inactive" title="Learner profile public">👁️ Learner: Public</span>`;
    badges = `${tBadge} ${lBadge}`;
  }

  const avatarChar = currentUser.is_confidential ? '🔒' : (currentUser.display_name.charAt(0).toUpperCase() || 'U');
  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.45rem;">
      <div style="display: flex; align-items: center; gap: 0.35rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 9999px;">
        <span class="chat-avatar" style="width: 20px; height: 20px; font-size: 0.7rem; margin: 0; line-height: 20px;">${avatarChar}</span>
        <span style="font-weight: 700; font-size: 0.8rem; color: #0f172a;">${escapeHtml(currentUser.display_name)}</span>
      </div>
      <div style="display: flex; gap: 0.25rem;">
        ${badges}
      </div>
    </div>
  `;
}

function setCatalogType(type) {
  currentCatalogType = type;
  const btnT = document.getElementById('btn-view-teachers');
  const btnL = document.getElementById('btn-view-learners');
  if (btnT && btnL) {
    if (type === 'TEACH') {
      btnT.className = 'btn btn-primary';
      btnL.className = 'btn btn-outline';
    } else {
      btnT.className = 'btn btn-outline';
      btnL.className = 'btn btn-primary';
    }
  }
  loadTeacherCatalog();
}

// ==================== 1. TEACHER & LEARNER CATALOG ====================
async function loadTeacherCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  grid.innerHTML = `<div style="padding: 2rem; color: #64748b;">Loading ${currentCatalogType === 'TEACH' ? 'teachers' : 'learners'} catalog...</div>`;

  const skillFilter = document.getElementById('filter-skill-select')?.value || '';
  const modeFilter = document.getElementById('filter-mode-select')?.value || '';
  const confidentialFilter = document.getElementById('filter-confidential-select')?.value || '';
  const search = document.getElementById('catalog-search')?.value || '';

  let url = `${API_BASE}/skills/catalog?skill_type=${currentCatalogType}&`;
  if (skillFilter) url += `skill_id=${skillFilter}&`;
  if (modeFilter) url += `exchange_mode=${modeFilter}&`;
  if (confidentialFilter !== '') url += `confidential_only=${confidentialFilter}&`;
  if (search) url += `skill_name=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url);
    const catalog = await res.json();
    if (!catalog.length) {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #64748b;">No ${currentCatalogType === 'TEACH' ? 'teachers' : 'learners'} found matching your filters.</div>`;
      return;
    }

    grid.innerHTML = catalog.map(item => {
      const isMe = currentUser && currentUser.id === item.user_id;
      const isTeacher = (item.skill_type === 'TEACH');

      let privacyBadge = '';
      if (item.is_confidential) {
        privacyBadge = `<span class="confidential-pill active" title="Identity protected by user choice: real name & personal details masked">🔒 Confidential ${isTeacher ? 'Teacher' : 'Learner'}</span>`;
      } else {
        const companyStr = item.company ? ` • 🏢 ${item.company}` : '';
        privacyBadge = `<span class="confidential-pill inactive" title="Real identity visible">👁️ Public Profile${companyStr}</span>`;
      }

      let modeBadge = '';
      if (item.exchange_preference === 'BARTER_ONLY') {
        modeBadge = '<span class="badge-tag badge-barter">Skill Barter (Free Swap)</span>';
      } else if (item.exchange_preference === 'PAID_ONLY') {
        modeBadge = `<span class="badge-tag badge-paid">Paid Mentorship ($${item.hourly_rate}/hr)</span>`;
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
                <h4>${escapeHtml(item.display_name)}</h4>
                ${privacyBadge}
              </div>
              <span style="font-size: 0.8rem; background: #f1f5f9; padding: 2px 8px; border-radius: 6px;">
                ${escapeHtml(item.proficiency_level)}
              </span>
            </div>
            
            <div class="card-body">
              <div style="font-size: 0.75rem; color: #4338ca; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
                ${isTeacher ? 'Offering to Teach' : 'Wants to Learn'}
              </div>
              <h3>${escapeHtml(item.skill_name)}</h3>
              <p style="font-size: 0.8rem; color: #6366f1; font-weight: 600; margin-bottom: 0.5rem;">${escapeHtml(item.category)}</p>
              
              ${isTeacher ? `
                <div class="card-desc">
                  <strong>Good at Explaining:</strong> ${escapeHtml(item.explanation_style || 'Explains concepts clearly with real-world examples.')}
                </div>
                <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.75rem;">
                  ⏳ <strong>Experience:</strong> ${item.years_of_experience} yrs
                </div>
              ` : `
                <div class="card-desc">
                  <strong>Learning Objective / Goal:</strong> ${escapeHtml(item.learning_goal || item.explanation_style || 'Seeking peer guidance and conceptual explanations.')}
                </div>
              `}
              <div>${modeBadge}</div>

              <!-- Contact & Identity Visibility -->
              ${item.is_confidential ? `
                <div style="font-size: 0.78rem; color: #64748b; background: #f8fafc; padding: 4px 8px; border-radius: 4px; margin-top: 0.5rem;">
                  🔒 <em>Contact & personal details protected by user choice</em>
                </div>
              ` : `
                <div style="font-size: 0.78rem; color: #475569; background: #f8fafc; padding: 4px 8px; border-radius: 4px; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 2px;">
                  ${item.show_phone && item.phone ? `<div>📞 <strong>Phone:</strong> <a href="tel:${item.phone}" style="color: #4f46e5; font-weight: 600; text-decoration: none;">${escapeHtml(item.phone)}</a></div>` : ''}
                  ${item.show_email && item.email ? `<div>✉️ <strong>Email:</strong> <a href="mailto:${item.email}" style="color: #4f46e5; font-weight: 600; text-decoration: none;">${escapeHtml(item.email)}</a></div>` : ''}
                  ${!item.show_phone && !item.show_email ? `<div>🔒 <em>Phone & email kept hidden by ${isTeacher ? 'teacher' : 'learner'}</em></div>` : ''}
                </div>
              `}
            </div>
          </div>

          <div class="card-footer">
            <div class="price-tag">
              ${isTeacher 
                ? (item.hourly_rate > 0 ? `$${item.hourly_rate} <span style="font-size: 0.75rem; font-weight: normal; color: #64748b;">/hr</span>` : `<span style="color: #059669;">Free / Barter</span>`)
                : `<span style="color: #4338ca; font-size: 0.9rem;">Learner Seeking Mentor</span>`
              }
            </div>
            ${isMe 
              ? `<span style="font-size: 0.8rem; color: #64748b; font-weight: 600;">(Your Listing)</span>` 
              : `<div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                  <button class="btn btn-secondary btn-sm" onclick="openChatWithUser(${item.user_id}, '${escapeHtml(item.display_name)}')">
                    💬 Chat
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="openExchangeModal(${item.user_id}, '${escapeHtml(item.display_name)}', '${escapeHtml(item.skill_name)}', ${item.hourly_rate}, '${item.exchange_preference}', '${item.skill_type}')">
                    ${isTeacher ? 'Request Tutoring' : 'Offer to Teach'}
                  </button>
                </div>`
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = '<div style="color: #ef4444; padding: 2rem;">Error loading catalog.</div>';
  }
}

// ==================== 2. SMART 2-WAY BARTER MATCHER ====================
async function loadBarterMatches() {
  const container = document.getElementById('barter-matches-container');
  if (!container) return;

  if (!currentToken) {
    container.innerHTML = '<div style="padding: 2rem; color: #64748b;">Please log in to see your 2-way barter matches.</div>';
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
          <h3 style="color: #0f172a; margin-bottom: 0.5rem;">No 2-Way Barter Matches Yet</h3>
          <p style="color: #64748b; max-width: 600px; margin: 0 auto 1.5rem auto;">
            A 2-way barter match occurs when another person teaches what you want to learn AND wants to learn what you teach (for instance, <strong>Alice knows C++ and wants Java</strong>, while <strong>Bob knows Java and wants C++</strong>!).
          </p>
          <button class="btn btn-primary" onclick="openAddTeacherModal()">
            Add a Skill You Can Teach
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
            <div style="font-size: 1.1rem; color: #065f46; font-weight: 700;">${escapeHtml(m.peer_wants_to_learn)}</div>
          </div>
          <div style="font-size: 1.5rem; color: #4f46e5;">⇄</div>
          <div style="text-align: center;">
            <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(m.peer_display_name)} TEACHES YOU</div>
            <div style="font-size: 1.1rem; color: #1e40af; font-weight: 700;">${escapeHtml(m.peer_teaches)}</div>
          </div>
        </div>

        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 1rem;">
          <strong>Peer Explanation Style:</strong> ${escapeHtml(m.peer_explanation_style || 'Direct code walkthroughs and diagrams.')}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="openChatWithUser(${m.peer_user_id}, '${escapeHtml(m.peer_display_name)}')">
            💬 Chat with ${escapeHtml(m.peer_display_name)}
          </button>
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

// ==================== 3. COMPANY INTERVIEW QUESTION BANK ====================
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
  if (search) url += `keyword=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url);
    const questions = await res.json();

    if (!questions.length) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #64748b;">No interview questions match your filter.</div>';
      return;
    }

    container.innerHTML = questions.map(q => `
      <div class="question-card" id="q-card-${q.id}">
        <div class="question-meta">
          <span class="company-tag">🏢 ${escapeHtml(q.company_name)}</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #475569;">${escapeHtml(q.role)}</span>
          <span style="font-size: 0.8rem; color: #64748b;">• ${escapeHtml(q.round_type)}</span>
          <span class="difficulty-tag ${q.difficulty}" style="font-size: 0.75rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
            ${q.difficulty}
          </span>
        </div>

        <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 0.75rem; line-height: 1.4;">
          ${escapeHtml(q.question_text)}
        </h3>

        ${q.tags ? `<div style="margin-bottom: 0.75rem;">
          ${q.tags.split(',').map(t => `<span style="display: inline-block; background: #eef2ff; color: #4338ca; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; margin-right: 4px;">#${escapeHtml(t.trim())}</span>`).join('')}
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
              Contributed by: ${q.author ? escapeHtml(q.author.display_name) : 'Anonymous'}
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

// ==================== 4. COMPANY MENTORS & DIRECT Q&A ====================
async function loadCompanyMentors() {
  const container = document.getElementById('company-mentors-grid');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/company-mentors`);
    const mentors = await res.json();

    container.innerHTML = mentors.map(m => {
      const isMe = currentUser && currentUser.id === m.user_id;
      return `
        <div class="card">
          <div>
            <div class="card-header">
              <div class="author-info">
                <h4>${escapeHtml(m.user.display_name)}</h4>
                <span class="author-company">🏢 ${escapeHtml(m.company_name)}</span>
              </div>
              ${m.can_give_referral ? `<span class="badge-tag badge-barter">🎯 Can Refer</span>` : ''}
            </div>

            <div class="card-body">
              <div style="font-weight: 600; font-size: 0.95rem; color: #1e293b; margin-bottom: 0.25rem;">
                ${escapeHtml(m.job_title)}
              </div>
              <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.75rem;">
                ${m.department ? `${escapeHtml(m.department)} • ` : ''}${m.years_of_experience} yrs in company
              </div>

              <div class="card-desc">
                <strong>Topics Open for Q&A:</strong><br>
                ${escapeHtml(m.topics_open_for_questions || 'Interviews, system design, corporate training, career guidance.')}
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="price-tag">
              ${m.hourly_fee > 0 ? `$${m.hourly_fee} <span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">/hr</span>` : '<span style="color: #059669;">Free Q&A / AMA</span>'}
            </div>
            ${isMe 
              ? `<span style="font-size: 0.8rem; color: #64748b;">(Your Profile)</span>`
              : `<div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                  <button class="btn btn-secondary btn-sm" onclick="openChatWithUser(${m.user_id}, '${escapeHtml(m.user.display_name)}')">
                    💬 Chat
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="openAskMentorModal(${m.user_id}, '${escapeHtml(m.user.display_name)}', '${escapeHtml(m.company_name)}')">
                    Ask Direct Question
                  </button>
                </div>`
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
    const qa = await res.json();

    if (!qa.length) {
      container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #64748b;">No questions posted yet. Be the first to ask!</div>';
      return;
    }

    container.innerHTML = qa.map(q => {
      const isAnswered = (q.status === 'ANSWERED');
      const isMentor = currentUser && (currentUser.id === q.mentor_user_id);

      return `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.85rem; color: #64748b;">
              Asked by <strong>${q.asker ? escapeHtml(q.asker.display_name) : 'Anonymous'}</strong> to 
              <strong style="color: #4338ca;">${q.mentor ? escapeHtml(q.mentor.display_name) : 'Mentor'}</strong>
            </div>
            <span class="badge-tag ${isAnswered ? 'badge-barter' : 'badge-paid'}">
              ${isAnswered ? '✅ Answered by Professional' : '⏳ Pending Response'}
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

// ==================== 5. MY EXCHANGES & SESSIONS ====================
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
      const isSender = currentUser && currentUser.id === ex.sender_id;
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
              <strong style="color: #1e293b; font-size: 1.05rem;">${escapeHtml(otherUser.display_name)}</strong>
              ${otherUser.is_confidential ? `<span class="confidential-pill active" style="margin-left: 4px;">🔒 Confidential</span>` : ''}
              <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">Type: ${ex.exchange_type}</div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div style="margin: 0.75rem 0; font-size: 0.9rem; color: #475569;">
            ${ex.exchange_type === 'BARTER' ? `
              <div><strong>Mutual Barter Swap:</strong> ${ex.sender_offered_skill ? ex.sender_offered_skill.name : 'Offered'} ⇄ ${ex.receiver_requested_skill ? ex.receiver_requested_skill.name : 'Requested'}</div>
            ` : `
              <div><strong>Tutoring:</strong> Learning ${ex.receiver_requested_skill ? ex.receiver_requested_skill.name : 'Skill'} • <strong>Fee:</strong> $${ex.monetary_amount}</div>
              <div><strong>Payment Escrow Status:</strong> <span style="font-weight: 600; color: #4338ca;">${ex.payment_status}</span></div>
            `}
            ${ex.session_details ? `<div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Details: ${escapeHtml(ex.session_details)}</div>` : ''}
            ${(ex.status === 'ACCEPTED' || ex.status === 'IN_PROGRESS') ? `
              <div style="margin-top: 0.75rem; padding: 0.85rem 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 0.85rem; color: #166534;">
                <div style="font-weight: 700; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 6px;">
                  🔒 Confidential Session Classroom Ready
                </div>
                <div style="margin-bottom: 0.6rem; color: #15803d;">Identity is protected. Teach and learn via voice, IDE screen-sharing, collaborative code sandboxes, and in-platform chat without exposing phone numbers, emails, or real identities.</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <a href="https://meet.jit.si/skillbridge-session-${ex.id}-${ex.sender_id}x${ex.receiver_id}#config.startWithVideoMuted=true&userInfo.displayName=%22${encodeURIComponent(currentUser ? currentUser.display_name : 'SkillBridge_Member')}%22" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="text-decoration: none; font-size: 0.8rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;">
                    🎥 Launch Virtual Classroom (Voice & Screen)
                  </a>
                  <a href="https://codeshare.io/new" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="text-decoration: none; font-size: 0.8rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;">
                    💻 Codeshare Live Sandbox
                  </a>
                  <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="text-decoration: none; font-size: 0.8rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;">
                    📐 Architecture Whiteboard
                  </a>
                </div>
              </div>
            ` : ''}
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-secondary btn-sm" onclick="openChatWithUser(${otherUser.id}, '${escapeHtml(otherUser.display_name)}')">
              💬 In-Platform Chat
            </button>

            ${(ex.status === 'ACCEPTED' || ex.status === 'IN_PROGRESS') ? `
              <a href="https://meet.jit.si/skillbridge-session-${ex.id}-${ex.sender_id}x${ex.receiver_id}#config.startWithVideoMuted=true&userInfo.displayName=%22${encodeURIComponent(currentUser ? currentUser.display_name : 'SkillBridge_Member')}%22" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                🎥 Launch Confidential Classroom (Voice & Screen)
              </a>
            ` : ''}

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

async function updateExchangeStatus(exId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/exchanges/${exId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Exchange marked as ${newStatus}`);
      loadMyExchanges();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to update status', 'error');
    }
  } catch (err) {
    console.error('Status error:', err);
    showToast('Network error updating exchange status', 'error');
  }
}

async function triggerPaymentAction(exId, action) {
  try {
    const res = await fetch(`${API_BASE}/exchanges/${exId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ action })
    });
    if (res.ok) {
      showToast(action === 'PAY_ESCROW' ? 'Payment securely deposited into Escrow!' : 'Funds released to teacher!');
      loadMyExchanges();
    }
  } catch (err) {
    console.error('Payment error:', err);
  }
}

// ==================== 6. SKILLBRIDGE CHATTING PLACE & COMMUNITY LOUNGE ====================
let currentChatMode = 'community';
let currentCommunityChannel = 'general';
let allCommunityChannels = [];
let allDirectoryUsers = [];

let currentChatUserId = null;
let currentChatUserName = '';
let allConversations = [];
let chatPollingTimer = null;

async function loadChatHub() {
  if (currentChatMode === 'community') {
    await loadCommunityChannels();
    await loadCommunityMessages(currentCommunityChannel);
  } else {
    await loadConversations();
  }
  startUnifiedChatPolling();
}

function setChatMode(mode) {
  currentChatMode = mode;
  const btnComm = document.getElementById('btn-chat-community');
  const btnDir = document.getElementById('btn-chat-direct');
  const viewComm = document.getElementById('chat-community-view');
  const viewDir = document.getElementById('chat-direct-view');

  if (mode === 'community') {
    if (btnComm) btnComm.className = 'btn btn-primary';
    if (btnDir) btnDir.className = 'btn btn-outline';
    if (viewComm) viewComm.style.display = 'grid';
    if (viewDir) viewDir.style.display = 'none';
    loadCommunityChannels();
    loadCommunityMessages(currentCommunityChannel);
  } else {
    if (btnComm) btnComm.className = 'btn btn-outline';
    if (btnDir) btnDir.className = 'btn btn-primary';
    if (viewComm) viewComm.style.display = 'none';
    if (viewDir) viewDir.style.display = 'grid';
    loadConversations();
  }
}

async function loadCommunityChannels() {
  const container = document.getElementById('community-channels-list');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/chat/community/channels`);
    if (!res.ok) throw new Error('Failed to fetch channels');
    allCommunityChannels = await res.json();

    container.innerHTML = allCommunityChannels.map(ch => {
      const isActive = (ch.id === currentCommunityChannel);
      return `
        <div class="channel-item ${isActive ? 'active' : ''}" onclick="selectCommunityChannel('${ch.id}', '${escapeHtml(ch.title)}', '${escapeHtml(ch.description)}')">
          <div>
            <div style="font-size: 0.9rem; color: #0f172a; font-weight: ${isActive ? '700' : '600'};">${escapeHtml(ch.name)}</div>
            <div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(ch.title)}</div>
          </div>
          <span style="font-size: 0.75rem; background: #f1f5f9; padding: 1px 7px; border-radius: 10px; color: #475569;">
            ${ch.message_count}
          </span>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading channels:', err);
  }
}

async function selectCommunityChannel(channelId, title, desc) {
  currentCommunityChannel = channelId;
  const titleEl = document.getElementById('comm-active-title');
  const descEl = document.getElementById('comm-active-desc');
  const inputEl = document.getElementById('community-chat-input');

  if (titleEl && title) titleEl.innerText = title;
  if (descEl && desc) descEl.innerText = desc;
  if (inputEl) inputEl.placeholder = `Chat with everyone in #${channelId}... (Press Enter to send)`;

  loadCommunityChannels();
  await loadCommunityMessages(channelId);
}

async function loadCommunityMessages(channelId, silent = false) {
  const container = document.getElementById('community-messages-container');
  if (!container) return;

  if (!silent && (!container.children.length || container.innerHTML.includes('Loading'))) {
    container.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1.5rem;">Loading community lounge...</div>';
  }

  try {
    const res = await fetch(`${API_BASE}/chat/community/messages?channel=${channelId}`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    const messages = await res.json();

    if (!messages.length) {
      container.innerHTML = `
        <div class="chat-empty-state" style="padding: 2.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💬</div>
          <div style="font-weight: 600; color: #475569;">Welcome to #${channelId}!</div>
          <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 4px;">Be the first person to post a message in this channel!</div>
        </div>
      `;
      return;
    }

    const isNearBottom = (container.scrollHeight - container.scrollTop - container.clientHeight < 140);

    container.innerHTML = messages.map(m => {
      const u = m.sender;
      const initial = (u.display_name || '?').charAt(0).toUpperCase();
      const isConf = Boolean(u.is_confidential);
      const isMe = (currentUser && currentUser.id === m.sender_id);
      const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let badges = '';
      if (u.company) {
        badges += `<span style="font-size: 0.7rem; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; font-weight: 600;">🏢 ${escapeHtml(u.company)}</span>`;
      }
      if (isConf) {
        badges += `<span style="font-size: 0.7rem; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 4px;">🔒 Confidential</span>`;
      }

      return `
        <div class="community-msg-row">
          <div class="chat-avatar ${isConf ? 'confidential' : ''}">${isConf ? '🔒' : initial}</div>
          <div class="community-msg-body">
            <div class="community-msg-header">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="community-author-name">${escapeHtml(u.display_name)}</span>
                ${badges}
                <span style="font-size: 0.7rem; color: #94a3b8;">${timeStr}</span>
              </div>
              ${!isMe ? `
                <button class="community-dm-btn" onclick="openChatWithUser(${m.sender_id}, '${escapeHtml(u.display_name)}')">
                  💬 Direct Message
                </button>
              ` : '<span style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">(You)</span>'}
            </div>
            <div style="font-size: 0.92rem; color: #1e293b; line-height: 1.45; word-break: break-word;">
              ${escapeHtml(m.content)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (!silent || isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error('Error loading community messages:', err);
  }
}

async function handleSendCommunityMessage(e) {
  e.preventDefault();
  const input = document.getElementById('community-chat-input');
  if (!input) return;

  const content = input.value.trim();
  if (!content) return;

  if (!currentToken) {
    showToast('Please log in to chat with the community', 'error');
    return;
  }

  input.value = '';
  input.focus();

  try {
    const res = await fetch(`${API_BASE}/chat/community/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        channel: currentCommunityChannel,
        content: content
      })
    });

    if (res.ok) {
      await loadCommunityMessages(currentCommunityChannel);
      await loadCommunityChannels();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Could not post message', 'error');
    }
  } catch (err) {
    console.error('Community send error:', err);
    showToast('Network error posting message', 'error');
  }
}

// ----------------- DIRECT 1-ON-1 MESSAGES -----------------
async function loadConversations() {
  const listEl = document.getElementById('chat-conv-list');
  if (!listEl) return;
  if (!currentToken) {
    listEl.innerHTML = '<div class="chat-empty-state" style="padding: 1.5rem;">Please log in to view messages.</div>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Failed to load conversations');
    allConversations = await res.json();

    renderConversationList(allConversations);
    updateChatUnreadBadge();
  } catch (err) {
    console.error('Error loading conversations:', err);
    listEl.innerHTML = '<div style="color: #ef4444; padding: 1.5rem;">Error loading conversations.</div>';
  }
}

function updateChatUnreadBadge() {
  const badge = document.getElementById('chat-unread-badge');
  if (!badge) return;
  const totalUnread = allConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  if (totalUnread > 0) {
    badge.innerText = totalUnread;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function renderConversationList(convs) {
  const listEl = document.getElementById('chat-conv-list');
  if (!listEl) return;

  if (!convs.length) {
    listEl.innerHTML = `
      <div class="chat-empty-state" style="padding: 1.5rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">💬</div>
        <div style="font-weight: 600; font-size: 0.9rem; color: #475569;">No direct messages yet</div>
        <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">Click "+ New Chat" to pick anyone on SkillBridge!</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = convs.map(c => {
    const u = c.other_user;
    const isActive = (currentChatUserId === u.id);
    const initial = (u.display_name || '?').charAt(0).toUpperCase();
    const isConf = Boolean(u.is_confidential);
    const timeStr = formatChatTime(c.last_message_time);

    return `
      <div class="chat-conversation-item ${isActive ? 'active' : ''}" onclick="selectConversation(${u.id}, '${escapeHtml(u.display_name)}')">
        <div class="chat-avatar ${isConf ? 'confidential' : ''}">${isConf ? '🔒' : initial}</div>
        <div class="chat-conv-info">
          <div class="chat-conv-title">
            <span class="chat-conv-name">${escapeHtml(u.display_name)}</span>
            <span class="chat-conv-time">${timeStr}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="chat-conv-snippet">${escapeHtml(c.last_message || '')}</span>
            ${c.unread_count > 0 ? `<span class="chat-unread-count">${c.unread_count}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterConversations() {
  const term = document.getElementById('chat-search')?.value.toLowerCase().trim() || '';
  if (!term) {
    renderConversationList(allConversations);
    return;
  }
  const filtered = allConversations.filter(c => {
    const name = (c.other_user.display_name || '').toLowerCase();
    const msg = (c.last_message || '').toLowerCase();
    return name.includes(term) || msg.includes(term);
  });
  renderConversationList(filtered);
}

function formatChatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

async function selectConversation(userId, displayName) {
  currentChatUserId = userId;
  currentChatUserName = displayName;

  setChatMode('direct');

  document.querySelectorAll('.chat-conversation-item').forEach(el => el.classList.remove('active'));
  
  const placeholder = document.getElementById('chat-placeholder');
  const activeContainer = document.getElementById('chat-active-container');
  if (placeholder) placeholder.style.display = 'none';
  if (activeContainer) activeContainer.style.display = 'flex';

  const nameEl = document.getElementById('chat-active-name');
  const avatarEl = document.getElementById('chat-active-avatar');
  const subEl = document.getElementById('chat-active-subtitle');
  if (nameEl) nameEl.innerText = displayName;
  if (avatarEl) avatarEl.innerText = displayName.charAt(0).toUpperCase();
  if (subEl) subEl.innerText = 'Connected peer (Zero-Disclosure Mode)';

  const actionsEl = document.getElementById('chat-active-actions');
  if (actionsEl && currentUser) {
    const minId = Math.min(currentUser.id, userId);
    const maxId = Math.max(currentUser.id, userId);
    actionsEl.innerHTML = `
      <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
        <a href="https://meet.jit.si/skillbridge-direct-${minId}x${maxId}#config.startWithVideoMuted=true&userInfo.displayName=%22${encodeURIComponent(currentUser.display_name)}%22" 
           target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" 
           title="Start confidential voice & screen call (camera off by default)" 
           style="font-size: 0.75rem; padding: 4px 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
          🎥 Call (Voice & Screen)
        </a>
        <a href="https://codeshare.io/new" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" 
           title="Open live collaborative code sandbox" 
           style="font-size: 0.75rem; padding: 4px 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
          💻 Sandbox
        </a>
        <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" 
           title="Open shared whiteboard" 
           style="font-size: 0.75rem; padding: 4px 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
          📐 Whiteboard
        </a>
      </div>
    `;
  }

  await loadChatMessages(userId);
  const conv = allConversations.find(c => c.other_user.id === userId);
  if (conv) conv.unread_count = 0;
  renderConversationList(allConversations);
  updateChatUnreadBadge();

  const input = document.getElementById('chat-input');
  if (input) input.focus();
}

function startUnifiedChatPolling() {
  if (chatPollingTimer) clearInterval(chatPollingTimer);
  chatPollingTimer = setInterval(() => {
    const chatPane = document.getElementById('tab-chat');
    if (!chatPane || !chatPane.classList.contains('active')) return;

    if (currentChatMode === 'community' && currentCommunityChannel) {
      loadCommunityMessages(currentCommunityChannel, true);
    } else if (currentChatMode === 'direct' && currentChatUserId) {
      loadChatMessages(currentChatUserId, true);
    }
  }, 3500);
}

async function openChatWithUser(userId, displayName) {
  if (!currentToken) {
    showToast('Please log in to chat with peers and teachers', 'error');
    return;
  }
  if (currentUser && currentUser.id === userId) {
    showToast('You cannot chat with yourself', 'error');
    return;
  }

  const chatTabBtn = document.querySelector('[data-target="tab-chat"]');
  if (chatTabBtn) chatTabBtn.click();

  await selectConversation(userId, displayName);
}

async function loadChatMessages(userId, silent = false) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  if (!silent && (!container.children.length || container.innerHTML.includes('Loading'))) {
    container.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1rem;">Loading messages...</div>';
  }

  try {
    const res = await fetch(`${API_BASE}/chat/conversations/${userId}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Failed to load thread');
    const messages = await res.json();

    if (!messages.length) {
      container.innerHTML = `
        <div class="chat-empty-state" style="padding: 2rem;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">👋</div>
          <div style="font-weight: 600; color: #475569;">No messages yet with ${escapeHtml(currentChatUserName)}</div>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">Say hello and ask about learning or teaching!</div>
        </div>
      `;
      return;
    }

    const isNearBottom = (container.scrollHeight - container.scrollTop - container.clientHeight < 120);

    container.innerHTML = messages.map(m => {
      const isSent = (currentUser && m.sender_id === currentUser.id);
      const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="chat-bubble ${isSent ? 'sent' : 'received'}">
          <div style="font-weight: 600; font-size: 0.72rem; margin-bottom: 3px; opacity: 0.85;">
            ${isSent ? 'You' : escapeHtml(m.sender.display_name)}
          </div>
          <div>${escapeHtml(m.content)}</div>
          <div class="chat-bubble-time">
            ${timeStr} ${isSent ? (m.is_read ? '✓✓' : '✓') : ''}
          </div>
        </div>
      `;
    }).join('');

    if (!silent || isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error('Error fetching chat messages:', err);
  }
}

async function handleSendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  if (!input || !currentChatUserId) return;

  const content = input.value.trim();
  if (!content) return;

  input.value = '';
  input.focus();

  try {
    const res = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        receiver_id: currentChatUserId,
        content: content
      })
    });

    if (res.ok) {
      await loadChatMessages(currentChatUserId);
      await loadConversations();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Could not send message', 'error');
    }
  } catch (err) {
    console.error('Send error:', err);
    showToast('Network error sending message', 'error');
  }
}

// ----------------- USER DIRECTORY (CHAT WITH ANYONE) -----------------
async function openUserDirectoryModal() {
  if (!currentToken) {
    showToast('Please log in to browse members and chat', 'error');
    return;
  }

  const modal = document.getElementById('user-directory-modal');
  const container = document.getElementById('user-directory-list');
  if (!modal || !container) return;

  modal.classList.add('active');
  container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #64748b;">Loading SkillBridge members...</div>';

  try {
    const res = await fetch(`${API_BASE}/chat/users-directory`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Failed to load directory');
    allDirectoryUsers = await res.json();

    renderUserDirectory(allDirectoryUsers);
  } catch (err) {
    console.error('Error loading directory:', err);
    container.innerHTML = '<div style="color: #ef4444; padding: 1.5rem;">Error loading directory.</div>';
  }
}

function renderUserDirectory(users) {
  const container = document.getElementById('user-directory-list');
  if (!container) return;

  if (!users.length) {
    container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #64748b;">No members found.</div>';
    return;
  }

  container.innerHTML = users.map(u => {
    const initial = (u.display_name || '?').charAt(0).toUpperCase();
    const isConf = Boolean(u.is_confidential);

    let roleTag = '';
    if (u.is_mentor) {
      roleTag = `<span style="font-size: 0.72rem; background: #e0e7ff; color: #3730a3; padding: 2px 7px; border-radius: 4px; font-weight: 700;">🏢 ${escapeHtml(u.mentor_company || u.company || 'Company')} Mentor</span>`;
    } else if (u.teaching_skills.length > 0) {
      roleTag = `<span style="font-size: 0.72rem; background: #ecfdf5; color: #065f46; padding: 2px 7px; border-radius: 4px; font-weight: 600;">👨‍🏫 Teacher</span>`;
    } else {
      roleTag = `<span style="font-size: 0.72rem; background: #eff6ff; color: #1e40af; padding: 2px 7px; border-radius: 4px; font-weight: 600;">🎓 Learner</span>`;
    }

    const teachSkillsStr = u.teaching_skills.length ? `<div style="font-size: 0.75rem; color: #047857; margin-top: 2px;"><strong>Teaches:</strong> ${escapeHtml(u.teaching_skills.join(', '))}</div>` : '';
    const learnSkillsStr = u.learning_skills.length ? `<div style="font-size: 0.75rem; color: #1d4ed8; margin-top: 2px;"><strong>Learning:</strong> ${escapeHtml(u.learning_skills.join(', '))}</div>` : '';

    return `
      <div class="directory-user-card">
        <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
          <div class="chat-avatar ${isConf ? 'confidential' : ''}">${isConf ? '🔒' : initial}</div>
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 0.92rem; color: #0f172a;">${escapeHtml(u.display_name)}</span>
              ${roleTag}
              ${isConf ? '<span style="font-size: 0.68rem; color: #92400e; background: #fef3c7; padding: 1px 5px; border-radius: 4px;">Confidential</span>' : ''}
            </div>
            ${teachSkillsStr}
            ${learnSkillsStr}
          </div>
        </div>

        <button class="btn btn-primary btn-sm" onclick="startChatFromDirectory(${u.id}, '${escapeHtml(u.display_name)}')">
          💬 Chat
        </button>
      </div>
    `;
  }).join('');
}

function filterUserDirectory() {
  const term = document.getElementById('directory-search-input')?.value.toLowerCase().trim() || '';
  if (!term) {
    renderUserDirectory(allDirectoryUsers);
    return;
  }
  const filtered = allDirectoryUsers.filter(u => {
    const name = (u.display_name || '').toLowerCase();
    const co = (u.company || u.mentor_company || '').toLowerCase();
    const teach = u.teaching_skills.join(' ').toLowerCase();
    const learn = u.learning_skills.join(' ').toLowerCase();
    return name.includes(term) || co.includes(term) || teach.includes(term) || learn.includes(term);
  });
  renderUserDirectory(filtered);
}

async function startChatFromDirectory(userId, displayName) {
  closeModals();
  await openChatWithUser(userId, displayName);
}

// ==================== 7. BECOME A TEACHER / ADD TEACHING PROFILE ====================
function openAddTeacherModal() {
  if (!currentUser) {
    showToast('Please log in first', 'error');
    return;
  }
  populateSkillSelects();
  const modal = document.getElementById('modal-add-teacher');
  if (modal) modal.classList.add('active');
}

async function handleCreateTeacherProfile(e) {
  e.preventDefault();
  const skillId = document.getElementById('modal-teach-skill-id').value;
  const prof = document.getElementById('modal-teach-prof').value;
  const exp = parseFloat(document.getElementById('modal-teach-exp').value) || 2.0;
  const style = document.getElementById('modal-teach-style').value.trim() || null;
  const pref = document.getElementById('modal-teach-pref').value;
  const rate = parseFloat(document.getElementById('modal-teach-rate').value) || 0.0;
  const isConf = document.getElementById('modal-teach-confidential').checked;
  const showPhone = document.getElementById('modal-teach-show-phone').checked;
  const showEmail = document.getElementById('modal-teach-show-email').checked;

  if (!skillId) {
    showToast('Please select a skill', 'error');
    return;
  }

  try {
    // 1. Update user privacy settings
    await fetch(`${API_BASE}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        is_confidential_teacher: isConf,
        show_phone: showPhone,
        show_email: showEmail
      })
    });

    // 2. Add teaching skill
    const res = await fetch(`${API_BASE}/skills/my-skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        skill_id: parseInt(skillId),
        skill_type: 'TEACH',
        proficiency_level: prof,
        years_of_experience: exp,
        explanation_style: style,
        exchange_preference: pref,
        hourly_rate: rate,
        is_confidential: isConf
      })
    });

    if (res.ok) {
      closeModals();
      showToast('Teaching profile successfully published!');
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      currentUser = await meRes.json();
      updateHeaderUserUI();
      setCatalogType('TEACH');
      loadTeacherCatalog();
      loadBarterMatches();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to add teaching skill', 'error');
    }
  } catch (err) {
    console.error('Error creating teacher profile:', err);
    showToast('Network error publishing profile', 'error');
  }
}

// ==================== 8. WANNA GET TAUGHT / ADD LEARNING GOAL ====================
function openAddLearnerModal() {
  if (!currentUser) {
    showToast('Please log in first', 'error');
    return;
  }
  populateSkillSelects();
  const modal = document.getElementById('modal-add-learner');
  if (modal) modal.classList.add('active');
}

async function handleCreateLearnerProfile(e) {
  e.preventDefault();
  const skillId = document.getElementById('modal-learn-skill-id').value;
  const prof = document.getElementById('modal-learn-prof').value;
  const goal = document.getElementById('modal-learn-goal').value.trim() || null;
  const pref = document.getElementById('modal-learn-pref').value;
  const isConf = document.getElementById('modal-learn-confidential').checked;

  if (!skillId) {
    showToast('Please select a skill', 'error');
    return;
  }

  try {
    if (isConf) {
      await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          is_confidential_learner: true
        })
      });
    }

    const res = await fetch(`${API_BASE}/skills/my-skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        skill_id: parseInt(skillId),
        skill_type: 'LEARN',
        proficiency_level: prof,
        learning_goal: goal,
        exchange_preference: pref,
        hourly_rate: 0.0,
        is_confidential: isConf
      })
    });

    if (res.ok) {
      closeModals();
      showToast('Learning goal saved! Matching you with peer teachers...');
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      currentUser = await meRes.json();
      updateHeaderUserUI();
      setCatalogType('LEARN');
      loadTeacherCatalog();
      loadBarterMatches();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to save learning goal', 'error');
    }
  } catch (err) {
    console.error('Error saving learning goal:', err);
    showToast('Network error saving goal', 'error');
  }
}

// ==================== 9. CONTACT SUPPORT & HELP DESK ====================
async function loadSupportFAQs() {
  const container = document.getElementById('faq-accordion-list');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/support/faq`);
    const faqs = await res.json();

    container.innerHTML = faqs.map(f => `
      <div class="faq-item">
        <div class="faq-question">
          <span>💡</span>
          <span>${escapeHtml(f.question)}</span>
        </div>
        <div class="faq-answer">
          ${escapeHtml(f.answer)}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading FAQs:', err);
  }
}

async function loadSupportTickets() {
  const container = document.getElementById('support-tickets-list');
  if (!container || !currentToken) return;

  try {
    const res = await fetch(`${API_BASE}/support/tickets`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    const tickets = await res.json();

    if (!tickets.length) {
      container.innerHTML = '<div style="font-size: 0.8rem; color: #94a3b8;">No support tickets submitted yet.</div>';
      return;
    }

    container.innerHTML = tickets.map(t => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.6rem 0.85rem; margin-bottom: 0.5rem; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <strong style="color: #0f172a;">${escapeHtml(t.subject)}</strong>
          <span class="badge-tag ${t.status === 'RESOLVED' ? 'badge-free' : 'badge-paid'}" style="font-size: 0.7rem;">
            ${t.status}
          </span>
        </div>
        <div style="color: #64748b; font-size: 0.75rem;">
          Category: ${escapeHtml(t.category)} • Priority: ${escapeHtml(t.priority)} • ${new Date(t.created_at).toLocaleDateString()}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading tickets:', err);
  }
}

async function handleSupportSubmit(e) {
  e.preventDefault();
  const cat = document.getElementById('support-cat').value;
  const sub = document.getElementById('support-subject').value.trim();
  const email = document.getElementById('support-email').value.trim();
  const priority = document.getElementById('support-priority').value;
  const msg = document.getElementById('support-message').value.trim();

  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

  try {
    const res = await fetch(`${API_BASE}/support/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category: cat,
        subject: sub,
        contact_email: email,
        priority: priority,
        message: msg
      })
    });

    if (res.ok) {
      document.getElementById('support-subject').value = '';
      document.getElementById('support-message').value = '';
      showToast('Support ticket submitted successfully! Ticket ID assigned.');
      loadSupportTickets();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Could not submit support ticket', 'error');
    }
  } catch (err) {
    showToast('Network error submitting ticket', 'error');
  }
}

// ==================== 10. MY PROFILE & PRIVACY CONTROLS ====================
async function loadMyProfile() {
  if (!currentUser) return;

  document.getElementById('prof-display-name').value = currentUser.display_name;
  document.getElementById('prof-full-name').value = currentUser.full_name;
  document.getElementById('prof-email').value = currentUser.email;
  document.getElementById('prof-phone').value = currentUser.phone || '';
  document.getElementById('prof-company').value = currentUser.company || '';
  document.getElementById('prof-job-title').value = currentUser.job_title || '';
  document.getElementById('prof-bio').value = currentUser.bio || '';
  
  document.getElementById('prof-confidential-toggle').checked = Boolean(currentUser.is_confidential);
  const tToggle = document.getElementById('prof-conf-teacher-toggle');
  if (tToggle) tToggle.checked = Boolean(currentUser.is_confidential_teacher);
  const lToggle = document.getElementById('prof-conf-learner-toggle');
  if (lToggle) lToggle.checked = Boolean(currentUser.is_confidential_learner);

  const pPhone = document.getElementById('prof-show-phone');
  if (pPhone) pPhone.checked = Boolean(currentUser.show_phone);
  const pEmail = document.getElementById('prof-show-email');
  if (pEmail) pEmail.checked = Boolean(currentUser.show_email);
  const pRealName = document.getElementById('prof-show-real-name');
  if (pRealName) pRealName.checked = currentUser.show_real_name !== undefined ? Boolean(currentUser.show_real_name) : true;
  const pCompany = document.getElementById('prof-show-company');
  if (pCompany) pCompany.checked = currentUser.show_company !== undefined ? Boolean(currentUser.show_company) : true;

  updatePrivacyPreview();
  loadMyUserSkills();
}

function updatePrivacyPreview() {
  const preview = document.getElementById('privacy-preview-box');
  if (!preview || !currentUser) return;

  const isMaster = document.getElementById('prof-confidential-toggle')?.checked || false;
  const isTeacherConf = isMaster || (document.getElementById('prof-conf-teacher-toggle')?.checked || false);
  const isLearnerConf = isMaster || (document.getElementById('prof-conf-learner-toggle')?.checked || false);
  const showPhone = document.getElementById('prof-show-phone')?.checked || false;
  const showEmail = document.getElementById('prof-show-email')?.checked || false;

  preview.innerHTML = `
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.9rem; font-size: 0.85rem; line-height: 1.45;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 0.35rem;">Live Privacy Status for Your Profile:</div>
      <div style="margin-bottom: 0.25rem;">
        👨‍🏫 <strong>Teaching Profile:</strong> 
        ${isTeacherConf 
          ? '<span style="color: #92400e; font-weight: 600;">🔒 Confidential (Only alias & teaching abilities shown; identity masked)</span>'
          : '<span style="color: #1e40af; font-weight: 600;">👁️ Public (Full name, company & bio visible)</span>'
        }
      </div>
      <div style="margin-bottom: 0.25rem;">
        🎓 <strong>Learner Profile (Wanna Get Taught):</strong> 
        ${isLearnerConf 
          ? '<span style="color: #92400e; font-weight: 600;">🔒 Confidential (Only alias & learning goals shown; identity masked)</span>'
          : '<span style="color: #1e40af; font-weight: 600;">👁️ Public (Full profile visible)</span>'
        }
      </div>
      <div style="font-size: 0.8rem; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 0.35rem; margin-top: 0.35rem;">
        📞 Phone: <strong>${showPhone ? '👁️ Shown to public' : '🔒 Hidden from public'}</strong> • 
        ✉️ Email: <strong>${showEmail ? '👁️ Shown to public' : '🔒 Hidden from public'}</strong>
      </div>
    </div>
  `;
}

async function saveProfileSettings() {
  const isConfidential = document.getElementById('prof-confidential-toggle').checked;
  const isConfTeacher = document.getElementById('prof-conf-teacher-toggle')?.checked || false;
  const isConfLearner = document.getElementById('prof-conf-learner-toggle')?.checked || false;
  const showPhone = document.getElementById('prof-show-phone')?.checked || false;
  const showEmail = document.getElementById('prof-show-email')?.checked || false;
  const showRealName = document.getElementById('prof-show-real-name')?.checked || false;
  const showCompany = document.getElementById('prof-show-company')?.checked || false;

  const payload = {
    display_name: document.getElementById('prof-display-name').value.trim(),
    full_name: document.getElementById('prof-full-name').value.trim(),
    phone: document.getElementById('prof-phone').value.trim(),
    company: document.getElementById('prof-company').value.trim(),
    job_title: document.getElementById('prof-job-title').value.trim(),
    bio: document.getElementById('prof-bio').value.trim(),
    is_confidential: isConfidential,
    is_confidential_teacher: isConfTeacher,
    is_confidential_learner: isConfLearner,
    show_phone: showPhone,
    show_email: showEmail,
    show_real_name: showRealName,
    show_company: showCompany
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
      updatePrivacyPreview();
      showToast('Profile and privacy settings saved!');
      loadTeacherCatalog();
    }
  } catch (err) {
    console.error('Error saving profile:', err);
  }
}

function toggleSkillTypeInputs() {
  const skillType = document.getElementById('profile-skill-type')?.value;
  const teachBox = document.getElementById('teach-style-group');
  const learnBox = document.getElementById('learn-goal-group');
  if (skillType === 'LEARN') {
    if (teachBox) teachBox.style.display = 'none';
    if (learnBox) learnBox.style.display = 'block';
  } else {
    if (teachBox) teachBox.style.display = 'block';
    if (learnBox) learnBox.style.display = 'none';
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

    container.innerHTML = skills.map(s => {
      const isTeacher = s.skill_type === 'TEACH';
      const confBadge = s.is_confidential 
        ? `<span class="badge-tag" style="background: #fef3c7; color: #92400e;">🔒 Confidential ${isTeacher ? 'Teacher' : 'Learner'}</span>`
        : `<span class="badge-tag" style="background: #eff6ff; color: #1e40af;">👁️ Public</span>`;

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <span class="badge-tag ${isTeacher ? 'badge-barter' : 'badge-free'}">
              ${isTeacher ? '👨‍🏫 TEACH' : '🎓 LEARN'}
            </span>
            ${confBadge}
            <strong style="margin-left: 0.4rem; color: #1e293b;">${escapeHtml(s.skill.name)}</strong>
            <span style="font-size: 0.8rem; color: #64748b; margin-left: 0.4rem;">(${s.proficiency_level})</span>
            ${s.hourly_rate > 0 ? `<span style="font-size: 0.8rem; color: #991b1b; margin-left: 0.4rem;">Fee: $${s.hourly_rate}/hr</span>` : ''}
            
            ${isTeacher && s.explanation_style ? `<div style="font-size: 0.8rem; color: #475569; margin-top: 3px;"><strong>Style:</strong> ${escapeHtml(s.explanation_style)}</div>` : ''}
            ${!isTeacher && s.learning_goal ? `<div style="font-size: 0.8rem; color: #475569; margin-top: 3px;"><strong>Goal:</strong> ${escapeHtml(s.learning_goal)}</div>` : ''}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="deleteUserSkill(${s.id})">✕ Remove</button>
        </div>
      `;
    }).join('');

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
  const expStyle = document.getElementById('profile-skill-style')?.value.trim() || null;
  const learnGoal = document.getElementById('profile-skill-goal')?.value.trim() || null;
  const isConf = document.getElementById('profile-skill-confidential')?.checked || false;

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
        is_confidential: isConf,
        proficiency_level: proficiency,
        hourly_rate: rate,
        exchange_preference: pref,
        explanation_style: expStyle,
        learning_goal: learnGoal,
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
      showToast('Skill removed from profile');
      loadMyUserSkills();
      loadTeacherCatalog();
      loadBarterMatches();
    }
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// ==================== MODALS HANDLING ====================
function openExchangeModal(userId, displayName, skillName, hourlyRate, pref, skillType) {
  if (!currentToken) {
    showToast('Please log in first', 'error');
    return;
  }
  document.getElementById('exchange-modal').classList.add('active');
  document.getElementById('req-receiver-id').value = userId;
  document.getElementById('modal-exchange-target').innerText = displayName;
  document.getElementById('modal-exchange-skill').innerText = skillName;
  document.getElementById('req-target-mode').value = pref;

  const titleEl = document.getElementById('modal-exchange-title');
  if (skillType === 'TEACH') {
    titleEl.innerText = `Request Tutoring from ${displayName}`;
  } else {
    titleEl.innerText = `Offer to Teach / Barter with ${displayName}`;
  }

  const exSelect = document.getElementById('req-exchange-type');
  if (pref === 'BARTER_ONLY') {
    exSelect.value = 'BARTER';
  } else if (pref === 'PAID_ONLY') {
    exSelect.value = 'PAID_ONE_WAY';
  } else {
    exSelect.value = 'BARTER';
  }

  document.getElementById('req-monetary-amount').value = hourlyRate || 0.0;
  toggleExchangeInputs();
}

function openBarterRequestModal(peerId, peerName, iTeach, peerTeaches) {
  if (!currentToken) {
    showToast('Please log in first', 'error');
    return;
  }
  document.getElementById('exchange-modal').classList.add('active');
  document.getElementById('req-receiver-id').value = peerId;
  document.getElementById('modal-exchange-target').innerText = peerName;
  document.getElementById('modal-exchange-skill').innerText = peerTeaches;

  const sTeach = masterSkills.find(s => s.name === iTeach);
  if (sTeach) document.getElementById('req-offer-skill').value = sTeach.id;

  document.getElementById('req-exchange-type').value = 'BARTER';
  document.getElementById('req-monetary-amount').value = 0.0;
  document.getElementById('req-session-details').value = `Direct Barter: I will teach you ${iTeach} in exchange for learning ${peerTeaches}.`;
  toggleExchangeInputs();
}

function toggleExchangeInputs() {
  const type = document.getElementById('req-exchange-type').value;
  const barterBox = document.getElementById('barter-specific-group');
  const paidBox = document.getElementById('paid-specific-group');

  if (type === 'BARTER') {
    if (barterBox) barterBox.style.display = 'block';
    if (paidBox) paidBox.style.display = 'none';
  } else if (type === 'PAID_ONE_WAY') {
    if (barterBox) barterBox.style.display = 'none';
    if (paidBox) paidBox.style.display = 'block';
  } else {
    if (barterBox) barterBox.style.display = 'none';
    if (paidBox) paidBox.style.display = 'none';
  }
}

async function submitExchangeRequest() {
  const receiverId = parseInt(document.getElementById('req-receiver-id').value);
  const type = document.getElementById('req-exchange-type').value;
  const offeredSkillId = (type === 'BARTER') ? (parseInt(document.getElementById('req-offer-skill').value) || null) : null;
  const amount = (type === 'PAID_ONE_WAY') ? parseFloat(document.getElementById('req-monetary-amount').value) || 0.0 : 0.0;
  const details = document.getElementById('req-session-details').value.trim();
  const hideIdentity = document.getElementById('req-hide-identity')?.checked || false;

  try {
    if (hideIdentity) {
      await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ is_confidential_learner: true })
      });
    }

    const res = await fetch(`${API_BASE}/exchanges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        receiver_id: receiverId,
        exchange_type: type,
        sender_offered_skill_id: offeredSkillId,
        monetary_amount: amount,
        session_details: details
      })
    });

    if (res.ok) {
      closeModals();
      showToast('Exchange proposal submitted successfully!');
      loadMyExchanges();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to submit proposal', 'error');
    }
  } catch (err) {
    console.error('Exchange submit error:', err);
    showToast('Network error submitting exchange', 'error');
  }
}

function openAskMentorModal(mentorId, mentorName, companyName) {
  if (!currentToken) {
    showToast('Please log in first', 'error');
    return;
  }
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
    showToast('Please fill in title and question', 'error');
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
        title,
        question_text: text,
        is_private: isPrivate
      })
    });
    if (res.ok) {
      closeModals();
      showToast('Question sent directly to company mentor!');
      document.getElementById('ask-q-title').value = '';
      document.getElementById('ask-q-text').value = '';
      loadMentorQuestions();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to post question', 'error');
    }
  } catch (err) {
    console.error('Ask error:', err);
  }
}

function openContributeQuestionModal() {
  if (!currentToken) {
    showToast('Please log in first', 'error');
    return;
  }
  document.getElementById('contribute-question-modal').classList.add('active');
}

async function submitInterviewQuestion() {
  const company = document.getElementById('add-q-company').value.trim();
  const role = document.getElementById('add-q-role').value.trim();
  const cat = document.getElementById('add-q-category').value.trim();
  const diff = document.getElementById('add-q-difficulty').value;
  const round = document.getElementById('add-q-round').value.trim();
  const qText = document.getElementById('add-q-text').value.trim();
  const ans = document.getElementById('add-q-ans').value.trim();
  const tags = document.getElementById('add-q-tags').value.trim();

  if (!company || !role || !qText || !ans) {
    showToast('Please complete all required fields', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        company_name: company,
        role,
        category: cat || 'General',
        difficulty: diff,
        round_type: round || 'Technical Round',
        question_text: qText,
        answer_explanation: ans,
        tags
      })
    });
    if (res.ok) {
      closeModals();
      showToast('Question contributed to question bank!');
      loadQuestionBank();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to submit question', 'error');
    }
  } catch (err) {
    console.error('Question submit error:', err);
  }
}

function openReviewModal(exId) {
  document.getElementById('review-modal').classList.add('active');
  document.getElementById('review-exchange-id').value = exId;
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
      showToast('Thank you for rating your session!');
      loadMyExchanges();
    }
  } catch (err) {
    console.error('Review error:', err);
  }
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: #1e293b; color: #f8fafc; padding: 0.75rem; border-radius: 6px; overflow-x: auto; margin: 0.5rem 0;"><code>$1</code></pre>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('skillbridge-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'skillbridge-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '24px';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9rem';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 10px 20px -3px rgba(0,0,0,0.25)';
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

// ==================== 1. NOTIFICATIONS SYSTEM ====================
let userNotifications = [];

async function loadNotifications() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    userNotifications = data.notifications || [];
    const unreadCount = data.unread_count || 0;

    const badge = document.getElementById('topbar-notification-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    renderNotificationList(userNotifications);
  } catch (err) {
    console.warn('Failed to load notifications:', err);
  }
}

function renderNotificationList(notifications) {
  const container = document.getElementById('notification-list-container');
  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `
      <div style="padding: 2rem 1rem; text-align: center; color: #94a3b8; font-size: 0.85rem;">
        <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔕</div>
        No notifications yet. You will be alerted when someone sends you a proposal, accepts a session, or sends a message!
      </div>
    `;
    return;
  }

  container.innerHTML = notifications.map(n => {
    let icon = '🔔';
    if (n.notification_type === 'EXCHANGE_REQUEST') icon = '📩';
    else if (n.notification_type === 'EXCHANGE_ACCEPTED') icon = '🎉';
    else if (n.notification_type === 'EXCHANGE_REJECTED') icon = '❌';
    else if (n.notification_type === 'PAYMENT_ESCROW') icon = '💳';
    else if (n.notification_type === 'SESSION_COMPLETED') icon = '🏆';
    else if (n.notification_type === 'NEW_MESSAGE') icon = '💬';

    const timeStr = formatRelativeTime(n.created_at);

    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotificationClick(${n.id}, '${n.link_tab || ''}')">
        <div class="notif-item-icon">${icon}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-msg">${escapeHtml(n.message)}</div>
          <div class="notif-item-time">${timeStr}</div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleNotificationDropdown() {
  const dd = document.getElementById('notification-dropdown');
  if (!dd) return;
  const isHidden = dd.style.display === 'none' || dd.style.display === '';
  dd.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    loadNotifications();
  }
}

// Close notification dropdown when clicking outside
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.notification-wrapper');
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown && wrapper && !wrapper.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

async function handleNotificationClick(id, linkTab) {
  try {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    loadNotifications();
  } catch (err) {}

  const dd = document.getElementById('notification-dropdown');
  if (dd) dd.style.display = 'none';

  if (linkTab) {
    switchTab(linkTab);
  }
}

async function markAllNotificationsRead() {
  if (!currentToken) return;
  try {
    await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    loadNotifications();
    showToast('All notifications marked as read.');
  } catch (err) {}
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function switchTab(tabId) {
  const targetBtn = document.querySelector(`.tab-btn[data-target="${tabId}"]`);
  if (targetBtn) {
    targetBtn.click();
  }
}

// Periodically check notifications every 25 seconds
setInterval(loadNotifications, 25000);


// ==================== 2. AI PLATFORM ASSISTANT CHATBOT (BOTTOM RIGHT) ====================
let isAIOpen = false;

function toggleAIAssistant() {
  const win = document.getElementById('ai-chat-window');
  if (!win) return;
  isAIOpen = !isAIOpen;
  win.style.display = isAIOpen ? 'flex' : 'none';
  if (isAIOpen) {
    const input = document.getElementById('ai-chat-input');
    if (input) setTimeout(() => input.focus(), 100);
  }
}

function handleAIQuickPrompt(text) {
  const input = document.getElementById('ai-chat-input');
  if (input) {
    input.value = text;
    handleAISend(new Event('submit'));
  }
}

async function handleAISend(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;

  // Append user message
  appendAIMessage('user', message);
  input.value = '';

  // Append typing indicator
  const typingId = appendAITyping();

  try {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    removeAITyping(typingId);
    if (res.ok) {
      const data = await res.json();
      appendAIMessage('bot', data.reply, data.action_link, data.suggestions);
    } else {
      appendAIMessage('bot', 'I encountered a temporary connection issue. Please try again or check the Help & Support tab.');
    }
  } catch (err) {
    removeAITyping(typingId);
    appendAIMessage('bot', 'Network error reaching the assistant. Please ensure the SkillBridge server is running.');
  }
}

function appendAIMessage(sender, text, actionLink = null, suggestions = []) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-msg ai-msg-${sender}`;

  // Format markdown in text (bold, lists, code)
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:#e2e8f0;padding:1px 4px;border-radius:4px;font-size:0.8rem;">$1</code>');
  formatted = formatted.replace(/\n/g, '<br>');

  let actionHtml = '';
  if (actionLink && actionLink.label && actionLink.tab) {
    actionHtml = `<div style="margin-top: 8px;"><button class="ai-action-btn" onclick="switchTab('${actionLink.tab}')">🚀 ${escapeHtml(actionLink.label)}</button></div>`;
  }

  let suggestionsHtml = '';
  if (suggestions && suggestions.length) {
    suggestionsHtml = `
      <div class="ai-quick-chips">
        ${suggestions.map(s => `<button class="ai-chip" onclick="handleAIQuickPrompt('${escapeHtml(s)}')">${escapeHtml(s)}</button>`).join('')}
      </div>
    `;
  }

  msgDiv.innerHTML = `
    <div class="ai-bubble">
      ${formatted}
      ${actionHtml}
    </div>
    ${suggestionsHtml}
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendAITyping() {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return null;
  const id = 'typing-' + Date.now();
  const typingDiv = document.createElement('div');
  typingDiv.id = id;
  typingDiv.className = 'ai-msg ai-msg-bot';
  typingDiv.innerHTML = `
    <div class="ai-bubble" style="color: #64748b; font-style: italic;">
      SkillBridge Assistant is thinking... ⏳
    </div>
  `;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeAITyping(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}


// ==================== 3. COURSE REFERENCE VIDEOS & PAID LEARNER PERKS ====================
let courseDataCache = null;
let currentVideoFilter = 'ALL';

async function loadCourseResources() {
  const container = document.getElementById('course-modules-container');
  if (!container) return;

  try {
    const headers = {};
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

    const res = await fetch(`${API_BASE}/courses/resources`, { headers });
    if (!res.ok) throw new Error('Failed to load courses');
    courseDataCache = await res.json();

    // Update status badge
    const pill = document.getElementById('paid-learner-status-pill');
    if (pill) {
      if (courseDataCache.is_paid_learner) {
        pill.innerHTML = '⭐ Verified Paid Learner: Special Resources Unlocked!';
        pill.style.background = '#ecfdf5';
        pill.style.color = '#065f46';
        pill.style.borderColor = '#a7f3d0';
      } else {
        pill.innerHTML = '⭐ Free Preview Active';
        pill.style.background = '#fef3c7';
        pill.style.color = '#92400e';
        pill.style.borderColor = '#fde68a';
      }
    }

    renderCourseModules();
  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444; padding: 2rem;">Error loading course reference videos.</div>';
  }
}

function filterVideoModules(category, btn) {
  currentVideoFilter = category;
  const filterBar = document.getElementById('video-filter-bar');
  if (filterBar) {
    filterBar.querySelectorAll('.btn').forEach(b => {
      b.className = 'btn btn-outline btn-sm';
    });
    if (btn) btn.className = 'btn btn-primary btn-sm';
  }
  renderCourseModules();
}

function renderCourseModules() {
  const container = document.getElementById('course-modules-container');
  if (!container || !courseDataCache) return;

  let modules = courseDataCache.modules || [];
  if (currentVideoFilter !== 'ALL') {
    modules = modules.filter(m => m.category === currentVideoFilter);
  }

  if (!modules.length) {
    container.innerHTML = '<div style="padding: 2rem; color: #64748b; text-align: center;">No modules found for this category.</div>';
    return;
  }

  const isPaid = Boolean(courseDataCache.is_paid_learner);

  container.innerHTML = modules.map(mod => {
    return `
      <div class="course-module-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem;">
          <div>
            <span style="font-size: 0.75rem; text-transform: uppercase; color: #4338ca; font-weight: 700;">${escapeHtml(mod.category)}</span>
            <h3 style="font-size: 1.25rem; color: #0f172a; margin: 0.2rem 0 0.4rem 0;">${escapeHtml(mod.skill_name)}</h3>
            <p style="font-size: 0.88rem; color: #64748b; margin: 0; max-width: 750px;">${escapeHtml(mod.overview)}</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openExchangeForSkill('${escapeHtml(mod.skill_name)}')">
            🤝 Find 1-on-1 Mentors
          </button>
        </div>

        <!-- Reference Videos Grid -->
        <div style="margin-top: 1.25rem;">
          <h4 style="font-size: 0.95rem; color: #334155; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px;">
            🎥 Recommended Reference Videos (${mod.reference_videos.length})
          </h4>
          <div class="video-card-grid">
            ${mod.reference_videos.map(v => `
              <div class="reference-video-card">
                <div>
                  <div class="video-thumb-preview" onclick="openVideoModal('${escapeHtml(v.title)}', '${v.video_url}', ${JSON.stringify(v.topics).replace(/"/g, '&quot;')}, '${escapeHtml(v.summary)}')">
                    <div style="font-size: 2rem; margin-bottom: 0.25rem;">${v.thumbnail_icon || '💻'}</div>
                    <div class="video-thumb-play-icon">▶</div>
                    <span class="video-duration-pill">⏱️ ${escapeHtml(v.duration)}</span>
                  </div>
                  <h5 style="font-size: 0.95rem; color: #0f172a; margin: 0 0 4px 0;">${escapeHtml(v.title)}</h5>
                  <div style="font-size: 0.75rem; color: #4f46e5; font-weight: 600; margin-bottom: 6px;">By ${escapeHtml(v.instructor)}</div>
                  <p style="font-size: 0.8rem; color: #64748b; margin: 0 0 8px 0; line-height: 1.4;">${escapeHtml(v.summary)}</p>
                  
                  <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 0.75rem;">
                    ${v.topics.map(t => `<span style="font-size: 0.7rem; background: #e2e8f0; color: #475569; padding: 1px 6px; border-radius: 4px;">${escapeHtml(t)}</span>`).join('')}
                  </div>
                </div>

                <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center;" onclick="openVideoModal('${escapeHtml(v.title)}', '${v.video_url}', ${JSON.stringify(v.topics).replace(/"/g, '&quot;')}, '${escapeHtml(v.summary)}')">
                  ▶ Watch Video Reference
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Special Paid Learner Perks & Resources -->
        <div class="paid-perk-box">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="paid-perk-badge">Special Perks</span>
              <strong style="color: #92400e; font-size: 0.95rem;">Paid Tutoring Extra Resources & Blueprints</strong>
            </div>
            ${isPaid 
              ? `<span style="font-size: 0.8rem; color: #059669; font-weight: 700;">✅ Unlocked for your account</span>` 
              : `<span style="font-size: 0.78rem; color: #b45309; font-weight: 600;">🔒 Unlocked with paid tutoring</span>`
            }
          </div>

          <div class="resource-list-grid">
            ${mod.special_resources.map(r => `
              <div class="resource-item-card">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <span style="font-size: 0.72rem; color: #d97706; font-weight: 700; text-transform: uppercase;">${escapeHtml(r.perk_category)}</span>
                    <span style="font-size: 0.7rem; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 4px;">${escapeHtml(r.file_format)}</span>
                  </div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: #0f172a; margin-bottom: 4px;">${escapeHtml(r.title)}</div>
                  <p style="font-size: 0.78rem; color: #64748b; margin: 0 0 8px 0; line-height: 1.35;">${escapeHtml(r.description)}</p>
                </div>
                <button class="btn ${isPaid ? 'btn-success' : 'btn-outline'} btn-sm" style="font-size: 0.75rem; padding: 4px 8px; justify-content: center;" onclick="claimPaidPerk('${escapeHtml(r.title)}', ${isPaid})">
                  ${isPaid ? '📥 Download Resource' : '🔒 View Perk Details'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openVideoModal(title, url, topics, desc) {
  const modal = document.getElementById('video-player-modal');
  const iframe = document.getElementById('video-iframe');
  const titleEl = document.getElementById('video-modal-title');
  const descEl = document.getElementById('video-modal-desc');
  const topicsEl = document.getElementById('video-modal-topics');
  if (!modal || !iframe) return;

  if (titleEl) titleEl.innerText = title;
  if (descEl) descEl.innerText = desc;
  if (topicsEl) {
    topicsEl.innerHTML = (topics || []).map(t => `<span style="font-size: 0.75rem; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-weight: 600;"># ${escapeHtml(t)}</span>`).join('');
  }

  // Set URL with autoplay parameter
  const embedUrl = url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
  iframe.src = embedUrl;
  modal.style.display = 'flex';
}

function closeVideoModal() {
  const modal = document.getElementById('video-player-modal');
  const iframe = document.getElementById('video-iframe');
  if (iframe) iframe.src = '';
  if (modal) modal.style.display = 'none';
}

function claimPaidPerk(title, isUnlocked) {
  if (isUnlocked) {
    showToast(`📥 Accessing "${title}"! Downloading resource...`, 'success');
  } else {
    showToast(`🔒 "${title}" is a special paid learner perk. It unlocks automatically when you request a paid 1-on-1 tutoring session in the Teacher Catalog!`, 'error');
  }
}

function openExchangeForSkill(skillName) {
  switchTab('tab-catalog');
  const searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    searchInput.value = skillName.split(' ')[0];
    loadTeacherCatalog();
  }
}

function switchToBrowseTeachers() {
  switchTab('tab-catalog');
  const modeSelect = document.getElementById('filter-mode-select');
  if (modeSelect) {
    modeSelect.value = 'PAID_ONLY';
    loadTeacherCatalog();
  }
}
