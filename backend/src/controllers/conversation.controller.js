const {
  createConversation,
  getConversationById,
  listConversationMessages,
} = require('../services/conversation.service');

async function handleCreateConversation(req, res) {
  try {
    const { title } = req.body || {};
    const conversation = await createConversation({ title });
    return res.status(201).json({ conversation });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro ao criar conversa.' });
  }
}

async function handleGetConversation(req, res) {
  try {
    const { id } = req.params;
    const conversation = await getConversationById(id);
    return res.json({ conversation });
  } catch (err) {
    return res.status(404).json({ error: err.message || 'Conversa nao encontrada.' });
  }
}

async function handleListConversationMessages(req, res) {
  try {
    const { id } = req.params;
    const { limit } = req.query || {};
    const messages = await listConversationMessages(id, { limit });
    return res.json({ messages });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro ao listar mensagens da conversa.' });
  }
}

module.exports = {
  handleCreateConversation,
  handleGetConversation,
  handleListConversationMessages,
};

