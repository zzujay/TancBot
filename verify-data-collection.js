/**
 * 微博数据采集功能验证脚本
 * 测试当前系统的数据采集能力
 */

const WeiboScraper = require('./src/data-collection/weibo-scraper');
const EnhancedRealCollector = require('./src/data-collection/enhanced-real-collector');
const logger = require('./src/utils/logger');

async function verifyDataCollection() {
  console.log('🔍 开始验证数据采集功能...\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. 检查当前配置
    console.log('\n📋 第一步：检查系统配置');
    console.log('-' .repeat(40));
    
    const weiboCookie = process.env.WEIBO_COOKIE;
    const hasWeiboCookie = !!weiboCookie;
    
    console.log(`   WEIBO_COOKIE 配置状态: ${hasWeiboCookie ? '✅ 已配置' : '❌ 未配置'}`);
    if (hasWeiboCookie) {
      console.log(`   Cookie长度: ${weiboCookie.length} 字符`);
      console.log(`   Cookie预览: ${weiboCookie.substring(0, 50)}...`);
    }
    
    console.log(`   数据采集超时: ${process.env.COLLECTION_TIMEOUT || 30000}ms`);
    console.log(`   最大采集数量: ${process.env.MAX_COLLECTIONS_PER_RUN || 100}`);
    console.log(`   请求间隔: ${process.env.WEIBO_DELAY || 2000}ms`);
    
    // 2. 测试基础网络连接
    console.log('\n🌐 第二步：测试网络连接');
    console.log('-' .repeat(40));
    
    const axios = require('axios');
    
    // 测试百度新闻（公开API）
    try {
      console.log('   🔄 测试百度新闻连接...');
      const baiduTest = await axios.get('https://news.baidu.com', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      console.log(`   ✅ 百度新闻连接正常 (${baiduTest.status})`);
    } catch (error) {
      console.log(`   ❌ 百度新闻连接失败: ${error.message}`);
    }
    
    // 测试微博连接
    try {
      console.log('   🔄 测试微博连接...');
      const weiboTest = await axios.get('https://weibo.cn', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': weiboCookie || ''
        }
      });
      console.log(`   ✅ 微博连接正常 (${weiboTest.status})`);
      
      // 检查是否登录
      if (hasWeiboCookie) {
        const isLoggedIn = weiboTest.data.includes('我的微博') || weiboTest.data.includes('账号设置');
        console.log(`   ${isLoggedIn ? '✅' : '⚠️'} 微博登录状态: ${isLoggedIn ? '已登录' : '未登录或Cookie无效'}`);
      }
    } catch (error) {
      console.log(`   ❌ 微博连接失败: ${error.message}`);
    }
    
    // 3. 测试微博爬虫
    console.log('\n📱 第三步：测试微博爬虫');
    console.log('-' .repeat(40));
    
    const weiboScraper = new WeiboScraper();
    
    console.log('   🔄 测试微博搜索功能...');
    try {
      const searchResults = await weiboScraper.search('人工智能', 1);
      console.log(`   📊 搜索结果: ${searchResults.length} 条`);
      
      if (searchResults.length > 0) {
        console.log('   📝 样本数据:');
        const sample = searchResults[0];
        console.log(`      内容: ${sample.content?.substring(0, 60)}...`);
        console.log(`      作者: ${sample.author}`);
        console.log(`      时间: ${sample.time}`);
        console.log(`      点赞: ${sample.likes || 0}`);
        console.log(`      转发: ${sample.reposts || 0}`);
        console.log(`      评论: ${sample.comments || 0}`);
      } else {
        console.log('   ⚠️  未搜索到相关内容');
      }
    } catch (error) {
      console.log(`   ❌ 微博搜索失败: ${error.message}`);
    }
    
    // 4. 测试增强版采集器
    console.log('\n🔧 第四步：测试增强版采集器');
    console.log('-' .repeat(40));
    
    const enhancedCollector = new EnhancedRealCollector();
    
    console.log('   🔄 测试增强版数据采集...');
    try {
      const enhancedResults = await enhancedCollector.collectV2RealData('疫情', 10);
      console.log(`   📊 增强采集结果: ${enhancedResults.length} 条`);
      
      if (enhancedResults.length > 0) {
        console.log('   📝 样本数据:');
        const sample = enhancedResults[0];
        console.log(`      标题: ${sample.title?.substring(0, 60)}...`);
        console.log(`      内容: ${sample.content?.substring(0, 60)}...`);
        console.log(`      来源: ${sample.platform}`);
        console.log(`      时间: ${sample.publishTime}`);
        console.log(`      情感: ${sample.sentiment}`);
      }
    } catch (error) {
      console.log(`   ❌ 增强采集失败: ${error.message}`);
    }
    
    // 5. 测试多源采集
    console.log('\n🌐 第五步：测试多源采集');
    console.log('-' .repeat(40));
    
    try {
      const multiSourceCollector = require('./src/data-collection/multi-source-collector');
      
      const multiResults = await multiSourceCollector.collectFromMultipleSources({
        keywords: ['人工智能', '疫情'],
        platforms: ['weibo', 'news'],
        maxResults: 5
      });
      
      console.log(`   📊 多源采集结果: ${multiResults.length} 条`);
      
      // 按平台统计
      const platformStats = {};
      multiResults.forEach(item => {
        const platform = item.platform || 'unknown';
        platformStats[platform] = (platformStats[platform] || 0) + 1;
      });
      
      console.log('   📈 平台分布:');
      Object.entries(platformStats).forEach(([platform, count]) => {
        console.log(`      ${platform}: ${count} 条`);
      });
    } catch (error) {
      console.log(`   ❌ 多源采集失败: ${error.message}`);
    }
    
    // 6. 综合评估
    console.log('\n📊 第六步：综合评估');
    console.log('-' .repeat(40));
    
    const totalData = await getTotalDataCount();
    console.log(`   📈 数据库中总数据量: ${totalData} 条`);
    
    console.log('\n💡 使用建议:');
    if (!hasWeiboCookie) {
      console.log('   1. 🔑 配置微博Cookie以启用真实数据采集');
      console.log('   2. 📖 查看WEIBO_COLLECTION_GUIDE.md获取详细配置步骤');
      console.log('   3. 🧪 使用测试数据验证分析功能');
    } else {
      console.log('   1. ✅ 微博Cookie已配置，可以采集真实数据');
      console.log('   2. 🔄 建议定期更新Cookie（每1-2个月）');
      console.log('   3. ⚙️ 可根据需要调整采集参数');
    }
    
    console.log('   4. 📊 建议建立定期监控机制');
    console.log('   5. 🎯 关注数据采集质量和合规性');
    
  } catch (error) {
    console.error('❌ 验证过程失败:', error.message);
  }
}

// 获取数据库中的总数据量
async function getTotalDataCount() {
  try {
    const DatabaseManager = require('./src/utils/simple-database');
    const db = new DatabaseManager();
    const stats = await db.getStatistics();
    return stats.totalRecords || 0;
  } catch (error) {
    return 0;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  verifyDataCollection();
}

module.exports = { verifyDataCollection };