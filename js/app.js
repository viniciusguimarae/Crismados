// ============================================================
// CONFRARIA DOS CRISMADOS — app.js
// Orquestrador principal: estado global, auth, roteamento
// ============================================================

import { mergeWithSupabase, getDailyQuote } from './members.js';
import {
  getCurrentMonthKey, getCurrentMonthName, getToday, toDateString,
  formatMonthName, getPastDays, formatShortDate, formatLongDate
} from './dates.js';
import {
  getMembers, registerAttendance, updateAttendance,
  onAuthStateChange, getAllAttendances, removeAttendance
} from './supabase.js';
import {
  showToast, triggerAllPresentEffect,
  lightCandle, fadeInElement,
} from './animations.js';
import {
  renderCandles, updatePanelHeader, renderPersonalHistory,
  updateStats, updateRegisterButton, renderRanking,
  renderConfrariaStatus, renderHistory, renderAdminMonthStatus
} from './ui.js';
import { renderCertificate, checkCertificateEligibility } from './certificate.js';
import { initAuth, renderAuthScreen, handleLogout } from './auth.js';

// ─── ESTADO GLOBAL ────────────────────────────────────────────

const state = {
  currentMember: null,
  currentTab: 'inicio',
  members: [],
  allAttendances: [],
  monthAttendances: [],
  memberAttendances: [],
  todayPresentIds: [],
  currentMonthKey: '',
  loading: false,
};

// ─── INICIALIZAÇÃO ────────────────────────────────────────────

async function init() {
  state.currentMonthKey = getCurrentMonthKey();
  showLoadingOverlay(true);

  const authContainer = document.getElementById('screen-auth');
  if (authContainer) renderAuthScreen(authContainer);

  const hadSession = await initAuth(onMemberAuthenticated);

  if (!hadSession) {
    showScreen('auth');
  }

  showLoadingOverlay(false);

  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      state.currentMember = null;
      showScreen('auth');
    }
  });

  setupModal();
}

// ─── CALLBACK DE AUTENTICAÇÃO ─────────────────────────────────

async function onMemberAuthenticated(member) {
  state.currentMember = member;
  showLoadingOverlay(true);

  try {
    await loadInitialData();
  } catch (err) {
    showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
    console.error('[App] Erro ao carregar dados:', err);
  }

  const adminTabBtn = document.getElementById('nav-admin');
  if (adminTabBtn && member.is_admin) {
    adminTabBtn.classList.remove('hidden');
  }

  showLoadingOverlay(false);
  showScreen('app');
  bindNavEvents();
  switchTab('inicio');
  loadMemberPanel();
}

// ─── CARREGAMENTO DE DADOS ────────────────────────────────────

async function loadInitialData() {
  const { data: supabaseMembers, error: membersError } = await getMembers();
  if (membersError) throw membersError;
  state.members = mergeWithSupabase(supabaseMembers || []);

  const { data: attendances, error: attError } = await getAllAttendances();
  if (attError) throw attError;
  state.allAttendances = attendances || [];
  
  state.monthAttendances = state.allAttendances.filter(a => a.month_key === state.currentMonthKey);

  const todayStr = toDateString(getToday());
  state.todayPresentIds = state.monthAttendances
    .filter(a => a.mass_date === todayStr || a.sunday_date === todayStr)
    .map(a => a.member_id);
}

async function reloadAttendances() {
  const { data: attendances } = await getAllAttendances();
  state.allAttendances = attendances || [];
  state.monthAttendances = state.allAttendances.filter(a => a.month_key === state.currentMonthKey);
  
  const todayStr = toDateString(getToday());
  state.todayPresentIds = state.monthAttendances
    .filter(a => a.mass_date === todayStr || a.sunday_date === todayStr)
    .map(a => a.member_id);
}

// ─── PAINEL INDIVIDUAL ────────────────────────────────────────

