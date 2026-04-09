const { retrieveRelevantChunks } = require('../services/retrieval.service');
const { generateAnswer } = require('../services/answer.service');
const { listDocuments, searchChunksByDocumentIds } = require('../services/vectorStore.service');
const {
  createConversation,
  getConversationById,
  listConversationMessages,
  saveConversationMessage,
  updateConversationSummary,
} = require('../services/conversation.service');
const logger = require('../utils/logger');
const MAX_HISTORY_MESSAGES = 6;
const SUMMARY_MAX_CHARS = 1200;

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

function isExtractCountQuestion(question) {
  const normalized = normalizeText(question);
  const hasExtractTerm = normalized.includes('extrato') || normalized.includes('ufpa');
  const hasCountIntent = /\b(quantos|quantas|qtd|quantidade|numero|existem|ha)\b/.test(normalized);
  const hasIndexedHint = normalized.includes('indexad') || normalized.includes('enviad') || normalized.includes('cadastrad');
  return hasExtractTerm && (hasCountIntent || hasIndexedHint);
}

function isExtractListQuestion(question) {
  const normalized = normalizeText(question);
  const hasExtractTerm = normalized.includes('extrato') || normalized.includes('ufpa');
  const hasListIntent = /\b(lista|listar|liste|mostre|quais)\b/.test(normalized);
  return hasExtractTerm && hasListIntent;
}

function isGenericListQuestion(question) {
  const normalized = normalizeText(question);
  const terms = normalized.match(/[a-z0-9_-]{2,}/g) || [];
  const hasListIntent = /\b(lista|listar|liste|mostre|todos|todas)\b/.test(normalized);
  const hasDetailTerms = /\b(composicao|familiar|familia|nomes|nome|pessoa|pessoas|conjuge|cpf|endereco|situacao|pronaf|validade|inscricao|data|membro|membros)\b/.test(normalized);
  const isShortGeneric = terms.length <= 4;
  return hasListIntent && isShortGeneric && !hasDetailTerms;
}

function inferContextListAction(messages) {
  const recent = [...(messages || [])].reverse().slice(0, 8);
  const joined = recent.map((msg) => normalizeText(msg.content || '')).join('\n');

  const hasDocumentInventoryCue =
    joined.includes('documentos indexados') || joined.includes('arquivos indexados');
  const hasExtractCue = joined.includes('extrato') || joined.includes('ufpa');
  const hasContentSources = recent.some(
    (msg) => msg.role === 'assistant' && Array.isArray(msg.sources_json) && msg.sources_json.length > 0
  );

  if (hasContentSources && !hasDocumentInventoryCue) {
    return 'document_content';
  }

  if (hasExtractCue) {
    return 'extract_inventory';
  }

  if (hasDocumentInventoryCue) {
    return 'document_inventory';
  }

  return 'document_inventory';
}

function getIndexedExtractDocuments(documents) {
  return (documents || []).filter((doc) => {
    const name = normalizeText(doc.original_name || '');
    return name.includes('extrato') || name.includes('ufpa');
  });
}

function buildExtractCountAnswer(extractDocuments) {
  const unique = new Map();
  for (const doc of extractDocuments || []) {
    if (!doc?.id || unique.has(doc.id)) continue;
    unique.set(doc.id, doc);
  }

  const count = unique.size;
  if (count === 0) {
    return 'Nao ha extratos indexados no momento.';
  }

  return `Existem ${count} extrato${count === 1 ? '' : 's'} indexado${count === 1 ? '' : 's'}.`;
}

