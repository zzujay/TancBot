const logger = require('../utils/logger');
const WeiboScraper = require('./weibo-scraper');
const { v4: uuidv4 } = require('uuid');

class DataCollector {
  constructor() {
    this.scrapers = {
      weibo: new WeiboScraper()
    };
    this.maxResults = 100;
    this.concurrentLimit = 3;
  }

  async initialize() {
    logger.info('数据采集模块初始化中...');
    
    // 验证必要的配置
    if (!process.env.WEIBO_COOKIE) {
      logger.warn('未配置WEIBO_COOKIE，微博数据采集可能受限');
    }
    
    logger.info('数据采集模块初始化完成');
  }

  async collect(keywords, options = {}) {
    const { platforms = ['weibo'], maxResults = this.maxResults, timeRange = '24h' } = options;
    
    const taskId = uuidv4();
    logger.info(`开始数据采集任务 ${taskId}，关键词: ${keywords.join(', ')}`);

    const allResults = [];

    for (const platform of platforms) {
      if (this.scrapers[platform]) {
        logger.info(`开始从 ${platform} 采集数据...`);
        
        try {
          const platformResults = await this.collectFromPlatform(platform, keywords, maxResults, timeRange);
          allResults.push(...platformResults);
          
          logger.info(`从 ${platform} 采集到 ${platformResults.length} 条数据`);
        } catch (error) {
          logger.error(`${platform} 数据采集失败:`, error);
        }
      } else {
        logger.warn(`不支持的平台: ${platform}`);
      }
    }

    // 数据清洗和去重
    const cleanedResults = this.cleanData(allResults);
    
    logger.info(`数据采集任务 ${taskId} 完成，共采集 ${cleanedResults.length} 条有效数据`);
    
    return cleanedResults;
  }

  async collectFromPlatform(platform, keywords, maxResults, timeRange) {
    const scraper = this.scrapers[platform];
    const results = [];
    
    // 为每个关键词采集数据
    for (const keyword of keywords) {
      try {
        const keywordResults = await this.collectKeyword(scraper, keyword, maxResults / keywords.length, timeRange);
        results.push(...keywordResults);
        
        // 添加随机延迟，避免被封
        await this.randomDelay(1000, 3000);
      } catch (error) {
        logger.error(`采集关键词 "${keyword}" 失败:`, error);
      }
    }

    return results;
  }

  async collectKeyword(scraper, keyword, maxResults, timeRange) {
    const results = [];
    let page = 1;
    let hasMore = true;

    while (results.length < maxResults && hasMore) {
      try {
        const pageResults = await scraper.search(keyword, page);
        
        if (pageResults.length === 0) {
          hasMore = false;
          break;
        }

        // 时间过滤
        const filteredResults = this.filterByTime(pageResults, timeRange);
        results.push(...filteredResults);

        page++;
        
        // 添加随机延迟
        await this.randomDelay(1000, 2000);
      } catch (error) {
        logger.error(`采集第 ${page} 页失败:`, error);
        break;
      }
    }

    return results.slice(0, maxResults);
  }

  filterByTime(results, timeRange) {
    const now = new Date();
    let cutoffTime;

    switch (timeRange) {
      case '1h':
        cutoffTime = new Date(now - 60 * 60 * 1000);
        break;
      case '6h':
        cutoffTime = new Date(now - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        return results;
    }

    return results.filter(result => {
      if (!result.publish_time) return true;
      const publishTime = new Date(result.publish_time);
      return publishTime >= cutoffTime;
    });
  }

  cleanData(results) {
    // 去重：基于内容相似度
    const uniqueResults = [];
    const seenContent = new Set();

    for (const result of results) {
      const contentHash = this.simpleHash(result.content);
      
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        
        // 清理数据
        const cleanedResult = {
          ...result,
          content: this.cleanText(result.content),
          author: result.author?.trim() || '未知用户'
        };
        
        uniqueResults.push(cleanedResult);
      }
    }

    return uniqueResults;
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // 合并多余空格
      .replace(/[^\u4e00-\u9fa5\w\s，。！？、；：""''（）【】《》]/g, '') // 移除非中文字符
      .trim();
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // 获取采集统计信息
  getStats() {
    return {
      scrapers: Object.keys(this.scrapers),
      maxResults: this.maxResults,
      concurrentLimit: this.concurrentLimit
    };
  }
}

module.exports = DataCollector;