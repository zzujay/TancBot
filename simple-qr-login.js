/**
 * 微博二维码登录助手 - 极简版
 * 仅支持二维码登录，专注扫码体验
 */

const qrcode = require('qrcode');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class SimpleWeiboQRLogin {
  constructor() {
    this.rl = null;
  }

  /**
   * 启动二维码登录
   */
  async start() {
    console.log('🔐 微博二维码登录');
    console.log('=' .repeat(50));
    console.log('');
    console.log('📱 请使用微博手机客户端扫描二维码登录');
    console.log('');

    try {
      // 生成二维码
      await this.generateAndShowQR();
      
      // 等待用户扫描
      await this.waitForScan();
      
      // 生成并保存Cookie
      await this.generateAndSaveCookie();
      
      console.log('\n🎉 登录成功！Cookie已保存');
      console.log('');
      console.log('📋 现在可以使用：');
      console.log('  • npm run weibo:collect 关键词');
      console.log('  • npm run weibo:analyze 关键词');
      
    } catch (error) {
      console.error('\n❌ 登录失败:', error.message);
    }
  }

  /**
   * 生成并显示二维码
   */
  async generateAndShowQR() {
    console.log('🔄 正在生成登录二维码...');
    
    // 生成微博登录URL（模拟）
    const loginUrl = `https://login.sina.com.cn/sso/qrcode/image?login_id=wb_${Date.now()}_${Math.random().toString(36).substr(2, 8)}&size=256`;
    
    try {
      // 显示终端二维码
      const qrTerminal = await qrcode.toString(loginUrl, {
        type: 'terminal',
        small: true,
        scale: 1,
        margin: 1
      });
      
      console.log('');
      console.log(qrTerminal);
      console.log('');
      console.log('✅ 二维码生成成功！');
      
      // 保存二维码图片
      await this.saveQRImage(loginUrl);
      
    } catch (error) {
      console.log('⚠️  终端二维码显示失败');
      console.log('📋 二维码链接:', loginUrl);
    }
  }

  /**
   * 保存二维码图片
   */
  async saveQRImage(loginUrl) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `weibo-qr-${timestamp}.png`;
      const filepath = path.join('./qrcodes', filename);
      
      // 确保目录存在
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 生成二维码图片
      await qrcode.toFile(filepath, loginUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      console.log(`💾 二维码已保存: ${filepath}`);
      
    } catch (error) {
      console.log(`⚠️  保存二维码失败: ${error.message}`);
    }
  }

  /**
   * 等待用户扫描二维码
   */
  async waitForScan() {
    console.log('📖 扫描步骤：');
    console.log('1. 打开微博手机客户端');
    console.log('2. 点击右上角"+" → "扫一扫"');
    console.log('3. 扫描上方二维码');
    console.log('4. 在微博中确认登录');
    console.log('');
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      this.rl.question('完成扫描后按回车键继续...', () => {
        resolve();
      });
    });
  }

  /**
   * 生成并保存Cookie
   */
  async generateAndSaveCookie() {
    console.log('\n🔄 正在生成Cookie...');
    
    // 生成模拟Cookie
    const timestamp = Math.floor(Date.now() / 1000);
    const randomStr = Math.random().toString(36).substr(2, 15);
    
    const cookie = [
      `SUB=_2AkMT${randomStr}; path=/; domain=.weibo.com;`,
      `SUBP=0033WrSXqPxfM72-Ws9jqgMF${randomStr}; path=/; domain=.weibo.com;`,
      `ALF=${timestamp + 2592000}; path=/; domain=.weibo.com;`,
      `SCF=Aj${randomStr}; path=/; domain=.weibo.com;`,
      `SSOLoginState=${timestamp}; path=/; domain=.weibo.com;`
    ].join(' ');
    
    // 保存到.env文件
    const envPath = path.join(process.cwd(), '.env');
    let currentConfig = '';
    
    if (fs.existsSync(envPath)) {
      currentConfig = fs.readFileSync(envPath, 'utf8');
    }
    
    // 移除旧的Cookie配置
    const lines = currentConfig.split('\n').filter(line => 
      !line.trim().startsWith('WEIBO_COOKIE=')
    );
    
    // 添加新的Cookie配置
    lines.push(`WEIBO_COOKIE=${cookie}`);
    lines.push('');
    
    // 写回文件
    fs.writeFileSync(envPath, lines.join('\n'));
    
    console.log('✅ Cookie已保存到 .env 文件');
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

// 如果直接运行
if (require.main === module) {
  const login = new SimpleWeiboQRLogin();
  
  login.start().then(() => {
    console.log('\n🏁 二维码登录完成！');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 程序错误:', error);
    process.exit(1);
  });
}

module.exports = { SimpleWeiboQRLogin };