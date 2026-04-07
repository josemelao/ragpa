const express = require('express');
const { handleAsk } = require('../controllers/ask.controller');

const router = express.Router();

// POST /api/ask
router.post('/', handleAsk);

module.exports = router;
