const { parseFile } = require('../services/fileParser.service');
const { chunkText } = require('../services/chunking.service');
const { generateEmbedding } = require('../services/embedding.service');
const { persistUploadedFile, removeStoredFile } = require('../services/storage.service');
const { saveDocument, saveChunks } = require('../services/vectorStore.service');
const logger = require('../utils/logger');

async function handleUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const { originalname, mimetype, size, buffer } = req.file;
  let storedFile = null;

  logger.info(`Upload recebido: ${originalname} (${size} bytes)`);

  try {
    const text = await parseFile({
      buffer,
      mimeType: mimetype,
      originalName: originalname,
    });

    const rawChunks = chunkText(text);
    if (rawChunks.length === 0) {
      return res.status(422).json({ error: 'Nao foi possivel extrair conteudo util do arquivo.' });
    }

    storedFile = await persistUploadedFile({
      buffer,
      mimeType: mimetype,
      originalName: originalname,
    });

    const document = await saveDocument({
      filename: storedFile.objectKey,
      originalName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
    });

    logger.info(`Gerando embeddings para ${rawChunks.length} chunks...`);

    const chunksWithEmbeddings = [];
    for (let i = 0; i < rawChunks.length; i++) {
      const embedding = await generateEmbedding(rawChunks[i]);
      chunksWithEmbeddings.push({
        chunkIndex: i,
        content: rawChunks[i],
        embedding,
      });
    }

    await saveChunks(document.id, chunksWithEmbeddings);

    logger.info(`Indexacao concluida: ${originalname} -> ${rawChunks.length} chunks`);

    return res.status(201).json({
      success: true,
      document: {
        id: document.id,
        name: originalname,
        chunks: rawChunks.length,
      },
    });
  } catch (err) {
    if (storedFile) {
      try {
        await removeStoredFile(storedFile);
      } catch (cleanupError) {
        logger.error(`Erro ao limpar arquivo persistido apos falha: ${cleanupError.message}`);
      }
    }

    logger.error(`Erro no upload: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Erro interno no processamento do arquivo.' });
  }
}

module.exports = { handleUpload };
