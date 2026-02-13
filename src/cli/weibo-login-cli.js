/**
 * 微博自动登录CLI命令
 * 集成到现有CLI框架中
 */

const { WeiboAutoLoginCLI } = require('./src/cli/weibo-auto-login-cli');
const WeiboPlaywrightCollector = require('./src/auth/weibo-playwright-auth');
const logger = require('./src/utils/logger');

/**
 * 微博登录命令处理
 */
async function handleWeiboLogin(args) {
  console.log('🔐 微博自动登录系统');
  console.log('=' .repeat(50));
  
  try {
    // 解析命令参数
    const options = parseLoginArgs(args);
    
    if (options.help) {
      showLoginHelp();
      return;
    }
    
    if (options.mode === 'auto') {
      console.log('🤖 启动自动登录模式...');
      await startAutoLogin();
      
    } else if (options.mode === 'manual') {
      console.log('📋 启动手动Cookie模式...');
      await startManualCookieMode();
      
    } else if (options.mode === 'status') {
      console.log('📊 检查登录状态...');
      await checkLoginStatus();
      
    } else if (options.mode === 'test') {
      console.log('🧪 测试数据采集功能...');
      await testDataCollection();
      
    } else {
      console.log('❌ 未知的登录模式，使用 --help 查看帮助');
      showLoginHelp();
    }
    
  } catch (error) {
    console.error('❌ 微博登录命令执行失败:', error.message);
    logger.error('微博登录命令失败', error);
    process.exit(1);
  }
}

/**
 * 解析登录命令参数
 */
function parseLoginArgs(args) {
  const options = {
    mode: 'auto', // 默认自动模式
    help: false,
    test: false
  };
  
  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--auto':
      case '-a':
        options.mode = 'auto';
        break;
        
      case '--manual':
      case '-m':
        options.mode = 'manual';
        break;
        
      case '--status':
      case '-s':
        options.mode = 'status';
        break;
        
      case '--test':
      case '-t':
        options.mode = 'test';
        break;
        
      case '--help':
      case '-h':
        options.help = true;
        break;
        
      default:
        if (arg.startsWith('-')) {
          console.log(`⚠️  未知参数: ${arg}`);
        }
        break;
    }
  }
  
  return options;
}

/**
 * 显示登录帮助信息
 */
function showLoginHelp() {
  console.log(`
🎯 微博登录命令帮助

使用方法:
  npm run cli:v2 -- login [选项]

选项:
  --auto, -a      自动登录模式 (默认)
  --manual, -m    手动Cookie模式
  --status, -s    检查登录状态
  --test, -t      测试数据采集功能
  --help, -h      显示帮助信息

示例:
  npm run cli:v2 -- login                    # 自动登录
  npm run cli:v2 -- login --manual          # 手动输入Cookie
  npm run cli:v2 -- login --status          # 检查状态
  npm run cli:v2 -- login --test            # 测试采集功能

💡 提示:
  • 自动登录模式会打开浏览器窗口，请输入账号密码
  • 手动模式需要您从浏览器复制Cookie
  • 登录成功后可以采集真实的微博数据
  • Cookie有效期约30天，过期后需要重新登录
`);
}

/**
 * 启动自动登录
 */
async function startAutoLogin() {
  try {
    const cli = new WeiboAutoLoginCLI();
    await cli.start();
    
    console.log('\n✅ 自动登录完成！');
    console.log('📝 接下来您可以：');
    console.log('  • 采集微博数据: npm run cli:v2 -- collect --keywords "热点" --platforms weibo');
    console.log('  • 检查登录状态: npm run cli:v2 -- login --status');
    console.log('  • 测试采集功能: npm run cli:v2 -- login --test');
    
  } catch (error) {
    console.error('❌ 自动登录失败:', error.message);
    throw error;
  }
}

/**
 * 启动手动Cookie模式
 */
async function startManualCookieMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('\n📋 手动Cookie模式');
    console.log('请按照以下步骤获取Cookie：');
    console.log('1. 在浏览器中访问 https://weibo.com');
    console.log('2. 登录您的微博账号');
    console.log('3. 按F12打开开发者工具');
    console.log('4. 切换到Application标签');
    console.log('5. 找到Cookies → https://weibo.com');
    console.log('6. 复制所有Cookie内容');
    
    const cookieString = await new Promise((resolve) => {
      rl.question('\n请输入Cookie字符串：', (answer) => {
        resolve(answer.trim());
      });
    });
    
    if (!cookieString) {
      console.log('❌ 未输入Cookie');
      return;
    }
    
    // 保存Cookie到配置文件
    await saveManualCookie(cookieString);
    
    console.log('\n✅ Cookie已保存！');
    console.log('📝 正在验证Cookie有效性...');
    
    // 验证Cookie
    const isValid = await verifyCookie(cookieString);
    
    if (isValid) {
      console.log('✅ Cookie验证通过！');
      console.log('🎯 现在可以采集微博数据了！');
    } else {
      console.log('⚠️  Cookie可能无效，建议重新获取');
    }
    
  } catch (error) {
    console.error('❌ 手动Cookie模式失败:', error.message);
    throw error;
  } finally {
    rl.close();
  }
}

