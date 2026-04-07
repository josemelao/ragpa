/**
 * Limpa e normaliza texto extraído de arquivos.
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Normaliza quebras de linha
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove caracteres de controle (exceto \n e \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Colapsa múltiplos espaços em branco (mas não quebras de linha)
    .replace(/[ \t]+/g, ' ')
    // Colapsa mais de 3 quebras de linha consecutivas em 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove espaços no início/fim de cada linha
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

module.exports = { sanitizeText };
