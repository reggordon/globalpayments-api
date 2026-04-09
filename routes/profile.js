const express = require('express');
const router = express.Router();
const logger = require('../logger');

// Log all requests to this router
router.use((req, res, next) => {
	logger.info('Profile route request', {
		method: req.method,
		path: req.originalUrl,
		sessionID: req.sessionID,
		userId: req.session ? req.session.userId : undefined,
		body: req.method !== 'GET' ? req.body : undefined
	});
	next();
});

// ...existing code for /profile and related profile routes will go here...
module.exports = router;
