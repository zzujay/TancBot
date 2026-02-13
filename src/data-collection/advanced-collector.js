/**
 * 高级数据采集器V2
 * 支持多平台、反爬机制、IP代理池等高级功能
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');
const configManager = require('../utils/config-manager');

/**
 * IP代理池管理器
 */
class ProxyPool {
  constructor() {
    this.proxies = [];
    this.failedProxies = new Set();
    this.currentIndex = 0;
    this.healthCheckInterval = 30000; // 30秒
    this.maxFailures = 3;
    this.proxyFailures = new Map();
  }

  async initialize() {
    logger.info('初始化IP代理池');
    
    // 加载代理列表
    await this.loadProxies();
    
    // 启动健康检查
    this.startHealthCheck();
    
    logger.info(`代理池初始化完成，可用代理: ${this.getHealthyProxyCount()}`);
  }

  async loadProxies() {
    // 这里可以从配置文件、数据库或代理服务API加载代理
    const proxyConfig = configManager.get('proxy');
    
    if (proxyConfig.enabled && proxyConfig.host) {
      this.proxies.push({
        host: proxyConfig.host,
        port: proxyConfig.port,
        auth: proxyConfig.auth.username ? {
          username: proxyConfig.auth.username,
          password: proxyConfig.auth.password
        } : null,
        protocol: 'http'
      });
    }

    // 可以添加更多代理源
    await this.loadProxiesFromAPI();
  }

  async loadProxiesFromAPI() {
    try {
      // 这里可以集成第三方代理API
      // 例如：ProxyMesh, Crawlera, ScraperAPI等
      const response = await axios.get('https://api.proxy-list.download/http.txt');
      const proxyList = response.data.split('\n').filter(line => line.trim());
      
      proxyList.forEach(proxy => {
        const [host, port] = proxy.split(':');
        if (host && port) {
          this.proxies.push({
            host: host.trim(),
            port: parseInt(port.trim()),
            protocol: 'http'
          });
        }
      });
    } catch (error) {
      logger.warn('从API加载代理失败:', error.message);
    }
  }

  // 获取健康代理
  async getHealthyProxy() {
    const maxAttempts = this.proxies.length;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const proxy = this.proxies[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      attempts++;

      if (this.isProxyHealthy(proxy)) {
        return proxy;
      }
    }

    // 如果没有健康代理，返回null
    logger.warn('没有可用的健康代理');
    return null;
  }

  // 检查代理是否健康
  isProxyHealthy(proxy) {
    const proxyKey = `${proxy.host}:${proxy.port}`;
    
    if (this.failedProxies.has(proxyKey)) {
      return false;
    }

    const failures = this.proxyFailures.get(proxyKey) || 0;
    return failures < this.maxFailures;
  }

  // 记录代理失败
  recordProxyFailure(proxy) {
    const proxyKey = `${proxy.host}:${proxy.port}`;
    const failures = (this.proxyFailures.get(proxyKey) || 0) + 1;
    this.proxyFailures.set(proxyKey, failures);

    if (failures >= this.maxFailures) {
      this.failedProxies.add(proxyKey);
      logger.warn(`代理 ${proxyKey} 已达到最大失败次数，标记为不可用`);
    }
  }

