/**
 * AI Cliometrics - Expert Panel Application
 * Multi-round Delphi-style expert validation with API backend
 */

// =====================================================
// STATE MANAGEMENT
// =====================================================

const state = {
    expertId: '',
    expertProfile: '',
    expertToken: '',
    currentRound: 0,
    roundStatus: [],
    isAdmin: false,
    adminToken: '',

    // Phase 1 data
    factorValidations: {},
    phase1Comments: '',

    // Phase 2 data
    canonValidations: {},
    suggestions: [],
    phase2Comments: '',

    // Phase 3 data
    valuations: {},
    currentWorkId: null,
    completedWorks: new Set(),
    approvedWorks: []
};

// =====================================================
// API HELPERS
// =====================================================

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (state.adminToken) {
        options.headers['X-Admin-Token'] = state.adminToken;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API Error');
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Check round status
    await checkRoundStatus();

    // Initialize UI components
    renderFactors();
    renderCanon();
    initializeWorkSelector();

    // Set up event listeners
    setupEventListeners();

    // Load any saved state
    loadSavedState();

    // Check for token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        handleUrlToken(token);
    }
}

async function handleUrlToken(token) {
    try {
        const result = await apiCall('/expert/validate', 'POST', { token });
        if (result.expert_id) {
            state.expertId = result.expert_id;
            state.expertProfile = result.profile;
            state.expertToken = token;

            // UI Update
            document.getElementById('expertId').value = result.expert_id;
            document.getElementById('expertProfile').value = result.profile;

            // Auto-start
            if (state.currentRound > 0) {
                showSection(`phase${state.currentRound}`);
            } else {
                showSection('roundClosed');
            }
            saveState();
        }
    } catch (e) {
        console.error("Invalid token in URL", e);
    }
}

async function checkRoundStatus() {
    try {
        const status = await apiCall('/status');
        state.currentRound = status.current_round;
        state.roundStatus = status.rounds;

        updateRoundDisplay();
    } catch (error) {
        // Fallback to offline mode
        console.warn('API not available, running in offline mode');
        state.currentRound = 1;
        updateRoundDisplay();
    }
}

function updateRoundDisplay() {
    const display = document.getElementById('currentRoundDisplay');
    const statusCard = document.getElementById('roundStatusCard');
    const statusTitle = document.getElementById('roundStatusTitle');
    const statusDesc = document.getElementById('roundStatusDesc');

    if (state.currentRound === 0) {
        display.textContent = 'Closed';
        statusCard.className = 'round-status-card status-closed';
        statusTitle.textContent = 'Study Complete';
        statusDesc.textContent = 'All rounds have been completed. Thank you for your participation!';
    } else {
        display.textContent = `Round ${state.currentRound}`;
        statusCard.className = 'round-status-card status-open';

        const roundNames = ['', 'Factor Validation', 'Canon Curation', 'Hybrid Valuation'];
        statusTitle.textContent = `Round ${state.currentRound}: ${roundNames[state.currentRound]}`;
        statusDesc.textContent = 'This round is currently open for submissions.';
    }

    // Update progress steps
    document.querySelectorAll('.progress-step').forEach(step => {
        const phase = parseInt(step.dataset.phase);
        step.classList.remove('active', 'completed', 'locked');

        if (phase === state.currentRound) {
            step.classList.add('active');
        } else if (phase < state.currentRound) {
            step.classList.add('completed');
        } else {
            step.classList.add('locked');
        }
    });
}

function setupEventListeners() {
    // Start button
    document.getElementById('startBtn').addEventListener('click', startValidation);

    // Work selector change
    document.getElementById('workSelect').addEventListener('change', (e) => {
        selectWork(e.target.value);
    });

    // Auto-save on input changes
    document.getElementById('phase1Comments').addEventListener('input', (e) => {
        state.phase1Comments = e.target.value;
        saveState();
    });

    document.getElementById('phase2Comments').addEventListener('input', (e) => {
        state.phase2Comments = e.target.value;
        saveState();
    });
}

// =====================================================
// PHASE 1: FACTOR VALIDATION
// =====================================================

