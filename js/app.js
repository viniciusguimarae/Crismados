// ============================================================
// CONFRARIA DOS CRISMADOS — app.js
// Orquestrador principal: estado global, auth, roteamento
// ============================================================

import { mergeWithSupabase, getDailyQuote } from './members.js';
import {
  getCurrentMonthKey, getCurrentMonthName,
  getSundaysInCurrentMonth, getPastSundaysInCurrentMonth,
  getCurrentSundayDateString, calculateStreak, toDateString,
  isRegistrationOpen, getMostRecentSunday, formatMonthName, getSundaysInMonth
} from './dates.js';
import {
  getMembers, registerAttendance,
  onAuthStateChange, getAllAttendances, removeAttendance
} from './supabase.js';
import {
  showToast, triggerAllPresentEffect,
  lightCandle, fadeInElement,
} from './animations.js';
import {
  renderCandles, updatePanelHeader,
  updateStats, updateRegisterButton, renderRanking,
  renderOrbs, updateFidelityBar, renderHistory, renderAdminMonthStatus
} from './ui.js';
import { renderCertificate, checkCertificateEligibility } from './certificate.js';
import { initAuth, renderAuthScreen, handleLogout } from './auth.js';

// ─── ESTADO GLOBAL ────────────────────────────────────────────

const state = {
  // Membro autenticado (null até fazer login)
  currentMember: null,

  // Aba ativa no app principal
  currentTab: 'inicio',

  // Dados carregados do Supabase
  members: [],
  allAttendances: [], // TODAS as presenças (para histórico e admin)
  monthAttendances: [], // Filtrado para o mês atual

  // Cache computado
  memberAttendanceDates: [],
  todayPresentIds: [],

  // Dados calculados do mês atual
  allSundays: [],
  pastSundays: [],
  currentMonthKey: '',
  currentSundayStr: '',
  registrationOpen: false,

  // Controle de loading
  loading: false,
};

// ─── INICIALIZAÇÃO ────────────────────────────────────────────

async function init() {
  // Datas (independente do Supabase)
  state.allSundays    = getSundaysInCurrentMonth();
  state.pastSundays   = getPastSundaysInCurrentMonth();
  state.currentMonthKey = getCurrentMonthKey();
  state.currentSundayStr = getCurrentSundayDateString();
  state.registrationOpen = isRegistrationOpen();

  showLoadingOverlay(true);

  // Renderiza a tela de auth (sempre primeiro)
  const authContainer = document.getElementById('screen-auth');
  if (authContainer) {
    renderAuthScreen(authContainer);
  }

  // Verifica sessão existente
  const hadSession = await initAuth(onMemberAuthenticated);

  if (!hadSession) {
    // Nenhuma sessão → mostra tela de login
    showScreen('auth');
  }

  showLoadingOverlay(false);

  // Listener para mudanças de sessão (logout em outra aba, etc)
  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      state.currentMember = null;
      showScreen('auth');
    }
  });
}

// ─── CALLBACK DE AUTENTICAÇÃO ─────────────────────────────────

/**
 * Chamado pelo auth.js quando login/cadastro for bem-sucedido.
 * @param {object} member - { id, name, auth_user_id, is_admin }
 */
async function onMemberAuthenticated(member) {
  state.currentMember = member;

  showLoadingOverlay(true);

  try {
    await loadInitialData();
  } catch (err) {
    showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
    console.error('[App] Erro ao carregar dados:', err);
  }

  // Mostra aba Admin se for admin
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
  // Busca todos os membros
  const { data: supabaseMembers, error: membersError } = await getMembers();
  if (membersError) throw membersError;
  state.members = mergeWithSupabase(supabaseMembers || []);

  // Busca TODAS as presenças
  const { data: attendances, error: attError } = await getAllAttendances();
  if (attError) throw attError;
  state.allAttendances = attendances || [];
  
  // Filtra mês atual
  state.monthAttendances = state.allAttendances.filter(a => a.month_key === state.currentMonthKey);

  // Presentes no domingo de referência
  state.todayPresentIds = state.monthAttendances
    .filter(a => a.sunday_date === state.currentSundayStr)
    .map(a => a.member_id);
}

