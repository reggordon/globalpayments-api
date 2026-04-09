const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Simple basic auth middleware (optional, can be improved)
const basicAuth = (req, res, next) => {
  const auth = { login: process.env.LOG_VIEW_USER || 'admin', password: process.env.LOG_VIEW_PASS || 'admin' };
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Logs"');
  res.status(401).send('Authentication required.');
};

// Serve log file content
router.get('/', basicAuth, (req, res) => {
  const logFile = req.query.file || 'combined.log';
  const logPath = path.join(__dirname, '../logs', logFile);
  if (!fs.existsSync(logPath)) {
    return res.status(404).send('Log file not found.');
  }
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading log file.');
    res.type('text/plain').send(data);
  });
});

module.exports = router;
