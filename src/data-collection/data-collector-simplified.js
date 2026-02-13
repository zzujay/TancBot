/**
 * 简化版数据采集器
 * 仅支持微博平台，使用Cookie认证，无模拟数据
 */

const WeiboCollector = require('./weibo-collector-simplified');
const logger = require('../utils/logger');

class DataCollectorSimplified {
  constructor(options = {}) {
    this.weiboCollector = new WeiboCollector(options);
    this.maxResults = options.maxResults || 50;
    this.delayBetweenRequests = options.delayBetweenRequests || 2000;
  }

  /**
   * 初始化数据收集器
   */
  async initialize() {
    logger.info('正在初始化简化版数据收集器...');
    
    try {
      // 测试微博收集器连接
      const connectionTest = await this.testConnection();
      if (!connectionTest) {
        logger.warn('微博收集器连接测试失败，但仍将继续运行');
      }
      
      logger.info('简化版数据收集器初始化完成');
      return true;
    } catch (error) {
      logger.error('数据收集器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 采集数据（仅微博平台）
   */
  async collectData(keywords, options = {}) {
    logger.info(`开始数据采集：关键词=${keywords}，平台=微博`);
    
    const maxResults = options.maxResults || this.maxResults;
    const allResults = [];
    
    // 确保关键词是数组
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
    
    for (const keyword of keywordArray) {
      logger.info(`正在采集关键词：${keyword}`);
      
      try {
        const results = await this.weiboCollector.search(keyword, maxResults);
        
        if (results.length > 0) {
          logger.info(`关键词"${keyword}"采集完成：${results.length}条数据`);
          allResults.push(...results);
        } else {
          logger.warn(`关键词"${keyword}"未采集到数据`);
        }
        
        // 关键词间延迟
        if (keyword !== keywordArray[keywordArray.length - 1]) {
          await this.delay(this.delayBetweenRequests);
        }
        
      } catch (error) {
        logger.error(`关键词"${keyword}"采集失败：`, error.message);
        // 继续下一个关键词，不中断整体流程
      }
    }
    
    logger.info(`数据采集完成：总数据量=${allResults.length}条`);
    return allResults;
  }

  /**
   * 批量采集（仅微博平台）
   */
  async batchCollect(keywords, batchSize = 10) {
    logger.info(`开始批量数据采集：关键词数量=${keywords.length}`);
    
    const allResults = [];
    const batches = this.createBatches(keywords, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`处理第${i + 1}批：${batch.length}个关键词`);
      
      const batchResults = await this.collectData(batch);
      allResults.push(...batchResults);
      
      // 批次间延迟
      if (i < batches.length - 1) {
        await this.delay(this.delayBetweenRequests * 2);
      }
    }
    
    logger.info(`批量数据采集完成：总数据量=${allResults.length}条`);
    return allResults;
  }

  /**
   * 创建批次
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 延迟函数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取采集器状态
   */
  getStatus() {
    const weiboStatus = this.weiboCollector.getStatus();
    
    return {
      platform: 'weibo_only',
      weibo: weiboStatus,
      isHealthy: weiboStatus.isHealthy,
      maxResults: this.maxResults,
      delayBetweenRequests: this.delayBetweenRequests
    };
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      return await this.weiboCollector.testConnection();
    } catch (error) {
      logger.error('连接测试失败:', error.message);
      return false;
    }
  }
}

module.exports = DataCollectorSimplified;