async function reloadAttendances() {
  const { data: attendances } = await getAllAttendances();
  state.allAttendances = attendances || [];
  state.monthAttendances = state.allAttendances.filter(a => a.month_key === state.currentMonthKey);
  
  state.todayPresentIds = state.monthAttendances
    .filter(a => a.sunday_date === state.currentSundayStr)
    .map(a => a.member_id);
}

// ─── PAINEL INDIVIDUAL ────────────────────────────────────────

function loadMemberPanel() {
  const member = state.currentMember;
  if (!member) return;

  // Header
  updatePanelHeader(member);

  // Quote
  const quote = getDailyQuote();
  const qtEl = document.getElementById('panel-quote-text');
  const qrEl = document.getElementById('panel-quote-ref');
  if (qtEl) qtEl.textContent = `"${quote.text}"`;
  if (qrEl) qrEl.textContent = quote.ref;

  // Presenças do membro atual no mês
  state.memberAttendanceDates = state.monthAttendances
    .filter(a => a.member_id === member.id)
    .map(a => a.sunday_date);

  const streak = calculateStreak(state.memberAttendanceDates, state.allSundays);
  updateStats(state.memberAttendanceDates.length, streak);

  // Velas
  const candlesContainer = document.getElementById('candles-container');
  if (candlesContainer) {
    renderCandles(candlesContainer, state.allSundays, state.memberAttendanceDates, state.currentSundayStr);
  }

  // Botão de registro — usa janela Dom+Seg
  const alreadyRegistered = state.memberAttendanceDates.includes(state.currentSundayStr);
  if (!state.registrationOpen) {
    updateRegisterButton('disabled');
  } else if (alreadyRegistered) {
    updateRegisterButton('done');
  } else {
    updateRegisterButton('active');
  }

  // Certificado
  const certContainer = document.getElementById('certificate-container');
  if (certContainer) {
    const eligibility = checkCertificateEligibility(state.memberAttendanceDates, state.allSundays);
    renderCertificate(certContainer, member, eligibility);
  }
}

// ─── REGISTRO DE PRESENÇA ─────────────────────────────────────

async function handleRegister() {
  const member = state.currentMember;
  if (!member || !state.registrationOpen) return;

  // Verifica duplicata local
  if (state.memberAttendanceDates.includes(state.currentSundayStr)) {
    showToast('Presença já registrada para este domingo.', 'error');
    updateRegisterButton('done');
    return;
  }

  // UI otimista
  updateRegisterButton('done');
  showToast(`Deo Gratias, ${member.name.split(' ')[0]}! Sua presença foi registrada.`, 'info', 2000);
  
  // Acende a vela instantaneamente
  const sundayIndex = state.allSundays.findIndex(s => toDateString(s) === state.currentSundayStr);
  if (sundayIndex !== -1) lightCandle(sundayIndex);

  // Usa sempre a data do domingo mais recente (funciona Dom e Seg)
  const sundayDate = toDateString(getMostRecentSunday());
  const monthKey   = sundayDate.slice(0, 7); // 'YYYY-MM'

  const { success, duplicate, error } = await registerAttendance(member.id, sundayDate, monthKey);

  if (success) {
    await reloadAttendances();
    state.memberAttendanceDates = state.monthAttendances
      .filter(a => a.member_id === member.id)
      .map(a => a.sunday_date);

    const streak = calculateStreak(state.memberAttendanceDates, state.allSundays);
    updateStats(state.memberAttendanceDates.length, streak);

    // Todos presentes?
    if (state.todayPresentIds.length >= state.members.length && state.members.length > 0) {
      setTimeout(() => triggerAllPresentEffect(), 800);
    }

    // Atualiza certificado
    const certContainer = document.getElementById('certificate-container');
    if (certContainer) {
      const eligibility = checkCertificateEligibility(state.memberAttendanceDates, state.allSundays);
      renderCertificate(certContainer, member, eligibility);
      
      if (eligibility.unlocked && state.memberAttendanceDates.length === state.allSundays.length) {
        setTimeout(() => {
          showToast(`Parabéns, ${member.name.split(' ')[0]}! Seu pergaminho foi selado.`, 'success', 3000);
        }, 1500);
      }
    }
  } else if (duplicate) {
    // Reverter otimismo se der erro
    // Na prática, é difícil cair aqui sem ter pego no local check, mas por segurança:
    updateRegisterButton('done');
  } else {
    showToast('Não foi possível registrar. Tente novamente.', 'error');
    updateRegisterButton('active');
  }
}

