// ============================================================
// CONFRARIA DOS CRISMADOS — supabase.js
// Todas as queries ao banco — isoladas neste módulo
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// ─── Cliente Supabase ─────────────────────────────────────────

let _client = null;

function getClient() {
  if (!_client) {
    if (!SUPABASE_URL || SUPABASE_URL.includes('COLE_SUA')) {
      throw new Error('Supabase não configurado. Preencha config.js com suas credenciais.');
    }
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

// ─── MEMBROS ──────────────────────────────────────────────────

/**
 * Busca todos os membros da tabela `members`.
 * @returns {Promise<{ data: Array|null, error: Error|null }>}
 */
export async function getMembers() {
  try {
    const { data, error } = await getClient()
      .from('members')
      .select('id, name')
      .order('name');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Supabase] getMembers:', error);
    return { data: null, error };
  }
}

// ─── PRESENÇAS ────────────────────────────────────────────────

/**
 * Busca todas as presenças de um mês.
 * @param {string} monthKey - formato 'YYYY-MM'
 * @returns {Promise<{ data: Array|null, error: Error|null }>}
 */
export async function getMonthAttendances(monthKey) {
  try {
    const { data, error } = await getClient()
      .from('attendances')
      .select('id, member_id, sunday_date, month_key')
      .eq('month_key', monthKey);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Supabase] getMonthAttendances:', error);
    return { data: null, error };
  }
}

/**
 * Busca presenças de um membro em um mês.
 * @param {string} memberId
 * @param {string} monthKey
 * @returns {Promise<{ data: Array|null, error: Error|null }>}
 */
export async function getMemberAttendances(memberId, monthKey) {
  try {
    const { data, error } = await getClient()
      .from('attendances')
      .select('id, sunday_date')
      .eq('member_id', memberId)
      .eq('month_key', monthKey)
      .order('sunday_date');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Supabase] getMemberAttendances:', error);
    return { data: null, error };
  }
}

/**
 * Busca presenças registradas para um domingo específico.
 * @param {string} sundayDate - formato 'YYYY-MM-DD'
 * @returns {Promise<{ data: Array|null, error: Error|null }>}
 */
export async function getTodayAttendances(sundayDate) {
  try {
    const { data, error } = await getClient()
      .from('attendances')
      .select('id, member_id, sunday_date')
      .eq('sunday_date', sundayDate);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Supabase] getTodayAttendances:', error);
    return { data: null, error };
  }
}

/**
 * Verifica se um membro já registrou presença em um domingo.
 * @param {string} memberId
 * @param {string} sundayDate
 * @returns {Promise<{ attended: boolean, error: Error|null }>}
 */
export async function checkAttendance(memberId, sundayDate) {
  try {
    const { data, error } = await getClient()
      .from('attendances')
      .select('id')
      .eq('member_id', memberId)
      .eq('sunday_date', sundayDate)
      .maybeSingle();
    if (error) throw error;
    return { attended: !!data, error: null };
  } catch (error) {
    console.error('[Supabase] checkAttendance:', error);
    return { attended: false, error };
  }
}

/**
 * Registra a presença de um membro em um domingo.
 * A constraint UNIQUE(member_id, sunday_date) no banco evita duplicatas.
 * @param {string} memberId
 * @param {string} sundayDate - 'YYYY-MM-DD'
 * @param {string} monthKey - 'YYYY-MM'
 * @returns {Promise<{ success: boolean, error: Error|null }>}
 */
export async function registerAttendance(memberId, sundayDate, monthKey) {
  try {
    const { error } = await getClient()
      .from('attendances')
      .insert({ member_id: memberId, sunday_date: sundayDate, month_key: monthKey });

    if (error) {
      // Código 23505 = violação de constraint UNIQUE (duplicata)
      if (error.code === '23505') {
        return { success: false, duplicate: true, error };
      }
      throw error;
    }
    return { success: true, duplicate: false, error: null };
  } catch (error) {
    console.error('[Supabase] registerAttendance:', error);
    return { success: false, duplicate: false, error };
  }
}

// ─── MESES (histórico futuro) ─────────────────────────────────

