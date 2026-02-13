/**
 * 微博自动化登录和数据采集模块
 * 基于Playwright实现
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class WeiboPlaywrightCollector {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      slowMo: options.slowMo || 100,
      timeout: options.timeout || 30000,
      userDataDir: options.userDataDir || './browser-data',
      ...options
    };
    
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.cookies = null;
  }

  /**
   * 初始化浏览器
   */
  async initBrowser() {
    console.log('🚀 初始化Playwright浏览器...');
    
    try {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        slowMo: this.options.slowMo,
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
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai'
      });

      this.page = await this.context.newPage();
      
      // 设置额外的HTTP头部
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      console.log('✅ 浏览器初始化完成');
      return true;
      
    } catch (error) {
      console.error('❌ 浏览器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 自动登录微博
   */
  async autoLogin(credentials) {
    console.log('🔐 开始自动登录微博...');
    
    try {
      // 访问微博登录页面
      console.log('🌐 访问微博登录页面...');
      await this.page.goto('https://weibo.com/login.php', {
        waitUntil: 'networkidle',
        timeout: this.options.timeout
      });

      // 等待登录表单加载
      console.log('⏳ 等待登录表单加载...');
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // 填写用户名
      console.log('📝 填写用户名...');
      await this.page.fill('input[name="username"]', credentials.username);
      await this.page.waitForTimeout(1000); // 等待验证

      // 填写密码
      console.log('📝 填写密码...');
      await this.page.fill('input[name="password"]', credentials.password);
      await this.page.waitForTimeout(1000);

      // 点击登录按钮
      console.log('🖱️ 点击登录按钮...');
      await this.page.click('a[action-type="btn_submit"]');

      // 等待登录结果
      console.log('⏳ 等待登录结果...');
      await this.page.waitForTimeout(3000);

      // 检查是否需要验证码
      const hasCaptcha = await this.checkForCaptcha();
      if (hasCaptcha) {
        console.log('🔍 检测到验证码，开始处理...');
        await this.handleCaptcha();
      }

      // 验证登录是否成功
      const loginSuccess = await this.verifyLogin();
      if (loginSuccess) {
        console.log('✅ 登录成功！');
        this.isLoggedIn = true;
        
        // 提取Cookie
        await this.extractCookies();
        return true;
      } else {
        console.log('❌ 登录失败');
        return false;
      }

    } catch (error) {
      console.error('❌ 自动登录失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查是否需要验证码
   */
  async checkForCaptcha() {
    try {
      // 检查常见的验证码元素
      const captchaSelectors = [
        'img[alt="验证码"]',
        'input[placeholder*="验证码"]',
        'img[src*="captcha"]',
        '.captcha',
        '#captcha'
      ];

      for (const selector of captchaSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          console.log(`🔍 发现验证码元素: ${selector}`);
          return true;
        }
      }

      // 检查页面内容是否包含验证码相关文字
      const pageContent = await this.page.content();
      const captchaKeywords = ['验证码', 'captcha', '请输入验证码'];
      
      for (const keyword of captchaKeywords) {
        if (pageContent.includes(keyword)) {
          console.log(`🔍 发现验证码关键词: ${keyword}`);
          return true;
        }
      }

      return false;
      
    } catch (error) {
      console.log('⚠️ 验证码检测失败:', error.message);
      return false;
    }
  }

  /**
   * 处理验证码
   */
  async handleCaptcha() {
    console.log('🤖 开始处理验证码...');
    
    try {
      // 方案1：尝试查找验证码图片并截图保存
      const captchaImage = await this.page.$('img[alt="验证码"], img[src*="captcha"]');
      if (captchaImage) {
        console.log('📸 发现验证码图片，正在截图保存...');
        await captchaImage.screenshot({ path: './captcha.png' });
        console.log('💾 验证码图片已保存到 captcha.png');
        console.log('👤 请查看图片并手动输入验证码');
      }

      // 方案2：提示用户输入验证码
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const captchaCode = await new Promise((resolve) => {
        rl.question('请输入验证码：', (answer) => {
          resolve(answer);
          rl.close();
        });
      });

      if (captchaCode) {
        console.log('📝 正在输入验证码...');
        await this.page.fill('input[placeholder*="验证码"]', captchaCode);
        await this.page.waitForTimeout(1000);
        
        // 重新提交登录
        console.log('🖱️ 重新提交登录...');
        await this.page.click('a[action-type="btn_submit"]');
        await this.page.waitForTimeout(3000);
      }

    } catch (error) {
      console.log('⚠️ 验证码处理失败:', error.message);
      throw new Error('需要手动处理验证码');
    }
  }

  /**
   * 验证登录是否成功
   */
  async verifyLogin() {
    try {
      // 检查是否跳转到首页
      const currentUrl = this.page.url();
      console.log(`🌐 当前页面URL: ${currentUrl}`);

      // 检查是否包含登录成功的标识
      const successIndicators = [
        'a[title="首页"]',
        'a[title="消息"]',
        'a[title="发现"]',
        '.gn_name',
        '[title*="的微博"]'
      ];

      for (const selector of successIndicators) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          console.log(`✅ 发现登录成功标识: ${selector}`);
          return true;
        } catch {
          // 继续检查下一个标识
        }
      }

      // 检查页面标题
      const title = await this.page.title();
      console.log(`📄 页面标题: ${title}`);
      
      if (title.includes('微博') && !title.includes('登录')) {
        console.log('✅ 页面标题表明登录成功');
        return true;
      }

      // 检查错误信息
      const errorMessages = await this.page.$$eval('*', elements => 
        elements.map(el => el.textContent).filter(text => 
          text && (text.includes('密码错误') || text.includes('用户名不存在') || text.includes('登录失败'))
        )
      );

      if (errorMessages.length > 0) {
        console.log('❌ 发现错误信息:', errorMessages[0]);
        return false;
      }

      return false;
      
    } catch (error) {
      console.error('❌ 登录验证失败:', error.message);
      return false;
    }
  }

  /**
   * 提取Cookie
   */
  async extractCookies() {
    console.log('🍪 提取Cookie...');
    
    try {
      const cookies = await this.context.cookies();
      this.cookies = cookies;
      
      console.log('📊 提取到的Cookie数量:', cookies.length);
      
      // 转换为字符串格式
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      // 保存到文件
      const cookieData = {
        string: cookieString,
        array: cookies,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      };
      
      fs.writeFileSync('./weibo-cookies.json', JSON.stringify(cookieData, null, 2));
      console.log('💾 Cookie已保存到 weibo-cookies.json');
      
      // 更新环境变量
      this.updateEnvCookie(cookieString);
      
      return cookieString;
      
    } catch (error) {
      console.error('❌ Cookie提取失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新环境变量中的Cookie
   */
  updateEnvCookie(cookieString) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      // 读取现有配置
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // 移除旧的WEIBO_COOKIE配置
      const lines = envContent.split('\n').filter(line => 
        !line.trim().startsWith('WEIBO_COOKIE=')
      );
      
      // 添加新的Cookie配置
      lines.push(`WEIBO_COOKIE=${cookieString}`);
      
      // 写回文件
      fs.writeFileSync(envPath, lines.join('\n'));
      console.log('✅ 已更新 .env 文件中的WEIBO_COOKIE');
      
    } catch (error) {
      console.error('❌ 更新环境变量失败:', error.message);
    }
  }

  /**
   * 采集微博数据
   */
  async collectWeiboData(keyword, maxResults = 10) {
    console.log(`🔍 开始采集微博数据：关键词="${keyword}"，最大结果=${maxResults}`);
    
    if (!this.isLoggedIn) {
      throw new Error('请先登录微博');
    }
    
    try {
      // 访问微博搜索页面
      const searchUrl = `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}&page=1`;
      console.log(`🌐 访问搜索页面: ${searchUrl}`);
      
      await this.page.goto(searchUrl, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout
      });

      // 等待搜索结果加载
      await this.page.waitForSelector('.card-wrap', { timeout: 10000 });
      
      // 提取搜索结果
      const results = await this.page.$$eval('.card-wrap', (cards, maxResults) => {
        const data = [];
        
        for (let i = 0; i < Math.min(cards.length, maxResults); i++) {
          const card = cards[i];
          
          try {
            // 提取微博内容
            const contentElement = card.querySelector('.txt');
            const content = contentElement ? contentElement.textContent.trim() : '';
            
            // 提取作者信息
            const authorElement = card.querySelector('.name');
            const author = authorElement ? authorElement.textContent.trim() : '未知用户';
            
            // 提取时间信息
            const timeElement = card.querySelector('.time');
            const time = timeElement ? timeElement.textContent.trim() : '';
            
            // 提取互动数据
            const actions = card.querySelectorAll('.card-act li');
            let likes = 0, reposts = 0, comments = 0;
            
            if (actions.length >= 3) {
              likes = actions[0].textContent.match(/\d+/) ? parseInt(actions[0].textContent.match(/\d+/)[0]) : 0;
              reposts = actions[1].textContent.match(/\d+/) ? parseInt(actions[1].textContent.match(/\d+/)[0]) : 0;
              comments = actions[2].textContent.match(/\d+/) ? parseInt(actions[2].textContent.match(/\d+/)[0]) : 0;
            }
            
            // 提取来源平台
            const fromElement = card.querySelector('.from');
            const from = fromElement ? fromElement.textContent.trim() : '微博';
            
            data.push({
              id: `weibo_${Date.now()}_${i}`,
              platform: 'weibo',
              author: author,
              content: content,
              time: time,
              likes: likes,
              reposts: reposts,
              comments: comments,
              url: window.location.href,
              from: from,
              publishTime: new Date().toISOString()
            });
            
          } catch (error) {
            console.error('提取卡片数据失败:', error);
          }
        }
        
        return data;
      }, maxResults);

      console.log(`✅ 成功采集 ${results.length} 条微博数据`);
      
      // 保存结果
      if (results.length > 0) {
        this.saveCollectionResults(results, keyword);
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ 微博数据采集失败:', error.message);
      throw error;
    }
  }

  /**
   * 保存采集结果
   */
  saveCollectionResults(results, keyword) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `weibo-data-${keyword}-${timestamp}.json`;
      const filepath = path.join('./data', filename);
      
      // 确保data目录存在
      if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data', { recursive: true });
      }
      
      const data = {
        keyword: keyword,
        count: results.length,
        timestamp: new Date().toISOString(),
        results: results
      };
      
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`💾 数据已保存到: ${filepath}`);
      
    } catch (error) {
      console.error('❌ 保存数据失败:', error.message);
    }
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      console.log('🚪 关闭浏览器...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('✅ 浏览器已关闭');
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      browser: this.browser !== null,
      loggedIn: this.isLoggedIn,
      cookies: this.cookies ? this.cookies.length : 0,
      currentUrl: this.page ? this.page.url() : null
    };
  }
}

module.exports = WeiboPlaywrightCollector;