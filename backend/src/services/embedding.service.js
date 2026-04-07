const config = require('../config/env');

// Must match the vector(N) dimension used in Supabase.
const EMBEDDING_DIMENSION = 768;

async function generateEmbedding(text) {
  const provider = config.providers.embedding;
  if (provider === 'gemini') return generateGeminiEmbedding(text);
  throw new Error(`Provedor de embedding nao suportado: ${provider}`);
}

async function generateGeminiEmbedding(text) {
  if (!config.google.apiKey) {
    throw new Error('GOOGLE_API_KEY nao configurada. Preencha o .env');
  }

  const model = 'gemini-embedding-001';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${config.google.apiKey}`;

  const body = {
    model: `models/${model}`,
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSION,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini embedding error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const embedding = data?.embedding?.values;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Resposta invalida da API de embedding Gemini');
  }

  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Dimensao de embedding inesperada: recebido ${embedding.length}, esperado ${EMBEDDING_DIMENSION}`
    );
  }

  return embedding;
}

module.exports = { generateEmbedding, EMBEDDING_DIMENSION };
