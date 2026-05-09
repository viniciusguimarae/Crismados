// ============================================================
// CONFRARIA DOS CRISMADOS — members.js
// Dados fixos dos 6 membros — preparado para PIN futuro
// ============================================================

/**
 * Lista fixa dos membros da Confraria.
 * Para adicionar PIN futuramente, inclua um campo `pin` aqui
 * e envolva a seleção em uma verificação de PIN no app.js.
 *
 * O campo `id` deve corresponder ao UUID inserido no Supabase.
 * Após rodar o SQL de setup, atualize os IDs abaixo com os
 * UUIDs reais da tabela `members`.
 */
/**
 * Retorna as iniciais de um nome.
 * Usa os dois primeiros caracteres do nome, ou as duas primeiras letras.
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '??';
  
  // Se o nome tiver mais de uma palavra (ex: Joao Paulo), pega as iniciais
  const parts = name.trim().split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  return name.slice(0, 2).toUpperCase();
}

/**
 * Processa os dados vindos do Supabase.
 * Como o banco é a única fonte da verdade, apenas adicionamos as iniciais.
 * @param {Array} supabaseMembers - Array de { id, name } do Supabase
 * @returns {Array} array de membros formatado
 */
export function mergeWithSupabase(supabaseMembers) {
  if (!supabaseMembers) return [];
  
  return supabaseMembers.map(member => ({
    ...member,
    initials: getInitials(member.name)
  }));
}

// ─── Quotes espirituais rotativas ─────────────────────────────
// Rotação por dia do ano: dayOfYear % quotes.length
export const SPIRITUAL_QUOTES = [
  {
    text: 'Posso tudo naquele que me fortalece.',
    ref: '— Filipenses 4,13',
  },
  {
    text: 'O Senhor é o meu pastor e nada me faltará.',
    ref: '— Salmo 23,1',
  },
  {
    text: 'Buscai primeiro o Reino de Deus e a sua justiça.',
    ref: '— Mateus 6,33',
  },
  {
    text: 'A fé é a certeza das coisas que se esperam.',
    ref: '— Hebreus 11,1',
  },
  {
    text: 'Confiai no Senhor de todo o vosso coração.',
    ref: '— Provérbios 3,5',
  },
  {
    text: 'Sede fortes e corajosos. Não temais, não vos assusteis.',
    ref: '— Josué 1,9',
  },
  {
    text: 'Aquietai-vos e sabei que Eu sou Deus.',
    ref: '— Salmo 46,11',
  },
  {
    text: 'Onde dois ou três estiverem reunidos em meu nome, ali estou no meio deles.',
    ref: '— Mateus 18,20',
  },
  {
    text: 'Ide pelo mundo inteiro e proclamai o Evangelho a toda criatura.',
    ref: '— Marcos 16,15',
  },
];

/**
 * Retorna a quote do dia.
 * @returns {{ text: string, ref: string }}
 */
export function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return SPIRITUAL_QUOTES[dayOfYear % SPIRITUAL_QUOTES.length];
}