function renderFactors() {
    const grid = document.getElementById('factorsGrid');
    grid.innerHTML = FACTORS.map((factor, index) => `
        <div class="factor-card" data-factor="${factor.id}">
            <div class="factor-header">
                <div class="factor-info">
                    <div class="factor-name">${index + 1}. ${factor.name}</div>
                    <div class="factor-definition">${factor.definition}</div>
                </div>
                <div class="factor-actions">
                    <button class="action-btn selected" data-action="ok" onclick="setFactorAction('${factor.id}', 'ok', this)">
                        ✓ OK
                    </button>
                    <button class="action-btn" data-action="modify" onclick="setFactorAction('${factor.id}', 'modify', this)">
                        ✎ Modify
                    </button>
                </div>
            </div>
            <div class="factor-comment hidden" id="comment-${factor.id}">
                <input type="text" placeholder="Suggested modification..." 
                       onchange="setFactorComment('${factor.id}', this.value)">
            </div>
        </div>
    `).join('');

    // Initialize all factors as OK
    FACTORS.forEach(factor => {
        state.factorValidations[factor.id] = { action: 'ok', comment: '' };
    });
}

function setFactorAction(factorId, action, button) {
    state.factorValidations[factorId].action = action;

    const card = button.closest('.factor-card');
    card.querySelectorAll('.action-btn').forEach(btn => {
        btn.classList.remove('selected', 'selected-modify');
    });

    if (action === 'ok') {
        button.classList.add('selected');
        card.querySelector('.factor-comment').classList.add('hidden');
    } else {
        button.classList.add('selected-modify');
        card.querySelector('.factor-comment').classList.remove('hidden');
    }

    saveState();
}

function setFactorComment(factorId, comment) {
    state.factorValidations[factorId].comment = comment;
    saveState();
}

async function submitRound1() {
    if (!state.expertId) {
        alert('Please enter your Expert ID first');
        return;
    }

    try {
        await apiCall('/round1/submit', 'POST', {
            expert_id: state.expertId,
            validations: state.factorValidations
        });

        showSection('thankyou');
        document.getElementById('nextRoundInfo').textContent =
            'Round 2 (Canon Curation) will open in approximately one week.';
    } catch (error) {
        alert('Error submitting: ' + error.message);
    }
}

// =====================================================
// PHASE 2: CANON VALIDATION
// =====================================================

function renderCanon() {
    const grid = document.getElementById('canonGrid');
    grid.innerHTML = Object.entries(WORKS).map(([workId, work]) => `
        <div class="canon-card" data-work="${workId}">
            <span class="canon-type ${work.type.toLowerCase()}">${work.type}</span>
            <div class="canon-author">${work.author}</div>
            <div class="canon-title">${work.title}</div>
            <a href="${work.url}" target="_blank" rel="noopener" class="canon-link">
                📖 View Publication
            </a>
            <div class="canon-actions">
                <button class="canon-btn keep selected" onclick="setCanonAction('${workId}', 'keep', this)">
                    ✓ Keep
                </button>
                <button class="canon-btn remove" onclick="setCanonAction('${workId}', 'remove', this)">
                    ✗ Remove
                </button>
            </div>
        </div>
    `).join('');

    // Initialize all works as Keep
    Object.keys(WORKS).forEach(workId => {
        state.canonValidations[workId] = 'keep';
    });
}