function buildExtractListAnswer(extractDocuments) {
  const unique = new Map();
  for (const doc of extractDocuments || []) {
    if (!doc?.id || unique.has(doc.id)) continue;
    unique.set(doc.id, doc);
  }

  const docs = [...unique.values()];
  if (docs.length === 0) {
    return 'Nao ha extratos indexados no momento.';
  }

  const lines = docs.map((doc, index) => `${index + 1}. ${doc.original_name || 'documento'}`);
  return `Extratos indexados (${docs.length}):\n${lines.join('\n')}`;
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

function normalizeQuestionTypos(question) {
  return String(question || '')
    .replace(/\bquants\b/gi, 'quantas')
    .replace(/\bqnts\b/gi, 'quantas')
    .replace(/\bqtas\b/gi, 'quantas')
    .replace(/\bqto\b/gi, 'quanto')
    .replace(/\bqtos\b/gi, 'quantos')
    .trim();
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

function isLineCountQuestion(question) {
  const normalized = normalizeText(question);
  return (
    (normalized.includes('quant') || normalized.includes('numero')) &&
    normalized.includes('linha')
  );
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

function extractDeterministicAnswer(question, chunks) {
  if (!isLineCountQuestion(question)) {
    return null;
  }

  for (const chunk of chunks || []) {
    const text = String(chunk.content || '');

    const tratorMatch = text.match(/trator\s+de\s+(\d+)\s+linha(?:s)?/i);
    if (tratorMatch) {
      const lines = tratorMatch[1];
      return `O trator solicitado e de ${lines} linha${lines === '1' ? '' : 's'}.`;
    }

    const genericMatch = text.match(/\b(\d+)\s+linha(?:s)?\b/i);
    if (genericMatch) {
      const lines = genericMatch[1];
      return `O documento menciona ${lines} linha${lines === '1' ? '' : 's'}.`;
    }
  }

  return null;
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
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => ({
      role: msg.role,
      content: String(msg.content || '').trim().slice(0, 500),
    }))
    .filter((msg) => msg.content.length > 0);
}

function buildConversationSummary(messages) {
  const history = Array.isArray(messages) ? messages.slice(-10) : [];
  if (history.length === 0) return null;

  const lastUserMessage = [...history].reverse().find((msg) => msg.role === 'user' && msg.content);
  const lastAssistantMessage = [...history].reverse().find((msg) => msg.role === 'assistant' && msg.content);

  const focusedDocs = [...new Set(
    history
      .filter((msg) => msg.role === 'assistant' && Array.isArray(msg.sources_json))
      .flatMap((msg) => msg.sources_json.map((source) => source?.filename))
      .filter(Boolean)
  )].slice(0, 4);

  const lines = [
    lastUserMessage ? `Assunto atual: ${String(lastUserMessage.content).slice(0, 220)}` : null,
    focusedDocs.length > 0 ? `Documentos em foco: ${focusedDocs.join(', ')}` : null,
    lastAssistantMessage ? `Ultima resposta util: ${String(lastAssistantMessage.content).slice(0, 320)}` : null,
  ].filter(Boolean);

  if (lines.length === 0) return null;

  return lines.join('\n').slice(0, SUMMARY_MAX_CHARS);
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
  let normalizedQuestion = normalizeQuestionTypos(trimmedQuestion);
  logger.info(`Pergunta recebida: "${trimmedQuestion.slice(0, 80)}"`);

  try {
    const conversationId = await resolveConversationId(rawConversationId, trimmedQuestion);
    await saveConversationMessage({
      conversationId,
      role: 'user',
      content: trimmedQuestion,
    });

    const conversation = await getConversationById(conversationId);
    const conversationMessages = await listConversationMessages(conversationId, { limit: 20 });
    const documents = await listDocuments();

    if (isDocumentListQuestion(normalizedQuestion)) {
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

    if (isExtractCountQuestion(normalizedQuestion)) {
      const answer = buildExtractCountAnswer(getIndexedExtractDocuments(documents));

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

    if (isExtractListQuestion(normalizedQuestion)) {
      const answer = buildExtractListAnswer(getIndexedExtractDocuments(documents));

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

    if (isGenericListQuestion(normalizedQuestion)) {
      const listAction = inferContextListAction(conversationMessages);

      if (listAction === 'extract_inventory') {
        const answer = buildExtractListAnswer(getIndexedExtractDocuments(documents));

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

      if (listAction === 'document_inventory') {
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

      if (listAction === 'document_content') {
        normalizedQuestion = 'Liste de forma objetiva as informacoes relevantes dos documentos em foco na conversa atual.';
      }
    }

    const retrievalQuestion = buildRetrievalQuestion(normalizedQuestion, conversationMessages);
    const matchedIds = matchDocumentIdsByQuestion(normalizedQuestion, documents);
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

    const deterministicAnswer = extractDeterministicAnswer(normalizedQuestion, chunks);
    const conversationHistory = buildConversationHistoryForPrompt(
      conversationMessages,
      normalizedQuestion
    );
    const answer = deterministicAnswer || await generateAnswer(normalizedQuestion, chunks, responseMode, {
      conversationHistory,
      conversationSummary: conversation?.summary || null,
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

    try {
      const latestMessages = await listConversationMessages(conversationId, { limit: 20 });
      const summary = buildConversationSummary(latestMessages);
      if (summary) {
        await updateConversationSummary(conversationId, summary);
      }
    } catch (summaryError) {
      logger.warn(`Falha ao atualizar resumo da conversa ${conversationId}: ${summaryError.message}`);
    }

    return res.json({ answer, sources, conversationId });
  } catch (err) {
    logger.error(`Erro ao processar pergunta: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Erro interno ao processar pergunta.' });
  }
}

module.exports = { handleAsk };
