const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

// 确保日志目录存在
const logDir = path.dirname(process.env.LOG_FILE || './logs/system.log');
fs.ensureDirSync(logDir);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'public-opinion-system' },
  transports: [
    new winston.transports.File({ 
      filename: process.env.LOG_FILE || './logs/system.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;