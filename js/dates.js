// ============================================================
// CONFRARIA DOS CRISMADOS — dates.js
// Utilitários de data: domingos, mês, streak, detecção
// ============================================================

import { DEBUG_SIMULATE_SUNDAY, DEBUG_SUNDAY_DATE } from './config.js';

/**
 * Retorna a data de hoje como objeto Date.
 * Em modo debug, retorna a data simulada se for domingo.
 * @returns {Date}
 */
export function getToday() {
  if (DEBUG_SIMULATE_SUNDAY && DEBUG_SUNDAY_DATE) {
    const [y, m, d] = DEBUG_SUNDAY_DATE.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

/**
 * Verifica se hoje é domingo.
 * @returns {boolean}
 */
export function isSunday() {
  return getToday().getDay() === 0;
}

/**
 * Formata uma Date para 'YYYY-MM-DD'.
 * @param {Date} date
 * @returns {string}
 */
export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Verifica se a janela de registro está aberta:
 * Domingo o dia todo (00:00–23:59) + Segunda até 23:59.
 * @returns {boolean}
 */
export function isRegistrationOpen() {
  const now = getToday();
  const day = now.getDay(); // 0 = domingo, 1 = segunda
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (day === 0) return true; // Domingo inteiro
  if (day === 1 && (hour < 23 || (hour === 23 && minute <= 59))) return true; // Segunda até 23:59
  return false;
}

/**
 * Retorna o domingo mais recente como objeto Date.
 * - Se hoje é domingo → retorna hoje
 * - Se hoje é segunda (dentro da janela) → retorna o domingo passado
 * - Caso contrário → retorna o próximo domingo
 * @returns {Date}
 */
export function getMostRecentSunday() {
  const now = getToday();
  const day = now.getDay();

  if (day === 0) {
    // Hoje é domingo
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (day === 1) {
    // Segunda-feira — retorna o domingo passado
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // Terça–Sábado → retorna o próximo domingo
  const next = new Date(now);
  next.setDate(now.getDate() + (7 - day));
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Retorna a Date do domingo atual (hoje se domingo, senão o próximo).
 * @returns {Date}
 */
export function getCurrentSundayDate() {
  return getMostRecentSunday();
}

/**
 * Retorna a string 'YYYY-MM-DD' do domingo de referência para registro.
 * Durante a janela (Dom ou Seg) → domingo mais recente.
 * Fora da janela → próximo domingo.
 * @returns {string}
 */
export function getCurrentSundayDateString() {
  return toDateString(getMostRecentSunday());
}

/**
 * Retorna a chave do mês atual no formato 'YYYY-MM'.
 * @returns {string}
 */
export function getCurrentMonthKey() {
  const today = getToday();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Retorna todos os domingos de um dado mês/ano como objetos Date.
 * @param {number} year
 * @param {number} month - 0-indexed (janeiro = 0)
 * @returns {Date[]}
 */
export function getSundaysInMonth(year, month) {
  const sundays = [];
  const date = new Date(year, month, 1);
  // Avança até o primeiro domingo
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  while (date.getMonth() === month) {
    sundays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return sundays;
}

/**
 * Retorna todos os domingos do mês atual.
 * @returns {Date[]}
 */
export function getSundaysInCurrentMonth() {
  const today = getToday();
  return getSundaysInMonth(today.getFullYear(), today.getMonth());
}

/**
 * Retorna os domingos do mês atual que já passaram (inclusive hoje se domingo).
 * @returns {Date[]}
 */
export function getPastSundaysInCurrentMonth() {
  const today = getToday();
  const todayStr = toDateString(today);
  return getSundaysInCurrentMonth().filter(
    s => toDateString(s) <= todayStr
  );
}

/**
 * Retorna o nome do mês atual em português.
 * @returns {string} ex: "Maio de 2026"
 */
export function getCurrentMonthName() {
  const today = getToday();
  return formatMonthName(today.getFullYear(), today.getMonth());
}

/**
 * Formata ano e mês em nome por extenso.
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {string}
 */
export function formatMonthName(year, month) {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${months[month]} de ${year}`;
}

/**
 * Converte número para numeral romano (1–6).
 * @param {number} n
 * @returns {string}
 */
export function toRomanNumeral(n) {
  const map = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return map[n - 1] || String(n);
}

/**
 * Calcula o streak atual de domingos consecutivos.
 * Recebe os domingos do mês passados e os que o membro frequentou.
 * @param {string[]} attendedDates - array de 'YYYY-MM-DD' frequentados
 * @param {Date[]} allSundays - todos os domingos do mês
 * @returns {number}
 */
export function calculateStreak(attendedDates, allSundays) {
  const today = getToday();
  const todayStr = toDateString(today);

  // Filtra domingos passados em ordem decrescente
  const pastSundays = allSundays
    .filter(s => toDateString(s) <= todayStr)
    .map(s => toDateString(s))
    .reverse();

  let streak = 0;
  for (const dateStr of pastSundays) {
    if (attendedDates.includes(dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Formata data 'YYYY-MM-DD' para exibição 'DD/MM'.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatShortDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

/**
 * Retorna label ordinal do domingo (I Dom., II Dom., etc.)
 * com base na posição no array de domingos do mês.
 * @param {number} index - 0-based
 * @returns {string}
 */
export function getSundayOrdinalLabel(index) {
  return `${toRomanNumeral(index + 1)} Dom.`;
}

/**
 * Verifica se a data é o domingo atual (hoje se domingo, senão o próximo).
 * @param {Date} date
 * @returns {boolean}
 */
export function isCurrentSunday(date) {
  return toDateString(date) === getCurrentSundayDateString();
}

/**
 * Altura da vela baseada na posição (para ritmo visual).
 * Retorna classe CSS.
 * @param {number} index - 0-based
 * @param {number} total - total de domingos no mês
 * @returns {string}
 */
export function getCandleHeightClass(index, total) {
  // Padrão: vela central mais alta, bordas menores
  const patterns = {
    1: ['h3'],
    2: ['h2', 'h3'],
    3: ['h2', 'h3', 'h2'],
    4: ['h2', 'h3', 'h3', 'h2'],
    5: ['h1', 'h2', 'h3', 'h2', 'h1'],
  };
  const pattern = patterns[total] || patterns[5];
  return pattern[index % pattern.length] || 'h2';
}
