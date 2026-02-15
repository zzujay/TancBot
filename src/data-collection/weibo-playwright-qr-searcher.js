const { chromium } = require('playwright');
const logger = require('../utils/logger');
const qrcode = require('qrcode');

/**
 * 微博Playwright QR搜索器
 * 获取二维码并在CLI展示，保持登录状态进行搜索
 */
class WeiboPlaywrightQRSearcher {
  constructor() {
    this.baseUrl = 'https://weibo.com';
    this.searchUrl = 'https://s.weibo.com';
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.qrCodeData = null;
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
        headless: true, // 后台运行，不显示浏览器窗口
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
   * 获取微博登录二维码
   */
  async getLoginQRCode() {
    try {
      logger.info('正在打开微博登录页面获取二维码...');
      
      // 使用正确的微博登录URL
      const loginUrl = 'https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup&url=https%3A%2F%2Fweibo.com%2Fnewlogin%3Ftabtype%3Dweibo%26gid%3D102803%26openLoginLayer%3D0%26url%3D&from=weibopro';
      
      await this.page.goto(loginUrl, { 
        waitUntil: 'domcontentloaded', // 使用domcontentloaded而不是networkidle
        timeout: 60000 
      });

      logger.info('等待二维码出现...');
      
      // 尝试多种二维码选择器策略
      const qrCodeSelectors = [
        'img[alt="二维码"]',
        'img.qr-code',
        '.qrcode img',
        '#qrcode img',
        'img[src*="qrcode"]',
        'img[src*="qr"]',
        'img[action-type="qrcode"]'
      ];
      
      let qrCodeElement = null;
      let foundSelector = null;
      
      for (const selector of qrCodeSelectors) {
        try {
          logger.info(`尝试二维码选择器: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 3000 });
          qrCodeElement = await this.page.$(selector);
          if (qrCodeElement) {
            foundSelector = selector;
            logger.info(`找到二维码元素，选择器: ${selector}`);
            break;
          }
        } catch (error) {
          // 忽略超时错误，继续尝试下一个选择器
        }
      }
      
      if (!qrCodeElement) {
        // 尝试更广泛的查找
        logger.info('尝试查找所有图片元素...');
        const allImages = await this.page.$$('img');
        for (const img of allImages) {
          const src = await img.getAttribute('src');
          if (src && (src.includes('qrcode') || src.includes('qr'))) {
            qrCodeElement = img;
            foundSelector = 'img[src*="qr"]';
            logger.info(`通过遍历找到二维码: ${src}`);
            break;
          }
        }
      }
      
      if (!qrCodeElement) {
        // 截图保存用于调试
        await this.page.screenshot({ path: 'weibo_login_debug.png', fullPage: true });
        logger.info('已保存调试截图到 weibo_login_debug.png');
        throw new Error('无法找到二维码元素，已保存调试截图');
      }

      // 获取二维码图片的src属性
      const qrCodeSrc = await qrCodeElement.getAttribute('src');
      
      if (!qrCodeSrc) {
        throw new Error('无法获取二维码图片地址');
      }

      logger.info(`✅ 二维码已获取: ${qrCodeSrc.substring(0, 100)}...`);
      
      // 分析二维码URL，提取真实的登录链接
      let realLoginUrl = qrCodeSrc;
      
      if (qrCodeSrc.includes('v2.qr.weibo.cn')) {
        logger.info('发现中间跳转二维码，正在提取真实登录链接...');
        
        try {
          const urlParams = new URLSearchParams(qrCodeSrc.split('?')[1]);
          const dataParam = urlParams.get('data');
          
          if (dataParam) {
            realLoginUrl = decodeURIComponent(dataParam);
            logger.info('✅ 提取到真实登录链接');
          }
        } catch (error) {
          logger.warn('提取真实登录链接失败，使用原始二维码:', error.message);
        }
      }
      
      // 更新为真实的登录链接
      this.qrCodeUrl = realLoginUrl;
      logger.info('✅ 最终使用的二维码内容:', this.qrCodeUrl);
      
      // 生成二维码的终端显示版本
      this.qrCodeData = await this.generateTerminalQRCode(realLoginUrl);
      
      return {
        success: true,
        qrCodeData: this.qrCodeData,
        message: '请使用手机微博扫码登录'
      };

    } catch (error) {
      logger.error('获取微博登录二维码失败:', error.message);
      return {
        success: false,
        error: error.message,
        message: '获取二维码失败'
      };
    }
  }

  /**
   * 生成终端显示的二维码（直接从URL生成）
   */
  async generateTerminalQRCode(qrCodeUrl) {
    try {
      logger.info('正在生成终端二维码...');
      
      // 直接使用URL生成二维码的ASCII艺术
      const qrAscii = await qrcode.toString(qrCodeUrl, { 
        type: 'terminal',
        small: true,
        scale: 1,
        margin: 1
      });
      
      logger.info('✅ 终端二维码生成成功');
      
      return {
        type: 'ascii',
        content: qrAscii,
        url: qrCodeUrl
      };
      
    } catch (error) {
      logger.error('生成终端二维码失败:', error.message);
      
      return {
        type: 'text',
        content: '二维码已获取，请在浏览器窗口中扫码登录',
        url: qrCodeUrl
      };
    }
  }

  /**
   * 等待用户扫码登录
   */
  async waitForLogin(timeout = 90000) {
    logger.info('⏰ 正在等待用户扫码登录...');
    logger.info('💡 请在手机微博中扫描显示的二维码');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // 检查是否已登录（检测首页元素）
        await this.page.waitForSelector('[data-key="home"] .nav-item', { 
          timeout: 5000 
        });
        
        logger.info('✅ 检测到已登录成功！');
        this.isLoggedIn = true;
        return true;
        
      } catch (e) {
        // 继续等待
        await this.page.waitForTimeout(2000);
      }

      // 检查是否跳转到首页
      const currentUrl = this.page.url();
      if (currentUrl === 'https://weibo.com/' || currentUrl.includes('weibo.com/u/')) {
        logger.info('✅ 检测到已跳转到首页，登录成功');
        this.isLoggedIn = true;
        return true;
      }
    }

    logger.error('❌ 登录超时，用户未在指定时间内完成扫码登录');
    return false;
  }

  /**
   * 执行完整的登录流程
   */
  async login() {
    try {
      // 获取二维码
      const qrResult = await this.getLoginQRCode();
      if (!qrResult.success) {
        return { success: false, error: qrResult.error };
      }
      
      // 显示二维码
      if (qrResult.qrCodeData && qrResult.qrCodeData.type === 'ascii') {
        console.log('\n' + qrResult.qrCodeData.content);
        console.log('💡 请使用手机微博扫描上方二维码');
      }
      
      // 等待登录
      const loginSuccess = await this.waitForLogin();
      
      if (loginSuccess) {
        return { success: true };
      } else {
        return { success: false, error: '登录超时' };
      }
    } catch (error) {
      logger.error('登录流程失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 搜索微博（使用已登录的浏览器）
   */
  async search(keyword, options = {}) {
    const { maxResults = 20 } = options;
    
    if (!keyword) {
      logger.error('搜索关键词不能为空');
      return [];
    }

    if (!this.isLoggedIn) {
      logger.error('未登录，无法执行搜索');
      throw new Error('请先完成微博登录');
    }

    try {
      logger.info(`开始搜索微博: ${keyword}`);
      
      // 构建搜索URL - 不使用timescope参数
      const searchUrl = `${this.searchUrl}/weibo?q=${encodeURIComponent(keyword)}&page=1`;
      
      logger.info(`搜索URL: ${searchUrl}`);
      
      // 导航到搜索页面 - 使用domcontentloaded而不是networkidle
      await this.page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // 等待页面加载
      logger.info('等待搜索页面加载...');
      await this.page.waitForTimeout(3000);

      // 等待搜索结果加载
      await this.page.waitForSelector('.card-wrap', { 
        timeout: 15000 
      }).catch(() => {
        logger.warn('未找到搜索结果卡片，可能是搜索无结果或页面加载问题');
      });

      // 等待一段时间确保动态内容加载
      await this.page.waitForTimeout(2000);

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
   * 关闭浏览器（可选）
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

  /**
   * 获取当前登录状态
   */
  getLoginStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      hasBrowser: !!this.browser,
      hasPage: !!this.page
    };
  }
}

module.exports = WeiboPlaywrightQRSearcher;