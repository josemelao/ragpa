const { generateEmbedding } = require('./embedding.service');
const { searchSimilarChunks, searchChunksByText } = require('./vectorStore.service');
const logger = require('../utils/logger');

const TOP_K = 8;
const TEXT_FALLBACK_K = 8;

function mergeChunks(textMatches, vectorMatches, topK) {
  const seen = new Set();
  const merged = [];

  for (const chunk of [...textMatches, ...vectorMatches]) {
    const key = chunk.id || `${chunk.document_id}:${chunk.chunk_index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(chunk);
    if (merged.length >= topK) break;
  }

  return merged;
}

async function retrieveRelevantChunks(question, topK = TOP_K) {
  logger.info(`Recuperando chunks para: "${question.slice(0, 80)}..."`);

  const [textMatches, queryEmbedding] = await Promise.all([
    searchChunksByText(question, TEXT_FALLBACK_K),
    generateEmbedding(question),
  ]);

  const vectorMatches = await searchSimilarChunks(queryEmbedding, topK);
  const merged = mergeChunks(textMatches, vectorMatches, topK);

  logger.info(
    `${merged.length} chunks recuperados (${textMatches.length} por texto, ${vectorMatches.length} por vetor)`
  );

  return merged;
}

module.exports = { retrieveRelevantChunks };
