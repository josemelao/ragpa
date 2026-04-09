const { retrieveRelevantChunks } = require('../services/retrieval.service');
const { generateAnswer } = require('../services/answer.service');
const { listDocuments, searchChunksByDocumentIds } = require('../services/vectorStore.service');
const {
  createConversation,
  getConversationById,
  listConversationMessages,
  saveConversationMessage,
} = require('../services/conversation.service');
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

function buildConversationTitle(question) {
  return question.slice(0, 80);
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractSearchTerms(question) {
  const stopwords = new Set([
    'como', 'para', 'sobre', 'quais', 'qual', 'listar', 'liste', 'mostre', 'mostrar',
    'todos', 'todas', 'documentos', 'documento', 'indexados', 'indexado', 'arquivo',
    'arquivos', 'onde', 'quando', 'porque', 'por', 'com', 'sem', 'uma', 'umas', 'uns',
    'das', 'dos', 'que', 'isso', 'essa', 'esse', 'esta', 'este', 'tem', 'nos', 'nas',
    'fala', 'trata', 'acesso'
  ]);

  const terms = normalizeText(question).match(/[a-z0-9_-]{3,}/g) || [];
  return [...new Set(terms.filter((term) => !stopwords.has(term)))];
}

function matchDocumentIdsByQuestion(question, documents) {
  const terms = extractSearchTerms(question);
  if (terms.length === 0) return [];

  return (documents || [])
    .map((doc) => {
      const name = normalizeText(doc.original_name || '');
      const hits = terms.reduce((acc, term) => acc + (name.includes(term) ? 1 : 0), 0);
      return { id: doc.id, hits };
    })
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map((item) => item.id);
}

function mergeUniqueIds(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

function hasAnyChunkFromDocuments(chunks, documentIds) {
  const set = new Set((documentIds || []).filter(Boolean));
  if (set.size === 0) return false;
  return (chunks || []).some((chunk) => set.has(chunk.document_id));
}

function isLikelyFollowUpQuestion(question) {
  const normalized = normalizeText(question);
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const isShort = wordCount <= 8 || normalized.length <= 64;
  const hasFollowUpSignal = /\b(esse|essa|isso|isto|ele|ela|dele|dela|disso|dessa|deste|qual|quais|quanto|quantos|quantas|quando|onde)\b/.test(normalized);
  return isShort || hasFollowUpSignal;
}

function buildRetrievalQuestion(question, messages) {
  if (!isLikelyFollowUpQuestion(question)) {
    return question;
  }

  const userMessages = (messages || []).filter((msg) => msg.role === 'user' && msg.content);

  if (userMessages.length < 2) {
    return question;
  }

  const previousContext = userMessages
    .slice(-3, -1)
    .map((msg) => msg.content)
    .join('\n');

  return `${previousContext}\nPergunta de continuidade: ${question}`;
}

function extractPreferredDocumentIds(messages) {
  const assistantMessages = (messages || []).filter((msg) => msg.role === 'assistant');
  const lastAssistantWithSources = [...assistantMessages]
    .reverse()
    .find((msg) => Array.isArray(msg.sources_json) && msg.sources_json.length > 0);

  if (!lastAssistantWithSources) {
    return [];
  }

  return [...new Set(
    lastAssistantWithSources.sources_json
      .map((source) => source?.documentId)
      .filter(Boolean)
  )];
}

function buildConversationHistoryForPrompt(messages, currentQuestion) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const history = [...messages];
  const last = history[history.length - 1];

  if (
    last &&
    last.role === 'user' &&
    String(last.content || '').trim() === String(currentQuestion || '').trim()
  ) {
    history.pop();
  }

  return history
    .slice(-6)
    .map((msg) => ({
      role: msg.role,
      content: String(msg.content || '').trim().slice(0, 500),
    }))
    .filter((msg) => msg.content.length > 0);
}

async function resolveConversationId(rawConversationId, question) {
  const conversationId = rawConversationId ? String(rawConversationId).trim() : '';

  if (!conversationId) {
    const conversation = await createConversation({
      title: buildConversationTitle(question),
    });
    return conversation.id;
  }

  try {
    const existing = await getConversationById(conversationId);
    return existing.id;
  } catch (err) {
    logger.warn(`conversationId invalido recebido (${conversationId}). Criando nova conversa.`);
    const conversation = await createConversation({
      title: buildConversationTitle(question),
    });
    return conversation.id;
  }
}

async function handleAsk(req, res) {
  const { question, responseMode, conversationId: rawConversationId } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'Pergunta nao pode estar vazia.' });
  }

  const trimmedQuestion = question.trim();
  logger.info(`Pergunta recebida: "${trimmedQuestion.slice(0, 80)}"`);

  try {
    const conversationId = await resolveConversationId(rawConversationId, trimmedQuestion);
    await saveConversationMessage({
      conversationId,
      role: 'user',
      content: trimmedQuestion,
    });

    const conversationMessages = await listConversationMessages(conversationId, { limit: 20 });

    if (isDocumentListQuestion(trimmedQuestion)) {
      const documents = await listDocuments();
      const answer = buildDocumentListAnswer(documents);

      await saveConversationMessage({
        conversationId,
        role: 'assistant',
        content: answer,
        sourcesJson: [],
      });

      return res.json({
        answer,
        sources: [],
        conversationId,
      });
    }

    const retrievalQuestion = buildRetrievalQuestion(trimmedQuestion, conversationMessages);
    const documents = await listDocuments();
    const matchedIds = matchDocumentIdsByQuestion(trimmedQuestion, documents);
    const preferredDocumentIds = extractPreferredDocumentIds(conversationMessages);
    const effectivePreferredIds = mergeUniqueIds(matchedIds, preferredDocumentIds);
    let chunks = await retrieveRelevantChunks(retrievalQuestion, {
      preferredDocumentIds: effectivePreferredIds,
    });

    if (
      matchedIds.length > 0 &&
      (!chunks || chunks.length === 0 || !hasAnyChunkFromDocuments(chunks, matchedIds))
    ) {
      chunks = await searchChunksByDocumentIds(matchedIds, 8);
    }

    if (!chunks || chunks.length === 0) {
      const answer = 'Nao encontrei essa informacao nos documentos enviados.';

      await saveConversationMessage({
        conversationId,
        role: 'assistant',
        content: answer,
        sourcesJson: [],
      });

      return res.json({
        answer,
        sources: [],
        conversationId,
      });
    }

    const conversationHistory = buildConversationHistoryForPrompt(
      conversationMessages,
      trimmedQuestion
    );
    const answer = await generateAnswer(trimmedQuestion, chunks, responseMode, {
      conversationHistory,
    });

    const sources = chunks.map((c) => ({
      filename: c.original_name || c.filename || 'documento',
      documentId: c.document_id || null,
      chunkIndex: c.chunk_index,
      excerpt: c.content ? c.content.slice(0, 300) + (c.content.length > 300 ? '...' : '') : '',
      similarity: c.similarity ? Math.round(c.similarity * 100) / 100 : null,
      matchType: c.match_type || 'vector',
    }));

    await saveConversationMessage({
      conversationId,
      role: 'assistant',
      content: answer,
      sourcesJson: sources,
    });

    return res.json({ answer, sources, conversationId });
  } catch (err) {
    logger.error(`Erro ao processar pergunta: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Erro interno ao processar pergunta.' });
  }
}

module.exports = { handleAsk };
