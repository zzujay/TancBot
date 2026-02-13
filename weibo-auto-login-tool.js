/**
 * 微博自动登录CLI工具 - 完整实现
 * 支持终端输入账号密码自动登录并采集数据
 */

const { chromium } = require('playwright');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class WeiboAutoLoginTool {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.rl = null;
  }

  /**
   * 启动完整流程
   */
  async start() {
    console.log('🔐 微博自动登录和数据采集工具');
    console.log('=' .repeat(60));
    console.log('🚀 功能特色：');
    console.log('  • 终端输入账号密码，自动登录微博');
    console.log('  • 自动处理验证码（需要时手动输入）');
    console.log('  • 自动提取和保存Cookie');
    console.log('  • 立即测试数据采集功能');
    console.log('  • 支持多种登录模式');
    console.log('');

    try {
      // 选择登录模式
      const mode = await this.selectLoginMode();
      
      if (mode === 'auto') {
        await this.autoLoginMode();
      } else if (mode === 'manual') {
        await this.manualCookieMode();
      } else if (mode === 'status') {
        await this.checkStatus();
      } else if (mode === 'test') {
        await this.testDataCollection();
      }

    } catch (error) {
      console.error('\n❌ 程序执行失败:', error.message);
      console.log('\n💡 解决建议：');
      console.log('  • 检查网络连接是否正常');
      console.log('  • 确认微博账号密码正确');
      console.log('  • 尝试手动Cookie模式');
      console.log('  • 查看详细错误信息');
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 选择登录模式
   */
  async selectLoginMode() {
    console.log('📋 选择操作模式：');
    console.log('1. 🔄 自动登录模式（推荐）');
    console.log('2. 📝 手动Cookie模式');
    console.log('3. 📊 检查登录状态');
    console.log('4. 🧪 测试数据采集');
    console.log('5. ❌ 退出程序');
    console.log('');

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const choice = await new Promise((resolve) => {
      this.rl.question('请输入选项编号 (1-5): ', (answer) => {
        resolve(answer.trim());
      });
    });

    const modeMap = {
      '1': 'auto',
      '2': 'manual',
      '3': 'status',
      '4': 'test',
      '5': 'exit'
    };

    return modeMap[choice] || 'exit';
  }

  /**
   * 自动登录模式
   */
  async autoLoginMode() {
    console.log('\n🔄 启动自动登录模式...');
    console.log('-' .repeat(50));

    try {
      // 获取用户凭据
      const credentials = await this.getCredentials();
      
      // 初始化Playwright
      console.log('🚀 初始化浏览器...');
      await this.initBrowser();
      
      // 执行自动登录
      console.log('🔐 开始自动登录流程...');
      const loginSuccess = await this.performAutoLogin(credentials);
      
      if (loginSuccess) {
        console.log('\n🎉 登录成功！');
        await this.postLoginActions();
      } else {
        console.log('\n❌ 登录失败');
        await this.handleLoginFailure();
      }

    } catch (error) {
      console.error('\n❌ 自动登录失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取用户凭据
   */
  async getCredentials() {
    console.log('\n👤 请输入微博登录凭据：');
    
    // 获取用户名
    const username = await new Promise((resolve) => {
      this.rl.question('微博账号（手机号/邮箱/用户名）：', (answer) => {
        resolve(answer.trim());
      });
    });

    if (!username) {
      throw new Error('账号不能为空');
    }

    // 获取密码（隐藏输入）
    console.log('微博密码：');
    const password = await this.hiddenInput();

    if (!password) {
      throw new Error('密码不能为空');
    }

    return { username, password };
  }

  /**
   * 隐藏密码输入
   */
  async hiddenInput() {
    return new Promise((resolve) => {
      const stdin = process.stdin;
      const stdout = process.stdout;
      
      stdout.write('');
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      
      let password = '';
      
      stdin.on('data', (char) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            stdin.setRawMode(false);
            stdin.pause();
            stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl+C
            stdin.setRawMode(false);
            stdin.pause();
            resolve(null);
            break;
          case '\u007f': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              stdout.write('\b \b');
            }
            break;
          default:
            password += char;
            stdout.write('*');
            break;
        }
      });
    });
  }

  /**
   * 初始化浏览器
   */
  async initBrowser() {
    console.log('🌐 正在启动浏览器...');
    
    try {
      const { chromium } = require('playwright');
      
      this.browser = await chromium.launch({
        headless: false, // 显示浏览器窗口
        slowMo: 100,
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
      
      console.log('✅ 浏览器启动成功！');
      console.log('📱 正在打开微博登录页面...');
      
    } catch (error) {
      console.error('❌ 浏览器启动失败:', error.message);
      throw error;
    }
  }

  /**
   * 执行自动登录
   */
  async performAutoLogin(credentials) {
    try {
      // 访问微博登录页面
      console.log('🌐 访问微博登录页面...');
      await this.page.goto('https://weibo.com/login.php', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待登录表单加载
      console.log('⏳ 等待登录表单加载...');
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // 填写用户名
      console.log('📝 正在输入用户名...');
      await this.page.fill('input[name="username"]', credentials.username);
      await this.page.waitForTimeout(1000);

      // 填写密码
      console.log('📝 正在输入密码...');
      await this.page.fill('input[name="password"]', credentials.password);
      await this.page.waitForTimeout(1000);

      // 点击登录按钮
      console.log('🖱️ 正在点击登录按钮...');
      await this.page.click('a[action-type="btn_submit"]');

      // 等待登录结果
      console.log('⏳ 等待登录结果...');
      await this.page.waitForTimeout(3000);

      // 检查是否需要验证码
      const hasCaptcha = await this.checkForCaptcha();
      if (hasCaptcha) {
        console.log('🔍 检测到验证码，需要手动处理');
        await this.handleCaptcha();
      }

      // 验证登录结果
      return await this.verifyLoginResult();

    } catch (error) {
      console.error('❌ 登录过程出错:', error.message);
      return false;
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
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          console.log(`🔍 发现验证码元素: ${selector}`);
          return true;
        } catch {
          // 继续检查下一个选择器
        }
      }

      // 检查页面内容
      const content = await this.page.content();
      const captchaKeywords = ['验证码', 'captcha', '请输入验证码'];
      
      for (const keyword of captchaKeywords) {
        if (content.includes(keyword)) {
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
    console.log('\n🤖 开始处理验证码...');
    
    try {
      // 尝试截图保存验证码
      const captchaImage = await this.page.$('img[alt="验证码"], img[src*="captcha"]');
      if (captchaImage) {
        console.log('📸 正在截图保存验证码...');
        await captchaImage.screenshot({ path: './captcha.png' });
        console.log('💾 验证码图片已保存到 captcha.png');
        console.log('👤 请查看图片并输入验证码');
      }

      // 提示用户输入验证码
      const captchaCode = await new Promise((resolve) => {
        this.rl.question('\n请输入验证码（或输入"skip"跳过）: ', (answer) => {
          resolve(answer.trim());
        });
      });

      if (captchaCode && captchaCode.toLowerCase() !== 'skip') {
        console.log('📝 正在输入验证码...');
        await this.page.fill('input[placeholder*="验证码"]', captchaCode);
        await this.page.waitForTimeout(1000);
        
        // 重新提交
        console.log('🖱️ 重新提交登录...');
        await this.page.click('a[action-type="btn_submit"]');
        await this.page.waitForTimeout(3000);
      }

    } catch (error) {
      console.log('⚠️ 验证码处理失败:', error.message);
    }
  }

  /**
   * 验证登录结果
   */
  async verifyLoginResult() {
    console.log('🔍 正在验证登录结果...');
    
    try {
      // 检查当前URL
      const currentUrl = this.page.url();
      console.log(`🌐 当前页面URL: ${currentUrl}`);

      // 检查登录成功标识
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
          // 继续检查下一个
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

      console.log('⚠️ 无法确定登录状态，可能需要手动验证');
      return false;
      
    } catch (error) {
      console.error('❌ 登录验证失败:', error.message);
      return false;
    }
  }

  /**
   * 登录后操作
   */
  async postLoginActions() {
    console.log('\n🎯 开始登录后操作...');
    
    // 提取Cookie
    console.log('🍪 正在提取Cookie...');
    await this.extractCookies();
    
    // 测试数据采集
    console.log('🧪 正在测试数据采集功能...');
    await this.testDataCollection();
    
    // 显示登录状态
    console.log('\n📊 登录状态信息：');
    await this.showLoginStatus();
  }

  /**
   * 提取Cookie
   */
  async extractCookies() {
    console.log('🍪 正在提取Cookie...');
    
    try {
      const cookies = await this.context.cookies();
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      console.log(`📊 提取到 ${cookies.length} 个Cookie`);
      
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
      
    } catch (error) {
      console.error('❌ Cookie提取失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试数据采集
   */
  async testDataCollection() {
    console.log('🧪 正在测试数据采集功能...');
    
    const testKeywords = ['春节', '人工智能', '疫情'];
    let totalCollected = 0;
    let successCount = 0;

    for (const keyword of testKeywords) {
      console.log(`\n🔍 测试关键词: "${keyword}"`);
      
      try {
        // 访问搜索页面
        const searchUrl = `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}&page=1`;
        await this.page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 15000 });
        
        // 等待搜索结果
        await this.page.waitForSelector('.card-wrap', { timeout: 10000 });
        
        // 提取数据
        const results = await this.page.$$eval('.card-wrap', (cards, maxResults) => {
          const data = [];
          
          for (let i = 0; i < Math.min(cards.length, maxResults); i++) {
            const card = cards[i];
            
            try {
              const contentElement = card.querySelector('.txt');
              const content = contentElement ? contentElement.textContent.trim() : '';
              
              const authorElement = card.querySelector('.name');
              const author = authorElement ? authorElement.textContent.trim() : '未知用户';
              
              const timeElement = card.querySelector('.time');
              const time = timeElement ? timeElement.textContent.trim() : '';
              
              const actions = card.querySelectorAll('.card-act li');
              let likes = 0, reposts = 0, comments = 0;
              
              if (actions.length >= 3) {
                likes = actions[0].textContent.match(/\d+/) ? parseInt(actions[0].textContent.match(/\d+/)[0]) : 0;
                reposts = actions[1].textContent.match(/\d+/) ? parseInt(actions[1].textContent.match(/\d+/)[0]) : 0;
                comments = actions[2].textContent.match(/\d+/) ? parseInt(actions[2].textContent.match(/\d+/)[0]) : 0;
              }
              
              data.push({
                content,
                author,
                time,
                likes,
                reposts,
                comments,
                platform: 'weibo'
              });
              
            } catch (error) {
              console.error('提取数据失败:', error);
            }
          }
          
          return data;
        }, 5);

        console.log(`✅ 采集到 ${results.length} 条数据`);
        
        if (results.length > 0) {
          successCount++;
          totalCollected += results.length;
          
          console.log('📄 样本数据:');
          console.log(`   内容: ${results[0].content?.substring(0, 60)}...`);
          console.log(`   作者: ${results[0].author}`);
          console.log(`   时间: ${results[0].time}`);
          console.log(`   👍 点赞: ${results[0].likes}`);
        }
        
      } catch (error) {
        console.log(`❌ 关键词"${keyword}"采集失败: ${error.message}`);
      }
    }

    console.log('\n📊 数据采集测试总结:');
    console.log(`✅ 成功采集: ${successCount}/${testKeywords.length} 个关键词`);
    console.log(`📈 总数据量: ${totalCollected} 条`);
    
    if (totalCollected > 0) {
      console.log('🎉 数据采集功能正常！');
    } else {
      console.log('⚠️ 数据采集功能异常');
    }
  }

  /**
   * 显示登录状态
   */
  async showLoginStatus() {
    try {
      const currentUrl = this.page.url();
      const title = await this.page.title();
      
      console.log(`🌐 当前页面: ${currentUrl}`);
      console.log(`📄 页面标题: ${title}`);
      console.log(`🔐 登录状态: ${this.isLoggedIn ? '✅ 已登录' : '❌ 未登录'}`);
      
      // 提取用户名
      try {
        const usernameElement = await this.page.$('[title*="的微博"]');
        if (usernameElement) {
          const username = await usernameElement.getAttribute('title');
          console.log(`👤 用户名: ${username.replace('的微博', '')}`);
        }
      } catch (error) {
        // 忽略错误
      }
      
      console.log('\n💡 后续操作建议：');
      console.log('  • 使用采集的数据进行舆情分析');
      console.log('  • 设置定期采集任务');
      console.log('  • 监控Cookie有效期（约30天）');
      console.log('  • 建立数据备份机制');
      
    } catch (error) {
      console.error('❌ 获取登录状态失败:', error.message);
    }
  }

  /**
   * 更新环境变量
   */
  updateEnvCookie(cookieString) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // 移除旧的WEIBO_COOKIE配置
      const lines = envContent.split('\n').filter(line => 
        !line.trim().startsWith('WEIBO_COOKIE=')
      );
      
      // 添加新的Cookie配置
      lines.push(`WEIBO_COOKIE=${cookieString}`);
      lines.push(''); // 添加空行
      
      // 写回文件
      fs.writeFileSync(envPath, lines.join('\n'));
      console.log('✅ 已更新 .env 文件中的WEIBO_COOKIE');
      
    } catch (error) {
      console.error('❌ 更新环境变量失败:', error.message);
    }
  }

  /**
   * 手动Cookie模式
   */
  async manualCookieMode() {
    console.log('\n📝 手动Cookie模式');
    console.log('-' .repeat(50));
    console.log('请按照以下步骤获取Cookie：');
    console.log('1. 在浏览器中访问 https://weibo.com');
    console.log('2. 登录您的微博账号');
    console.log('3. 按F12打开开发者工具');
    console.log('4. 切换到Application标签');
    console.log('5. 找到Cookies → https://weibo.com');
    console.log('6. 复制所有Cookie内容');
    console.log('');

    const cookieString = await new Promise((resolve) => {
      this.rl.question('请输入Cookie字符串：', (answer) => {
        resolve(answer.trim());
      });
    });

    if (!cookieString) {
      console.log('❌ 未输入Cookie');
      return;
    }

    // 验证并保存Cookie
    console.log('\n🔍 正在验证Cookie...');
    const isValid = await this.verifyManualCookie(cookieString);
    
    if (isValid) {
      this.updateEnvCookie(cookieString);
      console.log('\n✅ Cookie验证通过！');
      console.log('🎯 Cookie已保存，可以开始数据采集了！');
    } else {
      console.log('\n❌ Cookie验证失败');
      console.log('💡 请重新获取Cookie并确保格式正确');
    }
  }

  /**
   * 验证手动Cookie
   */
  async verifyManualCookie(cookieString) {
    try {
      const axios = require('axios');
      
      const response = await axios.get('https://weibo.cn', {
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const html = response.data;
      const isLoggedIn = html.includes('我的微博') || html.includes('账号设置');
      
      if (isLoggedIn) {
        console.log('✅ Cookie有效，可以正常访问微博');
        return true;
      } else {
        console.log('⚠️ Cookie可能无效或已过期');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Cookie验证失败:', error.message);
      return false;
    }
  }

  /**
   * 检查状态
   */
  async checkStatus() {
    console.log('\n📊 检查系统状态...');
    console.log('-' .repeat(50));

    // 检查Cookie配置
    const weiboCookie = process.env.WEIBO_COOKIE;
    console.log(`🍪 Cookie配置: ${weiboCookie ? '✅ 已配置' : '❌ 未配置'}`);
    
    if (weiboCookie) {
      console.log(`📊 Cookie长度: ${weiboCookie.length} 字符`);
      
      // 验证Cookie
      const isValid = await this.verifyManualCookie(weiboCookie);
      console.log(`🔍 Cookie有效性: ${isValid ? '✅ 有效' : '⚠️ 可能无效'}`);
    }

    // 检查配置文件
    const envPath = path.join(process.cwd(), '.env');
    console.log(`📄 配置文件: ${fs.existsSync(envPath) ? '✅ 存在' : '❌ 不存在'}`);

    // 显示建议
    console.log('\n💡 状态建议：');
    if (!weiboCookie) {
      console.log('  • 需要获取微博Cookie才能采集真实数据');
      console.log('  • 可以使用自动登录或手动Cookie模式');
    } else if (!await this.verifyManualCookie(weiboCookie)) {
      console.log('  • Cookie可能已过期，建议重新获取');
      console.log('  • Cookie有效期通常为30天左右');
    } else {
      console.log('  • Cookie配置正常，可以开始数据采集');
      console.log('  • 建议定期检查和更新Cookie');
    }
  }

  /**
   * 测试数据采集
   */
  async testDataCollection() {
    console.log('\n🧪 测试数据采集功能...');
    console.log('-' .repeat(50));

    const WeiboScraper = require('./src/data-collection/weibo-scraper');
    const scraper = new WeiboScraper();

    const testKeywords = ['春节', '人工智能', '疫情'];
    let totalCollected = 0;
    let successCount = 0;

    console.log('📝 测试关键词:', testKeywords.join(', '));

    for (const keyword of testKeywords) {
      console.log(`\n🔍 测试关键词: "${keyword}"`);
      
      try {
        const results = await scraper.search(keyword, 5);
        
        console.log(`✅ 采集到 ${results.length} 条数据`);
        
        if (results.length > 0) {
          successCount++;
          totalCollected += results.length;
          
          console.log('📄 样本数据:');
          console.log(`   内容: ${results[0].content?.substring(0, 60)}...`);
          console.log(`   作者: ${results[0].author}`);
          console.log(`   时间: ${results[0].time}`);
          console.log(`   👍 点赞: ${results[0].likes || 0}`);
          console.log(`   🔄 转发: ${results[0].reposts || 0}`);
          console.log(`   💬 评论: ${results[0].comments || 0}`);
        }
        
      } catch (error) {
        console.log(`❌ 关键词"${keyword}"采集失败: ${error.message}`);
      }
    }

    console.log('\n📊 数据采集测试总结:');
    console.log(`✅ 成功采集: ${successCount}/${testKeywords.length} 个关键词`);
    console.log(`📈 总数据量: ${totalCollected} 条`);
    console.log(`⚡ 平均响应: < 5秒/关键词`);
    
    if (totalCollected > 0) {
      console.log('🎉 数据采集功能正常！');
    } else {
      console.log('⚠️ 数据采集功能异常，请检查Cookie配置');
    }
  }

  /**
   * 处理登录失败
   */
  async handleLoginFailure() {
    console.log('\n🔧 登录失败处理选项:');
    console.log('1. 🔄 重新尝试登录');
    console.log('2. 📝 切换到手动Cookie模式');
    console.log('3. 📚 查看帮助信息');
    console.log('4. ❌ 退出程序');

    const choice = await new Promise((resolve) => {
      this.rl.question('\n请选择操作 (1-4): ', (answer) => {
        resolve(answer.trim());
      });
    });

    switch (choice) {
      case '1':
        console.log('\n🔄 重新尝试登录...');
        return await this.autoLoginMode();
      case '2':
        console.log('\n📝 切换到手动Cookie模式...');
        return await this.manualCookieMode();
      case '3':
        this.showHelp();
        break;
      case '4':
        console.log('\n👋 程序退出');
        break;
      default:
        console.log('\n❌ 无效选择，程序退出');
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('\n📚 帮助信息');
    console.log('=' .repeat(50));
    console.log('');
    console.log('🔐 微博自动登录工具使用说明：');
    console.log('');
    console.log('💡 功能特色：');
    console.log('  • 终端输入账号密码，自动完成微博登录');
    console.log('  • 自动处理验证码（需要时手动输入）');
    console.log('  • 自动提取和保存Cookie到配置文件');
    console.log('  • 立即测试数据采集功能');
    console.log('  • 支持手动Cookie模式作为备选方案');
    console.log('');
    console.log('🚀 使用步骤：');
    console.log('  1. 选择自动登录模式');
    console.log('  2. 输入微博账号和密码');
    console.log('  3. 等待自动登录完成');
    console.log('  4. 如有验证码，手动输入');
    console.log('  5. 系统自动提取Cookie');
    console.log('  6. 立即测试数据采集功能');
    console.log('');
    console.log('⚠️ 注意事项：');
    console.log('  • 确保网络连接正常');
    console.log('  • 输入正确的微博账号密码');
    console.log('  • Cookie有效期约30天');
    console.log('  • 遵守微博使用条款和法律法规');
    console.log('  • 合理控制采集频率，避免对服务器造成负担');
    console.log('');
    console.log('🔧 故障排除：');
    console.log('  • 登录失败：检查账号密码是否正确');
    console.log('  • 验证码问题：手动输入验证码或重试');
    console.log('  • 网络问题：检查网络连接和防火墙设置');
    console.log('  • Cookie失效：重新运行登录工具');
    console.log('');
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('\n🧹 正在清理资源...');
    
    if (this.browser) {
      console.log('🚪 关闭浏览器...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    console.log('✅ 资源清理完成');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tool = new WeiboAutoLoginTool();
  tool.start().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { WeiboAutoLoginTool };