/**
 * 微博数据采集器 - 简化版
 * 仅支持微博平台，使用Cookie认证，无模拟数据
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class WeiboCollector {
  constructor(options = {}) {
    this.baseUrl = 'https://s.weibo.com';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.maxResults = options.maxResults || 50;
    
    // Cookie配置
    this.cookie = options.cookie || process.env.WEIBO_COOKIE || '';
    this.userAgent = options.userAgent || process.env.USER_AGENT || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // 请求限制
    this.requestDelay = options.requestDelay || 2000;
    this.maxConcurrentRequests = options.maxConcurrentRequests || 2;
    
    // 验证配置
    this.validateConfiguration();
  }

  /**
   * 验证配置
   */
  validateConfiguration() {
    if (!this.cookie) {
      logger.warn('WEIBO_COOKIE 未配置，将使用公开数据源');
    }
    
    if (this.cookie.length < 50) {
      logger.warn('Cookie长度较短，可能无效');
    }
  }

  /**
   * 搜索微博
   */
  async search(keyword, maxResults = this.maxResults) {
    logger.info(`开始搜索微博：关键词="${keyword}"，最大结果=${maxResults}`);
    
    try {
      const results = [];
      let page = 1;
      let hasMore = true;
      
      while (results.length < maxResults && hasMore && page <= 10) {
        logger.debug(`搜索第${page}页`);
        
        const pageResults = await this.searchPage(keyword, page);
        
        if (pageResults.length === 0) {
          hasMore = false;
          break;
        }
        
        results.push(...pageResults);
        
        // 检查是否达到限制
        if (results.length >= maxResults) {
          results.splice(maxResults);
          break;
        }
        
        page++;
        
        // 延迟请求
        if (hasMore) {
          await this.delay(this.requestDelay);
        }
      }
      
      logger.info(`微博搜索完成：找到${results.length}条结果`);
      return results;
      
    } catch (error) {
      logger.error('微博搜索失败:', error.message);
      throw error;
    }
  }

  /**
   * 搜索单页
   */
  async searchPage(keyword, page = 1) {
    const searchUrl = `${this.baseUrl}/weibo`;
    
    try {
      const params = {
        q: keyword,
        page: page,
        typeall: 1,
        suball: 1,
        timescope: 'custom:2024-01-01:2024-12-31',
        Refer: 'g'
      };
      
      const response = await this.makeRequest(searchUrl, params);
      
      if (!response || !response.data) {
        logger.warn('搜索响应为空，尝试备用方案');
        return this.searchWithBackup(keyword, page);
      }
      
      const results = this.parseSearchResults(response.data, keyword);
      
      // 如果没有解析到结果，尝试备用方案
      if (results.length === 0 && page === 1) {
        logger.info('微博搜索结果为空，尝试备用方案');
        return this.searchWithBackup(keyword, page);
      }
      
      return results;
      
    } catch (error) {
      logger.error(`搜索第${page}页失败:`, error.message);
      
      // 如果是认证错误，尝试使用备用方案
      if (error.response && error.response.status === 401) {
        logger.warn('认证失败，尝试备用方案');
        return this.searchWithBackup(keyword, page);
      }
      
      // 其他错误也尝试备用方案
      logger.warn('搜索失败，尝试备用方案');
      return this.searchWithBackup(keyword, page);
    }
  }

  /**
   * 发起HTTP请求
   */
  async makeRequest(url, params = {}) {
    const config = {
      method: 'GET',
      url: url,
      params: params,
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    };

    // 如果有Cookie，添加到请求头
    if (this.cookie) {
      config.headers['Cookie'] = this.cookie;
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      logger.error('HTTP请求失败:', error.message);
      throw error;
    }
  }

  /**
   * 解析搜索结果
   */
  parseSearchResults(html, keyword) {
    try {
      const $ = cheerio.load(html);
      const results = [];
      
      // 查找微博卡片
      $('.card-wrap').each((index, element) => {
        try {
          const card = $(element);
          
          // 跳过广告和推广内容
          if (card.find('.card-act').length === 0) {
            return;
          }
          
          // 提取内容
          const contentElement = card.find('.txt');
          const content = contentElement.text().trim();
          
          if (!content) {
            return;
          }
          
          // 提取作者信息
          const authorElement = card.find('.name');
          const author = authorElement.text().trim() || '未知用户';
          
          // 提取时间
          const timeElement = card.find('.time');
          const timeText = timeElement.text().trim();
          const publishTime = this.parseTime(timeText);
          
          // 提取互动数据
          const actions = card.find('.card-act li');
          let likes = 0, reposts = 0, comments = 0;
          
          if (actions.length >= 3) {
            likes = this.extractNumber($(actions[0]).text());
            reposts = this.extractNumber($(actions[1]).text());
            comments = this.extractNumber($(actions[2]).text());
          }
          
          // 提取来源
          const fromElement = card.find('.from');
          const from = fromElement.text().trim() || '微博';
          
          // 提取链接
          const linkElement = card.find('a[href*="weibo.com"]');
          const url = linkElement.attr('href') || '';
          
          results.push({
            id: `weibo_${Date.now()}_${index}`,
            platform: 'weibo',
            author: author,
            content: content,
            publishTime: publishTime,
            time: timeText,
            likes: likes,
            reposts: reposts,
            comments: comments,
            from: from,
            url: url.startsWith('http') ? url : `https://weibo.com${url}`,
            keyword: keyword,
            collectedAt: new Date().toISOString()
          });
          
        } catch (error) {
          logger.error(`解析第${index}条微博失败:`, error.message);
        }
      });
      
      logger.debug(`解析完成：${results.length}条微博`);
      return results;
      
    } catch (error) {
      logger.error('解析搜索结果失败:', error.message);
      return [];
    }
  }

  /**
   * 备用搜索方案（使用公开API）
   */
  async searchWithBackup(keyword, page) {
    logger.info('使用备用搜索方案');
    
    try {
      // 使用百度新闻作为备用数据源
      const backupUrl = 'https://news.baidu.com/ns';
      const params = {
        word: keyword,
        pn: (page - 1) * 10,
        rn: 10,
        ct: 1,
        tn: 'news'
      };
      
      const response = await this.makeRequest(backupUrl, params);
      
      if (response && response.data) {
        return this.parseBackupResults(response.data, keyword);
      }
      
      return [];
      
    } catch (error) {
      logger.error('备用搜索方案失败:', error.message);
      return [];
    }
  }

  /**
   * 解析备用搜索结果（百度新闻）
   */
  parseBackupResults(html, keyword) {
    try {
      const $ = cheerio.load(html);
      const results = [];
      
      $('.result').each((index, element) => {
        try {
          const result = $(element);
          
          // 提取标题
          const titleElement = result.find('h3 a');
          const title = titleElement.text().trim();
          
          // 提取内容
          const contentElement = result.find('.c-summary');
          const content = contentElement.text().trim();
          
          // 提取来源和时间
          const infoElement = result.find('.c-author');
          const info = infoElement.text().trim();
          
          if (title && content) {
            results.push({
              id: `backup_${Date.now()}_${index}`,
              platform: 'news',
              author: this.extractAuthor(info) || '百度新闻',
              content: `${title}。${content}`,
              publishTime: this.parseBackupTime(info),
              time: info,
              likes: 0,
              reposts: 0,
              comments: 0,
              from: '百度新闻',
              url: titleElement.attr('href') || '',
              keyword: keyword,
              collectedAt: new Date().toISOString(),
              isBackup: true
            });
          }
          
        } catch (error) {
          logger.error(`解析备用结果失败:`, error.message);
        }
      });
      
      return results;
      
    } catch (error) {
      logger.error('解析备用搜索结果失败:', error.message);
      return [];
    }
  }

  /**
   * 提取数字
   */
  extractNumber(text) {
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 解析时间
   */
  parseTime(timeText) {
    if (!timeText) return new Date().toISOString();
    
    try {
      // 处理相对时间（如"2小时前"）
      const relativeMatch = timeText.match(/(\d+)(分钟|小时|天|周|月|年)前/);
      if (relativeMatch) {
        const amount = parseInt(relativeMatch[1]);
        const unit = relativeMatch[2];
        
        const now = new Date();
        switch (unit) {
          case '分钟':
            now.setMinutes(now.getMinutes() - amount);
            break;
          case '小时':
            now.setHours(now.getHours() - amount);
            break;
          case '天':
            now.setDate(now.getDate() - amount);
            break;
          case '周':
            now.setDate(now.getDate() - amount * 7);
            break;
          case '月':
            now.setMonth(now.getMonth() - amount);
            break;
          case '年':
            now.setFullYear(now.getFullYear() - amount);
            break;
        }
        
        return now.toISOString();
      }
      
      // 处理绝对时间
      return new Date(timeText).toISOString();
      
    } catch (error) {
      logger.warn('时间解析失败，使用当前时间:', timeText);
      return new Date().toISOString();
    }
  }

  /**
   * 解析备用时间
   */
  parseBackupTime(info) {
    if (!info) return new Date().toISOString();
    
    try {
      // 提取时间信息（格式：来源 时间）
      const timeMatch = info.match(/(\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{1,2}|\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{1,2}|\d{4}-\d{1,2}-\d{1,2}\s*\d{1,2}:\d{1,2})/);
      if (timeMatch) {
        return new Date(timeMatch[1]).toISOString();
      }
      
      return new Date().toISOString();
      
    } catch (error) {
      logger.warn('备用时间解析失败:', info);
      return new Date().toISOString();
    }
  }

  /**
   * 提取作者
   */
  extractAuthor(info) {
    if (!info) return '未知来源';
    
    try {
      // 提取作者信息（格式：作者 时间）
      const authorMatch = info.match(/^([^\s]+)\s+/);
      return authorMatch ? authorMatch[1].trim() : '未知来源';
    } catch (error) {
      return '未知来源';
    }
  }

  /**
   * 延迟函数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const response = await this.makeRequest(this.baseUrl);
      return response && response.status === 200;
    } catch (error) {
      logger.error('连接测试失败:', error.message);
      return false;
    }
  }

  /**
   * 获取采集器状态
   */
  getStatus() {
    return {
      platform: 'weibo',
      cookieConfigured: !!this.cookie,
      cookieLength: this.cookie.length,
      maxResults: this.maxResults,
      requestDelay: this.requestDelay,
      timeout: this.timeout,
      isHealthy: this.cookie.length > 50
    };
  }
}

module.exports = WeiboCollector;