// ============================================================
// CONFRARIA DOS CRISMADOS — ui.js
// Funções de renderização de componentes do DOM
// ============================================================

import {
  toDateString, getCandleHeightClass, formatLongDate, formatShortDate,
  getCurrentMonthName, formatMonthName, getToday
} from './dates.js';
import { getInitials } from './members.js';
import { animateProgressBar } from './animations.js';

// ─── VELAS ────────────────────────────────────────────────────

/**
 * Renderiza a fileira de velas no container fornecido.
 * @param {HTMLElement} container
 * @param {Array} attendances - missas registradas pelo membro
 */
export function renderCandles(container, attendances) {
  container.innerHTML = '';
  const total = attendances.length;

  attendances.forEach((att, index) => {
    const dateStr = att.mass_date || att.sunday_date;
    const heightClass = getCandleHeightClass(index);
    const shortDate = formatShortDate(dateStr);

    const wrapper = document.createElement('div');
    wrapper.className = 'candle-wrapper';
    wrapper.dataset.date = dateStr;
    wrapper.innerHTML = `
      <div class="candle candle--lit candle--${heightClass}" data-date="${dateStr}">
        <div class="candle__glow"></div>
        <div class="candle__flame-wrapper">
          <div class="candle__flame"></div>
        </div>
        <div class="candle__wick"></div>
        <div class="candle__body"></div>
        <div class="candle__base"></div>
      </div>
      <div class="candle-wrapper__date" style="font-size:10px; color:var(--cream-dim); margin-top:4px;">${shortDate}</div>
    `;
    if (att.location || att.mass_time) {
       wrapper.title = `${att.location || 'Local não informado'} - ${att.mass_time || 'Horário não informado'}`;
    }
    container.appendChild(wrapper);
  });
}

// ─── CARDS DE MEMBROS (tela de entrada) ───────────────────────

/**
 * Renderiza os 6 cards de membros na tela de entrada.
 * @param {HTMLElement} grid
 * @param {Array} members - membros com { id, name, initials }
 * @param {object} statsMap - { [memberId]: { count, streak } }
 * @param {Function} onSelect - callback(member)
 */
export function renderMemberCards(grid, members, statsMap, onSelect) {
  grid.innerHTML = '';

  members.forEach((member, index) => {
    const stats = statsMap[member.id] || { count: 0, streak: 0 };
    const initials = member.initials || getInitials(member.name);

    const card = document.createElement('div');
    card.className = `member-card animate-cardEntrance animate-delay-${index + 1}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Selecionar ${member.name}`);
    card.dataset.memberId = member.id;

    card.innerHTML = `
      <div class="avatar">${initials}</div>
      <div class="member-card__name">${member.name}</div>
      <div class="member-card__stat">${stats.count} ${stats.count === 1 ? 'missa' : 'missas'} este mês</div>
    `;

    card.addEventListener('click', () => onSelect(member));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') onSelect(member); });

    grid.appendChild(card);
  });
}

// ─── PAINEL INDIVIDUAL ────────────────────────────────────────

/**
 * Atualiza o cabeçalho do painel com saudação e mês.
 * @param {object} member
 */
export function updatePanelHeader(member) {
  const greetingEl = document.getElementById('panel-greeting');
  const monthEl = document.getElementById('panel-month');

  const hour = new Date().getHours();
  const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Paz e bem';

  if (greetingEl) greetingEl.textContent = `${saudacao}, ${member.name}.`;
  if (monthEl) monthEl.textContent = getCurrentMonthName();
}

/**
 * Atualiza os boxes de stats (missas e streak).
 * @param {number} count
 * @param {number} streak
 */
export function updateStats(count, streak) {
  const countEl = document.getElementById('stat-count');
  const streakEl = document.getElementById('stat-streak');
  if (countEl) countEl.textContent = count;
  if (streakEl) streakEl.textContent = streak;
}

/**
 * Atualiza o estado do botão de registro.
 * @param {'active'|'done'|'disabled'} state
 */
export function updateRegisterButton(state) {
  const btn = document.getElementById('btn-register');
  if (!btn) return;

  btn.classList.remove('btn-register--done', 'btn-register--disabled');
  btn.disabled = false;

  if (state === 'active') {
    btn.innerHTML = `<span class="btn-register__icon">✝</span> Registrar uma missa`;
    btn.setAttribute('aria-label', 'Registrar uma missa');
  } else if (state === 'done') {
    btn.innerHTML = `<span class="btn-register__icon">✦</span> Missa de hoje já registrada`;
    btn.classList.add('btn-register--done');
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Missa de hoje já registrada');
  } else {
    btn.innerHTML = `<span class="btn-register__icon">✝</span> Registrar uma missa`;
    btn.classList.add('btn-register--disabled');
    btn.disabled = true;
  }
}

// ─── RANKING ──────────────────────────────────────────────────

/**
 * Renderiza a lista de ranking.
 * @param {HTMLElement} listEl
 * @param {Array} members - ordenados por presença (desc), nome (asc)
 * @param {object} attendanceMap - { [memberId]: string[] }
 * @param {number} totalPossible - domingos passados no mês
 */