  // 健康检查
  async startHealthCheck() {
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  async performHealthCheck() {
    const healthCheckPromises = this.proxies.map(async (proxy) => {
      try {
        const startTime = Date.now();
        const response = await axios.get('https://httpbin.org/ip', {
          proxy: this.getAxiosProxyConfig(proxy),
          timeout: 5000
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200) {
          // 代理健康，重置失败次数
          const proxyKey = `${proxy.host}:${proxy.port}`;
          this.proxyFailures.set(proxyKey, 0);
          this.failedProxies.delete(proxyKey);
          
          logger.debug(`代理 ${proxyKey} 健康检查通过，响应时间: ${responseTime}ms`);
        }
      } catch (error) {
        this.recordProxyFailure(proxy);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  // 获取Axios代理配置
  getAxiosProxyConfig(proxy) {
    const config = {
      host: proxy.host,
      port: proxy.port
    };

    if (proxy.auth) {
      config.auth = proxy.auth;
    }

    return config;
  }

  // 获取健康代理数量
  getHealthyProxyCount() {
    return this.proxies.filter(proxy => this.isProxyHealthy(proxy)).length;
  }
}

/**
 * 用户代理轮换器
 */
class UserAgentRotator {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
    ];
    this.currentIndex = 0;
  }

  getNextUserAgent() {
    const userAgent = this.userAgents[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.userAgents.length;
    return userAgent;
  }
}

/**
 * 请求调度器
 */
class RequestScheduler {
  constructor() {
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 10;
    this.rateLimitWindow = 60000; // 1分钟
    this.maxRequestsPerWindow = 100;
    this.requestHistory = [];
  }

  async scheduleRequest(requestFunc, priority = 5) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        func: requestFunc,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // 按优先级排序
      this.requestQueue.sort((a, b) => b.priority - a.priority);
      
      this.processQueue();
    });
  }

  async processQueue() {
    while (this.requestQueue.length > 0 && this.canMakeRequest()) {
      const request = this.requestQueue.shift();
      this.executeRequest(request);
    }
  }

  canMakeRequest() {
    // 检查并发限制
    if (this.activeRequests >= this.maxConcurrentRequests) {
      return false;
    }

    // 检查速率限制
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    const recentRequests = this.requestHistory.filter(time => time > windowStart);
    
    if (recentRequests.length >= this.maxRequestsPerWindow) {
      return false;
    }

    return true;
  }

  async executeRequest(request) {
    this.activeRequests++;
    this.requestHistory.push(Date.now());

    // 清理旧的历史记录
    this.cleanupHistory();

    try {
      const result = await request.func();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  cleanupHistory() {
    const now = Date.now();
    const cutoff = now - this.rateLimitWindow * 2; // 保留2个窗口的历史
    this.requestHistory = this.requestHistory.filter(time => time > cutoff);
  }
}

/**
 * 验证码识别器
 */
class CaptchaSolver {
  constructor() {
    this.enabled = false; // 默认禁用，需要配置API密钥
  }

  async solve(captchaImage) {
    if (!this.enabled) {
      throw new Error('验证码识别未启用');
    }

    try {
      // 这里可以集成第三方验证码识别服务
      // 如：2Captcha, Anti-Captcha, DeathByCaptcha等
      
      // 示例：调用2Captcha API
      const response = await axios.post('https://2captcha.com/in.php', {
        method: 'base64',
        key: this.apiKey,
        body: captchaImage.toString('base64'),
        json: 1
      });

      if (response.data.status === 1) {
        const requestId = response.data.request;
        
        // 等待识别结果
        return await this.waitForSolution(requestId);
      } else {
        throw new Error(`验证码提交失败: ${response.data.error_text}`);
      }
    } catch (error) {
      logger.error('验证码识别失败:', error);
      throw error;
    }
  }

  async waitForSolution(requestId, maxWaitTime = 120000) {
    const startTime = Date.now();
    const pollInterval = 5000; // 5秒轮询一次

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get('https://2captcha.com/res.php', {
          params: {
            key: this.apiKey,
            action: 'get',
            id: requestId,
            json: 1
          }
        });

        if (response.data.status === 1) {
          return response.data.request; // 返回识别结果
        } else if (response.data.request === 'CAPCHA_NOT_READY') {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        } else {
          throw new Error(`验证码识别失败: ${response.data.error_text}`);
        }
      } catch (error) {
        logger.error('获取验证码结果失败:', error);
        throw error;
      }
    }

    throw new Error('验证码识别超时');
  }
}

/**
 * 高级微博爬虫V2
 */
class AdvancedWeiboScraper {
  constructor() {
    this.baseUrl = 'https://weibo.cn';
    this.proxyPool = new ProxyPool();
    this.userAgentRotator = new UserAgentRotator();
    this.requestScheduler = new RequestScheduler();
    this.captchaSolver = new CaptchaSolver();
    this.requestHistory = new Map();
    this.sessionManager = new SessionManager();
  }

  async initialize() {
    logger.info('初始化高级微博爬虫V2');
    
    await this.proxyPool.initialize();
    await this.sessionManager.initialize();
    
    logger.info('高级微博爬虫V2初始化完成');
  }

  async search(keyword, page = 1, options = {}) {
    return this.requestScheduler.scheduleRequest(async () => {
      return await this.performSearch(keyword, page, options);
    }, options.priority || 5);
  }

  async performSearch(keyword, page, options) {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const searchUrl = `${this.baseUrl}/search/mblog?keyword=${encodeURIComponent(keyword)}&page=${page}`;
        
        // 获取健康代理
        const proxy = await this.proxyPool.getHealthyProxy();
        
        // 获取用户代理
        const userAgent = this.userAgentRotator.getNextUserAgent();
        
        // 获取会话
        const session = await this.sessionManager.getSession();
        
        const requestConfig = {
          url: searchUrl,
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'Cookie': session.cookies || ''
          },
          timeout: 15000,
          proxy: proxy ? this.getAxiosProxyConfig(proxy) : undefined,
          validateStatus: (status) => status < 500
        };

        // 添加随机延迟
        await this.addRandomDelay();
        
        const response = await axios(requestConfig);
        
        // 检查是否需要验证码识别
        if (this.isCaptchaRequired(response.data)) {
          logger.info('检测到验证码，尝试自动识别');
          const captchaResult = await this.handleCaptcha(response.data);
          
          if (captchaResult.success) {
            // 重新发送请求
            continue;
          }
        }
        
        // 检查是否被限流
        if (this.isRateLimited(response.data)) {
          logger.warn('检测到限流，等待后重试');
          await this.handleRateLimit(response.data);
          retries++;
          continue;
        }
        
        // 解析搜索结果
        const results = this.parseSearchResults(response.data, keyword);
        
        // 记录成功的请求
        this.recordSuccess(proxy, keyword, page);
        
        return results;
        
      } catch (error) {
        await this.handleRequestError(error, keyword, page, retries);
        retries++;
        
        if (retries >= maxRetries) {
          throw error;
        }
        
        // 指数退避
        await this.exponentialBackoff(retries);
      }
    }