// ─── ADMIN PANEL ──────────────────────────────────────────────

function loadAdminPanel() {
  if (!state.currentMember || !state.currentMember.is_admin) return;

  const insertMemberSel = document.getElementById('admin-insert-member');
  const insertSundaySel = document.getElementById('admin-insert-sunday');
  const removeMemberSel = document.getElementById('admin-remove-member');
  const removeSundaySel = document.getElementById('admin-remove-sunday');

  // Preenche Membros
  const memberOptions = state.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  if (insertMemberSel) insertMemberSel.innerHTML = memberOptions;
  if (removeMemberSel) {
    removeMemberSel.innerHTML = '<option value="">Selecione o membro...</option>' + memberOptions;
    removeMemberSel.addEventListener('change', () => {
      // Atualiza os domingos removíveis baseado no membro selecionado
      const mId = removeMemberSel.value;
      if (!mId) {
        removeSundaySel.innerHTML = '';
        return;
      }
      const memberAtts = state.allAttendances.filter(a => a.member_id === mId);
      removeSundaySel.innerHTML = memberAtts.map(a => `<option value="${a.sunday_date}">${a.sunday_date}</option>`).join('');
    });
  }

  // Preenche Domingos passados (para inserção)
  if (insertSundaySel) {
    // Pegar domingos passados do mês atual + mês anterior para margem
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevSundays = getSundaysInMonth(prevMonth.getFullYear(), prevMonth.getMonth());
    const allRecentSundays = [...prevSundays, ...state.pastSundays];
    
    // Filtra para mostrar do mais recente pro mais antigo
    const sundayOptions = allRecentSundays.reverse().map(d => {
      const dStr = toDateString(d);
      return `<option value="${dStr}">${dStr}</option>`;
    }).join('');
    insertSundaySel.innerHTML = sundayOptions;
  }

  // Prepara status do mês atual
  const statusContainer = document.getElementById('admin-month-status');
  if (statusContainer) {
    renderAdminMonthStatus(statusContainer, state.members, state.monthAttendances, state.allSundays.length);
  }

  // Botões
  const btnInsert = document.getElementById('btn-admin-insert');
  if (btnInsert) {
    btnInsert.onclick = async () => {
      const mId = insertMemberSel.value;
      const sDate = insertSundaySel.value;
      if (!mId || !sDate) return;
      
      const mKey = sDate.slice(0, 7);
      const btn = btnInsert;
      const oldText = btn.textContent;
      btn.textContent = 'Aguarde...';
      btn.disabled = true;

      const { success, duplicate } = await registerAttendance(mId, sDate, mKey);
      if (success) {
        showToast('Presença registrada com sucesso.', 'success');
        await reloadAttendances();
        loadAdminPanel(); // recarrega UI
      } else if (duplicate) {
        showToast('Este membro já tem presença registrada neste domingo.', 'error');
      } else {
        showToast('Erro ao registrar presença.', 'error');
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
      if (!removeMemberSel.value || !removeSundaySel.value) return;
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
      const mId = removeMemberSel.value;
      const sDate = removeSundaySel.value;
      if (!mId || !sDate) return;

      const { success } = await removeAttendance(mId, sDate);
      if (success) {
        showToast('Presença removida.', 'success');
        await reloadAttendances();
        removeMemberSel.value = '';
        removeSundaySel.innerHTML = '';
        divConfirm.classList.add('hidden');
        btnRemove.classList.remove('hidden');
        loadAdminPanel();
      } else {
        showToast('Erro ao remover presença.', 'error');
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
  // Remove listeners antigos clonando os elementos
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
  });

  // Bottom nav
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Botão Sair (logout)
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await handleLogout(() => {
        state.currentMember = null;
        state.members = [];
        state.monthAttendances = [];
        state.memberAttendanceDates = [];
        state.todayPresentIds = [];
        showScreen('auth');
        showToast('Até logo. ✝', 'info', 2000);
      });
    });
  }

  // Botão de registro
  const registerBtn = document.getElementById('btn-register');
  if (registerBtn) {
    // Remove listener anterior
    const newBtn = registerBtn.cloneNode(true);
    registerBtn.parentNode.replaceChild(newBtn, registerBtn);
    newBtn.addEventListener('click', handleRegister);
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
      .map(a => a.sunday_date);
  });

  const totalPossible = state.pastSundays.length;
  const monthEl = document.getElementById('ranking-month');
  if (monthEl) monthEl.textContent = getCurrentMonthName();

  renderRanking(listEl, state.members, attendanceMap, totalPossible);
}

