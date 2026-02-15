/**
 * 微博高级搜索收集器
 * 使用登录后的Cookie进行真实微博搜索
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const fs = require('fs-extra');
const path = require('path');

class WeiboAdvancedSearcher {
  constructor() {
    this.baseUrl = 'https://weibo.com';
    this.searchUrl = 'https://s.weibo.com';
    this.mUrl = 'https://m.weibo.cn'; // 移动端接口，限制更少
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://weibo.com/',
      'Origin': 'https://weibo.com'
    };
    this.timeout = 15000;
    this.maxRetries = 3;
    this.requestDelay = 2000; // 请求间隔
    this.hasValidCookie = false;
    this.cookieCheckUrl = 'https://weibo.com'; // 简化的Cookie验证URL
    
    this.loadCookies();
  }

  /**
   * 从文件加载Cookie
   */
  loadCookies() {
    try {
      const cookiePath = path.join(process.cwd(), 'weibo-cookies.json');
      if (fs.existsSync(cookiePath)) {
        const cookieData = fs.readJsonSync(cookiePath);
        if (cookieData.string) {
          this.headers.Cookie = cookieData.string;
          logger.info('成功加载微博Cookie');
          this.hasValidCookie = true;
        } else {
          logger.warn('微博Cookie文件格式无效');
          this.hasValidCookie = false;
        }
      } else {
        logger.info('未找到微博Cookie文件');
        this.hasValidCookie = false;
      }
    } catch (error) {
      logger.error('加载微博Cookie失败:', error.message);
      this.hasValidCookie = false;
    }
  }

  /**
   * 验证Cookie是否有效（简化版）
   */
  async validateCookie() {
    if (!this.hasValidCookie) {
      logger.warn('没有可用的Cookie进行验证');
      return false;
    }

    try {
      logger.info('正在验证微博Cookie有效性...');
      
      // 尝试访问微博主页，如果Cookie有效，应该能正常访问
      const response = await axios.get('https://weibo.com', {
        headers: this.headers,
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status < 500; // 接受所有非服务器错误状态
        }
      });

      logger.info(`Cookie验证HTTP状态码: ${response.status}`);

      // 检查是否被重定向到登录页面
      if (response.status === 302 || response.status === 301) {
        const location = response.headers.location;
        if (location) {
          logger.info(`被重定向到: ${location}`);
          if (location.includes('login') || location.includes('passport') || location.includes('signin')) {
            logger.warn('Cookie验证失败：被重定向到登录页面');
            this.hasValidCookie = false;
            return false;
          }
        }
      }

      // 检查响应内容
      if (response.status === 200) {
        const content = response.data || '';
        
        // 检查是否包含登录相关的关键词
        const loginKeywords = ['登录', 'login', 'passport', 'signin', '请登录', '账号密码'];
        const hasLoginContent = loginKeywords.some(keyword => 
          content.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasLoginContent && content.length < 10000) {
          // 如果内容很短且包含登录关键词，很可能是登录页面
          logger.warn('Cookie验证失败：内容疑似登录页面');
          this.hasValidCookie = false;
          return false;
        }
        
        // 检查是否包含用户相关的信息
        const userKeywords = ['我的微博', '首页', '发布', '关注', '粉丝'];
        const hasUserContent = userKeywords.some(keyword => 
          content.includes(keyword)
        );
        
        if (hasUserContent) {
          logger.info('Cookie验证成功：检测到用户相关内容');
          return true;
        }
        
        // 如果没有明显的登录提示，且能正常访问，认为Cookie有效
        logger.info('Cookie验证成功：可以正常访问微博');
        return true;
      }
      
      // 其他状态码，根据具体情况判断
      logger.info(`Cookie验证结果：状态码 ${response.status}，认为Cookie有效`);
      return true;
      
    } catch (error) {
      logger.error('Cookie验证请求失败:', error.message);
      
      // 特定错误类型表示Cookie可能失效
      if (error.response && error.response.status === 403) {
        logger.warn('Cookie验证失败：403 Forbidden');
        this.hasValidCookie = false;
        return false;
      }
      
      if (error.response && error.response.status === 401) {
        logger.warn('Cookie验证失败：401 Unauthorized');
        this.hasValidCookie = false;
        return false;
      }
      
      // 网络超时等错误，暂时认为Cookie仍然有效，避免频繁重登录
      logger.warn(`Cookie验证请求异常：${error.message}，保持当前Cookie状态`);
      return this.hasValidCookie;
    }
  }

  /**
   * 搜索微博 - 增强版多策略搜索（带Cookie验证和自动重登录）
   */
  async search(keyword, options = {}) {
    if (!keyword) {
      logger.error('搜索关键词不能为空');
      return [];
    }

    const { maxResults = 20, timeRange = 'week', autoRelogin = true, justLoggedIn = false } = options;
    
    logger.info(`开始搜索微博: ${keyword}`);
    
    try {
      // 首先验证当前Cookie是否有效（如果刚刚登录过，跳过验证）
      if (this.hasValidCookie && !justLoggedIn) {
        logger.info('正在验证Cookie有效性...');
        const isCookieValid = await this.validateCookie();
        if (!isCookieValid) {
          logger.warn('Cookie验证失败，需要重新登录');
          this.hasValidCookie = false;
          
          if (autoRelogin) {
            logger.info('尝试自动重新登录...');
            const reloginSuccess = await this.attemptAutoRelogin();
            if (!reloginSuccess) {
              logger.error('自动重新登录失败');
              if (options.requireLogin) {
                throw new Error('Cookie失效且自动重登录失败，请手动重新登录');
              }
            } else {
              // 重新登录成功，标记为刚刚登录
              options.justLoggedIn = true;
            }
          }
        } else {
          logger.info('Cookie验证成功');
        }
      } else if (justLoggedIn) {
        logger.info('刚刚完成登录，跳过Cookie验证');
      }
      
      // 策略1: 尝试使用Cookie进行主搜索
      if (this.hasValidCookie) {
        logger.info('尝试使用Cookie进行主搜索');
        const mainResults = await this.searchWithCookie(keyword, options);
        if (mainResults.length > 0) {
          logger.info(`主搜索成功，获得 ${mainResults.length} 条结果`);
          return mainResults.slice(0, maxResults);
        } else {
          logger.warn('主搜索未获得结果，可能Cookie权限不足');
        }
      }
      
      // 策略2: 尝试移动端API（限制更少）
      logger.info('尝试移动端API搜索');
      const mobileResults = await this.searchMobileAPI(keyword, options);
      if (mobileResults.length > 0) {
        logger.info(`移动端API搜索成功，获得 ${mobileResults.length} 条结果`);
        return mobileResults.slice(0, maxResults);
      }
      
      // 策略3: 使用基础接口
      logger.info('尝试基础搜索接口');
      const basicResults = await this.searchBasicInterface(keyword, options);
      if (basicResults.length > 0) {
        logger.info(`基础接口搜索成功，获得 ${basicResults.length} 条结果`);
        return basicResults.slice(0, maxResults);
      }
      
      // 策略4: 所有方法都失败，抛出错误
      logger.error('所有搜索策略均失败，无法获取真实数据');
      throw new Error(`微博搜索失败: 所有搜索方法均失败，无法获取关于"${keyword}"的真实数据`);
      
    } catch (error) {
      logger.error(`搜索过程失败: ${error.message}`);
      throw new Error(`微博搜索失败: ${error.message}`);
    }
  }

  /**
   * 使用Cookie进行主搜索
   */
  async searchWithCookie(keyword, options) {
    const { maxResults = 20, timeRange = 'week' } = options;
    
    try {
      // 构建搜索URL
      const timeParam = this.getTimeRangeParam(timeRange);
      const searchUrl = `${this.searchUrl}/weibo?q=${encodeURIComponent(keyword)}${timeParam ? `&timescope=${timeParam}` : ''}&page=1`;
      
      logger.info(`主搜索URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: this.headers,
        timeout: this.timeout,
        maxRedirects: 5
      });

      if (response.status === 200) {
        const results = this.parseSearchResults(response.data, keyword);
        return results;
      } else {
        logger.error(`主搜索失败，状态码: ${response.status}`);
        return [];
      }

    } catch (error) {
      logger.error(`主搜索请求失败: ${error.message}`);
      
      // 如果是因为Cookie失效，标记为无效
      if (error.response && error.response.status === 403) {
        logger.warn('Cookie可能已失效');
        this.hasValidCookie = false;
      }
      
      return [];
    }
  }

  /**
   * 解析搜索结果
   */
  parseSearchResults(html, keyword) {
    const $ = cheerio.load(html);
    const results = [];

    // 微博搜索结果页面的内容选择器
    const postSelectors = [
      '.card-wrap[data-key]',
      '.card[data-key]',
      '.weibo-item',
      '.status-item',
      '[action-type="feed_list_item"]'
    ];

    let foundSelector = null;
    let posts = [];

    // 尝试不同的选择器
    for (const selector of postSelectors) {
      posts = $(selector);
      if (posts.length > 0) {
        foundSelector = selector;
        logger.info(`找到 ${posts.length} 个微博内容，使用选择器: ${selector}`);
        break;
      }
    }

    if (posts.length === 0) {
      logger.warn('未找到微博内容，尝试通用解析');
      // 通用解析策略
      posts = $('div').filter((i, el) => {
        const text = $(el).text();
        return text.includes(keyword) && $(el).find('a[href*="/u/"]').length > 0;
      });
    }

    posts.each((index, element) => {
      try {
        const $element = $(element);
        
        // 提取微博内容
        let content = '';
        const contentSelectors = [
          '.txt',
          '.weibo-text',
          '.status-text',
          '.content',
          'p',
          '.comment_txt'
        ];

        for (const selector of contentSelectors) {
          const contentEl = $element.find(selector).first();
          if (contentEl.length > 0) {
            content = contentEl.text().trim();
            break;
          }
        }

        if (!content) {
          content = $element.text().trim();
        }

        // 提取用户信息
        let author = '';
        let authorLink = '';
        const authorSelectors = [
          'a[href*="/u/"]',
          '.user-name',
          '.name',
          '.nickname'
        ];

        for (const selector of authorSelectors) {
          const authorEl = $element.find(selector).first();
          if (authorEl.length > 0) {
            author = authorEl.text().trim();
            authorLink = authorEl.attr('href') || '';
            break;
          }
        }

        // 提取时间信息
        let publishTime = '';
        const timeSelectors = [
          '.time',
          '.date',
          '.publish-time',
          'span[title*="20"]',
          '[data-time]'
        ];

        for (const selector of timeSelectors) {
          const timeEl = $element.find(selector).first();
          if (timeEl.length > 0) {
            if (timeEl.attr('data-time')) {
              publishTime = new Date(parseInt(timeEl.attr('data-time')) * 1000).toISOString();
            } else {
              publishTime = timeEl.attr('title') || timeEl.text().trim();
            }
            break;
          }
        }

        // 提取互动数据
        const likes = this.extractInteractionData($element, ['.like', '.favor', '[action-type="like"]']);
        const comments = this.extractInteractionData($element, ['.comment', '[action-type="comment"]']);
        const shares = this.extractInteractionData($element, ['.share', '.forward', '[action-type="share"]']);

        // 提取微博ID
        let weiboId = '';
        const idSelectors = ['data-key', 'data-mid', 'data-id'];
        for (const attr of idSelectors) {
          const id = $element.attr(attr);
          if (id) {
            weiboId = id;
            break;
          }
        }

        if (content && content.length > 10) { // 过滤掉太短的内容
          results.push({
            platform: 'weibo',
            id: weiboId || `weibo_${Date.now()}_${index}`,
            content: content,
            author: author || '未知用户',
            author_link: authorLink,
            publish_time: this.parseTime(publishTime),
            url: `https://weibo.com${authorLink}`,
            likes: likes,
            comments: comments,
            shares: shares,
            keyword: keyword,
            source: 'weibo_search',
            collection_time: new Date().toISOString()
          });
        }

      } catch (error) {
        logger.error(`解析第 ${index} 条微博失败:`, error.message);
      }
    });

    return results;
  }

  /**
   * 提取互动数据
   */
  extractInteractionData($element, selectors) {
    for (const selector of selectors) {
      const element = $element.find(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
    }
    return 0;
  }

  /**
   * 解析时间
   */
  parseTime(timeText) {
    if (!timeText) return new Date().toISOString();
    
    try {
      // 如果是时间戳
      if (typeof timeText === 'number') {
        return new Date(timeText).toISOString();
      }
      
      // 如果是标准时间格式
      if (timeText.includes('20') && timeText.includes(':')) {
        return new Date(timeText).toISOString();
      }
      
      // 处理相对时间
      if (timeText.includes('分钟前')) {
        const minutes = parseInt(timeText.match(/(\d+)分钟前/)[1]);
        return new Date(Date.now() - minutes * 60000).toISOString();
      }
      
      if (timeText.includes('小时前')) {
        const hours = parseInt(timeText.match(/(\d+)小时前/)[1]);
        return new Date(Date.now() - hours * 3600000).toISOString();
      }
      
      if (timeText.includes('天前')) {
        const days = parseInt(timeText.match(/(\d+)天前/)[1]);
        return new Date(Date.now() - days * 86400000).toISOString();
      }
      
    } catch (error) {
      logger.warn(`时间解析失败: ${timeText}, 使用当前时间`);
    }
    
    return new Date().toISOString();
  }

  /**
   * 获取时间范围参数
   */
  getTimeRangeParam(timeRange) {
    const now = new Date();
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    switch (timeRange) {
      case 'day':
        return `${formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000))}:${formatDate(now)}`;
      case 'week':
        return `${formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))}:${formatDate(now)}`;
      case 'month':
        return `${formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))}:${formatDate(now)}`;
      default:
        return '';
    }
  }

  /**
   * 备用搜索方案 - 当主搜索失败时使用
   */
  async fallbackSearch(keyword, options) {
    logger.info('使用备用搜索方案');
    
    try {
      // 尝试移动端API
      const mobileResults = await this.searchMobileAPI(keyword, options);
      if (mobileResults.length > 0) {
        return mobileResults;
      }
      
      // 尝试基础接口
      const basicResults = await this.searchBasicInterface(keyword, options);
      if (basicResults.length > 0) {
        return basicResults;
      }
      
      // 所有方法都失败，返回空数组
      logger.error('所有搜索方法均失败，无法获取数据');
      return [];
      
    } catch (error) {
      logger.error(`备用搜索失败: ${error.message}`);
      throw new Error(`微博搜索失败: ${error.message}`);
    }
  }

  /**
   * 移动端API搜索
   */
  async searchMobileAPI(keyword, options) {
    const { maxResults = 20 } = options;
    
    try {
      // 移动端搜索API
      const searchUrl = `${this.mUrl}/api/container/getIndex`;
      const params = {
        containerid: `100103type=1&q=${encodeURIComponent(keyword)}`,
        page_type: 'searchall',
        page: 1
      };
      
      const response = await axios.get(searchUrl, {
        params: params,
        headers: {
          ...this.headers,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          'Referer': `${this.mUrl}/search?keyword=${encodeURIComponent(keyword)}`
        },
        timeout: this.timeout
      });
      
      if (response.data && response.data.data && response.data.data.cards) {
        const cards = response.data.data.cards;
        const results = [];
        
        for (const card of cards) {
          if (card.mblog) {
            const mblog = card.mblog;
            
            results.push({
              platform: 'weibo',
              id: mblog.id,
              content: this.cleanWeiboText(mblog.text),
              author: mblog.user ? mblog.user.screen_name : '未知用户',
              author_link: mblog.user ? `/u/${mblog.user.id}` : '',
              publish_time: new Date(mblog.created_at).toISOString(),
              url: `${this.baseUrl}/${mblog.user ? mblog.user.id : 'unknown'}/${mblog.id}`,
              likes: mblog.attitudes_count || 0,
              comments: mblog.comments_count || 0,
              shares: mblog.reposts_count || 0,
              keyword: keyword,
              source: 'mobile_api',
              collection_time: new Date().toISOString(),
              raw_data: mblog
            });
          }
        }
        
        logger.info(`移动端API搜索完成，获得 ${results.length} 条结果`);
        return results.slice(0, maxResults);
      }
      
      return [];
      
    } catch (error) {
      logger.error(`移动端API搜索失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 清理微博文本
   */
  cleanWeiboText(text) {
    if (!text) return '';
    
    // 移除HTML标签
    let cleanText = text.replace(/<[^>]*>/g, '');
    
    // 解码HTML实体
    cleanText = cleanText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    return cleanText.trim();
  }

  /**
   * 尝试自动重新登录（带重试机制）
   */
  async attemptAutoRelogin(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`正在执行自动重新登录... (尝试 ${attempt}/${maxRetries})`);
        
        // 调用微博登录模块
        const WeiboPlaywrightQRLogin = require('../../playwright-weibo-qr-login');
        const login = new WeiboPlaywrightQRLogin({ 
          headless: true,
          timeout: 60000 // 增加超时时间到60秒
        });
        
        logger.info('请扫描弹出的二维码进行登录...');
        logger.info('💡 提示：如果二维码无法扫描，请检查网络连接');
        logger.info('⏰ 您有3分钟时间完成扫码和确认登录');
        
        const result = await login.start();
        
        if (result.success) {
          logger.info('自动重新登录成功');
          
          // 等待一段时间确保Cookie文件被正确写入
          logger.info('等待3秒确保Cookie文件写入完成...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 重新加载Cookie
          this.loadCookies();
          
          // 验证新Cookie是否有效
          const isValid = await this.validateCookie();
          if (isValid) {
            logger.info('新Cookie验证成功');
            return true;
          } else {
            logger.warn('新Cookie验证失败');
            if (attempt < maxRetries) {
              logger.info(`等待5秒后重试登录...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
              continue;
            }
            return false;
          }
        } else {
          logger.error(`自动重新登录失败 (尝试 ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            logger.info(`等待5秒后重试登录...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          return false;
        }
        
      } catch (error) {
        logger.error(`自动重新登录过程失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          logger.info(`等待5秒后重试登录...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        return false;
      }
    }
    
    logger.error(`自动重新登录最终失败，已尝试 ${maxRetries} 次`);
    return false;
  }

  /**
   * 基础搜索接口
   */
  async searchBasicInterface(keyword, options) {
    // 使用weibo.cn作为兜底方案
    const WeiboScraper = require('./weibo-scraper');
    const scraper = new WeiboScraper();
    
    const { page = 1 } = options;
    return await scraper.search(keyword, page);
  }

  // 模拟搜索功能已移除 - 系统要求使用真实数据

  /**
   * 获取用户详细信息
   */
  async getUserInfo(userId) {
    try {
      const profileUrl = `${this.baseUrl}/u/${userId}`;
      const response = await axios.get(profileUrl, {
        headers: this.headers,
        timeout: this.timeout
      });

      return this.parseUserProfile(response.data);
    } catch (error) {
      logger.error(`获取用户信息失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 解析用户资料
   */
  parseUserProfile(html) {
    const $ = cheerio.load(html);
    
    return {
      username: $('.username').text().trim() || $('.user-name').text().trim(),
      followers: this.extractNumber($('.followers-count').text()),
      following: this.extractNumber($('.following-count').text()),
      posts: this.extractNumber($('.posts-count').text()),
      bio: $('.user-bio').text().trim(),
      verified: $('.verified-icon').length > 0
    };
  }

  extractNumber(text) {
    if (!text) return 0;
    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? parseInt(match[1]) : 0;
  }
}

module.exports = WeiboAdvancedSearcher;