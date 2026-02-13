/**
 * 微博舆情系统演示
 * 展示完整的二维码登录、数据收集和分析功能
 */

const DemoDataCollector = require('./demo-data-collector');
const PublicOpinionSystemSimplified = require('./src/index-simplified');
const logger = require('./src/utils/logger');

async function runDemo() {
  console.log('🎉 微博舆情系统完整功能演示');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    // 第一步：演示二维码登录（模拟）
    console.log('🔐 第一步：微博二维码登录配置');
    console.log('-' .repeat(40));
    console.log('✅ 检测到演示模式，使用模拟Cookie配置');
    console.log('📱 二维码登录流程：');
    console.log('   1. 终端显示微博登录二维码');
    console.log('   2. 用户使用手机微博扫描二维码');
    console.log('   3. 系统自动提取并保存Cookie');
    console.log('   4. 配置完成，可以开始数据采集');
    console.log('');
    
    // 第二步：演示数据收集
    console.log('📊 第二步：微博数据采集');
    console.log('-' .repeat(40));
    
    const demoCollector = new DemoDataCollector();
    const keywords = ['人工智能', '科技', '热点'];
    
    for (const keyword of keywords) {
      console.log(`🎯 正在采集关键词：${keyword}`);
      const results = await demoCollector.search(keyword, 3);
      
      console.log(`✅ 采集到 ${results.length} 条数据`);
      
      if (results.length > 0) {
        console.log('📋 数据样本：');
        results.slice(0, 2).forEach((item, index) => {
          console.log(`\n   ${index + 1}. 【${item.platform}】${item.author}`);
          console.log(`      ${item.content.substring(0, 80)}...`);
          console.log(`      👍${item.likes} 🔄${item.reposts} 💬${item.comments} | ${item.time}`);
        });
      }
      console.log('');
    }
    
    // 第三步：演示数据分析
    console.log('🤖 第三步：国产LLM智能分析');
    console.log('-' .repeat(40));
    
    const opinionSystem = new PublicOpinionSystemSimplified();
    await opinionSystem.initialize();
    
    console.log('🚀 正在初始化舆情分析系统...');
    console.log('📚 使用国产大模型：通义千问');
    console.log('🔍 分析维度：情感、风险、影响力、趋势');
    console.log('');
    
    // 模拟分析结果
    const demoAnalysis = {
      success: true,
      data: {
        keyword: '人工智能',
        rawDataCount: 15,
        analyzedCount: 15,
        savedCount: 15,
        report: {
          statistics: {
            sentiment: {
              positive: 8,
              negative: 2,
              neutral: 5,
              percentages: { positive: '53.3%', negative: '13.3%', neutral: '33.3%' },
              averageConfidence: 0.85
            },
            risk: {
              low: 12,
              medium: 3,
              high: 0,
              percentages: { low: '80.0%', medium: '20.0%', high: '0.0%' },
              averageLevel: 2.1
            },
            influence: {
              low: 5,
              medium: 8,
              high: 2,
              percentages: { low: '33.3%', medium: '53.3%', high: '13.3%' },
              averageScore: 6.8
            },
            trends: {
              rising: 10,
              stable: 4,
              falling: 1,
              percentages: { rising: '66.7%', stable: '26.7%', falling: '6.7%' }
            },
            topics: [
              { topic: '技术发展', count: 8, percentage: '53.3%' },
              { topic: '产业应用', count: 5, percentage: '33.3%' },
              { topic: '未来趋势', count: 2, percentage: '13.3%' }
            ],
            keywords: [
              { keyword: '人工智能', count: 15, percentage: '100.0%' },
              { keyword: 'AI技术', count: 12, percentage: '80.0%' },
              { keyword: '创新', count: 8, percentage: '53.3%' },
              { keyword: '发展', count: 7, percentage: '46.7%' }
            ]
          },
          recommendations: [
            '人工智能话题整体情感积极，技术发展前景乐观',
            '建议关注AI技术在各行业的应用落地情况',
            '中等风险话题需要持续监控，防止技术滥用',
            '高影响力博主的发声值得重点关注和分析'
          ]
        }
      }
    };
    
    console.log('📊 分析结果摘要：');
    console.log(`📈 情感分析：正面 53.3% | 负面 13.3% | 中性 33.3%`);
    console.log(`⚠️ 风险评估：低风险 80% | 中等风险 20% | 高风险 0%`);
    console.log(`🌟 影响力：平均得分 6.8/10`);
    console.log(`📈 趋势预测：上升趋势 66.7% | 稳定 26.7% | 下降 6.7%`);
    console.log('');
    
    console.log('🏷️ 主要话题：');
    console.log('   • 技术发展 (53.3%)');
    console.log('   • 产业应用 (33.3%)');
    console.log('   • 未来趋势 (13.3%)');
    console.log('');
    
    console.log('🔑 核心关键词：');
    console.log('   • 人工智能 (100%)');
    console.log('   • AI技术 (80%)');
    console.log('   • 创新 (53.3%)');
    console.log('');
    
    console.log('💡 智能建议：');
    demoAnalysis.data.report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
    
    // 第四步：展示完整工作流程
    console.log('');
    console.log('🔄 第四步：完整工作流程演示');
    console.log('-' .repeat(40));
    console.log('✅ 二维码登录 → 数据采集 → 智能分析 → 报告生成');
    console.log('');
    console.log('📝 系统特色：');
    console.log('   • 专注微博平台，深度挖掘社交媒体数据');
    console.log('   • 国产LLM智能分析，支持多维度舆情研判');
    console.log('   • 简洁易用的CLI界面，一键完成复杂操作');
    console.log('   • 支持二维码登录，Cookie自动配置');
    console.log('   • 智能备用方案，确保数据获取稳定性');
    console.log('');
    
    console.log('🎯 使用建议：');
    console.log('   • 定期更新Cookie，保持数据采集的连续性');
    console.log('   • 合理设置采集频率，避免对目标网站造成压力');
    console.log('   • 结合多个关键词进行综合分析，获得更全面洞察');
    console.log('   • 关注系统推荐，及时调整监控策略');
    
  } catch (error) {
    console.error('❌ 演示失败:', error.message);
    logger.error('演示失败', error);
  }
  
  console.log('');
  console.log('🎉 演示完成！');
  console.log('=' .repeat(60));
  console.log('');
  console.log('📖 使用帮助：');
  console.log('   二维码登录: node weibo-qr-login-helper.js');
  console.log('   数据采集: npm run weibo:collect 关键词');
  console.log('   舆情分析: npm run weibo:analyze 关键词');
  console.log('   系统状态: npm run weibo:status');
}

// 如果直接运行
if (require.main === module) {
  runDemo().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { runDemo };