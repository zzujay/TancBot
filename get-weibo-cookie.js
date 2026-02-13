/**
 * 微博Cookie获取辅助工具
 * 帮助用户获取和验证微博Cookie
 */

const axios = require('axios');
const readline = require('readline');

// 创建命令行交互接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class WeiboCookieHelper {
  constructor() {
    this.cookies = {};
    this.testResults = [];
  }

  /**
   * 主流程：引导用户获取Cookie
   */
  async start() {
    console.log('🍪 微博Cookie获取辅助工具');
    console.log('=' .repeat(50));
    console.log('这个工具将帮助您获取微博Cookie，用于数据采集功能。');
    console.log('\n📋 步骤说明：');
    console.log('1. 在浏览器中登录微博');
    console.log('2. 获取Cookie字符串');
    console.log('3. 验证Cookie有效性');
    console.log('4. 保存到配置文件\n');

    await this.guideUserToGetCookie();
  }

  /**
   * 引导用户获取Cookie
   */
  async guideUserToGetCookie() {
    console.log('🌐 第一步：在浏览器中登录微博');
    console.log('-' .repeat(40));
    console.log('请在浏览器中访问：https://weibo.com');
    console.log('使用您的账号登录微博。\n');

    const answer = await this.askQuestion('登录完成后，按回车继续...');

    console.log('\n🔍 第二步：获取Cookie');
    console.log('-' .repeat(40));
    console.log('方法A：手动复制（推荐）');
    console.log('1. 按F12打开开发者工具');
    console.log('2. 切换到Application/应用标签');
    console.log('3. 左侧选择Cookies → https://weibo.com');
    console.log('4. 全选所有Cookie，右键复制');
    console.log('5. 粘贴到下方输入框\n');

    console.log('方法B：使用JavaScript（备用）');
    console.log('在控制台输入：document.cookie');
    console.log('复制返回的结果\n');

    const cookieString = await this.askQuestion('请输入Cookie字符串：');
    
    if (!cookieString || cookieString.trim() === '') {
      console.log('❌ 未输入Cookie，程序退出');
      rl.close();
      return;
    }

    this.cookies.rawString = cookieString.trim();
    this.parseCookieString(cookieString);

    console.log('\n🔍 第三步：验证Cookie有效性');
    console.log('-' .repeat(40));
    await this.validateCookie();
  }

  /**
   * 解析Cookie字符串
   */
  parseCookieString(cookieString) {
    console.log('📊 解析Cookie字符串...');
    
    const cookies = {};
    const cookieArray = cookieString.split(';');
    
    cookieArray.forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name.trim()] = value.trim();
      }
    });

    this.cookies.parsed = cookies;

    // 显示关键Cookie
    const importantCookies = ['SUB', 'SUBP', 'ALF', 'SCF', 'SSOLoginState'];
    console.log('\n🔑 关键Cookie检测：');
    
    importantCookies.forEach(name => {
      if (cookies[name]) {
        console.log(`   ✅ ${name}: ${cookies[name].substring(0, 20)}...`);
      } else {
        console.log(`   ⚠️  ${name}: 未找到`);
      }
    });

    return cookies;
  }

  /**
   * 验证Cookie有效性
   */
  async validateCookie() {
    console.log('🧪 正在验证Cookie有效性...');
    
    try {
      const response = await axios.get('https://weibo.cn', {
        headers: {
          'Cookie': this.cookies.rawString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const html = response.data;
      
      // 检查是否登录成功
      const isLoggedIn = html.includes('我的微博') || html.includes('账号设置');
      const usernameMatch = html.match(/title="(.*?)的微博"/);
      const username = usernameMatch ? usernameMatch[1] : '未知用户';

      if (isLoggedIn) {
        console.log(`   ✅ Cookie有效！`);
        console.log(`   👤 登录用户: ${username}`);
        console.log(`   📊 响应状态: ${response.status}`);
        
        this.testResults.push({
          test: 'Cookie有效性',
          result: '通过',
          details: `用户: ${username}`
        });

        await this.testSearchFunction();
      } else {
        console.log(`   ❌ Cookie无效或已过期`);
        console.log(`   💡 请重新获取Cookie`);
        
        this.testResults.push({
          test: 'Cookie有效性',
          result: '失败',
          details: '未检测到登录状态'
        });

        await this.retryOrExit();
      }

    } catch (error) {
      console.log(`   ❌ Cookie验证失败: ${error.message}`);
      
      this.testResults.push({
        test: 'Cookie有效性',
        result: '失败',
        details: error.message
      });

      await this.retryOrExit();
    }
  }

  /**
   * 测试搜索功能
   */
  async testSearchFunction() {
    console.log('\n🔍 第四步：测试搜索功能');
    console.log('-' .repeat(40));
    
    try {
      // 测试搜索API
      const searchUrl = 'https://s.weibo.com/weibo?q=人工智能&page=1';
      const response = await axios.get(searchUrl, {
        headers: {
          'Cookie': this.cookies.rawString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('   ✅ 搜索功能正常');
        console.log('   📊 可以访问微博搜索页面');
        
        this.testResults.push({
          test: '搜索功能',
          result: '通过',
          details: '可以正常访问搜索页面'
        });

      } else {
        console.log(`   ⚠️  搜索功能异常: ${response.status}`);
        
        this.testResults.push({
          test: '搜索功能',
          result: '警告',
          details: `状态码: ${response.status}`
        });
      }

    } catch (error) {
      console.log(`   ⚠️  搜索功能测试失败: ${error.message}`);
      
      this.testResults.push({
        test: '搜索功能',
        result: '失败',
        details: error.message
      });
    }

    await this.saveConfiguration();
  }

  /**
   * 保存配置
   */
  async saveConfiguration() {
    console.log('\n💾 第五步：保存配置');
    console.log('-' .repeat(40));
    
    // 显示测试结果总结
    console.log('📊 测试结果总结：');
    this.testResults.forEach(test => {
      const icon = test.result === '通过' ? '✅' : test.result === '失败' ? '❌' : '⚠️';
      console.log(`   ${icon} ${test.test}: ${test.result}`);
      if (test.details) {
        console.log(`      详情: ${test.details}`);
      }
    });

    // 准备配置文件内容
    const configContent = `
# 微博数据采集配置
# 生成时间: ${new Date().toLocaleString()}
# Cookie有效性: ${this.testResults.find(t => t.test === 'Cookie有效性')?.result || '未知'}

LLM_PROVIDER=qwen
LLM_MODEL=qwen-turbo
QWEN_API_KEY=sk-bf2aa41a2bcc4fe8ad32755b836f5db0

# 微博数据采集配置
WEIBO_COOKIE=${this.cookies.rawString}
WEIBO_SEARCH_URL=https://s.weibo.com/weibo?q={keyword}&page={page}
WEIBO_MAX_PAGES=5
WEIBO_DELAY=3000

# 数据采集限制
MAX_COLLECTIONS_PER_RUN=50
COLLECTION_TIMEOUT=15000
MAX_CONCURRENT_REQUESTS=2
RATE_LIMIT_PER_MINUTE=20
`;

    console.log('\n📄 生成的配置文件内容：');
    console.log(configContent);

    const saveAnswer = await this.askQuestion('\n是否保存到 .env 文件？(y/n): ');
    
    if (saveAnswer.toLowerCase() === 'y') {
      const fs = require('fs');
      const path = require('path');
      
      const envPath = path.join(process.cwd(), '.env');
      
      try {
        // 备份原文件
        if (fs.existsSync(envPath)) {
          const backupPath = envPath + '.backup.' + Date.now();
          fs.copyFileSync(envPath, backupPath);
          console.log(`   💾 已备份原配置文件: ${backupPath}`);
        }
        
        // 写入新配置
        fs.writeFileSync(envPath, configContent.trim());
        console.log('   ✅ 配置已保存到 .env 文件');
        console.log('   🔄 请重新运行系统以应用新配置');
        
      } catch (error) {
        console.log(`   ❌ 保存配置文件失败: ${error.message}`);
        console.log('   💡 请手动复制上面的配置内容到 .env 文件');
      }
    } else {
      console.log('   💡 请手动复制上面的配置内容到您的配置文件');
    }

    console.log('\n🎉 Cookie配置完成！');
    console.log('下一步：测试数据采集功能');
    console.log('运行: node quick-verify.js');
    
    rl.close();
  }

  /**
   * 重试或退出
   */
  async retryOrExit() {
    const answer = await this.askQuestion('\n是否重新获取Cookie？(y/n): ');
    
    if (answer.toLowerCase() === 'y') {
      await this.guideUserToGetCookie();
    } else {
      console.log('\n👋 程序退出，感谢使用！');
      rl.close();
    }
  }

  /**
   * 提问辅助函数
   */
  askQuestion(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const helper = new WeiboCookieHelper();
  helper.start().catch(error => {
    console.error('程序执行失败:', error);
    rl.close();
  });
}

module.exports = { WeiboCookieHelper };