/**
 * Busca registro do mês atual (para histórico futuro).
 * @param {string} monthKey
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function getMonthRecord(monthKey) {
  try {
    const { data, error } = await getClient()
      .from('months')
      .select('*')
      .eq('month_key', monthKey)
      .maybeSingle();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Supabase] getMonthRecord:', error);
    return { data: null, error };
  }
}

// ─── AUTENTICAÇÃO (Supabase Auth) ─────────────────────────────

/**
 * Login com email e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ session: object|null, error: Error|null }>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { session: data.session, error: null };
  } catch (error) {
    console.error('[Supabase] signIn:', error);
    return { session: null, error };
  }
}

/**
 * Cadastro de novo usuário.
 * Valida se o nome existe na tabela members (case-insensitive).
 * Após cadastro bem-sucedido, vincula auth_user_id ao membro.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<{ user: object|null, member: object|null, error: Error|null, errorType: string|null }>}
 */
export async function signUp(email, password, name) {
  try {
    const client = getClient();

    // 1. Verifica se o nome existe na tabela members (sem auth_user_id ainda)
    const { data: existingMembers, error: membersError } = await client
      .from('members')
      .select('id, name, auth_user_id')
      .ilike('name', name.trim());

    if (membersError) throw membersError;

    if (!existingMembers || existingMembers.length === 0) {
      return { user: null, member: null, error: new Error('name_not_found'), errorType: 'name_not_found' };
    }

    // Usa o primeiro match (nome na Confraria)
    const matchedMember = existingMembers[0];

    // 2. Cria conta no Supabase Auth
    const { data: authData, error: authError } = await client.auth.signUp({ email, password });

    if (authError) {
      // Email já cadastrado
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.message?.toLowerCase().includes('email') ||
          authError.status === 422 || authError.status === 400) {
        return { user: null, member: null, error: authError, errorType: 'email_taken' };
      }
      throw authError;
    }

    const user = authData.user;
    if (!user) {
      return { user: null, member: null, error: new Error('No user returned'), errorType: 'unknown' };
    }

    // 3. Vincula auth_user_id ao membro correspondente
    const { error: updateError } = await client
      .from('members')
      .update({ auth_user_id: user.id })
      .eq('id', matchedMember.id);

    if (updateError) {
      console.error('[Supabase] signUp: falha ao vincular auth_user_id:', updateError);
      // Não bloqueia — o usuário pode tentar logar e o admin vincula manualmente
    }

    // 4. Faz login automático (Supabase já retorna sessão em signUp)
    const session = authData.session;

    return {
      user,
      member: { ...matchedMember, auth_user_id: user.id },
      session,
      error: null,
      errorType: null,
    };

  } catch (error) {
    console.error('[Supabase] signUp:', error);
    return { user: null, member: null, error, errorType: 'unknown' };
  }
}

/**
 * Logout do usuário atual.
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    await getClient().auth.signOut();
  } catch (error) {
    console.error('[Supabase] signOut:', error);
  }
}

/**
 * Retorna a sessão ativa atual.
 * @returns {Promise<{ session: object|null, error: Error|null }>}
 */
export async function getSession() {
  try {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return { session: data.session, error: null };
  } catch (error) {
    console.error('[Supabase] getSession:', error);
    return { session: null, error };
  }
}

/**
 * Busca o membro vinculado a um auth user ID.
 * @param {string} authUserId
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function getMemberByAuthId(authUserId) {
  try {
    const { data, error } = await getClient()
      .from('members')
      .select('id, name, auth_user_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Supabase] getMemberByAuthId:', error);
    return { data: null, error };
  }
}

/**
 * Vincula manualmente um auth_user_id a um membro pelo nome.
 * (Usado como fallback se a vinculação automática falhar no signUp)
 * @param {string} authUserId
 * @param {string} memberName
 * @returns {Promise<{ success: boolean, error: Error|null }>}
 */
export async function linkAuthToMember(authUserId, memberName) {
  try {
    const { error } = await getClient()
      .from('members')
      .update({ auth_user_id: authUserId })
      .ilike('name', memberName);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('[Supabase] linkAuthToMember:', error);
    return { success: false, error };
  }
}

/**
 * Registra listener para mudanças de estado da sessão.
 * @param {Function} callback - (event, session) => void
 */
export function onAuthStateChange(callback) {
  return getClient().auth.onAuthStateChange(callback);
}

