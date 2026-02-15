const { chromium } = require('playwright');
const logger = require('../utils/logger');
const path = require('path');

/**
 * 微博Playwright搜索器
 * 完全基于Playwright，无需Cookie验证
 */
class WeiboPlaywrightSearcher {
  constructor() {
    this.baseUrl = 'https://weibo.com';
    this.searchUrl = 'https://s.weibo.com';
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.timeout = 30000;
  }

  /**
   * 初始化浏览器
   */
  async initialize() {
    if (this.browser) {
      logger.info('浏览器已初始化，无需重复初始化');
      return;
    }

    try {
      logger.info('正在初始化Playwright浏览器...');
      
      this.browser = await chromium.launch({
        headless: false, // 显示浏览器以便扫码
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai'
      });

      this.page = await this.context.newPage();
      
      // 设置超时
      this.page.setDefaultTimeout(this.timeout);
      this.page.setDefaultNavigationTimeout(this.timeout);

      logger.info('Playwright浏览器初始化成功');
      
    } catch (error) {
      logger.error('初始化Playwright浏览器失败:', error.message);
      throw error;
    }
  }

  /**
   * 登录微博（使用二维码）
   */
  async login() {
    if (this.isLoggedIn) {
      logger.info('已经登录，无需重复登录');
      return true;
    }

    try {
      logger.info('正在打开微博登录页面...');
      await this.page.goto('https://weibo.com/login.php', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      logger.info('等待二维码出现...');
      
      // 等待二维码出现
      await this.page.waitForSelector('img[action-type="qrcode"]', { 
        timeout: 10000 
      }).catch(() => {
        logger.warn('未找到二维码，尝试点击二维码登录按钮');
      });

      // 如果二维码未自动显示，点击二维码登录按钮
      try {
        await this.page.click('a[action-type="qrcode"]');
        logger.info('已点击二维码登录按钮');
      } catch (e) {
        logger.info('二维码登录按钮可能已自动显示');
      }

      // 等待二维码加载
      await this.page.waitForSelector('img[action-type="qrcode"]', { 
        timeout: 15000 
      });

      logger.info('✅ 二维码已显示，请使用手机微博扫码登录');
      logger.info('⏰ 您有90秒时间完成扫码和确认登录');
      
      // 等待登录成功（检测URL变化或特定元素）
      let loginSuccess = false;
      const startTime = Date.now();
      const maxWaitTime = 90000; // 90秒

      while (Date.now() - startTime < maxWaitTime) {
        try {
          // 检查是否已登录（检测首页元素）
          await this.page.waitForSelector('[data-key="home"] .nav-item', { 
            timeout: 5000 
          });
          
          loginSuccess = true;
          break;
        } catch (e) {
          // 继续等待
          await this.page.waitForTimeout(2000);
        }

        // 检查是否跳转到首页
        const currentUrl = this.page.url();
        if (currentUrl === 'https://weibo.com/' || currentUrl.includes('weibo.com/u/')) {
          logger.info('检测到已跳转到首页，登录成功');
          loginSuccess = true;
          break;
        }
      }

      if (loginSuccess) {
        logger.info('✅ 微博登录成功！');
        this.isLoggedIn = true;
        
        // 等待页面完全加载
        await this.page.waitForLoadState('networkidle', { timeout: 10000 });
        
        return true;
      } else {
        logger.error('❌ 登录超时，未检测到登录成功');
        return false;
      }

    } catch (error) {
      logger.error('微博登录过程失败:', error.message);
      return false;
    }
  }

  /**
   * 搜索微博
   */
  async search(keyword, options = {}) {
    const { maxResults = 20, timeRange = 'week' } = options;
    
    if (!keyword) {
      logger.error('搜索关键词不能为空');
      return [];
    }

    try {
      logger.info(`开始搜索微博: ${keyword}`);
      
      // 确保已登录
      if (!this.isLoggedIn) {
        logger.info('未登录，正在执行登录...');
        const loginSuccess = await this.login();
        if (!loginSuccess) {
          throw new Error('微博登录失败，无法继续搜索');
        }
      }

      // 构建搜索URL
      const timeParam = this.getTimeRangeParam(timeRange);
      const searchUrl = `${this.searchUrl}/weibo?q=${encodeURIComponent(keyword)}${timeParam ? `&timescope=${timeParam}` : ''}&page=1`;
      
      logger.info(`搜索URL: ${searchUrl}`);
      
      // 导航到搜索页面
      await this.page.goto(searchUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // 等待搜索结果加载
      await this.page.waitForSelector('.card-wrap', { 
        timeout: 10000 
      }).catch(() => {
        logger.warn('未找到搜索结果卡片，可能是搜索无结果或页面加载问题');
      });

      // 等待一段时间确保动态内容加载
      await this.page.waitForTimeout(3000);

      // 提取搜索结果
      const results = await this.extractSearchResults(keyword);
      
      logger.info(`搜索完成，获得 ${results.length} 条结果`);
      return results.slice(0, maxResults);

    } catch (error) {
      logger.error(`微博搜索失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 提取搜索结果
   */
  async extractSearchResults(keyword) {
    try {
      logger.info('正在提取搜索结果...');
      
      return await this.page.evaluate((searchKeyword) => {
        const results = [];
        const cards = document.querySelectorAll('.card-wrap');
        
        cards.forEach((card, index) => {
          try {
            // 提取微博内容
            const contentElement = card.querySelector('.txt') || card.querySelector('.content');
            const content = contentElement ? contentElement.textContent.trim() : '';
            
            if (!content) return; // 跳过空内容
            
            // 提取作者信息
            const authorElement = card.querySelector('.name') || card.querySelector('.user-name');
            const author = authorElement ? authorElement.textContent.trim() : '未知用户';
            
            // 提取作者链接
            const authorLinkElement = card.querySelector('a[href*="/u/"]') || card.querySelector('.name a');
            const authorLink = authorLinkElement ? authorLinkElement.getAttribute('href') : '';
            
            // 提取发布时间
            const timeElement = card.querySelector('.time') || card.querySelector('.from');
            const timeText = timeElement ? timeElement.textContent.trim() : '';
            
            // 提取互动数据
            const likeElement = card.querySelector('[action-type="like"] .line') || card.querySelector('.like .line');
            const likes = likeElement ? parseInt(likeElement.textContent) || 0 : 0;
            
            const commentElement = card.querySelector('[action-type="fl_comment"] .line') || card.querySelector('.comment .line');
            const comments = commentElement ? parseInt(commentElement.textContent) || 0 : 0;
            
            const shareElement = card.querySelector('[action-type="fl_forward"] .line') || card.querySelector('.forward .line');
            const shares = shareElement ? parseInt(shareElement.textContent) || 0 : 0;
            
            // 提取微博ID
            const mid = card.getAttribute('mid') || card.getAttribute('data-mid') || `search_${Date.now()}_${index}`;
            
            // 提取微博链接
            const linkElement = card.querySelector('a[href*="/status/"]') || card.querySelector('.from a');
            const url = linkElement ? linkElement.getAttribute('href') : '';
            
            results.push({
              platform: 'weibo',
              id: mid,
              content: content,
              author: author,
              author_link: authorLink,
              publish_time: timeText, // 需要后续处理时间格式
              url: url,
              likes: likes,
              comments: comments,
              shares: shares,
              keyword: searchKeyword,
              source: 'weibo_playwright_search',
              collection_time: new Date().toISOString()
            });
            
          } catch (cardError) {
            console.log(`提取第 ${index + 1} 个卡片失败:`, cardError.message);
          }
        });
        
        return results;
      }, keyword);

    } catch (error) {
      logger.error('提取搜索结果失败:', error.message);
      return [];
    }
  }

  /**
   * 获取时间范围参数
   */
  getTimeRangeParam(timeRange) {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return '';
    }
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    return `${formatDate(startDate)}:${formatDate(now)}`;
  }

  /**
   * 关闭浏览器
   */
  async close() {
    try {
      if (this.browser) {
        logger.info('正在关闭浏览器...');
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isLoggedIn = false;
        logger.info('浏览器已关闭');
      }
    } catch (error) {
      logger.error('关闭浏览器失败:', error.message);
    }
  }
}

module.exports = WeiboPlaywrightSearcher;