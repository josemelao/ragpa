const { generateEmbedding } = require('./embedding.service');
const {
  searchSimilarChunks,
  searchChunksByText,
  searchChunksByDocumentIds,
  listDocuments,
} = require('./vectorStore.service');
const logger = require('../utils/logger');

const TOP_K = 6;
const TEXT_FALLBACK_K = 6;
const DOCUMENT_MATCH_K = 6;
const PREFERRED_DOCUMENT_K = 20;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractQuestionTerms(question) {
  const stopwords = new Set([
    'como', 'para', 'sobre', 'quais', 'qual', 'listar', 'liste', 'mostre', 'mostrar',
    'todos', 'todas', 'documentos', 'documento', 'indexados', 'indexado', 'arquivo',
    'arquivos', 'onde', 'quando', 'porque', 'por', 'com', 'sem', 'uma', 'umas', 'uns',
    'das', 'dos', 'que', 'isso', 'essa', 'esse', 'esta', 'este', 'tem', 'nos', 'nas',
    'trata', 'sobre', 'acesso'
  ]);

  const terms = normalizeText(question).match(/[a-z0-9_-]{3,}/g) || [];
  return [...new Set(terms.filter((term) => !stopwords.has(term)))];
}

function matchDocumentIdsByName(question, documents) {
  const terms = extractQuestionTerms(question);
  if (terms.length === 0) return [];

  const scored = (documents || [])
    .map((doc) => {
      const name = normalizeText(doc.original_name || '');
      const hits = terms.reduce((acc, term) => acc + (name.includes(term) ? 1 : 0), 0);
      return { id: doc.id, hits };
    })
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored.slice(0, 3).map((item) => item.id);
}

function mergeChunks(documentMatches, textMatches, vectorMatches, topK) {
  const seen = new Set();
  const merged = [];

  for (const chunk of [...documentMatches, ...textMatches, ...vectorMatches]) {
    const key = chunk.id || `${chunk.document_id}:${chunk.chunk_index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(chunk);
    if (merged.length >= topK) break;
  }

  return merged;
}

async function retrieveRelevantChunks(question, options = {}) {
  const topK = Number.isInteger(options.topK) ? options.topK : TOP_K;
  const preferredDocumentIds = (options.preferredDocumentIds || []).filter(Boolean);

  logger.info(`Recuperando chunks para: "${question.slice(0, 80)}..."`);

  const [documents, textMatches, queryEmbedding] = await Promise.all([
    listDocuments(),
    searchChunksByText(question, TEXT_FALLBACK_K),
    generateEmbedding(question),
  ]);

  const matchedDocumentIds = matchDocumentIdsByName(question, documents);
  const [preferredDocumentMatches, documentMatches] = await Promise.all([
    searchChunksByDocumentIds(preferredDocumentIds, PREFERRED_DOCUMENT_K),
    searchChunksByDocumentIds(matchedDocumentIds, DOCUMENT_MATCH_K),
  ]);
  const vectorMatches = await searchSimilarChunks(queryEmbedding, topK);
  const merged = mergeChunks(
    [...preferredDocumentMatches, ...documentMatches],
    textMatches,
    vectorMatches,
    topK
  );

  logger.info(
    `${merged.length} chunks recuperados (${preferredDocumentMatches.length} doc preferido, ${documentMatches.length} por documento, ${textMatches.length} por texto, ${vectorMatches.length} por vetor)`
  );

  return merged;
}

module.exports = { retrieveRelevantChunks };
