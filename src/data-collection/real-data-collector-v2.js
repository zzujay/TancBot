const logger = require('../utils/logger');
const WeiboPlaywrightQRSearcher = require('./weibo-playwright-qr-searcher');
const { v4: uuidv4 } = require('uuid');

class RealDataCollectorV2 {
  constructor() {
    this.weiboSearcher = null;
    this.maxResults = 100;
  }

  async initialize() {
    logger.info('初始化真实数据收集器V2...');
    this.weiboSearcher = new WeiboPlaywrightQRSearcher();
    await this.weiboSearcher.initialize();
    logger.info('真实数据收集器V2初始化完成');
  }

  async collect(keywords, options = {}) {
    const { maxResults = this.maxResults } = options;
    const taskId = uuidv4();
    
    logger.info(`开始数据采集任务 ${taskId}，关键词: ${keywords.join(', ')}`);
    
    const allResults = [];
    
    for (const keyword of keywords) {
      try {
        logger.info(`开始从微博采集关键词: ${keyword}`);
        const results = await this.weiboSearcher.search(keyword, { maxResults });
        allResults.push(...results);
        logger.info(`从微博采集到 ${results.length} 条数据`);
      } catch (error) {
        logger.error(`微博数据采集失败: ${error.message}`);
      }
    }
    
    // 去重
    const uniqueResults = this.deduplicateResults(allResults);
    
    logger.info(`数据采集完成，共采集 ${uniqueResults.length} 条去重后的数据`);
    
    return {
      taskId,
      totalResults: uniqueResults.length,
      results: uniqueResults,
      timestamp: new Date()
    };
  }

  // 兼容旧接口
  async collectData(keywords, platforms = ['weibo'], maxResults = 100) {
    // 确保已初始化
    if (!this.weiboSearcher) {
      await this.initialize();
    }
    
    // 检查登录状态，如果未登录则执行登录流程
    if (!this.weiboSearcher.isLoggedIn) {
      logger.info('检测到未登录，开始微博登录流程...');
      const loginResult = await this.weiboSearcher.login();
      if (!loginResult.success) {
        logger.error('微博登录失败，无法采集数据');
        return [];
      }
    }
    
    const taskId = uuidv4();
    
    logger.info(`开始数据采集任务 ${taskId}，关键词: ${keywords.join(', ')}`);
    
    const allResults = [];
    
    for (const keyword of keywords) {
      try {
        logger.info(`开始从微博采集关键词: ${keyword}`);
        const results = await this.weiboSearcher.search(keyword, { maxResults });
        allResults.push(...results);
        logger.info(`从微博采集到 ${results.length} 条数据`);
      } catch (error) {
        logger.error(`微博数据采集失败: ${error.message}`);
      }
    }
    
    // 去重
    const uniqueResults = this.deduplicateResults(allResults);
    
    logger.info(`数据采集完成，共采集 ${uniqueResults.length} 条去重后的数据`);
    
    return uniqueResults;
  }

  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.id || result.url || result.content?.substring(0, 50);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async close() {
    if (this.weiboSearcher) {
      await this.weiboSearcher.close();
    }
  }
}

module.exports = RealDataCollectorV2;
