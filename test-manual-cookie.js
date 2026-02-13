/**
 * 测试手动Cookie配置功能
 */

const { WeiboQRLoginHelper } = require('./weibo-qr-login-helper');

async function testManualCookie() {
  console.log('🧪 测试手动Cookie配置功能');
  console.log('=' .repeat(50));
  
  const helper = new WeiboQRLoginHelper({
    showQRInTerminal: false,
    saveQRCode: false
  });
  
  try {
    // 模拟手动Cookie输入
    const testCookie = 'SUB=_2AkMT123456789; SUBP=0033WrSXqPxfM72-Ws9jqgMFabcdef; ALF=1234567890; SCF=Aj123456789; SSOLoginState=1234567890';
    
    console.log('📝 测试Cookie格式验证...');
    const isValid = helper.validateCookieFormat(testCookie);
    console.log(`✅ Cookie格式验证: ${isValid ? '通过' : '失败'}`);
    
    if (isValid) {
      console.log('💾 测试Cookie保存功能...');
      
      // 模拟保存配置
      await helper.saveCookieConfiguration({
        cookies: testCookie,
        userInfo: { 
          screen_name: '测试用户', 
          uid: '1234567890',
          followers_count: 1000,
          verified: true
        }
      });
      
      console.log('✅ Cookie配置保存成功！');
      console.log('👤 用户信息:');
      console.log('   用户名: 测试用户');
      console.log('   UID: 1234567890');
      console.log('   Cookie长度: 115 字符');
    }
    
    // 验证保存的Cookie
    console.log('\n🔍 验证保存的Cookie配置...');
    const savedCookie = process.env.WEIBO_COOKIE;
    if (savedCookie) {
      console.log(`✅ 检测到已保存的Cookie: ${savedCookie.substring(0, 50)}...`);
      
      // 验证Cookie有效性
      const isValidCookie = await helper.validateCookie(savedCookie);
      console.log(`✅ Cookie有效性验证: ${isValidCookie ? '有效' : '无效'}`);
    } else {
      console.log('⚠️ 未检测到保存的Cookie');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
  
  console.log('\n🏁 手动Cookie配置测试完成！');
}

// 如果直接运行
if (require.main === module) {
  testManualCookie().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testManualCookie };