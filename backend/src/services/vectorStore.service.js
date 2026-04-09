const { getSupabaseClient } = require('../config/supabase');
const logger = require('../utils/logger');

async function saveDocument({ filename, originalName, mimeType, sizeBytes }) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('documents')
    .insert({
      filename,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao salvar documento: ${error.message}`);

  logger.info(`Documento salvo: id=${data.id} | ${originalName}`);
  return data;
}

async function saveChunks(documentId, chunks) {
  const supabase = getSupabaseClient();

  const rows = chunks.map((c) => ({
    document_id: documentId,
    chunk_index: c.chunkIndex,
    content: c.content,
    embedding: c.embedding,
  }));

  const { error } = await supabase.from('document_chunks').insert(rows);

  if (error) throw new Error(`Erro ao salvar chunks: ${error.message}`);

  logger.info(`${rows.length} chunks salvos para documento ${documentId}`);
}

async function searchSimilarChunks(queryEmbedding, topK = 5) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_count: topK,
  });

  if (error) throw new Error(`Erro na busca vetorial: ${error.message}`);

  return data || [];
}

function extractTextQueries(question) {
  const quoted = [...question.matchAll(/"([^"]{2,})"/g)].map((match) => match[1].trim());

  const stopwords = new Set([
    'como', 'para', 'sobre', 'quais', 'qual', 'listar', 'liste', 'mostre', 'mostrar',
    'todos', 'todas', 'documentos', 'documento', 'indexados', 'indexado', 'arquivo',
    'arquivos', 'onde', 'quando', 'porque', 'por', 'com', 'sem', 'uma', 'umas', 'uns',
    'das', 'dos', 'que', 'isso', 'essa', 'esse', 'esta', 'este', 'tem', 'nos', 'nas'
  ]);

  const terms = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9_-]{3,}/g) || [];

  const filteredTerms = terms.filter((term) => !stopwords.has(term));

  return [...new Set([...quoted, ...filteredTerms])].slice(0, 6);
}

async function searchChunksByText(question, limit = 8) {
  const supabase = getSupabaseClient();
  const queries = extractTextQueries(question);

  if (queries.length === 0) {
    return [];
  }

  const orFilter = queries
    .map((term) => `content.ilike.%${term.replace(/[%_,]/g, '')}%`)
    .join(',');

  const { data, error } = await supabase
    .from('document_chunks')
    .select(`
      id,
      document_id,
      chunk_index,
      content,
      documents!inner (
        original_name,
        filename
      )
    `)
    .or(orFilter)
    .limit(limit);

  if (error) throw new Error(`Erro na busca textual: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    document_id: row.document_id,
    chunk_index: row.chunk_index,
    content: row.content,
    original_name: row.documents?.original_name || null,
    filename: row.documents?.filename || null,
    similarity: 1,
    match_type: 'text',
  }));
}

async function searchChunksByDocumentIds(documentIds, limit = 8) {
  const supabase = getSupabaseClient();
  const ids = (documentIds || []).filter(Boolean);

  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('document_chunks')
    .select(`
      id,
      document_id,
      chunk_index,
      content,
      documents!inner (
        original_name,
        filename
      )
    `)
    .in('document_id', ids)
    .order('chunk_index', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Erro na busca por documento: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    document_id: row.document_id,
    chunk_index: row.chunk_index,
    content: row.content,
    original_name: row.documents?.original_name || null,
    filename: row.documents?.filename || null,
    similarity: 1,
    match_type: 'document',
  }));
}

async function listDocuments() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('documents')
    .select('id, original_name, mime_type, size_bytes, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao listar documentos: ${error.message}`);

  return data || [];
}

async function deleteDocument(documentId) {
  const supabase = getSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('id, filename, original_name')
    .eq('id', documentId)
    .single();

  if (fetchError) throw new Error(`Erro ao localizar documento: ${fetchError.message}`);

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) throw new Error(`Erro ao apagar documento: ${deleteError.message}`);

  logger.info(`Documento removido: id=${existing.id} | ${existing.original_name}`);
  return existing;
}

module.exports = {
  deleteDocument,
  saveDocument,
  saveChunks,
  searchSimilarChunks,
  searchChunksByText,
  searchChunksByDocumentIds,
  listDocuments,
};