function loadMemberPanel() {
  const member = state.currentMember;
  if (!member) return;

  updatePanelHeader(member);

  const quote = getDailyQuote();
  const qtEl = document.getElementById('panel-quote-text');
  const qrEl = document.getElementById('panel-quote-ref');
  if (qtEl) qtEl.textContent = `"${quote.text}"`;
  if (qrEl) qrEl.textContent = quote.ref;

  state.memberAttendances = state.monthAttendances.filter(a => a.member_id === member.id);

  updateStats(state.memberAttendances.length, '-');

  const candlesContainer = document.getElementById('candles-container');
  if (candlesContainer) {
    renderCandles(candlesContainer, state.memberAttendances);
  }
  
  const historyContainer = document.getElementById('personal-history-container');
  if (historyContainer) {
    renderPersonalHistory(historyContainer, state.memberAttendances, openEditModal);
  }

  const todayStr = toDateString(getToday());
  const alreadyRegisteredToday = state.memberAttendances.some(a => (a.mass_date || a.sunday_date) === todayStr);
  if (alreadyRegisteredToday) {
    updateRegisterButton('done');
  } else {
    updateRegisterButton('active');
  }

  const certContainer = document.getElementById('certificate-container');
  if (certContainer) {
    const eligibility = checkCertificateEligibility(state.memberAttendances);
    renderCertificate(certContainer, member, eligibility);
  }
}

// ─── MODAL DE REGISTRO ────────────────────────────────────────

function setupModal() {
  const modal = document.getElementById('modal-register');
  const form = document.getElementById('form-register-mass');
  const btnCancel = document.getElementById('btn-cancel-mass');

  if (btnCancel) {
    btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
  }
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveMass();
    });
  }
}

