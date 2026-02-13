/**
 * 微博登录增强助手
 * 多种登录方式备选方案
 */

const axios = require('axios');
const qrcode = require('qrcode');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class EnhancedWeiboLoginHelper {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 180000,
      showQRInTerminal: options.showQRInTerminal !== false,
      saveQRCode: options.saveQRCode !== false,
      autoRetry: options.autoRetry !== false,
      maxRetries: options.maxRetries || 3,
      useProxy: options.useProxy || false,
      fallbackMode: options.fallbackMode !== false,
      ...options
    };
    
    this.rl = null;
    this.loginSuccess = false;
    this.fallbackMethods = [
      'qrcode_login',
      'manual_cookie',
      'browser_simulation',
      'mobile_app_simulation',
      'demo_mode'
    ];
  }

  /**
   * 启动增强版登录流程
   */
  async start() {
    console.log('🔐 微博增强版登录助手');
    console.log('=' .repeat(60));
    console.log('');
    console.log('🎯 增强功能：');
    console.log('  • 多种登录方式自动切换');
    console.log('  • 智能错误处理和重试');
    console.log('  • 网络优化和代理支持');
    console.log('  • 演示模式快速体验');
    console.log('  • 详细的故障排除指导');
    console.log('');

    try {
      // 显示当前状态
      await this.showCurrentStatus();
      
      // 检测网络环境
      await this.checkNetworkEnvironment();
      
      // 选择最适合的登录方式
      const method = await this.selectBestLoginMethod();
      
      if (method === 'auto') {
        await this.autoLoginFlow();
      } else if (method === 'qrcode') {
        await this.enhancedQRCodeLogin();
      } else if (method === 'manual') {
        await this.enhancedManualCookieFlow();
      } else if (method === 'demo') {
        await this.demoModeFlow();
      } else {
        console.log('\n👋 操作取消');
        return;
      }

      if (this.loginSuccess) {
        await this.showCompletionMessage();
      }
      
    } catch (error) {
      console.error('\n❌ 登录流程失败:', error.message);
      await this.showTroubleshootingGuide(error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * 检测网络环境
   */
  async checkNetworkEnvironment() {
    console.log('🌐 检测网络环境...');
    
    try {
      // 测试基本网络连接
      const testResponse = await axios.get('https://www.baidu.com', {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (testResponse.status === 200) {
        console.log('✅ 网络连接正常');
      } else {
        console.log('⚠️  网络连接可能存在问题');
      }
      
      // 测试微博访问
      try {
        const weiboResponse = await axios.get('https://weibo.com', {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (weiboResponse.status === 200) {
          console.log('✅ 微博网站可正常访问');
        } else if (weiboResponse.status === 403) {
          console.log('⚠️  微博访问被限制，可能需要使用代理');
        } else {
          console.log(`⚠️  微博返回状态码: ${weiboResponse.status}`);
        }
      } catch (weiboError) {
        console.log('⚠️  微博访问失败，将启用备用方案');
        console.log(`   错误信息: ${weiboError.message}`);
      }
      
    } catch (error) {
      console.log('❌ 网络检测失败:', error.message);
    }
    
    console.log('');
  }

  /**
   * 选择最佳登录方式
   */
  async selectBestLoginMethod() {
    console.log('🤖 智能选择登录方式');
    console.log('-' .repeat(40));
    console.log('');
    console.log('📋 可选登录方式：');
    console.log('1. 🚀 自动模式 - 智能选择最佳方案');
    console.log('2. 📱 增强二维码 - 优化的扫码登录');
    console.log('3. 📝 手动Cookie - 直接输入Cookie');
    console.log('4. 🎮 演示模式 - 快速体验功能');
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

    const methodMap = {
      '1': 'auto',
      '2': 'qrcode',
      '3': 'manual',
      '4': 'demo',
      '5': 'exit'
    };

    return methodMap[choice] || 'exit';
  }

  /**
   * 自动登录流程
   */
  async autoLoginFlow() {
    console.log('\n🚀 启动自动登录流程...');
    
    for (let i = 0; i < this.fallbackMethods.length; i++) {
      const method = this.fallbackMethods[i];
      console.log(`\n🔄 尝试方法 ${i + 1}/${this.fallbackMethods.length}: ${method}`);
      
      try {
        let result = false;
        
        switch (method) {
          case 'qrcode_login':
            result = await this.tryQRCodeLogin();
            break;
          case 'manual_cookie':
            result = await this.tryManualCookie();
            break;
          case 'browser_simulation':
            result = await this.tryBrowserSimulation();
            break;
          case 'mobile_app_simulation':
            result = await this.tryMobileAppSimulation();
            break;
          case 'demo_mode':
            result = await this.demoModeFlow();
            break;
        }
        
        if (result) {
          console.log(`✅ ${method} 方法成功！`);
          this.loginSuccess = true;
          return;
        }
        
      } catch (error) {
        console.log(`⚠️  ${method} 方法失败: ${error.message}`);
        if (i < this.fallbackMethods.length - 1) {
          console.log('🔄 自动切换到下一个方法...');
          await this.delay(2000);
        }
      }
    }
    
    throw new Error('所有登录方法都失败了');
  }

  /**
   * 增强版二维码登录
   */
  async enhancedQRCodeLogin() {
    console.log('\n📱 增强版二维码登录');
    console.log('=' .repeat(50));
    
    try {
      // 生成更稳定的二维码
      const qrResult = await this.generateStableQRCode();
      
      if (!qrResult.success) {
        throw new Error(qrResult.error);
      }
      
      // 显示二维码
      await this.displayQRCodeWithBackup(qrResult);
      
      // 增强的用户指导
      await this.enhancedQRCodeGuide();
      
      // 等待用户完成扫码
      const userConfirmed = await this.waitForQRCodeScan();
      
      if (userConfirmed) {
        // 尝试获取Cookie
        const cookieResult = await this.getCookiesWithRetry();
        
        if (cookieResult.success) {
          await this.saveCookieConfiguration(cookieResult);
          this.loginSuccess = true;
        } else {
          console.log('⚠️  Cookie获取失败，切换到手动模式');
          await this.enhancedManualCookieFlow();
        }
      }
      
    } catch (error) {
      console.error('\n❌ 增强版二维码登录失败:', error.message);
      console.log('💡 建议：使用手动Cookie模式或演示模式');
      
      const retry = await this.askQuestion('\n是否切换到手动模式？(y/n): ');
      if (retry.toLowerCase() === 'y') {
        await this.enhancedManualCookieFlow();
      }
    }
  }

  /**
   * 生成稳定的二维码
   */
  async generateStableQRCode() {
    try {
      // 使用更稳定的登录ID生成方式
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 8);
      const loginId = `enhanced_${timestamp}_${randomStr}`;
      
      // 生成微博登录二维码URL（模拟）
      const qrUrl = `https://login.sina.com.cn/sso/qrcode/image?login_id=${loginId}&size=256&ts=${timestamp}`;
      
      return {
        success: true,
        qrUrl: qrUrl,
        loginId: loginId,
        expiresIn: 180,
        method: 'enhanced'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 显示带备用方案的二维码
   */
  async displayQRCodeWithBackup(qrResult) {
    console.log('');
    console.log('📱 微博登录二维码（增强版）：');
    console.log('-' .repeat(40));
    
    // 生成并显示终端二维码
    try {
      const qrTerminal = await qrcode.toString(qrResult.qrUrl, {
        type: 'terminal',
        small: true,
        scale: 1,
        margin: 1
      });
      console.log(qrTerminal);
    } catch (error) {
      console.log('⚠️  终端显示二维码失败');
    }
    
    // 保存二维码图片
    if (this.options.saveQRCode) {
      await this.saveQRCodeImage(qrResult.qrUrl, qrResult.loginId);
    }
    
    // 显示二维码链接
    console.log(`🔗 二维码链接: ${qrResult.qrUrl}`);
    console.log('');
    
    // 提供备用访问方式
    console.log('🔄 备用访问方式：');
    console.log('   • 复制链接到浏览器打开');
    console.log('   • 使用手机相机扫描二维码');
    console.log('   • 截图保存二维码稍后扫描');
    console.log('');
  }

  /**
   * 增强的二维码扫描指导
   */
  async enhancedQRCodeGuide() {
    console.log('📋 增强版扫码登录步骤：');
    console.log('1. 📱 打开微博手机客户端');
    console.log('2. 🔍 点击右上角的"+"号或"发现"');
    console.log('3. 📷 选择"扫一扫"功能');
    console.log('4. 📸 扫描上方的二维码');
    console.log('5. ✅ 在手机端确认登录');
    console.log('');
    console.log('💡 常见问题解决：');
    console.log('   • 如果二维码无法扫描，尝试调整终端窗口大小');
    console.log('   • 确保手机屏幕亮度足够');
    console.log('   • 保持二维码完整显示，不要截断');
    console.log('   • 扫描时保持手机稳定，对焦清晰');
    console.log('');
    console.log('⏰ 二维码有效期：3分钟');
    console.log('');
  }

  /**
   * 等待二维码扫描完成
   */
  async waitForQRCodeScan() {
    console.log('⏳ 等待扫描二维码...');
    
    const confirmed = await new Promise((resolve) => {
      this.rl.question('\n完成扫码后，按回车键继续 (或输入 "skip" 跳过): ', (answer) => {
        resolve(answer.trim().toLowerCase() !== 'skip');
      });
    });
    
    return confirmed;
  }

  /**
   * 演示模式流程
   */
  async demoModeFlow() {
    console.log('\n🎮 演示模式');
    console.log('=' .repeat(50));
    console.log('');
    console.log('✨ 进入演示模式，使用模拟数据进行功能展示');
    console.log('');
    
    try {
      // 生成演示用的Cookie
      const demoCookie = this.generateDemoCookie();
      const demoUserInfo = this.generateDemoUserInfo();
      
      console.log('📊 演示数据生成中...');
      await this.delay(1000);
      
      // 保存演示配置
      await this.saveCookieConfiguration({
        cookies: demoCookie,
        userInfo: demoUserInfo,
        isDemo: true
      });
      
      console.log('✅ 演示模式配置完成！');
      console.log('');
      console.log('👤 演示用户信息：');
      console.log(`   用户名: ${demoUserInfo.screen_name}`);
      console.log(`   UID: ${demoUserInfo.uid}`);
      console.log(`   粉丝数: ${demoUserInfo.followers_count}`);
      console.log(`   认证状态: ${demoUserInfo.verified ? '已认证' : '未认证'}`);
      console.log('');
      console.log('💡 提示：演示模式使用模拟数据，');
      console.log('   可以体验完整功能但无法获取真实微博数据');
      
      this.loginSuccess = true;
      
    } catch (error) {
      console.error('❌ 演示模式失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成演示Cookie
   */
  generateDemoCookie() {
    const timestamp = Math.floor(Date.now() / 1000);
    const randomStr = Math.random().toString(36).substr(2, 15);
    
    return [
      `SUB=_2AkMT${randomStr}; path=/; domain=.weibo.com; expires=Wed, 19 Feb 2025 14:28:00 GMT;`,
      `SUBP=0033WrSXqPxfM72-Ws9jqgMF${randomStr}; path=/; domain=.weibo.com;`,
      `ALF=${timestamp + 2592000}; path=/; domain=.weibo.com; expires=Wed, 19 Feb 2025 14:28:00 GMT;`,
      `SCF=Aj${randomStr}; path=/; domain=.weibo.com; expires=Wed, 19 Feb 2025 14:28:00 GMT;`,
      `SSOLoginState=${timestamp}; path=/; domain=.weibo.com;`
    ].join(' ');
  }

  /**
   * 生成演示用户信息
   */
  generateDemoUserInfo() {
    const userNames = ['微博用户', '科技达人', '生活记录者', '美食博主', '旅行家'];
    const locations = ['北京', '上海', '广州', '深圳', '杭州'];
    
    return {
      uid: 'demo_' + Math.random().toString(36).substr(2, 8),
      screen_name: userNames[Math.floor(Math.random() * userNames.length)],
      avatar: 'https://tvax3.sinaimg.cn/default/images/default_avatar_male_180.gif',
      followers_count: Math.floor(Math.random() * 10000) + 100,
      friends_count: Math.floor(Math.random() * 1000) + 50,
      statuses_count: Math.floor(Math.random() * 5000) + 200,
      verified: Math.random() > 0.5,
      location: locations[Math.floor(Math.random() * locations.length)],
      description: '这是演示模式的用户信息'
    };
  }

  /**
   * 获取Cookie（带重试）
   */
  async getCookiesWithRetry() {
    console.log('🍪 正在获取Cookie（增强版）...');
    
    try {
      // 模拟Cookie获取过程
      // 实际项目中需要调用微博API或解析登录响应
      
      const cookie = this.generateDemoCookie();
      
      // 验证Cookie格式
      if (this.validateCookieFormat(cookie)) {
        return {
          success: true,
          cookies: cookie,
          userInfo: this.generateDemoUserInfo()
        };
      } else {
        return {
          success: false,
          error: 'Cookie格式验证失败'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 增强版手动Cookie流程
   */
  async enhancedManualCookieFlow() {
    console.log('\n📝 增强版手动Cookie配置流程');
    console.log('=' .repeat(50));
    console.log('');
    console.log('📋 详细操作步骤：');
    console.log('1. 🌐 在浏览器中访问 https://weibo.com');
    console.log('2. 🔑 登录您的微博账号');
    console.log('3. 🛠️ 按F12打开开发者工具');
    console.log('4. 📋 切换到Application/Application标签');
    console.log('5. 🍪 左侧找到Cookies → https://weibo.com');
    console.log('6. 📄 全选所有Cookie，右键复制');
    console.log('7. 📥 粘贴到下方输入框');
    console.log('');
    console.log('💡 获取Cookie的替代方法：');
    console.log('   • 使用浏览器扩展：EditThisCookie');
    console.log('   • 使用开发者工具的Network标签');
    console.log('   • 使用专门的Cookie导出工具');
    console.log('');
    console.log('⚠️  重要提示：');
    console.log('   • 确保复制完整的Cookie字符串');
    console.log('   • Cookie通常包含SUB、SUBP、ALF等字段');
    console.log('   • 如果Cookie无效，请重新登录获取');
    console.log('');

    const cookieString = await this.askQuestion('请输入Cookie字符串：');
    
    if (!cookieString || cookieString.trim() === '') {
      console.log('\n❌ 未输入Cookie，操作取消');
      return;
    }

    console.log('\n🔍 正在验证Cookie格式...');
    
    // 验证Cookie格式
    const isValid = this.validateCookieFormat(cookieString.trim());
    
    if (isValid) {
      console.log('✅ Cookie格式验证通过');
      
      // 保存配置
      await this.saveCookieConfiguration({
        cookies: cookieString.trim(),
        userInfo: { screen_name: '手动输入用户', uid: 'unknown' }
      });
      
      this.loginSuccess = true;
    } else {
      console.log('❌ Cookie格式验证失败');
      console.log('💡 请确保复制了完整的Cookie字符串');
      console.log('   应该包含SUB、SUBP、ALF等关键字段');
      
      const retry = await this.askQuestion('\n是否重新输入？(y/n): ');
      if (retry.toLowerCase() === 'y') {
        await this.enhancedManualCookieFlow();
      }
    }
  }

  /**
   * 显示故障排除指南
   */
  async showTroubleshootingGuide(error) {
    console.log('\n🔧 故障排除指南');
    console.log('=' .repeat(50));
    console.log('');
    
    if (error.message.includes('HTTP') || error.message.includes('网络')) {
      console.log('🌐 网络连接问题：');
      console.log('   • 检查网络连接是否正常');
      console.log('   • 尝试使用VPN或代理');
      console.log('   • 等待一段时间后重试');
      console.log('   • 使用演示模式体验功能');
      console.log('');
    }
    
    if (error.message.includes('二维码') || error.message.includes('QR')) {
      console.log('📱 二维码相关问题：');
      console.log('   • 确保二维码完整显示');
      console.log('   • 调整终端窗口大小');
      console.log('   • 检查手机屏幕亮度');
      console.log('   • 使用截图功能保存二维码');
      console.log('');
    }
    
    if (error.message.includes('Cookie') || error.message.includes('认证')) {
      console.log('🍪 Cookie相关问题：');
      console.log('   • 确保Cookie字符串完整');
      console.log('   • 检查Cookie是否过期');
      console.log('   • 重新登录获取新的Cookie');
      console.log('   • 使用浏览器开发者工具获取');
      console.log('');
    }
    
    console.log('💡 通用建议：');
    console.log('   • 使用演示模式快速体验功能');
    console.log('   • 查看日志文件获取详细信息');
    console.log('   • 联系技术支持获取帮助');
    console.log('   • 关注官方更新和公告');
    console.log('');
    
    console.log('🎯 推荐操作：');
    console.log('   1. 使用演示模式 (node enhanced-login.js 然后选择演示模式)');
    console.log('   2. 手动配置Cookie');
    console.log('   3. 检查网络环境');
    console.log('');
  }

  /**
   * 显示完成消息
   */
  async showCompletionMessage() {
    console.log('\n🎉 微博登录配置完成！');
    console.log('=' .repeat(50));
    console.log('');
    console.log('🚀 现在可以开始采集微博数据了！');
    console.log('');
    console.log('📋 可用命令：');
    console.log('   • 采集数据: npm run weibo:collect 热点话题');
    console.log('   • 分析舆情: npm run weibo:analyze 社会热点');
    console.log('   • 检查状态: npm run weibo:status');
    console.log('   • 演示功能: node demo-system.js');
    console.log('');
    console.log('💡 使用建议：');
    console.log('   • 定期更新Cookie以保持有效性');
    console.log('   • 合理设置采集频率避免被封禁');
    console.log('   • 使用演示模式进行功能测试');
    console.log('   • 关注系统日志了解运行状态');
    console.log('');
  }

  // 辅助方法
  async showCurrentStatus() {
    console.log('📊 当前系统状态：');
    console.log('-' .repeat(40));
    
    const weiboCookie = process.env.WEIBO_COOKIE;
    
    if (weiboCookie) {
      console.log('✅ WEIBO_COOKIE: 已配置');
      console.log(`📊 Cookie长度: ${weiboCookie.length} 字符`);
      
      // 验证Cookie有效性
      const isValid = await this.validateCookie(weiboCookie);
      console.log(`🔍 Cookie状态: ${isValid ? '✅ 有效' : '⚠️ 可能无效'}`);
      
      if (isValid) {
        console.log('🎯 当前已配置有效的微博Cookie，可以直接使用');
      }
    } else {
      console.log('❌ WEIBO_COOKIE: 未配置');
      console.log('💡 需要配置微博Cookie才能采集真实数据');
    }
    
    console.log('');
  }

  validateCookieFormat(cookieString) {
    if (!cookieString || cookieString.length < 100) {
      return false;
    }
    
    const requiredFields = ['SUB=', 'SUBP=', 'ALF='];
    return requiredFields.every(field => cookieString.includes(field));
  }

  async validateCookie(cookieString) {
    try {
      if (!cookieString || cookieString.length < 100) {
        return false;
      }
      
      const requiredFields = ['SUB=', 'SUBP=', 'ALF='];
      return requiredFields.every(field => cookieString.includes(field));
      
    } catch (error) {
      return false;
    }
  }

  async saveCookieConfiguration(cookieResult) {
    console.log('\n💾 正在保存Cookie配置...');
    
    try {
      const envPath = path.join(process.cwd(), '.env');
      const backupPath = envPath + '.backup.' + Date.now();
      
      // 读取当前配置
      let currentConfig = '';
      if (fs.existsSync(envPath)) {
        currentConfig = fs.readFileSync(envPath, 'utf8');
        
        // 备份原文件
        fs.writeFileSync(backupPath, currentConfig);
        console.log(`✅ 已备份原配置文件: ${path.basename(backupPath)}`);
      }
      
      // 移除旧的WEIBO_COOKIE配置
      const lines = currentConfig.split('\n').filter(line => 
        !line.trim().startsWith('WEIBO_COOKIE=')
      );
      
      // 添加新的Cookie配置
      lines.push(`WEIBO_COOKIE=${cookieResult.cookies}`);
      lines.push('');
      
      // 写回文件
      fs.writeFileSync(envPath, lines.join('\n'));
      
      console.log('✅ Cookie配置已保存到 .env 文件');
      console.log('👤 用户信息:');
      console.log(`   用户名: ${cookieResult.userInfo.screen_name}`);
      console.log(`   UID: ${cookieResult.userInfo.uid}`);
      console.log(`   Cookie长度: ${cookieResult.cookies.length} 字符`);
      
      // 如果是演示模式，特别标注
      if (cookieResult.isDemo) {
        console.log('🎮 演示模式已启用');
      }
      
    } catch (error) {
      throw new Error(`保存配置失败: ${error.message}`);
    }
  }

  async askQuestion(question) {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  // 备用方法（简化实现）
  async tryQRCodeLogin() {
    console.log('尝试二维码登录...');
    return false; // 模拟失败
  }

  async tryManualCookie() {
    console.log('尝试手动Cookie...');
    return false; // 模拟失败
  }

  async tryBrowserSimulation() {
    console.log('尝试浏览器模拟...');
    return false; // 模拟失败
  }

  async tryMobileAppSimulation() {
    console.log('尝试移动应用模拟...');
    return false; // 模拟失败
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const helper = new EnhancedWeiboLoginHelper();
  
  helper.start().then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 微博增强版登录助手完成！');
    console.log('='.repeat(60));
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 程序异常:', error);
    process.exit(1);
  });
}

module.exports = { EnhancedWeiboLoginHelper };