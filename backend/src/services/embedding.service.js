const config = require('../config/env');

// Must match the vector(N) dimension used in Supabase.
const EMBEDDING_DIMENSION = 768;

// Gemini free tier: 100 requests/minute → ~600ms between calls keeps us safe.
const THROTTLE_MS = 650;
let lastCallTime = 0;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < THROTTLE_MS) {
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS - elapsed));
  }
  lastCallTime = Date.now();
}

async function generateEmbedding(text) {
  const provider = config.providers.embedding;
  if (provider === 'gemini') return generateGeminiEmbedding(text);
  throw new Error(`Provedor de embedding nao suportado: ${provider}`);
}

async function generateGeminiEmbedding(text) {
  if (!config.google.apiKey) {
    throw new Error('GOOGLE_API_KEY nao configurada. Preencha o .env');
  }

  await throttle();

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
