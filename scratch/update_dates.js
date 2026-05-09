const content = `
export function getCurrentMonthKey() {
  const today = getToday();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  return \`\${y}-\${m}\`;
}

export function getCurrentMonthName() {
  const today = getToday();
  return formatMonthName(today.getFullYear(), today.getMonth());
}

export function formatMonthName(year, month) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return \`\${months[month]} de \${year}\`;
}

export function formatShortDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return \`\${d}/\${months[parseInt(m) - 1]}\`;
}

export function formatLongDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return \`\${weekDays[date.getDay()]}, \${d} de \${months[date.getMonth()]}\`;
}

export function getPastDays(n) {
  const days = [];
  const today = getToday();
  for (let i = 0; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

export function getCandleHeightClass(index) {
  const heights = ['md', 'sm', 'lg', 'sm', 'md', 'sm', 'lg', 'md'];
  return heights[index % heights.length];
}
`;

const fs = require('fs');
fs.appendFileSync('js/dates.js', content, 'utf-8');
