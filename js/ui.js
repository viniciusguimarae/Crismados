// ============================================================
// CONFRARIA DOS CRISMADOS — ui.js
// Funções de renderização de componentes do DOM
// ============================================================

import {
  toDateString, getSundayOrdinalLabel, getCandleHeightClass,
  getCurrentMonthName, toRomanNumeral, getPastSundaysInCurrentMonth,
  getCurrentSundayDateString, isSunday, formatMonthName, getSundaysInMonth
} from './dates.js';
import { getInitials } from './members.js';
import { animateProgressBar } from './animations.js';

// ─── VELAS ────────────────────────────────────────────────────

/**
 * Renderiza a fileira de velas no container fornecido.
 * @param {HTMLElement} container
 * @param {Date[]} sundays - todos os domingos do mês
 * @param {string[]} attendedDates - datas frequentadas pelo membro
 * @param {string} currentSundayStr - data do domingo atual 'YYYY-MM-DD'
 */
export function renderCandles(container, sundays, attendedDates, currentSundayStr) {
  container.innerHTML = '';
  const total = sundays.length;

  sundays.forEach((sunday, index) => {
    const dateStr = toDateString(sunday);
    const isLit = attendedDates.includes(dateStr);
    const isCurrent = dateStr === currentSundayStr;
    const heightClass = getCandleHeightClass(index, total);
    const ordinalLabel = getSundayOrdinalLabel(index);
    const dayNum = String(sunday.getDate()).padStart(2, '0');

    const stateClass = isLit ? 'candle--lit' : 'candle--unlit';
    const currentClass = (!isLit && isCurrent) ? 'candle--current current-sunday-pulse' : '';

    const wrapper = document.createElement('div');
    wrapper.className = 'candle-wrapper';
    wrapper.dataset.date = dateStr;
    wrapper.innerHTML = `
      <div class="candle-wrapper__ordinal">${ordinalLabel}</div>
      <div class="candle ${stateClass} ${currentClass} candle--${heightClass}" data-date="${dateStr}">
        <div class="candle__glow"></div>
        <div class="candle__flame-wrapper">
          <div class="candle__flame"></div>
        </div>
        <div class="candle__wick"></div>
        <div class="candle__body"></div>
        <div class="candle__base"></div>
      </div>
      <div class="candle-wrapper__date">${dayNum}</div>
    `;
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
      <div class="member-card__streak">${stats.streak > 0 ? `${stats.streak} dom. seguidos` : 'Nenhum seguido ainda'}</div>
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
    btn.innerHTML = `<span class="btn-register__icon">✝</span> Registrar presença deste domingo`;
    btn.setAttribute('aria-label', 'Registrar presença deste domingo');
  } else if (state === 'done') {
    btn.innerHTML = `<span class="btn-register__icon">✦</span> Presença já registrada · Deo Gratias`;
    btn.classList.add('btn-register--done');
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Presença já registrada');
  } else {
    btn.innerHTML = `<span class="btn-register__icon">☩</span> O registro abre no próximo domingo`;
    btn.classList.add('btn-register--disabled');
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Registro indisponível — aguarde o domingo');
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
  });
}

/**
 * Atualiza a barra e stats de fidelidade coletiva.
 * @param {number} totalAttended - total de presenças registradas no mês
 * @param {number} totalPossible - total possível (membros × domingos passados)
 */
export function updateFidelityBar(totalAttended, totalPossible) {
  const pct = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;

  const pctEl = document.getElementById('fidelity-percentage');
  const statEl = document.getElementById('fidelity-stats');
  const barEl = document.getElementById('fidelity-bar');

  if (pctEl) pctEl.textContent = `${pct}%`;
  if (statEl) statEl.textContent = `${totalAttended} de ${totalPossible} presenças possíveis`;
  if (barEl) animateProgressBar(barEl, pct);
}

// ─── HISTÓRICO ────────────────────────────────────────────────

/**
 * Renderiza a lista de histórico agrupada por meses.
 * @param {HTMLElement} listEl
 * @param {Array} members
 * @param {string[]} uniqueMonths - ex: ['2026-05', '2026-04']
 * @param {object} attendancesByMonth - dicionário de arrays de presenças
 */
export function renderHistory(listEl, members, uniqueMonths, attendancesByMonth) {
  listEl.innerHTML = '';

  uniqueMonths.forEach(monthKey => {
    // Calcula nome do mês e total de domingos daquele mês
    const [yStr, mStr] = monthKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1; // 0-indexed
    const monthName = formatMonthName(year, month);
    
    // Pega todos os domingos daquele mês (não apenas os passados)
    const monthSundays = getSundaysInMonth(year, month);
    const totalPossible = monthSundays.length;

    const monthAtts = attendancesByMonth[monthKey] || [];
    
    // Monta mapa de presenças por membro para este mês
    const attendanceMap = {};
    members.forEach(m => attendanceMap[m.id] = 0);
    monthAtts.forEach(a => {
      if (attendanceMap[a.member_id] !== undefined) {
        attendanceMap[a.member_id]++;
      }
    });

    // Acha quem tem 100% e o maior número de presenças
    let maxCount = 0;
    Object.values(attendanceMap).forEach(c => {
      if (c > maxCount) maxCount = c;
    });

    const monthContainer = document.createElement('div');
    monthContainer.className = 'history-month-block';
    monthContainer.style.marginBottom = '32px';

    monthContainer.innerHTML = `
      <h3 style="color: var(--gold); font-size: 15px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">${monthName}</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${members.map(member => {
          const count = attendanceMap[member.id] || 0;
          const is100Percent = count === totalPossible && totalPossible > 0;
          const isTop = count === maxCount && count > 0;
          const initials = member.initials || member.name.slice(0, 2).toUpperCase();
          
          return \`
            <div class="ranking-row" style="padding: 12px 16px;">
              <div class="avatar avatar--sm">\${initials}</div>
              <div class="ranking-row__info" style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                <div class="ranking-row__name" style="margin-bottom: 0;">
                  \${member.name}
                  \${isTop ? '<span title="Mais presenças no mês" style="color: var(--gold); margin-left: 4px; font-size: 14px;">♔</span>' : ''}
                  \${is100Percent ? '<span title="Completou o mês" style="color: var(--gold); margin-left: 4px; font-size: 14px;">✦</span>' : ''}
                </div>
                <div class="ranking-row__count" style="margin-top: 0; font-size: 14px;">\${count}/\${totalPossible}</div>
              </div>
            </div>
          \`;
        }).join('')}
      </div>
    `;

    listEl.appendChild(monthContainer);
  });
}

/**
 * Renderiza o status do mês atual para o admin.
 */
export function renderAdminMonthStatus(container, members, monthAttendances, totalPossible) {
  const map = {};
  members.forEach(m => map[m.id] = 0);
  monthAttendances.forEach(a => {
    if (map[a.member_id] !== undefined) map[a.member_id]++;
  });

  container.innerHTML = members.map(m => {
    return \`
      <div class="ranking-row" style="padding: 8px 12px; min-height: unset;">
        <div class="ranking-row__info" style="flex: 1; display: flex; justify-content: space-between; flex-direction: row; align-items: center;">
          <span style="color: var(--cream); font-size: 13px;">\${m.name}</span>
          <span style="color: var(--gold); font-size: 13px;">\${map[m.id] || 0}/\${totalPossible} domingos</span>
        </div>
      </div>
    \`;
  }).join('');
}
