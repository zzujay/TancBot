/**
 * 微博自动登录工具 - 简化版
 * 基于现有Cookie机制，提供友好的用户界面
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class WeiboSimpleLoginTool {
  constructor() {
    this.rl = null;
    this.loginUrl = 'https://weibo.com/login.php';
    this.cookieData = null;
  }

  /**
   * 启动工具
   */
  async start() {
    console.log('🔐 微博登录辅助工具 - 简化版');
    console.log('=' .repeat(60));
    console.log('');
    console.log('💡 功能说明：');
    console.log('  • 提供友好的Cookie获取指导');
    console.log('  • 支持多种Cookie获取方式');
    console.log('  • 自动验证Cookie有效性');
    console.log('  • 一键保存到配置文件');
    console.log('');

    try {
      // 显示当前状态
      await this.showCurrentStatus();
      
      // 选择操作模式
      const mode = await this.selectMode();
      
      switch (mode) {
        case 'guide':
          await this.guideMode();
          break;
        case 'manual':
          await this.manualMode();
          break;
        case 'auto':
          await this.autoMode();
          break;
        case 'status':
          await this.statusMode();
          break;
        case 'exit':
          console.log('\n👋 感谢使用，再见！');
          break;
      }
      
    } catch (error) {
      console.error('\n❌ 程序执行失败:', error.message);
    } finally {
      this.cleanup();
    }
  }

  /**
   * 显示当前状态
   */
  async showCurrentStatus() {
    console.log('📊 当前系统状态：');
    console.log('-' .repeat(40));
    
    // 检查Cookie配置
    const weiboCookie = process.env.WEIBO_COOKIE;
    if (weiboCookie) {
      console.log('✅ WEIBO_COOKIE: 已配置');
      console.log(`📊 Cookie长度: ${weiboCookie.length} 字符`);
      
      // 检查关键Cookie字段
      const hasSUB = weiboCookie.includes('SUB=');
      const hasSUBP = weiboCookie.includes('SUBP=');
      const hasALF = weiboCookie.includes('ALF=');
      
      console.log(`${hasSUB ? '✅' : '❌'} SUB字段: ${hasSUB ? '存在' : '缺失'}`);
      console.log(`${hasSUBP ? '✅' : '❌'} SUBP字段: ${hasSUBP ? '存在' : '缺失'}`);
      console.log(`${hasALF ? '✅' : '❌'} ALF字段: ${hasALF ? '存在' : '缺失'}`);
      
      // 验证Cookie有效性
      const isValid = await this.verifyCookie(weiboCookie);
      console.log(`${isValid ? '✅' : '⚠️'} Cookie有效性: ${isValid ? '有效' : '可能无效'}`);
    } else {
      console.log('❌ WEIBO_COOKIE: 未配置');
      console.log('💡 需要获取微博Cookie才能采集真实数据');
    }
    
    console.log('');
  }

  /**
   * 选择模式
   */
  async selectMode() {
    console.log('📋 选择操作模式：');
    console.log('1. 🎯 引导模式（推荐）- 详细指导获取Cookie');
    console.log('2. 📝 手动模式 - 直接输入Cookie字符串');
    console.log('3. 🤖 自动模式 - 模拟自动登录（演示版）');
    console.log('4. 📊 状态模式 - 检查当前Cookie状态');
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
      '1': 'guide',
      '2': 'manual',
      '3': 'auto',
      '4': 'status',
      '5': 'exit'
    };

    return modeMap[choice] || 'exit';
  }

  /**
   * 引导模式
   */
  async guideMode() {
    console.log('\n🎯 引导模式 - 详细Cookie获取指导');
    console.log('=' .repeat(50));
    console.log('');
    console.log('📱 步骤1：在浏览器中登录微博');
    console.log('   • 打开浏览器，访问 https://weibo.com');
    console.log('   • 使用您的微博账号登录');
    console.log('   • 确保登录成功，看到微博首页');
    console.log('');
    console.log('🔍 步骤2：获取Cookie（选择一种方法）');
    console.log('');
    console.log('方法A：开发者工具（推荐）');
    console.log('   1. 按 F12 打开开发者工具');
    console.log('   2. 切换到 Application/应用 标签');
    console.log('   3. 左侧找到 Cookies → https://weibo.com');
    console.log('   4. 全选所有Cookie（Ctrl+A）');
    console.log('   5. 右键点击 → 复制 → 复制所有');
    console.log('');
    console.log('方法B：JavaScript控制台');
    console.log('   1. 按 F12 打开开发者工具');
    console.log('   2. 切换到 Console/控制台 标签');
    console.log('   3. 输入：document.cookie');
    console.log('   4. 复制输出的完整内容');
    console.log('');
    console.log('方法C：浏览器扩展');
    console.log('   1. 安装 Cookie-Editor 扩展');
    console.log('   2. 点击扩展图标');
    console.log('   3. 选择 Export/导出');
    console.log('   4. 复制导出的内容');
    console.log('');

    const answer = await this.askQuestion('完成上述步骤后，按回车继续...');
    
    // 进入手动输入模式
    await this.manualMode();
  }

  /**
   * 手动模式
   */
  async manualMode() {
    console.log('\n📝 手动模式 - 输入Cookie');
    console.log('=' .repeat(50));
    console.log('');
    console.log('💡 请粘贴您获取的Cookie字符串：');
    console.log('   • 确保包含完整的Cookie内容');
    console.log('   • 格式应该类似：SUB=_xxx; SUBP=_xxx; ALF=xxx');
    console.log('   • 长度通常在200-1000字符之间');
    console.log('');

    const cookieString = await this.askQuestion('请输入Cookie字符串：');
    
    if (!cookieString || cookieString.trim() === '') {
      console.log('\n❌ 未输入Cookie，操作取消');
      return;
    }

    console.log('\n🔍 正在验证Cookie格式...');
    
    // 验证Cookie格式
    const trimmedCookie = cookieString.trim();
    const validation = this.validateCookieFormat(trimmedCookie);
    
    if (!validation.isValid) {
      console.log('\n⚠️  Cookie格式验证结果：');
      console.log(`   长度: ${trimmedCookie.length} 字符`);
      console.log(`   状态: ${validation.isValid ? '有效' : '可能有问题'}`);
      console.log(`   问题: ${validation.issues.join(', ')}`);
      
      const continueAnswer = await this.askQuestion('\n是否继续保存？(y/n): ');
      if (continueAnswer.toLowerCase() !== 'y') {
        console.log('\n❌ 操作取消');
        return;
      }
    } else {
      console.log('\n✅ Cookie格式验证通过！');
      console.log(`   长度: ${trimmedCookie.length} 字符`);
      console.log(`   关键字段: ${validation.importantFields.join(', ')}`);
    }

    // 验证Cookie有效性
    console.log('\n🔍 正在验证Cookie有效性...');
    const isValid = await this.verifyCookie(trimmedCookie);
    
    if (isValid) {
      console.log('✅ Cookie验证通过！可以正常访问微博');
    } else {
      console.log('⚠️  Cookie可能无效，但仍可保存用于测试');
    }

    // 保存配置
    await this.saveCookieConfiguration(trimmedCookie, isValid);
  }

  /**
   * 自动模式（演示版）
   */
  async autoMode() {
    console.log('\n🤖 自动模式 - 模拟自动登录');
    console.log('=' .repeat(50));
    console.log('');
    console.log('⚠️  重要说明：');
    console.log('   由于技术限制，当前版本无法真正实现自动登录');
    console.log('   此模式将为您提供详细的Cookie获取指导');
    console.log('   并模拟自动登录的流程');
    console.log('');
    console.log('📝 模拟自动登录步骤：');
    console.log('   1. 打开浏览器访问微博登录页');
    console.log('   2. 自动填写用户名和密码');
    console.log('   3. 处理验证码（如需要）');
    console.log('   4. 登录成功后提取Cookie');
    console.log('   5. 自动保存Cookie到配置文件');
    console.log('');
    console.log('💡 实际操作建议：');
    console.log('   请使用"引导模式"或"手动模式"获取Cookie');
    console.log('   未来版本将集成真正的自动登录功能');
    console.log('');

    const answer = await this.askQuestion('是否继续查看详细指导？(y/n): ');
    if (answer.toLowerCase() === 'y') {
      await this.guideMode();
    } else {
      console.log('\n👋 返回主菜单');
    }
  }

  /**
   * 状态模式
   */
  async statusMode() {
    console.log('\n📊 状态模式 - 详细状态检查');
    console.log('=' .repeat(50));
    console.log('');

    const weiboCookie = process.env.WEIBO_COOKIE;
    
    if (!weiboCookie) {
      console.log('❌ 当前未配置微博Cookie');
      console.log('💡 建议：使用引导模式获取Cookie');
      return;
    }

    console.log('🔍 Cookie详细信息：');
    console.log(`📊 总长度: ${weiboCookie.length} 字符`);
    console.log('');

    // 解析Cookie字段
    const cookies = this.parseCookieString(weiboCookie);
    console.log('📋 Cookie字段分析：');
    
    const importantFields = ['SUB', 'SUBP', 'ALF', 'SCF', 'SSOLoginState', 'SRT', 'SUP'];
    importantFields.forEach(field => {
      const hasField = cookies[field] !== undefined;
      const value = cookies[field];
      const displayValue = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'N/A';
      
      console.log(`${hasField ? '✅' : '❌'} ${field}: ${hasField ? displayValue : '缺失'}`);
    });

    console.log('');
    console.log('🔍 Cookie有效性测试：');
    const isValid = await this.verifyCookie(weiboCookie);
    console.log(`${isValid ? '✅' : '⚠️'} 网络验证: ${isValid ? 'Cookie有效' : 'Cookie可能无效'}`);

    if (isValid) {
      console.log('');
      console.log('🎉 Cookie状态良好，可以正常使用！');
      console.log('💡 建议：Cookie有效期通常为30天左右');
      console.log('     如发现采集异常，请重新获取Cookie');
    } else {
      console.log('');
      console.log('⚠️  Cookie可能存在问题，建议：');
      console.log('   1. 重新获取Cookie');
      console.log('   2. 检查网络连接');
      console.log('   3. 验证微博账号状态');
    }
  }

  /**
   * Cookie格式验证
   */
  validateCookieFormat(cookieString) {
    const issues = [];
    const importantFields = {};

    // 基本格式检查
    if (cookieString.length < 50) {
      issues.push('Cookie过短，可能不完整');
    }

    if (cookieString.length > 2000) {
      issues.push('Cookie过长，可能包含多余内容');
    }

    // 检查关键字段
    const hasSUB = cookieString.includes('SUB=');
    const hasSUBP = cookieString.includes('SUBP=');
    const hasALF = cookieString.includes('ALF=');

    if (!hasSUB) {
      issues.push('缺少SUB字段（主要认证Cookie）');
    }

    if (!hasSUBP) {
      issues.push('缺少SUBP字段（子域名认证）');
    }

    if (!hasALF) {
      issues.push('缺少ALF字段（登录有效期）');
    }

    // 格式检查
    if (!cookieString.includes('=')) {
      issues.push('Cookie格式错误，缺少等号分隔');
    }

    if (!cookieString.includes(';')) {
      issues.push('Cookie格式错误，缺少分号分隔');
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      importantFields: ['SUB', 'SUBP', 'ALF'].filter(field => cookieString.includes(field + '='))
    };
  }

  /**
   * Cookie有效性验证
   */
  async verifyCookie(cookieString) {
    try {
      console.log('🌐 正在测试网络连接...');
      
      const response = await axios.get('https://weibo.cn', {
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      const html = response.data;
      
      // 检查登录状态标识
      const isLoggedIn = html.includes('我的微博') || 
                        html.includes('账号设置') || 
                        html.includes('title="') && html.includes('的微博"');

      if (isLoggedIn) {
        // 尝试提取用户名
        const usernameMatch = html.match(/title="(.*?)的微博"/);
        if (usernameMatch) {
          console.log(`👤 检测到登录用户: ${usernameMatch[1]}`);
        }
        return true;
      }

      return false;
      
    } catch (error) {
      console.log(`❌ Cookie验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 解析Cookie字符串
   */
  parseCookieString(cookieString) {
    const cookies = {};
    const cookieArray = cookieString.split(';');
    
    cookieArray.forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name && valueParts.length > 0) {
        cookies[name.trim()] = valueParts.join('=').trim();
      }
    });

    return cookies;
  }

  /**
   * 保存Cookie配置
   */
  async saveCookieConfiguration(cookieString, isValid) {
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

      // 移除旧的WEIBO相关配置
      const lines = currentConfig.split('\n').filter(line => 
        !line.trim().startsWith('WEIBO_COOKIE=') &&
        !line.trim().startsWith('WEIBO_SEARCH_URL=') &&
        !line.trim().startsWith('WEIBO_MAX_PAGES=') &&
        !line.trim().startsWith('WEIBO_DELAY=')
      );

      // 构建新配置
      const newConfig = lines.join('\n').trim() + 
        `\n\n# 微博数据采集配置\n` +
        `# 生成时间: ${new Date().toLocaleString()}\n` +
        `# Cookie有效性: ${isValid ? '有效' : '待验证'}\n` +
        `WEIBO_COOKIE=${cookieString}\n` +
        `WEIBO_SEARCH_URL=https://s.weibo.com/weibo?q={keyword}&page={page}\n` +
        `WEIBO_MAX_PAGES=5\n` +
        `WEIBO_DELAY=3000\n`;

      // 写入新配置
      fs.writeFileSync(envPath, newConfig);
      
      console.log('✅ Cookie配置已保存到 .env 文件');
      console.log('');
      console.log('🎉 Cookie配置完成！');
      console.log('');
      console.log('📋 下一步操作建议：');
      console.log('  1. 测试数据采集功能');
      console.log('  2. 运行: npm run cli:v2 -- collect --keywords "热点" --platforms weibo');
      console.log('  3. 验证舆情分析功能');
      console.log('  4. 定期检查和更新Cookie（约30天有效期）');
      
    } catch (error) {
      console.error('❌ 保存配置失败:', error.message);
      console.log('\n💡 解决建议：');
      console.log('  • 检查文件写入权限');
      console.log('  • 确保磁盘空间充足');
      console.log('  • 手动复制配置内容到 .env 文件');
      
      // 显示手动配置内容
      console.log('\n📄 手动配置内容：');
      console.log('```');
      console.log(`WEIBO_COOKIE=${cookieString}`);
      console.log('WEIBO_SEARCH_URL=https://s.weibo.com/weibo?q={keyword}&page={page}');
      console.log('WEIBO_MAX_PAGES=5');
      console.log('WEIBO_DELAY=3000');
      console.log('```');
    }
  }

  /**
   * 提问辅助函数
   */
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

// 如果直接运行此脚本
if (require.main === module) {
  const tool = new WeiboSimpleLoginTool();
  tool.start().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { WeiboSimpleLoginTool };