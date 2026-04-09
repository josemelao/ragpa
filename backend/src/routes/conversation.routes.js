const express = require('express');
const {
  handleCreateConversation,
  handleGetConversation,
  handleListConversationMessages,
} = require('../controllers/conversation.controller');

const router = express.Router();

router.post('/', handleCreateConversation);
router.get('/:id', handleGetConversation);
router.get('/:id/messages', handleListConversationMessages);

module.exports = router;

