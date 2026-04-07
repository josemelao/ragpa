const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { sanitizeText } = require('../utils/sanitizeText');

function resolveFileInput(fileOrPath, mimeType) {
  if (typeof fileOrPath === 'string') {
    return {
      buffer: null,
      filePath: fileOrPath,
      mimeType,
      originalName: path.basename(fileOrPath),
    };
  }

  return {
    buffer: fileOrPath?.buffer || null,
    filePath: fileOrPath?.filePath || null,
    mimeType: fileOrPath?.mimeType || mimeType,
    originalName: fileOrPath?.originalName || fileOrPath?.filename || 'arquivo',
  };
}

async function parseFile(fileOrPath, mimeType) {
  const input = resolveFileInput(fileOrPath, mimeType);
  const ext = path.extname(input.originalName || input.filePath || '').toLowerCase();

  logger.info(`Parseando arquivo: ${input.originalName} (${input.mimeType || 'sem mime'})`);

  let rawText = '';

  if (ext === '.txt' || ext === '.md') {
    rawText = parsePlainText(input);
  } else if (ext === '.pdf' || input.mimeType === 'application/pdf') {
    rawText = await parsePdf(input);
  } else {
    throw new Error(`Tipo de arquivo nao suportado: ${ext}`);
  }

  const cleaned = sanitizeText(rawText);

  if (!cleaned || cleaned.length < 10) {
    throw new Error('Arquivo vazio ou sem texto extraivel.');
  }

  logger.info(`Texto extraido: ${cleaned.length} caracteres`);
  return cleaned;
}

function parsePlainText(input) {
  if (input.buffer) {
    return input.buffer.toString('utf8').replace(/^\uFEFF/, '');
  }

  if (input.filePath) {
    return fs.readFileSync(input.filePath, 'utf8').replace(/^\uFEFF/, '');
  }

  throw new Error('Arquivo de texto sem buffer e sem caminho para leitura.');
}

async function parsePdf(input) {
  const pdfParse = require('pdf-parse');
  const buffer = input.buffer || fs.readFileSync(input.filePath);
  const result = await pdfParse(buffer);
  return result.text;
}

module.exports = { parseFile };
