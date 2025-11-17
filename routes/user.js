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

// Get current user
router.get('/', requireAuth, (req, res) => {
  console.log('GET /api/user - Session ID:', req.sessionID);
  console.log('GET /api/user - User ID from session:', req.session.userId);
  const user = findUserById(req.session.userId);
  if (user) {
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

// Get user's transactions
router.get('/transactions', requireAuth, (req, res) => {
  try {
    const allTransactions = loadTransactions();
    const userId = req.session.userId;
    const userTransactions = allTransactions.filter(t => t.userId === userId);
    const recentTransactions = userTransactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
    res.json({
      success: true,
      transactions: recentTransactions
    });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

// Get user's saved cards
router.get('/cards', requireAuth, (req, res) => {
  try {
    const allCards = loadStoredCards();
    const userId = req.session.userId;
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
    res.json({
      success: true,
      cards: userCards
    });
  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({ success: false, message: 'Error fetching cards' });
  }
});

module.exports = router;
