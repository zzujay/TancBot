/**
 * 微博二维码登录 - Playwright 实现
 * 解决二维码只能请求一次的问题
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const axios = require('axios');

class WeiboPlaywrightQRLogin {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      slowMo: options.slowMo || 100,
      timeout: options.timeout || 180000, // 3分钟超时
      pollingInterval: options.pollingInterval || 2000,
      showQRInTerminal: options.showQRInTerminal !== false,
      saveQRCode: options.saveQRCode !== false,
      ...options
    };
    
    this.browser = null;
    this.context = null;
    this.page = null;
    this.loginStatus = 'idle';
    this.cookies = null;
    this.startTime = null;
    this.qrCodeUrl = null;
    this.qrCodePath = null;
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      console.log('✅ 浏览器初始化完成');
      return true;
      
    } catch (error) {
      console.error('❌ 浏览器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 开始二维码登录流程
   */
  async start() {
    console.log('🔐 微博二维码登录 - Playwright 实现');
    console.log('=' .repeat(60));
    console.log('');
    console.log('📱 功能特色：');
    console.log('  • 真实浏览器环境，模拟用户行为');
    console.log('  • 自动处理微博反爬虫机制');
    console.log('  • 终端显示二维码，扫码即可登录');
    console.log('  • 自动轮询扫码状态');
    console.log('  • 自动提取和保存Cookie');
    console.log('');
    console.log('🚀 使用步骤：');
    console.log('1. 系统将打开微博登录页面');
    console.log('2. 自动获取二维码并显示');
    console.log('3. 使用微博手机客户端扫描二维码');
    console.log('4. 等待系统自动完成登录');
    console.log('');

    try {
      // 初始化浏览器
      if (!this.browser) {
        await this.initBrowser();
      }

      // 步骤1：访问微博登录页面
      console.log('🌐 访问微博登录页面...');
      await this.page.goto('https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup&url=https%3A%2F%2Fweibo.com%2Fnewlogin%3Ftabtype%3Dweibo%26gid%3D102803%26openLoginLayer%3D0%26url%3D&from=weibopro', {
        waitUntil: 'networkidle',
        timeout: this.options.timeout
      });

      // 步骤2：等待二维码加载
      console.log('⏳ 等待二维码加载...');
      
      // 尝试多种二维码选择器策略
      const qrCodeSelectors = [
        'img[alt="二维码"]',
        'img.qr-code',
        '.qrcode img',
        '#qrcode img',
        'img[src*="qrcode"]',
        'img[src*="qr"]'
      ];
      
      let qrCodeElement = null;
      let foundSelector = null;
      
      for (const selector of qrCodeSelectors) {
        try {
          console.log(`� 尝试二维码选择器: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 2000 });
          qrCodeElement = await this.page.$(selector);
          if (qrCodeElement) {
            foundSelector = selector;
            break;
          }
        } catch (error) {
          // 忽略超时错误，继续尝试下一个选择器
        }
      }
      
      if (!qrCodeElement) {
        // 尝试更广泛的查找
        console.log('🔍 尝试查找所有图片元素...');
        const allImages = await this.page.$$('img');
        for (const img of allImages) {
          const src = await img.getAttribute('src');
          if (src && (src.includes('qrcode') || src.includes('qr'))) {
            qrCodeElement = img;
            foundSelector = 'img[src*="qr"]';
            break;
          }
        }
      }
      
      if (!qrCodeElement) {
        throw new Error('无法找到二维码元素');
      }
      
      console.log(`✅ 找到二维码元素，选择器: ${foundSelector}`);

      this.qrCodeUrl = await qrCodeElement.getAttribute('src');
      if (!this.qrCodeUrl) {
        throw new Error('无法获取二维码URL');
      }

      // 分析二维码URL，提取真实的登录链接
      console.log('🔍 分析二维码URL，提取真实登录链接...');
      
      let realLoginUrl = this.qrCodeUrl;
      
      if (this.qrCodeUrl.includes('v2.qr.weibo.cn')) {
        console.log('⚠️  发现中间跳转二维码:', this.qrCodeUrl);
        
        // 从URL中提取data参数，这包含了真正的登录链接
        try {
          const urlParams = new URLSearchParams(this.qrCodeUrl.split('?')[1]);
          const dataParam = urlParams.get('data');
          
          if (dataParam) {
            realLoginUrl = decodeURIComponent(dataParam);
            console.log('✅ 提取到真实登录链接:', realLoginUrl);
          }
        } catch (error) {
          console.log('⚠️  提取真实登录链接失败，使用原始二维码:', error.message);
        }
      } else {
        console.log('✅ 找到直接登录二维码:', this.qrCodeUrl);
      }

      // 更新为真实的登录链接
      this.qrCodeUrl = realLoginUrl;
      console.log('✅ 最终使用的二维码内容:', this.qrCodeUrl);

      // 步骤4：显示和保存二维码
      if (this.options.showQRInTerminal) {
        await this.displayQRCodeInTerminal();
      }

      if (this.options.saveQRCode) {
        await this.saveQRCode();
      }

      // 步骤5：等待用户扫描
      console.log('⏳ 等待用户扫描二维码...');
      console.log('💡 请使用微博手机客户端扫描上方二维码');
      console.log('📱 扫描后请在手机端确认登录');
      console.log('⏰ 二维码有效期：3分钟');
      console.log('');

      this.startTime = Date.now();
      this.loginStatus = 'scanning';

      // 步骤6：监控登录状态
      await this.monitorLoginStatus();

      // 步骤7：等待页面跳转到微博首页
      console.log('⏳ 等待跳转到微博首页...');
      try {
        await this.page.waitForNavigation({
          waitUntil: 'networkidle',
          timeout: 30000
        });
        console.log(`✅ 页面跳转成功，当前URL: ${this.page.url()}`);
      } catch (error) {
        console.log('⚠️  页面跳转超时，尝试直接访问首页...');
        await this.page.goto('https://weibo.com', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        console.log(`✅ 访问首页成功，当前URL: ${this.page.url()}`);
      }

      // 步骤8：提取Cookie
      console.log('🍪 提取登录Cookie...');
      await this.extractCookies();

      // 步骤9：验证登录成功
      console.log('✅ 登录成功！');
      this.loginStatus = 'success';

      return {
        success: true,
        cookies: this.cookies,
        qrCodeUrl: this.qrCodeUrl,
        qrCodePath: this.qrCodePath,
        loginTime: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 二维码登录失败:', error.message);
      this.loginStatus = 'error';
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 在终端显示二维码
   */
  async displayQRCodeInTerminal() {
    try {
      // 直接使用真实的登录链接在终端生成二维码
      console.log('');
      console.log('📱 微博登录二维码：');
      console.log('-' .repeat(40));
      
      // 使用qrcode库生成终端二维码
      console.log('🔄 正在生成终端二维码...');
      const terminalQR = await qrcode.toString(this.qrCodeUrl, {
        type: 'terminal',
        small: true,
        scale: 1,
        margin: 1
      });
      
      // 显示二维码
      console.log(terminalQR);
      console.log('');
      
      // 同时保存原始二维码图片作为备份
      console.log('📷 保存原始二维码图片作为备份...');
      try {
        const qrCodeBuffer = await this.page.screenshot({
          selector: 'img[src*="qrcode"]',
          type: 'png'
        });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.qrCodePath = path.join('./qrcodes', `weibo-qr-backup-${timestamp}.png`);
        
        // 确保目录存在
        if (!fs.existsSync('./qrcodes')) {
          fs.mkdirSync('./qrcodes', { recursive: true });
        }
        
        fs.writeFileSync(this.qrCodePath, qrCodeBuffer);
        console.log('💾 二维码备份已保存到:', this.qrCodePath);
      } catch (error) {
        console.log('⚠️  保存二维码备份失败:', error.message);
      }
      
      // 显示登录链接（供参考）
      console.log('🔗 登录链接:', this.qrCodeUrl);
      console.log('');
      console.log('💡 请直接扫描上方的终端二维码');
      console.log('');

    } catch (error) {
      console.log('⚠️  终端显示二维码失败:', error.message);
      console.log('🔗 二维码链接:', this.qrCodeUrl);
      console.log('');
    }
  }

  /**
   * 保存二维码图片
   */
  async saveQRCode() {
    try {
      if (!this.qrCodePath) {
        // 使用真实的登录链接生成并保存二维码
        console.log('📷 使用真实登录链接生成并保存二维码...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.qrCodePath = path.join('./qrcodes', `weibo-qr-real-${timestamp}.png`);
        
        if (!fs.existsSync('./qrcodes')) {
          fs.mkdirSync('./qrcodes', { recursive: true });
        }
        
        // 使用qrcode库生成二维码图片
        await qrcode.toFile(this.qrCodePath, this.qrCodeUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        
        console.log('💾 二维码已保存到:', this.qrCodePath);
      }

    } catch (error) {
      console.log('⚠️  保存二维码失败:', error.message);
    }
  }

  /**
   * 监控登录状态
   */
  async monitorLoginStatus() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('二维码登录超时'));
      }, this.options.timeout);

      const checkInterval = setInterval(async () => {
        try {
          const currentUrl = this.page.url();
          const elapsed = Date.now() - this.startTime;
          const remaining = Math.max(0, Math.floor((this.options.timeout - elapsed) / 1000));

          // 显示倒计时
          process.stdout.write(`\r⏳ 等待扫码... (${remaining}s)`);

          // 检查是否已经登录成功（URL变化或出现登录成功标识）
          if (currentUrl.includes('weibo.com') && !currentUrl.includes('login') && !currentUrl.includes('signin')) {
            console.log('\r✅ 登录成功！正在处理...');
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
            return;
          }

          // 检查是否出现登录成功的页面元素
          try {
            const successElements = [
              'a[title="首页"]',
              'a[title="消息"]',
              'a[title="发现"]',
              '.gn_name',
              '[title*="的微博"]'
            ];

            for (const selector of successElements) {
              if (await this.page.$(selector)) {
                console.log('\r✅ 登录成功！正在处理...');
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve();
                return;
              }
            }
          } catch (e) {
            // 忽略元素检查错误
          }

          // 检查是否需要刷新二维码
          try {
            const qrCodeElement = await this.page.$('img[alt="二维码"]') || await this.page.$('img.qr-code');
            if (!qrCodeElement) {
              // 二维码元素消失，可能已经登录
              console.log('\r✅ 二维码已扫描，正在完成登录...');
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve();
              return;
            }
          } catch (e) {
            // 忽略元素检查错误
          }

        } catch (error) {
          console.log(`\r⚠️  状态检查失败: ${error.message}`);
        }
      }, this.options.pollingInterval);
    });
  }

  /**
   * 提取Cookie
   */
  async extractCookies() {
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
   * 清理资源
   */
  async cleanup() {
    if (this.browser) {
      console.log('🚪 关闭浏览器...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('✅ 浏览器已关闭');
    }

    this.loginStatus = 'idle';
    this.cookies = null;
    this.startTime = null;
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      loginStatus: this.loginStatus,
      hasCookies: !!this.cookies,
      qrCodeUrl: this.qrCodeUrl,
      qrCodePath: this.qrCodePath,
      browser: this.browser !== null
    };
  }
}

// 测试代码
if (require.main === module) {
  const login = new WeiboPlaywrightQRLogin({
    headless: false, // 开发模式下显示浏览器
    showQRInTerminal: true,
    saveQRCode: true
  });

  login.start().then(result => {
    if (result.success) {
      console.log('\n🎉 微博二维码登录成功！');
      console.log('🚀 现在可以开始使用微博数据采集功能了！');
      console.log('');
      console.log('📋 登录信息：');
      console.log(`   Cookie保存路径: weibo-cookies.json`);
      console.log(`   二维码保存路径: ${result.qrCodePath}`);
      console.log(`   登录时间: ${result.loginTime}`);
      console.log('');
    }
  }).catch(error => {
    console.error('\n💥 登录失败:', error.message);
  }).finally(async () => {
    await login.cleanup();
  });
}

module.exports = WeiboPlaywrightQRLogin;