const { retrieveRelevantChunks } = require('../services/retrieval.service');
const { generateAnswer } = require('../services/answer.service');
const { listDocuments } = require('../services/vectorStore.service');
const logger = require('../utils/logger');

function isDocumentListQuestion(question) {
  const normalized = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const patterns = [
    'quais documentos',
    'quais arquivos',
    'listar documentos',
    'liste os documentos',
    'liste documentos',
    'documentos indexados',
    'arquivos indexados',
    'documentos enviados',
    'arquivos enviados',
    'mostre os documentos',
    'mostre os arquivos',
  ];

  return patterns.some((pattern) => normalized.includes(pattern));
}

function buildDocumentListAnswer(documents) {
  if (documents.length === 0) {
    return 'Nao ha documentos indexados no momento.';
  }

  const lines = documents.map((doc, index) => {
    const size = doc.size_bytes ? ` (${Math.round(doc.size_bytes / 1024)} KB)` : '';
    return `${index + 1}. ${doc.original_name || 'documento'}${size}`;
  });

  return `Documentos indexados (${documents.length}):\n` + lines.join('\n');
}

async function handleAsk(req, res) {
  const { question, responseMode } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'Pergunta nao pode estar vazia.' });
  }

  const trimmedQuestion = question.trim();
  logger.info(`Pergunta recebida: "${trimmedQuestion.slice(0, 80)}"`);

  try {
    if (isDocumentListQuestion(trimmedQuestion)) {
      const documents = await listDocuments();
      return res.json({
        answer: buildDocumentListAnswer(documents),
        sources: [],
      });
    }

    const chunks = await retrieveRelevantChunks(trimmedQuestion);

    if (!chunks || chunks.length === 0) {
      return res.json({
        answer: 'Nao encontrei essa informacao nos documentos enviados.',
        sources: [],
      });
    }

    const answer = await generateAnswer(trimmedQuestion, chunks, responseMode);

    const sources = chunks.map((c) => ({
      filename: c.original_name || c.filename || 'documento',
      chunkIndex: c.chunk_index,
      excerpt: c.content ? c.content.slice(0, 300) + (c.content.length > 300 ? '...' : '') : '',
      similarity: c.similarity ? Math.round(c.similarity * 100) / 100 : null,
      matchType: c.match_type || 'vector',
    }));

    return res.json({ answer, sources });
  } catch (err) {
    logger.error(`Erro ao processar pergunta: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Erro interno ao processar pergunta.' });
  }
}

module.exports = { handleAsk };