    throw new Error(`搜索失败，已达到最大重试次数: ${maxRetries}`);
  }

  // 检测验证码
  isCaptchaRequired(html) {
    const $ = cheerio.load(html);
    return $('form[action*="captcha"]').length > 0 || 
           $('img[src*="captcha"]').length > 0 ||
           html.includes('验证码') ||
           html.includes('captcha');
  }

  // 处理验证码
  async handleCaptcha(html) {
    try {
      // 提取验证码图片
      const $ = cheerio.load(html);
      const captchaImage = $('img[src*="captcha"]').attr('src');
      
      if (captchaImage) {
        // 下载验证码图片
        const captchaData = await this.downloadCaptcha(captchaImage);
        
        // 识别验证码
        const solution = await this.captchaSolver.solve(captchaData);
        
        // 提交验证码
        return await this.submitCaptcha(solution);
      }
      
      return { success: false, reason: 'no_captcha_found' };
    } catch (error) {
      logger.error('验证码处理失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 检测限流
  isRateLimited(html) {
    return html.includes('访问过于频繁') ||
           html.includes('rate limit') ||
           html.includes('429') ||
           html.includes('请稍后再试');
  }

  // 处理限流
  async handleRateLimit(html) {
    // 解析等待时间
    const waitTime = this.extractWaitTime(html) || 60000; // 默认等待1分钟
    logger.info(`检测到限流，等待 ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // 解析搜索结果
  parseSearchResults(html, keyword) {
    const $ = cheerio.load(html);
    const results = [];

    $('.c').each((index, element) => {
      const $element = $(element);
      
      if ($element.attr('id') && $element.attr('id').startsWith('M_')) {
        try {
          const content = $element.find('.ctt').text().trim();
          const author = $element.find('.nk').text().trim();
          const timeText = $element.find('.ct').text().trim();
          
          // 提取互动数据
          const likeText = $element.find('[action-type="like"]').text();
          const likes = this.extractNumber(likeText);
          
          const commentText = $element.find('[action-type="comment"]').text();
          const comments = this.extractNumber(commentText);
          
          const shareText = $element.find('[action-type="forward"]').text();
          const shares = this.extractNumber(shareText);

          if (content && author) {
            results.push({
              platform: 'weibo',
              keyword: keyword,
              content: content,
              author: author,
              publish_time: this.parseTime(timeText),
              url: `${this.baseUrl}/${$element.attr('id')}`,
              likes: likes,
              comments: comments,
              shares: shares
            });
          }
        } catch (error) {
          logger.error('解析微博内容失败:', error);
        }
      }
    });

    return results;
  }

  // 工具方法
  extractNumber(text) {
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  parseTime(timeText) {
    if (!timeText) return null;
    
    // 处理相对时间格式
    if (timeText.includes('分钟前')) {
      const minutes = parseInt(timeText.match(/(\d+)分钟前/)[1]);
      return new Date(Date.now() - minutes * 60000).toISOString();
    } else if (timeText.includes('小时前')) {
      const hours = parseInt(timeText.match(/(\d+)小时前/)[1]);
      return new Date(Date.now() - hours * 3600000).toISOString();
    } else if (timeText.includes('今天')) {
      const timeMatch = timeText.match(/今天 (\d{2}:\d{2})/);
      if (timeMatch) {
        const today = new Date();
        const [hours, minutes] = timeMatch[1].split(':');
        today.setHours(parseInt(hours), parseInt(minutes));
        return today.toISOString();
      }
    } else if (timeText.includes('月')) {
      // 处理 "MM月DD日 HH:mm" 格式
      const match = timeText.match(/(\d{1,2})月(\d{1,2})日 (\d{2}):(\d{2})/);
      if (match) {
        const year = new Date().getFullYear();
        const month = parseInt(match[1]) - 1;
        const day = parseInt(match[2]);
        const hour = parseInt(match[3]);
        const minute = parseInt(match[4]);
        return new Date(year, month, day, hour, minute).toISOString();
      }
    }
    
    return new Date().toISOString();
  }

  // 添加随机延迟
  async addRandomDelay() {
    const minDelay = 1000;
    const maxDelay = 3000;
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 指数退避
  async exponentialBackoff(retryCount) {
    const delay = Math.pow(2, retryCount) * 1000; // 2^retryCount 秒
    logger.info(`指数退避: 等待 ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 处理请求错误
  async handleRequestError(error, keyword, page, retryCount) {
    logger.error(`请求失败 (重试 ${retryCount + 1}):`, {
      keyword,
      page,
      error: error.message,
      code: error.code
    });

    // 记录代理失败
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      // 这里应该记录具体代理的失败
    }

    // 使用错误处理器进行统一处理
    await errorHandler.handleError(error, {
      source: 'weibo_scraper',
      keyword,
      page,
      retryCount
    });
  }

  // 记录成功请求
  recordSuccess(proxy, keyword, page) {
    const timestamp = Date.now();
    const key = `${keyword}_${page}`;
    
    this.requestHistory.set(key, {
      timestamp,
      proxy: proxy ? `${proxy.host}:${proxy.port}` : 'direct',
      success: true
    });

    // 清理旧的历史记录
    const cutoff = timestamp - 3600000; // 1小时前
    for (const [key, record] of this.requestHistory.entries()) {
      if (record.timestamp < cutoff) {
        this.requestHistory.delete(key);
      }
    }
  }

  // 获取Axios代理配置
  getAxiosProxyConfig(proxy) {
    const config = {
      host: proxy.host,
      port: proxy.port
    };

    if (proxy.auth) {
      config.auth = proxy.auth;
    }

    return config;
  }

  // 提取等待时间
  extractWaitTime(html) {
    const patterns = [
      /(\d+)秒/,
      /(\d+)分钟/,
      /(\d+)小时/,
      /请稍后再试/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        if (match[1]) {
          if (html.includes('秒')) return parseInt(match[1]) * 1000;
          if (html.includes('分钟')) return parseInt(match[1]) * 60000;
          if (html.includes('小时')) return parseInt(match[1]) * 3600000;
        }
        return 60000; // 默认1分钟
      }
    }

    return 60000; // 默认1分钟
  }

  // 下载验证码
  async downloadCaptcha(captchaUrl) {
    try {
      const response = await axios.get(captchaUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      logger.error('下载验证码失败:', error);
      throw error;
    }
  }

  // 提交验证码
  async submitCaptcha(solution) {
    try {
      // 这里实现具体的验证码提交逻辑
      // 需要根据目标网站的具体实现来调整
      logger.info(`提交验证码解决方案: ${solution}`);
      return { success: true, solution };
    } catch (error) {
      logger.error('提交验证码失败:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * 会话管理器
 */
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxSessions = 10;
    this.sessionTimeout = 1800000; // 30分钟
  }

  async initialize() {
    logger.info('初始化会话管理器');
    this.startSessionCleanup();
  }

  async getSession() {
    // 查找或创建会话
    let session = this.findHealthySession();
    
    if (!session) {
      session = await this.createSession();
    }
    
    return session;
  }

  findHealthySession() {
    const now = Date.now();
    
    for (const session of this.sessions.values()) {
      if (now - session.lastUsed < this.sessionTimeout && session.healthy) {
        session.lastUsed = now;
        return session;
      }
    }
    
    return null;
  }

  async createSession() {
    if (this.sessions.size >= this.maxSessions) {
      // 清理最旧的会话
      this.cleanupOldestSession();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      cookies: '',
      healthy: true,
      lastUsed: Date.now(),
      createdAt: new Date()
    };

    this.sessions.set(sessionId, session);
    logger.info(`创建新会话: ${sessionId}`);
    
    return session;
  }

  cleanupOldestSession() {
    let oldestSession = null;
    let oldestTime = Date.now();
    
    for (const session of this.sessions.values()) {
      if (session.lastUsed < oldestTime) {
        oldestTime = session.lastUsed;
        oldestSession = session;
      }
    }
    
    if (oldestSession) {
      this.sessions.delete(oldestSession.id);
      logger.info(`清理最旧会话: ${oldestSession.id}`);
    }
  }

  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 300000); // 每5分钟清理一次
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const expired = [];
    
    for (const session of this.sessions.values()) {
      if (now - session.lastUsed > this.sessionTimeout) {
        expired.push(session.id);
      }
    }
    
    expired.forEach(sessionId => {
      this.sessions.delete(sessionId);
      logger.info(`清理过期会话: ${sessionId}`);
    });
  }
}

/**
 * 高级数据采集器
 */
class AdvancedDataCollector {
  constructor() {
    this.scrapers = {
      weibo: new AdvancedWeiboScraper()
    };
    this.maxResults = 1000; // V2版本支持更多结果
    this.concurrentLimit = 20; // V2版本支持更高并发
    this.rateLimiter = new RateLimiter();
    this.dataValidator = new DataValidator();
  }

  async initialize() {
    logger.info('初始化高级数据采集器V2');
    
    for (const [name, scraper] of Object.entries(this.scrapers)) {
      try {
        await scraper.initialize();
        logger.info(`采集器 ${name} 初始化完成`);
      } catch (error) {
        logger.error(`采集器 ${name} 初始化失败:`, error);
      }
    }
    
    logger.info('高级数据采集器V2初始化完成');
  }

  async collect(keywords, options = {}) {
    const { platforms = ['weibo'], maxResults = this.maxResults, timeRange = '24h' } = options;
    
    const taskId = `collect_${Date.now()}`;
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
          await errorHandler.handleError(error, {
            source: 'data_collection',
            platform,
            keywords
          });
        }
      } else {
        logger.warn(`不支持的平台: ${platform}`);
      }
    }

    // 数据验证和清洗
    const validatedResults = await this.dataValidator.validate(allResults);
    
    logger.info(`数据采集任务 ${taskId} 完成，共采集 ${validatedResults.length} 条有效数据`);
    
    return validatedResults;
  }

  async collectFromPlatform(platform, keywords, maxResults, timeRange) {
    const scraper = this.scrapers[platform];
    const results = [];
    
    // 为每个关键词采集数据
    for (const keyword of keywords) {
      try {
        const keywordResults = await this.collectKeyword(scraper, keyword, maxResults / keywords.length, timeRange);
        results.push(...keywordResults);
        
        // 速率限制
        await this.rateLimiter.throttle();
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
        
        // 速率限制
        await this.rateLimiter.throttle();
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
      case '30d':
        cutoffTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
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
}

/**
 * 速率限制器
 */
class RateLimiter {
  constructor() {
    this.requests = [];
    this.maxRequests = 100;
    this.windowMs = 60000; // 1分钟
  }

  async throttle() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // 清理旧的请求记录
    this.requests = this.requests.filter(time => time > windowStart);
    
    // 检查是否达到限制
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      logger.info(`达到速率限制，等待 ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // 记录当前请求
    this.requests.push(now);
  }
}

/**
 * 数据验证器
 */
class DataValidator {
  async validate(data) {
    const validData = [];
    const invalidData = [];
    
    for (const item of data) {
      if (this.isValid(item)) {
        validData.push(item);
      } else {
        invalidData.push(item);
      }
    }
    
    logger.info(`数据验证完成: 有效 ${validData.length} 条, 无效 ${invalidData.length} 条`);
    
    return validData;
  }

  isValid(item) {
    // 基础验证
    if (!item.content || item.content.trim().length < 5) {
      return false;
    }
    
    if (!item.author || item.author.trim().length === 0) {
      return false;
    }
    
    // 内容质量验证
    if (this.containsSpam(item.content)) {
      return false;
    }
    
    if (this.isDuplicate(item)) {
      return false;
    }
    
    return true;
  }

  containsSpam(content) {
    const spamPatterns = [
      /\b(?:buy|sell|click|visit)\s+(?:now|here)\b/i,
      /\b(?:free|win|prize)\s+(?:now|today)\b/i,
      /\b(?:http|https):\/\/\S+/i,
      /\b(?:\d{4,})\b/ // 连续4个以上数字
    ];
    
    return spamPatterns.some(pattern => pattern.test(content));
  }

  isDuplicate(item) {
    // 简单的重复检测，实际项目中可以使用更复杂的算法
    const contentHash = this.hashContent(item.content);
    // 这里应该检查数据库中是否已存在相同内容
    return false;
  }

  hashContent(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

module.exports = AdvancedDataCollector;