function setCanonAction(workId, action, button) {
    state.canonValidations[workId] = action;

    const card = button.closest('.canon-card');
    card.querySelectorAll('.canon-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    saveState();
}

async function submitSuggestion() {
    const author = document.getElementById('suggestAuthor').value.trim();
    const title = document.getElementById('suggestTitle').value.trim();
    const type = document.getElementById('suggestType').value;
    const url = document.getElementById('suggestUrl').value.trim();
    const justification = document.getElementById('suggestJustification').value.trim();

    if (!author || !title) {
        alert('Please fill in at least the author and title');
        return;
    }

    const suggestion = {
        expert_id: state.expertId,
        author,
        title,
        work_type: type,
        url,
        justification
    };

    try {
        await apiCall('/round2/suggest', 'POST', suggestion);

        // Add to local list
        state.suggestions.push(suggestion);
        renderSuggestions();

        // Clear form
        document.getElementById('suggestAuthor').value = '';
        document.getElementById('suggestTitle').value = '';
        document.getElementById('suggestType').value = '';
        document.getElementById('suggestUrl').value = '';
        document.getElementById('suggestJustification').value = '';

    } catch (error) {
        // Store locally if API fails
        state.suggestions.push(suggestion);
        renderSuggestions();
    }

    saveState();
}

function renderSuggestions() {
    const list = document.getElementById('suggestionsList');
    if (state.suggestions.length === 0) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = `
        <h4>Your Suggestions</h4>
        ${state.suggestions.map((s, i) => `
            <div class="suggestion-item">
                <span class="suggestion-author">${s.author}</span>
                <span class="suggestion-title">${s.title}</span>
            </div>
        `).join('')}
    `;
}

async function submitRound2() {
    if (!state.expertId) {
        alert('Please enter your Expert ID first');
        return;
    }

    try {
        await apiCall('/round2/submit', 'POST', {
            expert_id: state.expertId,
            votes: state.canonValidations
        });

        showSection('thankyou');
        document.getElementById('nextRoundInfo').textContent =
            'Round 3 (Hybrid Valuation) will open in approximately one week.';
    } catch (error) {
        alert('Error submitting: ' + error.message);
    }
}

// =====================================================
// PHASE 3: HYBRID VALUATION
// =====================================================

async function initializeWorkSelector() {
    // Try to get approved works from API
    try {
        const worksData = await apiCall('/round3/works');
        state.approvedWorks = worksData.approved_works || Object.keys(WORKS);
    } catch (error) {
        // Use all works if API fails
        state.approvedWorks = Object.keys(WORKS);
    }

    const select = document.getElementById('workSelect');
    select.innerHTML = '<option value="">-- Select a work to evaluate --</option>' +
        state.approvedWorks
            .filter(workId => WORKS[workId])
            .map(workId => {
                const work = WORKS[workId];
                return `<option value="${workId}">${work.author}: ${work.title}</option>`;
            }).join('');

    // Initialize valuations with AI baselines
    state.approvedWorks.forEach(workId => {
        if (WORKS[workId]) {
            state.valuations[workId] = { ...WORKS[workId].aiBaseline };
        }
    });

    updateWorkProgress();
}

function selectWork(workId) {
    if (!workId) return;

    state.currentWorkId = workId;
    const work = WORKS[workId];

    // Update header
    document.getElementById('workTitle').textContent = `${work.author}: ${work.title}`;
    document.getElementById('workType').textContent = work.type;

    // Update publication link
    const linkEl = document.getElementById('workUrl');
    linkEl.href = work.url;
    linkEl.style.display = 'inline-flex';

    // Render sliders
    renderSliders(workId);

    saveState();
}

function renderSliders(workId) {
    const container = document.getElementById('slidersContainer');
    const work = WORKS[workId];
    const currentValues = state.valuations[workId];

    container.innerHTML = FACTORS.map(factor => {
        const aiValue = work.aiBaseline[factor.id];
        const expertValue = currentValues[factor.id];
        const delta = expertValue - aiValue;
        const deltaClass = delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : 'delta-neutral';
        const deltaSign = delta > 0 ? '+' : '';

        return `
            <div class="slider-row" data-factor="${factor.id}">
                <div class="slider-label">${factor.name}</div>
                <div class="ai-value">
                    <span class="ai-value-label">AI</span>
                    <span class="ai-value-number">${aiValue}</span>
                </div>
                <div class="slider-wrapper">
                    <input type="range" class="slider" 
                           min="0" max="100" value="${expertValue}"
                           data-factor="${factor.id}"
                           oninput="updateSlider('${factor.id}', this.value)">
                </div>
                <div class="expert-value">
                    <span class="expert-value-label">You</span>
                    <span class="expert-value-number" id="value-${factor.id}">${expertValue}</span>
                </div>
                <div class="delta-display ${deltaClass}" id="delta-${factor.id}">
                    ${deltaSign}${delta.toFixed(1)}
                </div>
            </div>
        `;
    }).join('');

    updateTotal();
}

function updateSlider(factorId, value) {
    const numValue = parseInt(value);
    state.valuations[state.currentWorkId][factorId] = numValue;

    document.getElementById(`value-${factorId}`).textContent = numValue;

    const aiValue = WORKS[state.currentWorkId].aiBaseline[factorId];
    const delta = numValue - aiValue;
    const deltaEl = document.getElementById(`delta-${factorId}`);
    deltaEl.textContent = (delta > 0 ? '+' : '') + delta.toFixed(1);
    deltaEl.className = 'delta-display ' + (delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : 'delta-neutral');

    updateTotal();
    saveState();
}

function updateTotal() {
    if (!state.currentWorkId) return;

    const values = state.valuations[state.currentWorkId];
    const total = Object.values(values).reduce((sum, v) => sum + v, 0);

    const indicator = document.getElementById('totalIndicator');
    const valueEl = document.getElementById('totalValue');

    valueEl.textContent = total;

    indicator.classList.remove('valid', 'invalid');
    if (total === 100) {
        indicator.classList.add('valid');
        state.completedWorks.add(state.currentWorkId);
    } else {
        indicator.classList.add('invalid');
    }

    updateWorkProgress();
}

function updateWorkProgress() {
    const total = state.approvedWorks.length;
    const completed = state.completedWorks.size;

    document.getElementById('workProgressText').textContent = `${completed} of ${total} completed`;
    document.getElementById('workProgressFill').style.width = `${(completed / total) * 100}%`;
}

async function submitRound3() {
    if (state.completedWorks.size === 0) {
        alert('Please complete at least one work valuation before submitting.');
        return;
    }

    // Submit each completed work
    for (const workId of state.completedWorks) {
        const work = WORKS[workId];
        const values = state.valuations[workId];

        const valuations = FACTORS.map(factor => ({
            factor_id: factor.id,
            ai_value: work.aiBaseline[factor.id],
            expert_value: values[factor.id],
            delta: values[factor.id] - work.aiBaseline[factor.id]
        }));

        try {
            await apiCall('/round3/submit', 'POST', {
                expert_id: state.expertId,
                work_id: workId,
                valuations
            });
        } catch (error) {
            console.error('Error submitting work:', workId, error);
        }
    }

    showSection('thankyou');
    document.getElementById('nextRoundInfo').textContent =
        'Thank you for completing all three rounds! Your contributions are invaluable to our research.';

    localStorage.removeItem('aiCliometricsState');
}

// =====================================================
// NAVIGATION
// =====================================================

async function startValidation() {
    const expertId = document.getElementById('expertId').value.trim();
    const expertProfile = document.getElementById('expertProfile').value;

    if (!expertId) {
        alert('Please enter your Expert ID');
        return;
    }

    if (!expertProfile) {
        alert('Please select your historiographical profile');
        return;
    }

    state.expertId = expertId;
    state.expertProfile = expertProfile;

    // Register expert
    try {
        const result = await apiCall('/expert/register', 'POST', {
            expert_id: expertId,
            profile: expertProfile
        });
        state.expertToken = result.token;
    } catch (error) {
        console.warn('Could not register with API, continuing offline');
    }

    // Go to current round
    if (state.currentRound === 0) {
        showSection('roundClosed');
    } else {
        showSection(`phase${state.currentRound}`);
    }

    saveState();
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================================
// ADMIN FUNCTIONS
// =====================================================

function showAdminLogin() {
    document.getElementById('adminModal').classList.remove('hidden');
}

function hideAdminLogin() {
    document.getElementById('adminModal').classList.add('hidden');
}

async function loginAdmin() {
    const token = document.getElementById('adminToken').value;
    state.adminToken = token;

    try {
        await apiCall('/status');
        state.isAdmin = true;
        hideAdminLogin();
        showSection('admin');
        loadAdminData();
    } catch (error) {
        alert('Invalid admin token');
    }
}

async function loadAdminData() {
    // Load round status
    const status = await apiCall('/status');
    const roundsDiv = document.getElementById('adminRounds');
    roundsDiv.innerHTML = status.rounds.map(r => `
        <div class="admin-round">
            <span>Round ${r.round_number}</span>
            <span class="round-status-badge ${r.status}">${r.status}</span>
            ${r.status === 'open' ?
            `<button class="btn btn-secondary" onclick="closeRound(${r.round_number})">Close Round</button>`
            : ''}
        </div>
    `).join('');

    // Load suggestions
    const suggestions = await apiCall('/round2/suggestions');
    const suggestionsDiv = document.getElementById('adminSuggestions');
    suggestionsDiv.innerHTML = suggestions
        .filter(s => s.status === 'pending')
        .map(s => `
            <div class="admin-suggestion">
                <div class="suggestion-info">
                    <strong>${s.author}</strong>: ${s.title}
                    <p>${s.justification || 'No justification provided'}</p>
                </div>
                <div class="suggestion-actions">
                    <button class="btn btn-primary" onclick="approveSuggestion(${s.id})">Approve</button>
                    <button class="btn btn-secondary" onclick="rejectSuggestion(${s.id})">Reject</button>
                </div>
            </div>
        `).join('') || '<p>No pending suggestions</p>';
}

async function closeRound(roundNumber) {
    if (confirm(`Close Round ${roundNumber} and open Round ${roundNumber + 1}?`)) {
        await apiCall('/admin/close-round', 'POST', { round: roundNumber });
        await loadAdminData();
        await checkRoundStatus();
    }
}

async function approveSuggestion(id) {
    await apiCall('/admin/approve-suggestion', 'POST', { id });
    await loadAdminData();
}

async function rejectSuggestion(id) {
    await apiCall('/admin/reject-suggestion', 'POST', { id });
    await loadAdminData();
}

async function exportJSON() {
    window.open(`${API_BASE}/admin/export`, '_blank');
}

async function exportCSV() {
    window.open(`${API_BASE}/admin/export-csv`, '_blank');
}

// =====================================================
// LOCAL STORAGE
// =====================================================

function saveState() {
    const saveData = {
        expertId: state.expertId,
        expertProfile: state.expertProfile,
        expertToken: state.expertToken,
        factorValidations: state.factorValidations,
        phase1Comments: state.phase1Comments,
        canonValidations: state.canonValidations,
        suggestions: state.suggestions,
        phase2Comments: state.phase2Comments,
        valuations: state.valuations,
        currentWorkId: state.currentWorkId,
        completedWorks: Array.from(state.completedWorks)
    };
    localStorage.setItem('aiCliometricsState', JSON.stringify(saveData));
}

function loadSavedState() {
    const saved = localStorage.getItem('aiCliometricsState');
    if (!saved) return;

    try {
        const data = JSON.parse(saved);

        if (data.expertId) state.expertId = data.expertId;
        if (data.expertProfile) state.expertProfile = data.expertProfile;
        if (data.expertToken) state.expertToken = data.expertToken;
        if (data.factorValidations) state.factorValidations = data.factorValidations;
        if (data.phase1Comments) state.phase1Comments = data.phase1Comments;
        if (data.canonValidations) state.canonValidations = data.canonValidations;
        if (data.suggestions) state.suggestions = data.suggestions;
        if (data.phase2Comments) state.phase2Comments = data.phase2Comments;
        if (data.valuations) state.valuations = data.valuations;
        if (data.currentWorkId) state.currentWorkId = data.currentWorkId;
        if (data.completedWorks) state.completedWorks = new Set(data.completedWorks);

        // Restore UI
        if (state.expertId) {
            document.getElementById('expertId').value = state.expertId;
        }
        if (state.expertProfile) {
            document.getElementById('expertProfile').value = state.expertProfile;
        }
        if (state.phase1Comments) {
            document.getElementById('phase1Comments').value = state.phase1Comments;
        }
        if (state.phase2Comments) {
            document.getElementById('phase2Comments').value = state.phase2Comments;
        }

        renderSuggestions();

    } catch (e) {
        console.error('Error loading saved state:', e);
    }
}

// Make functions globally available
window.showSection = showSection;
window.setFactorAction = setFactorAction;
window.setFactorComment = setFactorComment;
window.setCanonAction = setCanonAction;
window.updateSlider = updateSlider;
window.selectWork = selectWork;
window.submitRound1 = submitRound1;
window.submitRound2 = submitRound2;
window.submitRound3 = submitRound3;
window.submitSuggestion = submitSuggestion;
window.showAdminLogin = showAdminLogin;
window.hideAdminLogin = hideAdminLogin;
window.loginAdmin = loginAdmin;
window.closeRound = closeRound;
window.approveSuggestion = approveSuggestion;
window.rejectSuggestion = rejectSuggestion;
window.exportJSON = exportJSON;
window.exportCSV = exportCSV;
