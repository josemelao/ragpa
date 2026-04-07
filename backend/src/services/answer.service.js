const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('../utils/logger');

function getSystemPrompt() {
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

function buildFullPrompt(systemPrompt, question, chunks) {
  return `${systemPrompt}

${buildPrompt(question, chunks)}`;
}

async function generateAnswer(question, chunks) {
  const provider = config.providers.llm;

  if (provider === 'gemini') {
    return callGemini(question, chunks);
  }

  throw new Error(`Provedor de LLM nao suportado: ${provider}`);
}

async function callGemini(question, chunks) {
  if (!config.google.apiKey) {
    throw new Error('GOOGLE_API_KEY nao configurada. Preencha o .env');
  }

  const systemPrompt = getSystemPrompt();
  const userPrompt = buildFullPrompt(systemPrompt, question, chunks);

  const model = process.env.GEMINI_LLM_MODEL || 'gemini-2.5-flash';
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
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

  if (!text) {
    throw new Error('Resposta vazia da API Gemini');
  }

  logger.info(`Resposta gerada: ${text.length} caracteres`);
  return text;
}

module.exports = { generateAnswer };
