const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),  // captures full stack trace
    winston.format.json()                    // structured JSON logs
  ),
  transports: [
    // All errors go here
    new winston.transports.File({
      filename: path.join(__dirname, 'logs/error.log'),
      level: 'error'
    }),
    // Everything (info, warnings, errors) goes here
    new winston.transports.File({
      filename: path.join(__dirname, 'logs/combined.log')
    }),
  ]
});

module.exports = logger;
