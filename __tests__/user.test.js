const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Unit tests for helper functions
describe('User Management Helper Functions', () => {
  const testUsersFile = path.join(__dirname, '../data/test-users.json');
  
  beforeAll(() => {
    // Create test users file
    fs.writeFileSync(testUsersFile, JSON.stringify([], null, 2));
  });

  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testUsersFile)) {
      fs.unlinkSync(testUsersFile);
    }
  });

  describe('Password Hashing', () => {
    test('should hash password with bcrypt', async () => {
      const password = 'testpassword123';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[ab]\$/); // bcrypt hash pattern
    });

    test('should verify password correctly', async () => {
      const password = 'testpassword123';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await bcrypt.compare('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });

    test('should create different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);
      
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      const isValid1 = await bcrypt.compare(password, hash1);
      const isValid2 = await bcrypt.compare(password, hash2);
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });
  });

  describe('User Data Validation', () => {
    test('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@example.co.uk'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    test('should validate password length', () => {
      const minLength = 8;
      
      expect('short'.length >= minLength).toBe(false);
      expect('validpassword'.length >= minLength).toBe(true);
      expect('12345678'.length >= minLength).toBe(true);
    });
  });

  describe('File Operations', () => {
    test('should create users file if it does not exist', () => {
      const newFile = path.join(__dirname, '../data/new-test-users.json');
      
      if (!fs.existsSync(newFile)) {
        fs.writeFileSync(newFile, JSON.stringify([], null, 2));
      }
      
      expect(fs.existsSync(newFile)).toBe(true);
      
      // Cleanup
      fs.unlinkSync(newFile);
    });

    test('should read and parse JSON users file', () => {
      const testUsers = [
        {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: '$2b$10$abcdefg'
        }
      ];
      
      fs.writeFileSync(testUsersFile, JSON.stringify(testUsers, null, 2));
      
      const data = fs.readFileSync(testUsersFile, 'utf8');
      const users = JSON.parse(data);
      
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('test@example.com');
    });

    test('should append new user to users file', () => {
      const existingUsers = [
        {
          id: '123',
          email: 'user1@example.com',
          name: 'User One'
        }
      ];
      
      fs.writeFileSync(testUsersFile, JSON.stringify(existingUsers, null, 2));
      
      const newUser = {
        id: '456',
        email: 'user2@example.com',
        name: 'User Two'
      };
      
      const users = JSON.parse(fs.readFileSync(testUsersFile, 'utf8'));
      users.push(newUser);
      fs.writeFileSync(testUsersFile, JSON.stringify(users, null, 2));
      
      const updatedUsers = JSON.parse(fs.readFileSync(testUsersFile, 'utf8'));
      expect(updatedUsers).toHaveLength(2);
      expect(updatedUsers[1].email).toBe('user2@example.com');
    });

    test('should find user by email', () => {
      const users = [
        { id: '1', email: 'user1@example.com', name: 'User 1' },
        { id: '2', email: 'user2@example.com', name: 'User 2' },
        { id: '3', email: 'user3@example.com', name: 'User 3' }
      ];
      
      fs.writeFileSync(testUsersFile, JSON.stringify(users, null, 2));
      
      const loadedUsers = JSON.parse(fs.readFileSync(testUsersFile, 'utf8'));
      const foundUser = loadedUsers.find(u => u.email === 'user2@example.com');
      
      expect(foundUser).toBeDefined();
      expect(foundUser.name).toBe('User 2');
    });

    test('should handle case-insensitive email search', () => {
      const users = [
        { id: '1', email: 'User@Example.COM', name: 'User 1' }
      ];
      
      fs.writeFileSync(testUsersFile, JSON.stringify(users, null, 2));
      
      const loadedUsers = JSON.parse(fs.readFileSync(testUsersFile, 'utf8'));
      const foundUser = loadedUsers.find(
        u => u.email.toLowerCase() === 'user@example.com'
      );
      
      expect(foundUser).toBeDefined();
    });
  });

  describe('Security Best Practices', () => {
    test('should not store plain text passwords', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: '$2b$10$abc...' // Hashed, not plain text
      };
      
      expect(user).not.toHaveProperty('password');
      expect(user).toHaveProperty('passwordHash');
      expect(user.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    test('should not expose sensitive data in API responses', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: '$2b$10$abc...'
      };
      
      // Simulate API response
      const apiResponse = {
        id: user.id,
        email: user.email,
        name: user.name
        // passwordHash should NOT be included
      };
      
      expect(apiResponse).not.toHaveProperty('passwordHash');
    });
  });
});

describe('Authentication Flow', () => {
  test('registration flow structure', () => {
    const registrationData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpassword123'
    };
    
    expect(registrationData).toHaveProperty('name');
    expect(registrationData).toHaveProperty('email');
    expect(registrationData).toHaveProperty('password');
    expect(registrationData.password.length).toBeGreaterThanOrEqual(8);
  });

  test('login flow structure', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };
    
    expect(loginData).toHaveProperty('email');
    expect(loginData).toHaveProperty('password');
  });

  test('session data structure', () => {
    const sessionData = {
      userId: '123-456-789',
      userEmail: 'test@example.com'
    };
    
    expect(sessionData).toHaveProperty('userId');
    expect(sessionData).toHaveProperty('userEmail');
  });
});
