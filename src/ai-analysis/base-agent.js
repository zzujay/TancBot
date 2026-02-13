const logger = require('../utils/logger');

class BaseAgent {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.version = '1.0.0';
    this.confidence = 0;
    this.lastUsed = null;
  }

  async initialize() {
    logger.info(`初始化Agent: ${this.name}`);
  }

  async process(data, context = {}) {
    throw new Error('子类必须实现process方法');
  }

  setConfidence(confidence) {
    this.confidence = Math.max(0, Math.min(1, confidence));
  }

  getConfidence() {
    return this.confidence;
  }

  updateLastUsed() {
    this.lastUsed = new Date();
  }

  getInfo() {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
      confidence: this.confidence,
      lastUsed: this.lastUsed
    };
  }
}

module.exports = BaseAgent;