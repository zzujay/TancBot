/**
 * 微博自动登录CLI集成模块
 * 支持终端输入账号密码进行自动登录
 */

const WeiboPlaywrightCollector = require('./src/auth/weibo-playwright-auth');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class WeiboAutoLoginCLI {
  constructor() {
    this.collector = null;
    this.rl = null;
  }

  /**
   * 启动自动登录流程
   */
  async start() {
    console.log('🔐 微博自动登录系统');
    console.log('=' .repeat(50));
    console.log('请输入您的微博账号和密码进行自动登录。');
    console.log('注意：密码输入时不会显示字符，这是正常的安全措施。\n');

    try {
      // 获取登录凭据
      const credentials = await this.getCredentials();
      
      // 初始化采集器
      this.collector = new WeiboPlaywrightCollector({
        headless: false, // 显示浏览器窗口，便于用户观察
        slowMo: 200
      });

      console.log('\n🚀 开始自动登录流程...');
      
      // 初始化浏览器
      await this.collector.initBrowser();
      
      // 执行自动登录
      const loginSuccess = await this.collector.autoLogin(credentials);
      
      if (loginSuccess) {
        console.log('\n🎉 登录成功！');
        
        // 测试数据采集功能
        await this.testDataCollection();
        
        // 显示登录状态
        await this.showLoginStatus();
        
      } else {
        console.log('\n❌ 登录失败，请检查账号密码是否正确');
        await this.handleLoginFailure();
      }

    } catch (error) {
      console.error('\n❌ 自动登录过程出错:', error.message);
      await this.handleError(error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 获取用户凭据
   */
  async getCredentials() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // 隐藏密码输入
    const hiddenQuestion = (query) => {
      return new Promise((resolve) => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        
        stdout.write(query);
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
    };

    try {
      // 获取用户名
      const username = await new Promise((resolve) => {
        this.rl.question('请输入微博账号（手机号/邮箱/用户名）：', (answer) => {
          resolve(answer.trim());
        });
      });

      if (!username) {
        throw new Error('账号不能为空');
      }

      // 获取密码
      console.log('请输入微博密码：');
      const password = await hiddenQuestion('');

      if (!password) {
        throw new Error('密码不能为空');
      }

      return {
        username: username,
        password: password
      };

    } finally {
      this.rl.close();
    }
  }

  /**
   * 测试数据采集功能
   */
  async testDataCollection() {
    console.log('\n🧪 正在测试数据采集功能...');
    
    try {
      // 测试热门关键词
      const testKeywords = ['春节', '人工智能', '疫情'];
      const results = [];

      for (const keyword of testKeywords) {
        console.log(`\n🔍 测试关键词: "${keyword}"`);
        
        try {
          const data = await this.collector.collectWeiboData(keyword, 5);
          results.push({
            keyword: keyword,
            count: data.length,
            success: true,
            data: data.slice(0, 2) // 只保存前2条作为样本
          });
          
          console.log(`✅ 采集到 ${data.length} 条数据`);
          
          if (data.length > 0) {
            console.log('📄 样本数据:');
            console.log(`   内容: ${data[0].content?.substring(0, 60)}...`);
            console.log(`   作者: ${data[0].author}`);
            console.log(`   时间: ${data[0].time}`);
          }
          
        } catch (error) {
          console.log(`❌ 关键词"${keyword}"采集失败: ${error.message}`);
          results.push({
            keyword: keyword,
            count: 0,
            success: false,
            error: error.message
          });
        }
      }

      // 显示测试总结
      console.log('\n📊 数据采集测试总结:');
      const totalData = results.reduce((sum, result) => sum + result.count, 0);
      const successCount = results.filter(r => r.success).length;
      
      console.log(`✅ 成功采集: ${successCount}/${results.length} 个关键词`);
      console.log(`📈 总数据量: ${totalData} 条`);
      
      if (totalData > 0) {
        console.log('🎉 数据采集功能正常！');
      } else {
        console.log('⚠️  数据采集功能异常，请检查网络连接');
      }

    } catch (error) {
      console.error('❌ 数据采集测试失败:', error.message);
    }
  }

  /**
   * 显示登录状态
   */
  async showLoginStatus() {
    console.log('\n📋 登录状态信息:');
    console.log('-' .repeat(40));
    
    const status = this.collector.getStatus();
    console.log(`🌐 浏览器状态: ${status.browser ? '运行中' : '已关闭'}`);
    console.log(`🔐 登录状态: ${status.loggedIn ? '已登录' : '未登录'}`);
    console.log(`🍪 Cookie数量: ${status.cookies} 个`);
    console.log(`📍 当前页面: ${status.currentUrl || '未知'}`);
    
    // 显示Cookie有效期信息
    if (status.loggedIn) {
      console.log('\n⏰ Cookie信息:');
      console.log('   • Cookie已自动保存到 .env 文件');
      console.log('   • 有效期约30天（具体取决于微博设置）');
      console.log('   • 系统会自动检测Cookie过期并提示重新登录');
    }
  }

  /**
   * 处理登录失败
   */
  async handleLoginFailure() {
    console.log('\n🔧 登录失败处理选项:');
    console.log('1. 重新输入账号密码');
    console.log('2. 使用手动Cookie模式');
    console.log('3. 退出程序');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    try {
      const choice = await new Promise((resolve) => {
        rl.question('\n请选择操作 (1-3): ', (answer) => {
          resolve(answer.trim());
        });
      });
      
      switch (choice) {
        case '1':
          console.log('🔄 重新启动登录流程...');
          await this.start();
          break;
        case '2':
          console.log('📋 切换到手动Cookie模式');
          await this.switchToManualMode();
          break;
        case '3':
          console.log('👋 程序退出');
          break;
        default:
          console.log('❌ 无效选择，程序退出');
      }
      
    } finally {
      rl.close();
    }
  }

  /**
   * 切换到手动Cookie模式
   */
  async switchToManualMode() {
    console.log('\n📋 手动Cookie模式');
    console.log('请按照以下步骤获取Cookie：');
    console.log('1. 在浏览器中访问 https://weibo.com');
    console.log('2. 登录您的微博账号');
    console.log('3. 按F12打开开发者工具');
    console.log('4. 切换到Application标签');
    console.log('5. 找到Cookies → https://weibo.com');
    console.log('6. 复制所有Cookie内容');
    console.log('7. 粘贴到下方输入框');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    try {
      const cookieString = await new Promise((resolve) => {
        rl.question('\n请输入Cookie字符串：', (answer) => {
          resolve(answer.trim());
        });
      });
      
      if (cookieString) {
        // 保存Cookie到配置文件
        this.saveManualCookie(cookieString);
        console.log('✅ Cookie已保存');
      } else {
        console.log('❌ 未输入Cookie');
      }
      
    } finally {
      rl.close();
    }
  }

  /**
   * 保存手动Cookie
   */
  saveManualCookie(cookieString) {
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
      
      // 写回文件
      fs.writeFileSync(envPath, lines.join('\n'));
      console.log('✅ 已更新 .env 文件中的WEIBO_COOKIE');
      
    } catch (error) {
      console.error('❌ 保存Cookie失败:', error.message);
    }
  }

  /**
   * 错误处理
   */
  async handleError(error) {
    console.log('\n🔧 错误处理选项:');
    console.log('1. 重试登录');
    console.log('2. 查看错误详情');
    console.log('3. 退出程序');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    try {
      const choice = await new Promise((resolve) => {
        rl.question('\n请选择操作 (1-3): ', (answer) => {
          resolve(answer.trim());
        });
      });
      
      switch (choice) {
        case '1':
          console.log('🔄 重新启动登录流程...');
          await this.start();
          break;
        case '2':
          console.log('\n📋 错误详情:');
          console.log(error.stack);
          break;
        case '3':
          console.log('👋 程序退出');
          break;
        default:
          console.log('❌ 无效选择，程序退出');
      }
      
    } finally {
      rl.close();
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.collector) {
      await this.collector.close();
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    console.log('\n🧹 资源清理完成');
  }
}

// CLI命令集成
async function weiboAutoLogin() {
  const cli = new WeiboAutoLoginCLI();
  await cli.start();
}

// 如果直接运行此脚本
if (require.main === module) {
  weiboAutoLogin().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { WeiboAutoLoginCLI, weiboAutoLogin };