export function renderRanking(listEl, members, attendanceMap, totalPossible) {
  listEl.innerHTML = '';

  const sorted = [...members].sort((a, b) => {
    const countA = (attendanceMap[a.id] || []).length;
    const countB = (attendanceMap[b.id] || []).length;
    if (countB !== countA) return countB - countA;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach((member, index) => {
    const count = (attendanceMap[member.id] || []).length;
    const possible = totalPossible || 1;
    const pct = Math.round((count / possible) * 100);
    const isFirst = index === 0 && count > 0;
    const initials = member.initials || getInitials(member.name);
    const numeral = toRomanNumeral(index + 1);

    const row = document.createElement('div');
    row.className = `ranking-row${isFirst ? ' ranking-row--first' : ''}`;

    row.innerHTML = `
      <div class="ranking-row__numeral">${numeral}</div>
      <div class="avatar avatar--sm">${initials}</div>
      <div class="ranking-row__info">
        <div class="ranking-row__name">${member.name}</div>
        <div class="ranking-row__count">${count} de ${possible} ${possible === 1 ? 'domingo' : 'domingos'}</div>
        <div class="ranking-row__progress-track">
          <div class="ranking-row__progress-fill" data-pct="${pct}"></div>
        </div>
      </div>
      ${isFirst ? '<div class="ranking-row__honor">✦</div>' : ''}
    `;

    listEl.appendChild(row);

    // Anima a barra após inserção
    setTimeout(() => {
      const fill = row.querySelector('.ranking-row__progress-fill');
      animateProgressBar(fill, pct);
    }, index * 80 + 100);
  });
}

// ─── PROGRESSO COLETIVO ───────────────────────────────────────

/**
 * Renderiza os orbs de membros na tela Confraria.
 * @param {HTMLElement} orbsContainer
 * @param {Array} members
 * @param {string[]} todayPresentIds - IDs que registraram hoje
 */
export function renderOrbs(orbsContainer, members, todayPresentIds) {
  orbsContainer.innerHTML = '';

  members.forEach(member => {
    const isPresent = todayPresentIds.includes(member.id);
    const initials = member.initials || getInitials(member.name);

    const wrapper = document.createElement('div');
    wrapper.className = 'orb-wrapper';
    wrapper.innerHTML = `
      <div class="orb${isPresent ? ' orb--present' : ''}" title="${member.name}">${initials}</div>
      <span class="orb__name">${member.name.split(' ')[0]}</span>
    `;
    orbsContainer.appendChild(wrapper);
 * Atualiza o painel da Confraria (Progresso coletivo e Orbs).
 * @param {Array} members 
 * @param {Array} allAttendances - de todos do mês
 */
export function renderConfrariaStatus(members, allAttendances) {
  const container = document.getElementById('orbs-container');
  const candlesContainer = document.getElementById('confraria-candles');
  const fidelityPercentageEl = document.getElementById('fidelity-percentage');
  const fidelityBarEl = document.getElementById('fidelity-bar');
  const fidelityStatsEl = document.getElementById('fidelity-stats');
  const todayMessageEl = document.getElementById('today-message');
  const gloryMessageEl = document.getElementById('glory-message');

  const todayStr = toDateString(getToday());
  const todayAtts = allAttendances.filter(a => a.mass_date === todayStr || a.sunday_date === todayStr);

  // Presentes hoje
  const presentMemberIds = todayAtts.map(a => a.member_id);
  const totalMembers = members.length;
  const presentCount = presentMemberIds.length;

  if (todayMessageEl) {
    todayMessageEl.textContent = `A Confraria tem ${presentCount} ${presentCount === 1 ? 'missa registrada' : 'missas registradas'} hoje.`;
  }

  // Glory message (Todos presentes hoje)
  if (gloryMessageEl) {
    const isGlory = presentCount === totalMembers && totalMembers > 0;
    gloryMessageEl.style.display = isGlory ? 'block' : 'none';
  }

  // Orbs e Velinhas de Hoje
  if (container) container.innerHTML = '';
  if (candlesContainer) candlesContainer.innerHTML = '';

  members.forEach((member, i) => {
    const initials = member.initials || getInitials(member.name);
    const isPresent = presentMemberIds.includes(member.id);
    const stateClass = isPresent ? 'orb--lit' : 'orb--unlit';
    const delayClass = `animate-delay-${i + 1}`;

    if (container) {
      container.innerHTML += `<div class="orb ${stateClass} ${delayClass}" title="${member.name}">${initials}</div>`;
    }
    if (candlesContainer) {
      const candleState = isPresent ? 'candle--lit' : 'candle--unlit';
      candlesContainer.innerHTML += `
        <div class="candle-wrapper ${delayClass}" style="transform: scale(0.65); transform-origin: bottom center;">
          <div class="candle ${candleState} candle--sm">
            <div class="candle__glow"></div>
            <div class="candle__flame-wrapper"><div class="candle__flame"></div></div>
            <div class="candle__wick"></div>
            <div class="candle__body"></div>
            <div class="candle__base"></div>
          </div>
          <div class="candle-wrapper__ordinal" style="margin-top: 4px;">${initials}</div>
        </div>
      `;
    }
  });

  // Fidelidade (Total de Missas)
  const totalMasses = allAttendances.length;
  
  if (fidelityPercentageEl) fidelityPercentageEl.textContent = `${totalMasses}`;
  if (fidelityStatsEl) fidelityStatsEl.textContent = `${totalMasses} missas registradas`;
  if (fidelityBarEl) {
    const fill = Math.min((totalMasses / 24) * 100, 100);
    fidelityBarEl.style.width = `${fill}%`;
  }
}

// ─── HISTÓRICO ────────────────────────────────────────────────

export function renderHistory(container, allAttendances, members) {
  container.innerHTML = '';
  if (!allAttendances.length) {
    container.innerHTML = '<p class="history-item text-cream-dim" style="text-align:center;">Nenhum registro encontrado.</p>';
    return;
  }

  // Agrupa por mês
  const byMonth = {};
  allAttendances.forEach(att => {
    const key = att.month_key;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(att);
  });

  const memberMap = {};
  members.forEach(m => memberMap[m.id] = m);

  Object.keys(byMonth).sort().reverse().forEach(monthKey => {
    const [y, m] = monthKey.split('-');
    const monthTitle = formatMonthName(parseInt(y), parseInt(m) - 1);

    const monthEl = document.createElement('div');
    monthEl.className = 'history-month-group';
    monthEl.innerHTML = `<h3 class="history-month-title">${monthTitle}</h3>`;
    
    // Calcula contagem no mês
    const counts = {};
    byMonth[monthKey].forEach(att => {
      counts[att.member_id] = (counts[att.member_id] || 0) + 1;
    });

    // Ordena membros por count
    const sortedMembers = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
    const maxCount = sortedMembers.length ? counts[sortedMembers[0]] : 0;

    sortedMembers.forEach((mId, index) => {
      const name = memberMap[mId]?.name || 'Membro';
      const c = counts[mId];
      // Exibe uma coroa se for o maior
      const badge = (c === maxCount && c > 0) ? '<span title="Maior presença" style="color:var(--gold); margin-left:6px;">♔</span>' : '';
      
      const item = document.createElement('div');
      item.className = 'history-item animate-cardEntrance animate-delay-' + (index % 5 + 1);
      item.innerHTML = `
        <span class="history-item__name">${name} ${badge}</span>
        <span class="history-item__count">${c} missas</span>
      `;
      monthEl.appendChild(item);
    });

    container.appendChild(monthEl);
  });
}

/**
 * Renderiza o status do mês atual para o admin.
 */
export function renderAdminMonthStatus(container, members, monthAttendances) {
  const map = {};
  members.forEach(m => map[m.id] = 0);
  monthAttendances.forEach(a => {
    if (map[a.member_id] !== undefined) map[a.member_id]++;
  });

  container.innerHTML = members.map(m => {
    return `
      <div class="ranking-row" style="padding: 8px 12px; min-height: unset;">
        <div class="ranking-row__info" style="flex: 1; display: flex; justify-content: space-between; flex-direction: row; align-items: center;">
          <span style="color: var(--cream); font-size: 13px;">${m.name}</span>
          <span style="color: var(--gold); font-size: 13px;">${map[m.id] || 0} missas</span>
        </div>
      </div>
    `;
  }).join('');
}

export function renderPersonalHistory(container, attendances, onEditClick) {
  if (!container) return;
  container.innerHTML = '';
  
  if (!attendances || attendances.length === 0) {
    container.innerHTML = '<div style="color:var(--cream-dim); font-size:13px; font-style:italic; text-align:center;">Nenhuma missa registrada ainda este mês.</div>';
    return;
  }

  // Ordena por data decrescente
  const sorted = [...attendances].sort((a,b) => {
    const d1 = a.mass_date || a.sunday_date;
    const d2 = b.mass_date || b.sunday_date;
    return d2.localeCompare(d1);
  });

  sorted.forEach(att => {
    const dateStr = att.mass_date || att.sunday_date;
    const longDate = formatLongDate(dateStr);
    
    let metaText = '';
    if (att.location && att.mass_time) metaText = `${att.location} • ${att.mass_time}`;
    else if (att.location) metaText = att.location;
    else if (att.mass_time) metaText = att.mass_time;
    else metaText = 'Local e horário não informados';

    const card = document.createElement('div');
    card.className = 'history-card';
    card.style.marginBottom = '8px';
    card.innerHTML = `
      <div class="history-card__info">
        <div class="history-card__date">${longDate}</div>
        <div class="history-card__meta">${metaText}</div>
      </div>
      <button class="history-card__edit">Editar</button>
    `;

    const editBtn = card.querySelector('.history-card__edit');
    editBtn.addEventListener('click', () => {
      if (onEditClick) onEditClick(att);
    });

    container.appendChild(card);
  });
}
