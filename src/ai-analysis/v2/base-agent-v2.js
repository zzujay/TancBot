/**
 * V2基础Agent类
 * 所有智能体的基类，定义通用接口和行为
 */

const logger = require('../../utils/logger');

class BaseAgentV2 {
  constructor(name, description, role) {
    this.name = name;
    this.description = description;
    this.role = role; // 'coordinator', 'analyzer', 'validator', 'optimizer'
    this.version = '2.0.0';
    this.confidence = 0;
    this.lastUsed = null;
    this.analysisHistory = [];
  }

  async initialize() {
    logger.info(`[V2] 初始化Agent: ${this.name} (${this.role})`);
  }

  /**
   * 处理数据的核心方法，子类必须实现
   * @param {Object} data - 舆情数据
   * @param {Object} context - 分析上下文
   * @returns {Object} 分析结果
   */
  async process(data, context = {}) {
    throw new Error('子类必须实现process方法');
  }

  /**
   * 接收迭代指导方案并调整分析策略
   * @param {Object} guidance - 迭代优化指导
   */
  async adjustStrategy(guidance) {
    logger.info(`[V2] ${this.name} 接收迭代指导:`, guidance);
    // 子类可重写此方法实现具体的策略调整
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

  addToHistory(result) {
    this.analysisHistory.push({
      timestamp: new Date(),
      result: result,
      confidence: this.confidence
    });
  }

  getInfo() {
    return {
      name: this.name,
      description: this.description,
      role: this.role,
      version: this.version,
      confidence: this.confidence,
      lastUsed: this.lastUsed,
      historyCount: this.analysisHistory.length
    };
  }
}

module.exports = BaseAgentV2;
