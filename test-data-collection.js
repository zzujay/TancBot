/**
 * 测试数据收集功能
 */

const WeiboCollector = require('./src/data-collection/weibo-collector-simplified');

async function testDataCollection() {
  console.log('🧪 测试微博数据收集功能');
  console.log('=' .repeat(50));
  
  const collector = new WeiboCollector({
    maxResults: 3,
    timeout: 10000
  });
  
  try {
    console.log('📡 测试网络连接...');
    const connectionTest = await collector.testConnection();
    console.log(`✅ 网络连接测试: ${connectionTest ? '通过' : '失败'}`);
    
    console.log('\n🔍 测试关键词搜索...');
    const keywords = ['人工智能', '科技', '新闻'];
    
    for (const keyword of keywords) {
      console.log(`\n📝 测试关键词: ${keyword}`);
      try {
        const results = await collector.search(keyword, 2);
        console.log(`✅ 找到 ${results.length} 条结果`);
        
        if (results.length > 0) {
          console.log('📋 样本数据:');
          results.slice(0, 1).forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.content.substring(0, 60)}...`);
            console.log(`     作者: ${item.author} | 平台: ${item.platform}`);
            console.log(`     👍 ${item.likes} 🔄 ${item.reposts} 💬 ${item.comments}`);
          });
        }
      } catch (error) {
        console.log(`❌ 关键词 "${keyword}" 搜索失败: ${error.message}`);
      }
    }
    
    console.log('\n📊 收集器状态:');
    const status = collector.getStatus();
    console.log(JSON.stringify(status, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
  
  console.log('\n🏁 测试完成！');
}

// 如果直接运行
if (require.main === module) {
  testDataCollection().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testDataCollection };