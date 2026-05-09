const fs = require('fs');

let ui = fs.readFileSync('js/ui.js', 'utf-8');

// 1. Update imports
ui = ui.replace(
  /import \{\n  toDateString, getSundayOrdinalLabel, getCandleHeightClass,\n  getCurrentMonthName, toRomanNumeral, getPastSundaysInCurrentMonth,\n  getCurrentSundayDateString, isSunday, formatMonthName, getSundaysInMonth\n\} from '\.\/dates\.js';/,
  `import {
  toDateString, getCandleHeightClass, formatLongDate, formatShortDate,
  getCurrentMonthName, formatMonthName, getToday
} from './dates.js';`
);

// 2. Replace renderCandles
ui = ui.replace(
  /\/\*\*[\s\S]*?export function renderCandles[\s\S]*?\}\n\}/,
  `/**
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
    wrapper.innerHTML = \`
      <div class="candle candle--lit candle--\${heightClass}" data-date="\${dateStr}">
        <div class="candle__glow"></div>
        <div class="candle__flame-wrapper">
          <div class="candle__flame"></div>
        </div>
        <div class="candle__wick"></div>
        <div class="candle__body"></div>
        <div class="candle__base"></div>
      </div>
      <div class="candle-wrapper__date" style="font-size:10px; color:var(--cream-dim); margin-top:4px;">\${shortDate}</div>
    \`;
    if (att.location || att.mass_time) {
       wrapper.title = \`\${att.location || 'Local não informado'} - \${att.mass_time || 'Horário não informado'}\`;
    }
    container.appendChild(wrapper);
  });
}`
);

// 3. Update renderMemberCards
ui = ui.replace(
  /<div class="member-card__stat">\$\{stats\.count\} \$\{stats\.count === 1 \? 'missa' : 'missas'\} este mês<\/div>\n\s*<div class="member-card__streak">\$\{stats\.streak > 0 \? \`\$\{stats\.streak\} dom\. seguidos\` : 'Nenhum seguido ainda'\}<\/div>/,
  `<div class="member-card__stat">\${stats.count} \${stats.count === 1 ? 'missa' : 'missas'} este mês</div>`
);

// 4. Update updateRegisterButton
ui = ui.replace(
  /export function updateRegisterButton\(state\) \{[\s\S]*?\}\n\}/,
  `export function updateRegisterButton(state) {
  const btn = document.getElementById('btn-register');
  if (!btn) return;

  btn.classList.remove('btn-register--done', 'btn-register--disabled');
  btn.disabled = false;

  if (state === 'active') {
    btn.innerHTML = \`<span class="btn-register__icon">✝</span> Registrar uma missa\`;
    btn.setAttribute('aria-label', 'Registrar uma missa');
  } else if (state === 'done') {
    btn.innerHTML = \`<span class="btn-register__icon">✦</span> Missa de hoje já registrada\`;
    btn.classList.add('btn-register--done');
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Missa de hoje já registrada');
  } else {
    btn.innerHTML = \`<span class="btn-register__icon">✝</span> Registrar uma missa\`;
    btn.classList.add('btn-register--disabled');
    btn.disabled = true;
  }
}`
);

// 5. Replace renderRanking
ui = ui.replace(
  /const text = \`\$\{count\} de \$\{totalSundays\}\`;[\s\S]*?const progressWidth = totalSundays > 0 \? \(count \/ totalSundays\) \* 100 : 0;/,
  `const text = \`\${count} missas\`;
      const maxCount = Math.max(...sorted.map(m => statsMap[m.id]?.count || 0), 1);
      const progressWidth = (count / maxCount) * 100;`
);

// 6. Replace renderConfrariaStatus
ui = ui.replace(
  /\/\*\*[\s\S]*?export function renderConfrariaStatus[\s\S]*?\}\n\}/,
  `/**
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
    todayMessageEl.textContent = \`A Confraria tem \${presentCount} \${presentCount === 1 ? 'missa' : 'missas'} hoje.\`;
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
    const delayClass = \`animate-delay-\${i + 1}\`;

    if (container) {
      container.innerHTML += \`<div class="orb \${stateClass} \${delayClass}" title="\${member.name}">\${initials}</div>\`;
    }
    if (candlesContainer) {
      const candleState = isPresent ? 'candle--lit' : 'candle--unlit';
      candlesContainer.innerHTML += \`
        <div class="candle-wrapper \${delayClass}" style="transform: scale(0.65); transform-origin: bottom center;">
          <div class="candle \${candleState} candle--sm">
            <div class="candle__glow"></div>
            <div class="candle__flame-wrapper"><div class="candle__flame"></div></div>
            <div class="candle__wick"></div>
            <div class="candle__body"></div>
            <div class="candle__base"></div>
          </div>
          <div class="candle-wrapper__ordinal" style="margin-top: 4px;">\${initials}</div>
        </div>
      \`;
    }
  });

  // Fidelidade (Total de Missas)
  const totalMasses = allAttendances.length;
  
  if (fidelityPercentageEl) fidelityPercentageEl.textContent = \`\${totalMasses}\`;
  if (fidelityStatsEl) fidelityStatsEl.textContent = \`\${totalMasses} missas registradas\`;
  if (fidelityBarEl) {
    // Arbitrary fill since there's no max limit. e.g. 24 missas = 100%
    const fill = Math.min((totalMasses / 24) * 100, 100);
    fidelityBarEl.style.width = \`\${fill}%\`;
  }
}`
);

// 7. Render History List
ui = ui.replace(
  /export function renderHistory\(container, allAttendances, members\) \{[\s\S]*?\}\n\}/,
  `export function renderHistory(container, allAttendances, members) {
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
    monthEl.innerHTML = \`<h3 class="history-month-title">\${monthTitle}</h3>\`;
    
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
      item.innerHTML = \`
        <span class="history-item__name">\${name} \${badge}</span>
        <span class="history-item__count">\${c} missas</span>
      \`;
      monthEl.appendChild(item);
    });

    container.appendChild(monthEl);
  });
}`
);

// Append renderPersonalHistory
ui += `
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
    if (att.location && att.mass_time) metaText = \`${att.location} • ${att.mass_time}\`;
    else if (att.location) metaText = att.location;
    else if (att.mass_time) metaText = att.mass_time;
    else metaText = 'Local e horário não informados';

    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = \`
      <div class="history-card__info">
        <div class="history-card__date">${longDate}</div>
        <div class="history-card__meta">${metaText}</div>
      </div>
      <button class="history-card__edit">Editar</button>
    \`;

    const editBtn = card.querySelector('.history-card__edit');
    editBtn.addEventListener('click', () => {
      if (onEditClick) onEditClick(att);
    });

    container.appendChild(card);
  });
}
`;

fs.writeFileSync('js/ui.js', ui, 'utf-8');
