const fs = require('fs');
const path = require('path');
const TRANSACTIONS_FILE = path.join(__dirname, '../data', 'transactions.json');
const HPP_TRANSACTIONS_FILE = path.join(__dirname, '../data', 'hpp-transactions.json');

function loadTransactions() {
  try {
    const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
}

function saveTransaction(transaction) {
  try {
    const transactions = loadTransactions();
    transactions.unshift(transaction);
    if (transactions.length > 1000) {
      transactions.splice(1000);
    }
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    console.log('Transaction saved:', transaction.orderId);
  } catch (error) {
    console.error('Error saving transaction:', error);
  }
}

function loadHppTransactions() {
  try {
    const data = fs.readFileSync(HPP_TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading HPP transactions:', error);
    return [];
  }
}

function saveHppTransaction(transaction) {
  try {
    const transactions = loadHppTransactions();
    transactions.unshift(transaction);
    if (transactions.length > 1000) {
      transactions.splice(1000);
    }
    fs.writeFileSync(HPP_TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    console.log('HPP Transaction saved:', transaction.orderId);
  } catch (error) {
    console.error('Error saving HPP transaction:', error);
  }
}

module.exports = {
  loadTransactions,
  saveTransaction,
  loadHppTransactions,
  saveHppTransaction
};
