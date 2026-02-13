/**
 * 简化版微博Cookie获取工具
 * 快速配置微博Cookie
 */

const fs = require('fs');
const path = require('path');

console.log('🍪 简化版微博Cookie配置工具');
console.log('=' .repeat(50));
console.log('\n📋 快速配置步骤：');
console.log('1. 打开浏览器，访问 https://weibo.com');
console.log('2. 登录您的微博账号');
console.log('3. 按F12打开开发者工具');
console.log('4. 切换到Application/Application标签');
console.log('5. 左侧找到Cookies → https://weibo.com');
console.log('6. 全选所有Cookie，复制完整字符串');
console.log('7. 粘贴到下方输入框\n');

// 创建简单的输入接口
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('👆 完成上述步骤后，请粘贴Cookie字符串：\n', (cookieString) => {
  if (!cookieString || cookieString.trim() === '') {
    console.log('\n❌ 未输入Cookie，程序退出');
    console.log('💡 请重新运行此工具完成配置');
    rl.close();
    return;
  }

  console.log('\n🔍 正在验证Cookie格式...');
  
  // 基本格式验证
  const trimmedCookie = cookieString.trim();
  const hasSUB = trimmedCookie.includes('SUB=');
  const hasSUBP = trimmedCookie.includes('SUBP=');
  const cookieLength = trimmedCookie.length;

  console.log(`📊 Cookie长度: ${cookieLength} 字符`);
  console.log(`${hasSUB ? '✅' : '⚠️'} SUB字段: ${hasSUB ? '存在' : '缺失'}`);
  console.log(`${hasSUBP ? '✅' : '⚠️'} SUBP字段: ${hasSUBP ? '存在' : '缺失'}`);

  if (!hasSUB || !hasSUBP) {
    console.log('\n⚠️  Cookie可能不完整，建议重新获取');
    const confirm = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    confirm.question('\n是否继续保存？(y/n): ', (answer) => {
      if (answer.toLowerCase() !== 'y') {
        console.log('\n❌ 配置取消，程序退出');
        confirm.close();
        rl.close();
        return;
      }
      saveConfiguration(trimmedCookie);
      confirm.close();
    });
  } else {
    saveConfiguration(trimmedCookie);
  }
});

function saveConfiguration(cookieString) {
  console.log('\n💾 正在保存配置...');
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    const backupPath = envPath + '.backup.' + Date.now();
    
    // 读取当前配置
    let currentConfig = '';
    if (fs.existsSync(envPath)) {
      currentConfig = fs.readFileSync(envPath, 'utf8');
      
      // 备份原文件
      fs.writeFileSync(backupPath, currentConfig);
      console.log(`✅ 已备份原配置: ${path.basename(backupPath)}`);
    }
    
    // 移除旧的WEIBO_COOKIE配置
    const lines = currentConfig.split('\n');
    const filteredLines = lines.filter(line => 
      !line.trim().startsWith('WEIBO_COOKIE=') && 
      !line.trim().startsWith('WEIBO_SEARCH_URL=') &&
      !line.trim().startsWith('WEIBO_MAX_PAGES=') &&
      !line.trim().startsWith('WEIBO_DELAY=')
    );
    
    // 构建新配置
    const newConfig = filteredLines.join('\n').trim() + 
      `\n\n# 微博数据采集配置\n` +
      `# 生成时间: ${new Date().toLocaleString()}\n` +
      `WEIBO_COOKIE=${cookieString}\n` +
      `WEIBO_SEARCH_URL=https://s.weibo.com/weibo?q={keyword}&page={page}\n` +
      `WEIBO_MAX_PAGES=5\n` +
      `WEIBO_DELAY=3000\n`;
    
    // 写入新配置
    fs.writeFileSync(envPath, newConfig);
    
    console.log('✅ Cookie配置已保存到 .env 文件');
    console.log('📄 配置摘要：');
    console.log(`   🍪 Cookie长度: ${cookieString.length} 字符`);
    console.log(`   🔍 搜索URL: https://s.weibo.com/weibo`);
    console.log(`   📊 最大页数: 5页`);
    console.log(`   ⏰ 请求间隔: 3秒`);
    
    console.log('\n🎉 Cookie配置完成！');
    console.log('\n📋 下一步：');
    console.log('   1. 测试数据采集功能');
    console.log('   2. 运行: node quick-data-test.js');
    console.log('   3. 开始采集微博数据');
    console.log('   4. 分析采集到的数据');
    
  } catch (error) {
    console.error('\n❌ 保存配置失败:', error.message);
    console.log('\n💡 解决建议：');
    console.log('   1. 检查文件权限');
    console.log('   2. 确保磁盘空间充足');
    console.log('   3. 手动复制配置内容到 .env 文件');
    
    // 显示配置内容供手动复制
    console.log('\n📄 手动配置内容：');
    console.log('```');
    console.log(`WEIBO_COOKIE=${cookieString}`);
    console.log('WEIBO_SEARCH_URL=https://s.weibo.com/weibo?q={keyword}&page={page}');
    console.log('WEIBO_MAX_PAGES=5');
    console.log('WEIBO_DELAY=3000');
    console.log('```');
  }
  
  rl.close();
}

// 显示完成信息
console.log('\n' + '='.repeat(50));
console.log('🎯 配置完成！');
console.log('='.repeat(50));