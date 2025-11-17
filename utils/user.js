const fs = require('fs');
const path = require('path');
const USERS_FILE = path.join(__dirname, '../data', 'users.json');

function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

function saveUser(user) {
  try {
    const users = loadUsers();
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('User saved:', user.email);
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

function updateUser(userId, updates) {
  try {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      console.log('User updated:', userId);
      return users[userIndex];
    }
    return null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

function findUserByEmail(email) {
  const users = loadUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

function findUserById(userId) {
  const users = loadUsers();
  return users.find(user => user.id === userId);
}

module.exports = {
  loadUsers,
  saveUser,
  updateUser,
  findUserByEmail,
  findUserById
};
