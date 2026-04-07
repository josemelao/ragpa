const logger = require('../utils/logger');

// Configurações do MVP — ajuste aqui se necessário
const CHUNK_SIZE = 1000;   // caracteres por chunk
const CHUNK_OVERLAP = 150; // overlap entre chunks

/**
 * Divide texto em chunks com overlap.
 * Tenta respeitar parágrafos; cai em corte por caracteres se necessário.
 *
 * @param {string} text - Texto limpo
 * @param {object} options - { chunkSize, chunkOverlap }
 * @returns {string[]} Array de chunks
 */
function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || CHUNK_SIZE;
  const overlap = options.chunkOverlap || CHUNK_OVERLAP;

  if (!text || text.length === 0) return [];

  // Tenta quebrar por parágrafos primeiro
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // Se o parágrafo por si só já é maior que chunkSize, quebra em sub-chunks
    if (trimmed.length > chunkSize) {
      // Salva o chunk atual antes de quebrar o parágrafo longo
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      const subChunks = splitBySize(trimmed, chunkSize, overlap);
      chunks.push(...subChunks);
      continue;
    }

    // Se adicionar este parágrafo ultrapassa o limite, fecha o chunk atual
    if (currentChunk.length + trimmed.length + 2 > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // Inicia próximo chunk com overlap do chunk anterior
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText ? overlapText + '\n\n' + trimmed : trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    }
  }

  // Adiciona o último chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Remove chunks muito pequenos (menos de 50 chars)
  const validChunks = chunks.filter((c) => c.length >= 50);

  logger.info(`Chunking: ${validChunks.length} chunks gerados (tamanho alvo: ${chunkSize}, overlap: ${overlap})`);

  return validChunks;
}

/**
 * Divide texto longo em pedaços por tamanho com overlap.
 */
function splitBySize(text, chunkSize, overlap) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks.filter((c) => c.length >= 50);
}

/**
 * Retorna os últimos N caracteres de um texto (para overlap).
 */
function getOverlapText(text, overlapSize) {
  if (!text || overlapSize <= 0) return '';
  return text.slice(-overlapSize).trim();
}

module.exports = { chunkText };
