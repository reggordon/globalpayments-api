const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  requireAuth,
  findUserById,
  loadTransactions,
  loadStoredCards
} = require('../server');

// Add logger
const logger = require('../logger');

// Log all requests to this router
router.use((req, res, next) => {
  logger.info('User route request', {
    method: req.method,
    path: req.originalUrl,
    sessionID: req.sessionID,
    userId: req.session ? req.session.userId : undefined,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// Get current user
router.get('/', requireAuth, (req, res) => {
  const user = findUserById(req.session.userId);
  if (user) {
    logger.info('User found', { userId: user.id });
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } else {
    logger.warn('User not found', { userId: req.session.userId });
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

// Get user's transactions
router.get('/transactions', requireAuth, (req, res) => {
  try {
    const allTransactions = loadTransactions();
    const userId = req.session.userId;
    logger.info('GET /api/user/transactions', { userId });
    const userTransactions = allTransactions.filter(t => t.userId === userId);
    const recentTransactions = userTransactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
    logger.info('User transactions fetched', { userId, count: recentTransactions.length });
    res.json({
      success: true,
      transactions: recentTransactions
    });
  } catch (error) {
    logger.error('Error fetching user transactions', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

// Get user's saved cards
router.get('/cards', requireAuth, (req, res) => {
  try {
    const allCards = loadStoredCards();
    const userId = req.session.userId;
    logger.info('GET /api/user/cards', { userId });
    const userCards = allCards
      .filter(card => card.userId === userId)
      .map(card => ({
        token: card.token,
        maskedCardNumber: card.maskedCardNumber,
        cardBrand: card.cardBrand,
        cardHolderName: card.cardHolderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        createdAt: card.createdAt,
        lastUsed: card.lastUsed,
        storedInRealvault: card.storedInRealvault
      }));
    logger.info('User cards fetched', { userId, count: userCards.length });
    res.json({
      success: true,
      cards: userCards
    });
  } catch (error) {
    logger.error('Error fetching user cards', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching cards' });
  }
});

module.exports = router;