// ─── CONFRARIA ────────────────────────────────────────────────

function loadConfraria() {
  // Todos os membros aparecem como orbs na confraria
  const orbsContainer = document.getElementById('orbs-container');
  if (orbsContainer) renderOrbs(orbsContainer, state.members, state.todayPresentIds);

  const todayMsgEl = document.getElementById('today-message');
  if (todayMsgEl) {
    if (state.registrationOpen) {
      const count = state.todayPresentIds.length;
      const total = state.members.length;
      todayMsgEl.textContent = `${count} de ${total} membros presentes neste domingo`;
    } else {
      const [,, day] = state.currentSundayStr.split('-');
      todayMsgEl.textContent = `Próximo domingo: dia ${parseInt(day, 10)} · Aguardando...`;
    }
  }

  const totalPossible = state.pastSundays.length * state.members.length;
  const totalAttended  = state.monthAttendances.length;
  updateFidelityBar(totalAttended, totalPossible);

  const confCandlesEl = document.getElementById('confraria-candles');
  if (confCandlesEl) renderConfrariaCandlesRow(confCandlesEl);

  const gloryEl = document.getElementById('glory-message');
  if (gloryEl) {
    const allPresent = state.members.length > 0 &&
      state.todayPresentIds.length >= state.members.length;
    gloryEl.classList.toggle('visible', allPresent);
  }
}

function renderConfrariaCandlesRow(container) {
  container.innerHTML = '';
  state.members.forEach(member => {
    const isPresent = state.todayPresentIds.includes(member.id);
    const initials  = member.initials || member.name.slice(0, 2).toUpperCase();

    const wrapper = document.createElement('div');
    wrapper.className = 'orb-wrapper';
    wrapper.innerHTML = `
      <div class="orb${isPresent ? ' orb--present' : ''}">${initials}</div>
      <span class="orb__name">${member.name.split(' ')[0]}</span>
    `;
    container.appendChild(wrapper);
  });
}

// ─── HISTÓRICO ────────────────────────────────────────────────

function loadHistory() {
  const listEl = document.getElementById('history-list');
  if (!listEl) return;
  
  // Agrupar todas as presenças por mês
  const attendancesByMonth = {};
  state.allAttendances.forEach(a => {
    if (!attendancesByMonth[a.month_key]) attendancesByMonth[a.month_key] = [];
    attendancesByMonth[a.month_key].push(a);
  });
  
  // Extrair chaves dos meses únicos e ordenar decrescente
  const uniqueMonths = Object.keys(attendancesByMonth).sort((a, b) => b.localeCompare(a));
  
  // Se não tiver meses ainda, adiciona pelo menos o mês atual vazio
  if (uniqueMonths.length === 0) {
    uniqueMonths.push(state.currentMonthKey);
  }
  
  // Ocultar placeholder de "em breve"
  const futureEl = document.querySelector('.history-future');
  if (futureEl) futureEl.classList.add('hidden');

  renderHistory(listEl, state.members, uniqueMonths, attendancesByMonth);
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
