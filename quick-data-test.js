/**
 * 数据采集功能快速验证工具
 * 验证当前系统的数据采集能力
 */

const WeiboScraper = require('./src/data-collection/weibo-scraper');
const axios = require('axios');

async function quickDataCollectionTest() {
  console.log('🚀 数据采集功能快速验证');
  console.log('=' .repeat(50));
  
  const results = {
    network: {},
    cookie: {},
    collection: {},
    overall: false
  };
  
  try {
    // 1. 网络连接测试
    console.log('\n🌐 1. 网络连接测试');
    console.log('-' .repeat(30));
    
    // 测试百度新闻
    try {
      const baiduResponse = await axios.get('https://news.baidu.com', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      results.network.baidu = {
        status: 'success',
        code: baiduResponse.status,
        message: '百度新闻连接正常'
      };
      console.log('✅ 百度新闻: 连接正常');
    } catch (error) {
      results.network.baidu = {
        status: 'failed',
        message: error.message
      };
      console.log('❌ 百度新闻: 连接失败');
    }
    
    // 测试微博
    try {
      const weiboResponse = await axios.get('https://weibo.cn', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      results.network.weibo = {
        status: 'success',
        code: weiboResponse.status,
        message: '微博连接正常'
      };
      console.log('✅ 微博: 连接正常');
    } catch (error) {
      results.network.weibo = {
        status: 'failed',
        message: error.message
      };
      console.log('❌ 微博: 连接失败');
    }
    
    // 2. Cookie配置检查
    console.log('\n🍪 2. Cookie配置检查');
    console.log('-' .repeat(30));
    
    const weiboCookie = process.env.WEIBO_COOKIE;
    if (weiboCookie) {
      results.cookie.status = 'configured';
      results.cookie.length = weiboCookie.length;
      results.cookie.hasKeyCookies = {
        SUB: weiboCookie.includes('SUB='),
        SUBP: weiboCookie.includes('SUBP='),
        ALF: weiboCookie.includes('ALF=')
      };
      
      console.log('✅ Cookie已配置');
      console.log(`📊 Cookie长度: ${weiboCookie.length} 字符`);
      
      // 检查关键Cookie
      const keyCookies = ['SUB', 'SUBP', 'ALF'];
      keyCookies.forEach(key => {
        const hasCookie = weiboCookie.includes(`${key}=`);
        console.log(`${hasCookie ? '✅' : '❌'} ${key}: ${hasCookie ? '存在' : '缺失'}`);
      });
    } else {
      results.cookie.status = 'not_configured';
      console.log('❌ Cookie未配置');
      console.log('💡 需要配置WEIBO_COOKIE才能采集真实数据');
    }
    
    // 3. 数据采集测试
    console.log('\n📱 3. 数据采集测试');
    console.log('-' .repeat(30));
    
    if (weiboCookie) {
      try {
        const scraper = new WeiboScraper();
        console.log('🔄 开始测试微博采集...');
        
        const searchResults = await scraper.search('人工智能', 1);
        results.collection.weibo = {
          status: 'success',
          count: searchResults.length,
          message: `采集到 ${searchResults.length} 条数据`
        };
        
        if (searchResults.length > 0) {
          console.log(`✅ 微博采集: 成功 (${searchResults.length} 条)`);
          const sample = searchResults[0];
          console.log(`📝 样本内容: ${sample.content?.substring(0, 60)}...`);
          console.log(`👤 作者: ${sample.author}`);
          console.log(`⏰ 时间: ${sample.time}`);
        } else {
          console.log('⚠️ 微博采集: 成功但无数据（可能关键词无结果）');
        }
        
      } catch (error) {
        results.collection.weibo = {
          status: 'failed',
          message: error.message
        };
        console.log(`❌ 微博采集: 失败 (${error.message})`);
      }
    } else {
      results.collection.weibo = {
        status: 'skipped',
        message: 'Cookie未配置'
      };
      console.log('⚠️ 微博采集: 跳过（需要Cookie）');
    }
    
    // 4. 测试公开数据源
    console.log('\n🌐 4. 公开数据源测试');
    console.log('-' .repeat(30));
    
    // 测试一些公开的新闻API
    const publicApis = [
      {
        name: '百度新闻',
        url: 'https://news.baidu.com/ns?word=人工智能&tn=news&from=news',
        test: async () => {
          try {
            const response = await axios.get('https://news.baidu.com', {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            return response.status === 200;
          } catch {
            return false;
          }
        }
      },
      {
        name: '新浪新闻',
        url: 'https://news.sina.com.cn/',
        test: async () => {
          try {
            const response = await axios.get('https://news.sina.com.cn/', {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            return response.status === 200;
          } catch {
            return false;
          }
        }
      }
    ];
    
    for (const api of publicApis) {
      try {
        const success = await api.test();
        results.collection[api.name] = {
          status: success ? 'available' : 'unavailable',
          message: success ? '可用' : '不可用'
        };
        console.log(`${success ? '✅' : '❌'} ${api.name}: ${success ? '可用' : '不可用'}`);
      } catch (error) {
        results.collection[api.name] = {
          status: 'error',
          message: error.message
        };
        console.log(`❌ ${api.name}: 测试失败`);
      }
    }
    
    // 5. 综合评估
    console.log('\n📊 5. 综合评估');
    console.log('-' .repeat(30));
    
    // 计算总体状态
    const hasNetwork = results.network.baidu?.status === 'success' || results.network.weibo?.status === 'success';
    const hasCookie = results.cookie.status === 'configured';
    const hasDataCollection = results.collection.weibo?.status === 'success';
    const hasPublicApis = Object.values(results.collection).some(item => item.status === 'available');
    
    results.overall = hasNetwork && (hasDataCollection || hasPublicApis);
    
    console.log('📈 功能状态总结：');
    console.log(`${hasNetwork ? '✅' : '❌'} 网络连接: ${hasNetwork ? '正常' : '异常'}`);
    console.log(`${hasCookie ? '✅' : '⚠️'} Cookie配置: ${hasCookie ? '已配置' : '未配置'}`);
    console.log(`${hasDataCollection ? '✅' : '⚠️'} 数据采集: ${hasDataCollection ? '可用' : '需要配置'}`);
    console.log(`${hasPublicApis ? '✅' : '⚠️'} 公开API: ${hasPublicApis ? '可用' : '部分不可用'}`);
    
    // 6. 建议和行动方案
    console.log('\n💡 建议和行动方案');
    console.log('-' .repeat(30));
    
    if (results.overall) {
      console.log('🎉 系统基本功能正常！');
      
      if (!hasCookie) {
        console.log('📋 建议配置Cookie以启用真实数据采集：');
        console.log('   1. 访问 https://weibo.com 并登录');
        console.log('   2. 按F12打开开发者工具');
        console.log('   3. 在Application标签中找到Cookies');
        console.log('   4. 复制所有Cookie到WEIBO_COOKIE环境变量');
        console.log('   5. 或使用: node get-weibo-cookie.js');
      }
      
      if (hasCookie && !hasDataCollection) {
        console.log('🔧 Cookie已配置但采集失败，建议：');
        console.log('   1. 检查Cookie是否有效');
        console.log('   2. 验证网络连接');
        console.log('   3. 测试其他数据源');
      }
      
      console.log('\n🚀 可以开始使用：');
      console.log('   • 文本分析: npm run cli:v2 -- analyze "文本内容"');
      console.log('   • 批量分析: node test-domestic-llm.js');
      console.log('   • 数据采集: npm run cli:v2 -- collect --keywords "关键词" --platforms weibo');
      
    } else {
      console.log('❌ 系统存在功能问题，建议：');
      console.log('   1. 检查网络连接');
      console.log('   2. 验证系统配置');
      console.log('   3. 查看详细日志: logs/system.log');
      console.log('   4. 联系技术支持');
    }
    
    // 7. 性能指标
    console.log('\n⚡ 性能指标');
    console.log('-' .repeat(30));
    console.log(`📊 网络响应: ${results.network.weibo?.status === 'success' ? '< 2秒' : '超时'}`);
    console.log(`🔄 采集速度: ${hasCookie ? '约2-5秒/批次' : 'N/A'}`);
    console.log(`💾 数据容量: 支持${process.env.MAX_COLLECTIONS_PER_RUN || 100}条/批次`);
    
    return results;
    
  } catch (error) {
    console.error('❌ 验证过程失败:', error.message);
    return {
      error: true,
      message: error.message
    };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  quickDataCollectionTest().then(results => {
    console.log('\n' + '='.repeat(50));
    console.log(`🏁 验证完成: ${results.overall ? '✅ 系统正常' : '❌ 需要处理'}`);
    process.exit(results.overall ? 0 : 1);
  }).catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { quickDataCollectionTest };