const { getSupabaseClient } = require('../config/supabase');

const ALLOWED_ROLES = new Set(['user', 'assistant']);

function normalizeLimit(limit, fallback = 20, max = 100) {
  const parsed = Number.parseInt(limit, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

async function createConversation({ title = null } = {}) {
  const supabase = getSupabaseClient();

  const payload = {
    title: title ? String(title).trim().slice(0, 200) : null,
  };

  const { data, error } = await supabase
    .from('conversations')
    .insert(payload)
    .select('id, title, summary, created_at, updated_at')
    .single();

  if (error) throw new Error(`Erro ao criar conversa: ${error.message}`);

  return data;
}

async function getConversationById(conversationId) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, summary, created_at, updated_at')
    .eq('id', conversationId)
    .single();

  if (error) throw new Error(`Erro ao buscar conversa: ${error.message}`);

  return data;
}

async function listConversationMessages(conversationId, { limit = 20 } = {}) {
  const supabase = getSupabaseClient();
  const safeLimit = normalizeLimit(limit);

  const { data, error } = await supabase
    .from('conversation_messages')
    .select('id, conversation_id, role, content, sources_json, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(safeLimit);

  if (error) throw new Error(`Erro ao listar mensagens da conversa: ${error.message}`);

  return data || [];
}

async function saveConversationMessage({ conversationId, role, content, sourcesJson = null }) {
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Role invalido para mensagem de conversa.');
  }

  const normalizedContent = String(content || '').trim();
  if (!normalizedContent) {
    throw new Error('Conteudo da mensagem nao pode ser vazio.');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content: normalizedContent,
      sources_json: sourcesJson,
    })
    .select('id, conversation_id, role, content, sources_json, created_at')
    .single();

  if (error) throw new Error(`Erro ao salvar mensagem da conversa: ${error.message}`);

  return data;
}

async function updateConversationSummary(conversationId, summary) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('conversations')
    .update({
      summary: summary ? String(summary).trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .select('id, title, summary, created_at, updated_at')
    .single();

  if (error) throw new Error(`Erro ao atualizar resumo da conversa: ${error.message}`);

  return data;
}

module.exports = {
  createConversation,
  getConversationById,
  listConversationMessages,
  saveConversationMessage,
  updateConversationSummary,
};

