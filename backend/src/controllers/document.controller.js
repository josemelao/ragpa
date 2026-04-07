const { deleteDocument } = require('../services/vectorStore.service');
const { removeStoredFile } = require('../services/storage.service');
const logger = require('../utils/logger');

async function handleDeleteDocument(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID do documento e obrigatorio.' });
  }

  try {
    const document = await deleteDocument(id);

    if (document.filename) {
      try {
        await removeStoredFile({
          provider: 'supabase',
          objectKey: document.filename,
        });
      } catch (storageError) {
        logger.warn(`Falha ao remover arquivo do storage para ${id}: ${storageError.message}`);
      }
    }

    return res.json({
      success: true,
      document: {
        id: document.id,
        name: document.original_name,
      },
    });
  } catch (err) {
    logger.error(`Erro ao remover documento: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Erro interno ao remover documento.' });
  }
}

module.exports = { handleDeleteDocument };