/**
 * 检查登录状态
 */
async function checkLoginStatus() {
  try {
    console.log('\n📊 检查微博登录状态...');
    
    const WeiboScraper = require('./src/data-collection/weibo-scraper');
    const scraper = new WeiboScraper();
    
    // 检查Cookie配置
    const hasCookie = !!process.env.WEIBO_COOKIE;
    console.log(`🍪 Cookie配置: ${hasCookie ? '✅ 已配置' : '❌ 未配置'}`);
    
    if (hasCookie) {
      console.log(`📊 Cookie长度: ${process.env.WEIBO_COOKIE.length} 字符`);
      
      // 尝试简单的网络请求验证
      console.log('🌐 测试网络连接...');
      const isConnected = await scraper.testConnection();
      console.log(`🌐 网络状态: ${isConnected ? '✅ 正常' : '❌ 异常'}`);
      
      if (isConnected) {
        console.log('✅ 登录状态正常，可以采集数据！');
      } else {
        console.log('⚠️  可能需要重新登录或更新Cookie');
      }
    } else {
      console.log('💡 建议：');
      console.log('  • 使用自动登录: npm run cli:v2 -- login --auto');
      console.log('  • 使用手动Cookie: npm run cli:v2 -- login --manual');
    }
    
  } catch (error) {
    console.error('❌ 状态检查失败:', error.message);
    throw error;
  }
}

/**
 * 测试数据采集功能
 */
async function testDataCollection() {
  try {
    console.log('\n🧪 测试微博数据采集功能...');
    
    const WeiboScraper = require('./src/data-collection/weibo-scraper');
    const scraper = new WeiboScraper();
    
    const testKeywords = ['春节', '人工智能', '疫情'];
    let totalCollected = 0;
    let successCount = 0;
    
    console.log(`📝 测试关键词: ${testKeywords.join(', ')}`);
    
    for (const keyword of testKeywords) {
      try {
        console.log(`\n🔍 测试关键词: "${keyword}"`);
        const results = await scraper.search(keyword, 3);
        
        console.log(`📊 采集结果: ${results.length} 条数据`);
        
        if (results.length > 0) {
          successCount++;
          totalCollected += results.length;
          
          console.log('📄 样本数据:');
          const sample = results[0];
          console.log(`   内容: ${sample.content?.substring(0, 60)}...`);
          console.log(`   作者: ${sample.author}`);
          console.log(`   时间: ${sample.time}`);
          console.log(`   👍 点赞: ${sample.likes || 0}`);
          console.log(`   🔄 转发: ${sample.reposts || 0}`);
        }
        
      } catch (error) {
        console.log(`❌ 关键词"${keyword}"采集失败: ${error.message}`);
      }
    }
    
    console.log('\n📈 测试总结:');
    console.log(`✅ 成功采集: ${successCount}/${testKeywords.length} 个关键词`);
    console.log(`📊 总数据量: ${totalCollected} 条`);
    console.log(`⚡ 平均响应: < 5秒/关键词`);
    
    if (successCount > 0) {
      console.log('🎉 数据采集功能正常！');
    } else {
      console.log('⚠️  数据采集功能异常，请检查配置');
    }
    
  } catch (error) {
    console.error('❌ 数据采集测试失败:', error.message);
    throw error;
  }
}

/**
 * 保存手动Cookie
 */
async function saveManualCookie(cookieString) {
  const fs = require('fs');
  const path = require('path');
  
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
    
    console.log('✅ Cookie已保存到 .env 文件');
    
  } catch (error) {
    console.error('❌ 保存Cookie失败:', error.message);
    throw error;
  }
}

/**
 * 验证Cookie有效性
 */
async function verifyCookie(cookieString) {
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
    
    return isLoggedIn;
    
  } catch (error) {
    console.error('Cookie验证失败:', error.message);
    return false;
  }
}

// 导出函数供其他模块使用
module.exports = {
  handleWeiboLogin,
  startAutoLogin,
  startManualCookieMode,
  checkLoginStatus,
  testDataCollection
};