const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('../utils/logger');

const DEFAULT_RESPONSE_MODE = 'balanced';

function getBaseSystemPrompt() {
  const promptPath = path.join(__dirname, '../prompts/rag.system.prompt.txt');
  try {
    return fs.readFileSync(promptPath, 'utf8').trim();
  } catch {
    return `Voce e um assistente de consulta documental.
Regras obrigatorias:
1. Responda apenas com base no CONTEXTO fornecido.
2. Nao invente fatos.
3. Nao preencha lacunas com suposicoes.
4. Se a resposta nao estiver claramente presente no contexto, diga: "Nao encontrei essa informacao nos documentos enviados."
5. Sempre que possivel, seja objetivo e direto.`;
  }
}

function normalizeResponseMode(mode) {
  const allowed = ['conservative', 'balanced', 'flexible'];
  return allowed.includes(mode) ? mode : DEFAULT_RESPONSE_MODE;
}

function getModeInstruction(mode) {
  switch (normalizeResponseMode(mode)) {
    case 'conservative':
      return `Modo de resposta: conservadora.
- Responda apenas o que estiver explicitamente presente no contexto.
- Evite inferencias, mesmo quando parecerem provaveis.
- Se qualquer parte da resposta depender de interpretacao mais livre, prefira dizer: "Nao encontrei essa informacao nos documentos enviados."
- Priorize seguranca e fidelidade literal ao texto.`;
    case 'flexible':
      return `Modo de resposta: flexivel.
- Responda com base no contexto como fonte principal.
- Voce pode resumir, conectar trechos e fazer inferencias diretas e conservadoras quando elas forem claramente sustentadas pelo contexto.
- Nao invente fatos nem use conhecimento externo como base principal.
- Se houver apenas apoio parcial, responda o que o contexto permite concluir e deixe claro o que nao pode ser afirmado com certeza.`;
    case 'balanced':
    default:
      return `Modo de resposta: equilibrada.
- Responda com base no contexto como fonte principal.
- Voce pode consolidar informacoes e fazer inferencias diretas quando elas forem claramente sustentadas pelo contexto.
- Nao invente fatos, nao complete lacunas com suposicoes e nao use conhecimento externo como base principal.
- Se o contexto nao trouxer informacao suficiente para responder com seguranca, diga: "Nao encontrei essa informacao nos documentos enviados."`;
  }
}

function getSystemPrompt(mode) {
  return `${getBaseSystemPrompt()}

${getModeInstruction(mode)}`;
}

function buildPrompt(question, chunks) {
  const contextBlocks = chunks
    .map((c, i) => {
      const source = c.original_name || c.filename || 'documento';
      return `[Trecho ${i + 1} - ${source}]\n${c.content}`;
    })
    .join('\n\n---\n\n');

  return `CONTEXTO DOS DOCUMENTOS:
${contextBlocks}

---

PERGUNTA DO USUARIO:
${question}`;
}

async function generateAnswer(question, chunks, responseMode) {
  const provider = config.providers.llm;

  if (provider === 'gemini') return callGemini(question, chunks, responseMode);
  if (provider === 'groq')   return callGroq(question, chunks, responseMode);

  throw new Error(`Provedor de LLM nao suportado: ${provider}`);
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
async function callGemini(question, chunks, responseMode) {
  if (!config.google.apiKey) {
    throw new Error('GOOGLE_API_KEY nao configurada. Preencha o .env');
  }

  const mode = normalizeResponseMode(responseMode);
  const systemPrompt = getSystemPrompt(mode);
  const userPrompt = `${systemPrompt}\n\n${buildPrompt(question, chunks)}`;

  const model = process.env.GEMINI_LLM_MODEL || 'gemini-2.0-flash';
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.google.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini LLM error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Resposta vazia da API Gemini');

  logger.info(`Resposta gerada (Gemini): ${text.length} caracteres`);
  return text;
}

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------
async function callGroq(question, chunks, responseMode) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY nao configurada. Preencha o .env');

  const mode = normalizeResponseMode(responseMode);
  const systemPrompt = getSystemPrompt(mode);
  const userPrompt = buildPrompt(question, chunks);

  const model = process.env.GROQ_LLM_MODEL || 'llama-3.1-8b-instant';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const body = {
    model,
    temperature: 0.3,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq LLM error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Resposta vazia da API Groq');

  logger.info(`Resposta gerada (Groq): ${text.length} caracteres`);
  return text;
}

module.exports = { generateAnswer };
