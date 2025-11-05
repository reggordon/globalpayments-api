const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write payment logs to payments.log
    new winston.transports.File({
      filename: path.join(logsDir, 'payments.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} ${level}: ${message}`;
      })
    )
  }));
}

// Helper functions for structured logging
logger.logPayment = (data) => {
  logger.info('Payment processed', {
    orderId: data.orderId,
    amount: data.amount,
    currency: data.currency,
    resultCode: data.resultCode,
    success: data.success,
    cardLast4: data.cardNumber ? data.cardNumber.slice(-4) : 'N/A',
    timestamp: new Date().toISOString()
  });
};

logger.logRefund = (data) => {
  logger.info('Refund processed', {
    orderId: data.orderId,
    amount: data.amount,
    currency: data.currency,
    resultCode: data.resultCode,
    success: data.success,
    timestamp: new Date().toISOString()
  });
};

logger.logHppRequest = (data) => {
  logger.info('HPP payment initiated', {
    orderId: data.orderId,
    amount: data.amount,
    currency: data.currency,
    timestamp: new Date().toISOString()
  });
};

logger.logHppResponse = (data) => {
  logger.info('HPP payment response', {
    orderId: data.orderId,
    resultCode: data.result,
    valid: data.valid,
    timestamp: new Date().toISOString()
  });
};

logger.logError = (context, error) => {
  logger.error(`Error in ${context}`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
