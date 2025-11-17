const crypto = require('crypto');

function generateSha1Hash(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

module.exports = { generateSha1Hash };
