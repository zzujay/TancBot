/**
 * 高级功能演示 - 批量舆情分析
 * 展示国产LLM的多场景应用
 */

const EnhancedLLMAnalyzer = require('./src/ai-analysis/llm-enhanced-analyzer-improved');
const LLMConfigManager = require('./src/ai-analysis/llm-config-manager');

async function advancedDemo() {
  console.log('🚀 国产LLM高级功能演示\n');
  console.log('=' .repeat(70));
  
  try {
    // 初始化系统
    console.log('\n📋 第一步：初始化国产LLM系统');
    const configManager = LLMConfigManager.getInstance();
    await configManager.initialize();
    
    const analyzer = new EnhancedLLMAnalyzer();
    await analyzer.initialize();
    
    console.log('✅ 系统初始化完成');
    console.log(`   当前LLM: ${configManager.get('LLM_PROVIDER')} - ${configManager.get('LLM_MODEL')}`);
    
    // 场景一：品牌危机舆情分析
    console.log('\n🚨 场景一：品牌危机舆情分析');
    console.log('-' .repeat(50));
    
    const crisisContent = `
    某知名餐饮品牌被曝食品安全问题，多名消费者出现腹泻症状。事件发生后，该品牌股价大跌15%，市值蒸发50亿。
    消费者纷纷表示愤怒和失望，要求严惩相关企业。监管部门已介入调查，涉事门店已停业整顿。
    社交媒体上，#某品牌食品安全#话题阅读量超过10亿，讨论量达到500万条。
    业内专家呼吁加强食品安全监管，建立更严格的惩罚机制。
    `;
    
    console.log('📄 分析内容：食品安全危机事件');
    const crisisResult = await analyzer.analyzeContent(crisisContent, {
      type: 'comprehensive'
    });
    
    if (crisisResult.success) {
      console.log('📊 危机分析结果：');
      console.log(`   💭 情感倾向: ${crisisResult.analysis.sentiment?.label || '未知'} (置信度: ${(crisisResult.analysis.sentiment?.confidence * 100 || 0).toFixed(1)}%)`);
      console.log(`   ⚠️  风险等级: ${crisisResult.analysis.risk_level || 0}/10 ${crisisResult.analysis.risk_level >= 7 ? '🚨高风险' : crisisResult.analysis.risk_level >= 4 ? '⚠️中等风险' : '✅低风险'}`);
      console.log(`   🌟 影响力: ${crisisResult.analysis.influence_score || 0}/10`);
      console.log(`   🔥 热门话题: ${crisisResult.analysis.topics?.slice(0, 3).join(', ') || '无'}`);
      console.log(`   📈 趋势预测: ${crisisResult.analysis.trend_prediction || 'unknown'}`);
      
      // 危机应对建议
      if (crisisResult.analysis.risk_level >= 7) {
        console.log('\n🆘 危机应对建议：');
        console.log('   • 立即启动危机公关预案');
        console.log('   • 公开道歉并承担责任');
        console.log('   • 全面整改并邀请第三方监督');
        console.log('   • 建立长期食品安全保障机制');
      }
    }
    
    // 场景二：产品发布舆情分析
    console.log('\n📱 场景二：新产品发布舆情分析');
    console.log('-' .repeat(50));
    
    const productContent = `
    某科技公司发布新款智能手机，配备AI芯片和120Hz高刷屏，售价3999元起。发布会后，用户反响热烈，预售量突破100万台。
    消费者普遍赞赏其性价比和创新功能，特别是AI摄影和游戏性能。但也有用户担心电池续航和系统稳定性。
    科技媒体给予积极评价，认为该产品有望改变市场格局。竞争对手表示将加快产品研发进度。
    股市反应积极，该公司股价上涨8%，分析师上调目标价至4500元。
    `;
    
    console.log('📄 分析内容：新产品发布');
    const productResult = await analyzer.analyzeContent(productContent, {
      type: 'comprehensive'
    });
    
    if (productResult.success) {
      console.log('📊 产品发布分析结果：');
      console.log(`   💭 情感倾向: ${productResult.analysis.sentiment?.label || '未知'} (置信度: ${(productResult.analysis.sentiment?.confidence * 100 || 0).toFixed(1)}%)`);
      console.log(`   🌟 影响力: ${productResult.analysis.influence_score || 0}/10 ${productResult.analysis.influence_score >= 7 ? '🔥高影响' : productResult.analysis.influence_score >= 4 ? '📈中等影响' : '📊低影响'}`);
      console.log(`   📈 趋势预测: ${productResult.analysis.trend_prediction || 'unknown'}`);
      console.log(`   🏷️ 主要话题: ${productResult.analysis.topics?.slice(0, 3).join(', ') || '无'}`);
      
      // 市场策略建议
      if (productResult.analysis.sentiment?.label === '正面' && productResult.analysis.influence_score >= 6) {
        console.log('\n💡 市场策略建议：');
        console.log('   • 加大营销推广力度');
        console.log('   • 扩大产能满足需求');
        console.log('   • 收集用户反馈持续优化');
        console.log('   • 准备应对竞争对手反击');
      }
    }
    
    // 场景三：政策舆情分析
    console.log('\n🏛️ 场景三：政策舆情分析');
    console.log('-' .repeat(50));
    
    const policyContent = `
    政府发布新的房地产调控政策，包括限购限贷、增加土地供应、发展租赁住房等措施。
    购房者普遍持观望态度，期待房价下降；开发商表示将调整销售策略；投资者担心资产贬值。
    专家意见分歧，有人认为政策效果需要3-6个月显现，也有人担心政策过于严厉可能影响经济发展。
    社交媒体上讨论激烈，#房地产新政#话题持续发酵，各方观点交锋激烈。
    股市房地产板块大幅波动，多家房企股价跌停，银行股也受到拖累。
    `;
    
    console.log('📄 分析内容：房地产调控政策');
    const policyResult = await analyzer.analyzeContent(policyContent, {
      type: 'comprehensive'
    });
    
    if (policyResult.success) {
      console.log('📊 政策舆情分析结果：');
      console.log(`   💭 情感倾向: ${policyResult.analysis.sentiment?.label || '未知'} (置信度: ${(policyResult.analysis.sentiment?.confidence * 100 || 0).toFixed(1)}%)`);
      console.log(`   📊 风险等级: ${policyResult.analysis.risk_level || 0}/10`);
      console.log(`   🌟 影响力: ${policyResult.analysis.influence_score || 0}/10`);
      console.log(`   📈 趋势预测: ${policyResult.analysis.trend_prediction || 'unknown'}`);
      console.log(`   🔑 关键词: ${policyResult.analysis.keywords?.slice(0, 5).join(', ') || '无'}`);
      
      // 政策建议
      console.log('\n📋 政策建议：');
      console.log('   • 加强政策解读和舆论引导');
      console.log('   • 密切关注市场反应和社会影响');
      console.log('   • 建立政策效果评估机制');
      console.log('   • 准备应对可能的负面舆情');
    }
    
    // 场景四：批量分析对比
    console.log('\n📊 场景四：多品牌对比分析');
    console.log('-' .repeat(50));
    
    const brandContents = [
      {
        brand: '品牌A',
        content: '品牌A新款电动汽车续航500公里，售价25万元，用户反馈续航表现优秀，充电速度快。'
      },
      {
        brand: '品牌B', 
        content: '品牌B新款电动汽车续航600公里，售价30万元，用户赞赏智能驾驶功能，但担心售后服务。'
      },
      {
        brand: '品牌C',
        content: '品牌C新款电动汽车续航450公里，售价20万元，用户认为性价比高，但品牌影响力较弱。'
      }
    ];
    
    console.log('📄 分析内容：电动汽车品牌对比');
    const batchResults = await analyzer.batchAnalyze(
      brandContents.map(item => item.content),
      { type: 'comprehensive' }
    );
    
    console.log('📊 品牌对比分析结果：');
    batchResults.forEach((result, index) => {
      if (result.success) {
        const brand = brandContents[index].brand;
        console.log(`   🏷️  ${brand}:`);
        console.log(`      💭 情感: ${result.analysis.sentiment?.label || '未知'} (${(result.analysis.sentiment?.confidence * 100 || 0).toFixed(1)}%)`);
        console.log(`      🌟 影响力: ${result.analysis.influence_score || 0}/10`);
        console.log(`      ⚠️  风险: ${result.analysis.risk_level || 0}/10`);
        console.log(`      🏷️  话题: ${result.analysis.topics?.slice(0, 2).join(', ') || '无'}`);
      }
    });
    
    // 综合评分排名
    const scores = batchResults.map((result, index) => ({
      brand: brandContents[index].brand,
      score: result.success ? 
        (result.analysis.sentiment?.label === '正面' ? 3 : 0) +
        (result.analysis.influence_score || 0) * 0.3 +
        (10 - (result.analysis.risk_level || 0)) * 0.4 : 0
    }));
    
    scores.sort((a, b) => b.score - a.score);
    console.log('\n🏆 综合评分排名：');
    scores.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.brand} (得分: ${item.score.toFixed(1)})`);
    });
    
    // 性能统计
    console.log('\n⚡ 性能统计');
    console.log('=' .repeat(70));
    
    const totalTime = batchResults.reduce((sum, result) => sum + (result.metadata?.duration || 0), 0);
    const avgTime = totalTime / batchResults.length;
    const successRate = batchResults.filter(r => r.success).length / batchResults.length;
    
    console.log(`📈 分析统计：`);
    console.log(`   ✅ 成功率: ${(successRate * 100).toFixed(1)}%`);
    console.log(`   ⚡ 平均响应时间: ${avgTime.toFixed(0)}ms`);
    console.log(`   📊 总分析条数: ${batchResults.length}`);
    console.log(`   🤖 使用模型: ${configManager.get('LLM_PROVIDER')} - ${configManager.get('LLM_MODEL')}`);
    
    // 使用建议
    console.log('\n💡 使用建议：');
    console.log('   • 定期监控重点品牌和话题');
    console.log('   • 建立风险预警机制（风险等级≥7）');
    console.log('   • 结合业务指标进行综合分析');
    console.log('   • 保存历史数据进行趋势分析');
    console.log('   • 人工验证关键分析结果');
    
  } catch (error) {
    console.error('❌ 演示失败:', error.message);
    console.error('📋 错误详情:', error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  advancedDemo();
}

module.exports = { advancedDemo };