function openRegisterModal() {
  const modal = document.getElementById('modal-register');
  const form = document.getElementById('form-register-mass');
  const chipsContainer = document.getElementById('chips-date-container');
  const dateInput = document.getElementById('input-mass-date');
  const title = document.getElementById('modal-title');
  const errorMsg = document.getElementById('error-mass-date');
  
  form.reset();
  document.getElementById('input-mass-id').value = '';
  title.textContent = 'Registrar Missa';
  errorMsg.classList.add('hidden');
  
  const btnSave = document.getElementById('btn-save-mass');
  if (btnSave) {
    btnSave.textContent = 'Registrar missa';
    btnSave.disabled = false;
  }
  
  // Create chips for last 4 days
  chipsContainer.innerHTML = '';
  const pastDays = getPastDays(3);
  let selectedDateStr = toDateString(pastDays[0]); // Default to today
  dateInput.value = selectedDateStr;
  
  pastDays.forEach((date, i) => {
    const dStr = toDateString(date);
    const isToday = i === 0;
    const label = isToday ? 'Hoje' : (i === 1 ? 'Ontem' : formatShortDate(dStr));
    
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${isToday ? 'chip--active' : ''}`;
    chip.textContent = label;
    chip.dataset.date = dStr;
    
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      dateInput.value = dStr;
      errorMsg.classList.add('hidden');
    });
    
    chipsContainer.appendChild(chip);
  });
  
  modal.classList.remove('hidden');
}

function openEditModal(attendance) {
  const modal = document.getElementById('modal-register');
  const form = document.getElementById('form-register-mass');
  const chipsContainer = document.getElementById('chips-date-container');
  const dateInput = document.getElementById('input-mass-date');
  const title = document.getElementById('modal-title');
  const errorMsg = document.getElementById('error-mass-date');
  
  form.reset();
  document.getElementById('input-mass-id').value = attendance.id;
  title.textContent = 'Editar Missa';
  errorMsg.classList.add('hidden');
  
  const btnSave = document.getElementById('btn-save-mass');
  if (btnSave) {
    btnSave.textContent = 'Salvar alterações';
    btnSave.disabled = false;
  }
  
  const dStr = attendance.mass_date || attendance.sunday_date;
  dateInput.value = dStr;
  
  document.getElementById('input-mass-location').value = attendance.location || '';
  document.getElementById('input-mass-time').value = attendance.mass_time || '';
  
  chipsContainer.innerHTML = '';
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip chip--active';
  chip.textContent = formatShortDate(dStr);
  chipsContainer.appendChild(chip);
  
  modal.classList.remove('hidden');
}

async function handleSaveMass() {
  const member = state.currentMember;
  if (!member) return;

  const id = document.getElementById('input-mass-id').value;
  const dateStr = document.getElementById('input-mass-date').value;
  const location = document.getElementById('input-mass-location').value.trim();
  const time = document.getElementById('input-mass-time').value.trim();
  const errorMsg = document.getElementById('error-mass-date');
  
  const monthKey = dateStr.slice(0, 7);
  const modal = document.getElementById('modal-register');
  const btnSave = document.getElementById('btn-save-mass');
  
  // Verificação de duplicata para novas inserções
  if (!id) {
    const isDuplicate = state.memberAttendances.some(a => (a.mass_date || a.sunday_date) === dateStr);
    if (isDuplicate) {
      errorMsg.classList.remove('hidden');
      return;
    }
  }

  const oldText = btnSave.textContent;
  btnSave.textContent = 'Aguarde...';
  btnSave.disabled = true;

  let success = false;
  let errorObj = null;
  let isDuplicate = false;

  if (id) {
    const res = await updateAttendance(id, { mass_date: dateStr, location, mass_time: time });
    success = res.success;
    errorObj = res.error;
    isDuplicate = res.duplicate;
  } else {
    const res = await registerAttendance(member.id, dateStr, monthKey, location, time);
    success = res.success;
    errorObj = res.error;
    isDuplicate = res.duplicate;
  }

  if (success) {
    await reloadAttendances();
    loadMemberPanel();
    modal.classList.add('hidden');
    showToast(`Missa salva, ${member.name.split(' ')[0]}!`, 'success');
  } else if (isDuplicate) {
    errorMsg.classList.remove('hidden');
  } else {
    const errText = errorObj?.message || JSON.stringify(errorObj) || 'Erro desconhecido';
    showToast('Erro Supabase: ' + errText, 'error');
  }

  btnSave.textContent = oldText;
  btnSave.disabled = false;
}

// ─── ADMIN PANEL ──────────────────────────────────────────────

function loadAdminPanel() {
  if (!state.currentMember || !state.currentMember.is_admin) return;

  const insertMemberSel = document.getElementById('admin-insert-member');
  const insertSundaySel = document.getElementById('admin-insert-sunday'); // we will use it for any date
  const removeMemberSel = document.getElementById('admin-remove-member');
  const removeSundaySel = document.getElementById('admin-remove-sunday');

  const memberOptions = state.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  if (insertMemberSel) insertMemberSel.innerHTML = memberOptions;
  
  if (removeMemberSel) {
    removeMemberSel.innerHTML = '<option value="">Selecione o membro...</option>' + memberOptions;
    removeMemberSel.addEventListener('change', () => {
      const mId = removeMemberSel.value;
      if (!mId) {
        removeSundaySel.innerHTML = '';
        return;
      }
      const memberAtts = state.allAttendances.filter(a => a.member_id === mId);
      // Sort by date desc
      memberAtts.sort((a, b) => (b.mass_date||b.sunday_date).localeCompare(a.mass_date||a.sunday_date));
      removeSundaySel.innerHTML = memberAtts.map(a => `<option value="${a.id}">${a.mass_date||a.sunday_date}</option>`).join('');
    });
  }

  if (insertSundaySel) {
    // We can just turn it into an input type date via JS if it's not already
    insertSundaySel.outerHTML = '<input type="date" id="admin-insert-sunday" class="form-input" style="color:var(--stone); padding:4px;" max="' + toDateString(getToday()) + '" value="' + toDateString(getToday()) + '" />';
  }

  const statusContainer = document.getElementById('admin-month-status');
  if (statusContainer) {
    renderAdminMonthStatus(statusContainer, state.members, state.monthAttendances);
  }

  const btnInsert = document.getElementById('btn-admin-insert');
  if (btnInsert) {
    btnInsert.onclick = async () => {
      const mId = document.getElementById('admin-insert-member').value;
      const sDate = document.getElementById('admin-insert-sunday').value;
      if (!mId || !sDate) return;
      
      const mKey = sDate.slice(0, 7);
      const btn = btnInsert;
      const oldText = btn.textContent;
      btn.textContent = 'Aguarde...';
      btn.disabled = true;

      const { success, duplicate } = await registerAttendance(mId, sDate, mKey);
      if (success) {
        showToast('Presença registrada.', 'success');
        await reloadAttendances();
        loadAdminPanel();
      } else if (duplicate) {
        showToast('Já existe registro nessa data.', 'error');
      } else {
        showToast('Erro ao registrar.', 'error');
      }
      btn.textContent = oldText;
      btn.disabled = false;
    };
  }

  const btnRemove = document.getElementById('btn-admin-remove');
  const divConfirm = document.getElementById('admin-remove-confirm');
  const btnConfirmRemove = document.getElementById('btn-admin-confirm-remove');
  const btnCancelRemove = document.getElementById('btn-admin-cancel-remove');

  if (btnRemove) {
    btnRemove.onclick = () => {
      const idToRemove = document.getElementById('admin-remove-sunday').value;
      if (!removeMemberSel.value || !idToRemove) return;
      btnRemove.classList.add('hidden');
      divConfirm.classList.remove('hidden');
    };
  }
  if (btnCancelRemove) {
    btnCancelRemove.onclick = () => {
      divConfirm.classList.add('hidden');
      btnRemove.classList.remove('hidden');
    };
  }
  if (btnConfirmRemove) {
    btnConfirmRemove.onclick = async () => {
      const idToRemove = document.getElementById('admin-remove-sunday').value;
      if (!idToRemove) return;

      const { success } = await removeAttendance(idToRemove); // we need to update supabase.js
      if (success) {
        showToast('Presença removida.', 'success');
        await reloadAttendances();
        removeMemberSel.value = '';
        document.getElementById('admin-remove-sunday').innerHTML = '';
        divConfirm.classList.add('hidden');
        btnRemove.classList.remove('hidden');
        loadAdminPanel();
      } else {
        showToast('Erro ao remover.', 'error');
      }
    };
  }
}

// ─── NAVEGAÇÃO (TABS) ─────────────────────────────────────────

function switchTab(tabName) {
  state.currentTab = tabName;

  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.add('tab--hidden');
  });

  const target = document.getElementById(`tab-${tabName}`);
  if (target) {
    target.classList.remove('tab--hidden');
    fadeInElement(target, 0);
  }

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('nav-tab--active', btn.dataset.tab === tabName);
  });

  if (tabName === 'ranking')   loadRanking();
  if (tabName === 'confraria') loadConfraria();
  if (tabName === 'historico') loadHistory();
  if (tabName === 'admin')     loadAdminPanel();
}

function bindNavEvents() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
  });

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await handleLogout(() => {
        state.currentMember = null;
        state.members = [];
        state.monthAttendances = [];
        state.memberAttendances = [];
        state.todayPresentIds = [];
        showScreen('auth');
        showToast('Até logo. ✝', 'info', 2000);
      });
    });
  }

  const registerBtn = document.getElementById('btn-register');
  if (registerBtn) {
    const newBtn = registerBtn.cloneNode(true);
    registerBtn.parentNode.replaceChild(newBtn, registerBtn);
    newBtn.addEventListener('click', openRegisterModal);
  }
}

// ─── RANKING ──────────────────────────────────────────────────

function loadRanking() {
  const listEl = document.getElementById('ranking-list');
  if (!listEl) return;

  const attendanceMap = {};
  state.members.forEach(member => {
    attendanceMap[member.id] = state.monthAttendances
      .filter(a => a.member_id === member.id)
      .map(a => a.mass_date || a.sunday_date);
  });

  const monthEl = document.getElementById('ranking-month');
  if (monthEl) monthEl.textContent = getCurrentMonthName();

  renderRanking(listEl, state.members, attendanceMap, 0); // Removemos totalPossible visualmente em renderRanking
}

// ─── CONFRARIA ────────────────────────────────────────────────

function loadConfraria() {
  renderConfrariaStatus(state.members, state.monthAttendances);
}

// ─── HISTÓRICO ────────────────────────────────────────────────

function loadHistory() {
  const listEl = document.getElementById('history-list');
  if (!listEl) return;
  
  renderHistory(listEl, state.allAttendances, state.members);
}

// ─── HELPERS DE TELA ──────────────────────────────────────────

function showScreen(name) {
  document.getElementById('screen-auth')?.classList.toggle('screen--hidden',  name !== 'auth');
  document.getElementById('screen-entry')?.classList.toggle('screen--hidden', name !== 'entry');
  document.getElementById('screen-app')?.classList.toggle('screen--hidden',   name !== 'app');
}

function showLoadingOverlay(show) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  if (show) {
    overlay.classList.remove('hidden', 'fade-out');
  } else {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.classList.add('hidden'), 550);
  }
}

// ─── ARRANQUE ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
