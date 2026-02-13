/**
 * 国产LLM舆情分析演示
 * 使用千问模型进行实际舆情分析
 */

const EnhancedLLMAnalyzer = require('./src/ai-analysis/llm-enhanced-analyzer-improved');
const LLMConfigManager = require('./src/ai-analysis/llm-config-manager');

async function demonstrateDomesticLLM() {
  console.log('🚀 国产LLM舆情分析演示\n');
  console.log('=' .repeat(60));
  
  try {
    // 步骤1: 显示当前配置
    console.log('\n📋 步骤1: 检查当前LLM配置');
    const configManager = LLMConfigManager.getInstance();
    await configManager.initialize();
    
    const config = configManager.getConfigSummary();
    console.log(`✅ 当前配置:`);
    console.log(`   提供商: ${config.provider} (国产LLM)`);
    console.log(`   模型: ${config.model}`);
    console.log(`   配置时间: ${config.timestamp}`);
    
    // 步骤2: 初始化分析器
    console.log('\n🔧 步骤2: 初始化国产LLM分析器');
    const analyzer = new EnhancedLLMAnalyzer();
    await analyzer.initialize();
    console.log('✅ 国产LLM分析器初始化完成');
    
    // 步骤3: 准备测试数据 - 真实舆情案例
    console.log('\n📝 步骤3: 准备舆情分析测试数据');
    const testCases = [
      {
        title: '教育政策舆情',
        content: '教育部最新发布的"双减"政策在社会各界引起广泛讨论。家长群体普遍表示支持，认为有助于减轻学生负担；但也有部分家长担心孩子课余时间过多。培训机构面临转型压力，部分机构已开始探索素质教育新模式。专家表示，政策效果需要3-6个月才能显现。',
        type: 'comprehensive'
      },
      {
        title: '环保政策舆情',
        content: '某市实施垃圾分类新政已满月，市民参与度持续提升。调查显示，78%的市民表示支持垃圾分类，认为有利于环境保护；15%的市民反映分类标准不够明确；7%的市民希望增加分类设施。环保部门表示将继续优化分类指南，提高便民服务水平。',
        type: 'sentiment'
      },
      {
        title: '科技产品舆情',
        content: '国产新能源汽车销量创历史新高，技术创新获得国际认可。消费者普遍赞赏国产车的性价比和智能化水平，充电基础设施建设加快。但也有消费者担心电池续航和充电便利性。业内专家认为，国产新能源汽车正在从"中国制造"向"中国智造"转变。',
        type: 'topics'
      },
      {
        title: '食品安全舆情',
        content: '某知名品牌被曝食品安全问题，引发消费者强烈关注。监管部门已介入调查，相关产品已下架。消费者纷纷表示担忧，要求加强食品安全监管。专家建议建立更严格的食品安全追溯体系，提高违法成本。企业承诺将全面整改，重建消费者信任。',
        type: 'risk'
      }
    ];
    
    console.log(`✅ 准备了 ${testCases.length} 个典型舆情案例`);
    
    // 步骤4: 执行分析
    console.log('\n🧪 步骤4: 使用国产LLM进行舆情分析');
    console.log('=' .repeat(60));
    
    for (const testCase of testCases) {
      console.log(`\n📊 分析案例: ${testCase.title}`);
      console.log(`📄 内容预览: ${testCase.content.substring(0, 80)}...`);
      console.log(`🔍 分析类型: ${testCase.type}`);
      
      const startTime = Date.now();
      const result = await analyzer.analyzeContent(testCase.content, {
        type: testCase.type
      });
      const endTime = Date.now();
      
      if (result.success) {
        console.log(`✅ 分析成功 (${endTime - startTime}ms)`);
        console.log('📈 分析结果:');
        
        // 根据不同分析类型显示结果
        switch (testCase.type) {
          case 'comprehensive':
            console.log(`   💭 情感倾向: ${result.analysis.sentiment?.label || '未知'} (置信度: ${(result.analysis.sentiment?.confidence * 100 || 0).toFixed(1)}%)`);
            console.log(`   🏷️  主要话题: ${result.analysis.topics?.slice(0, 3).join(', ') || '无'}`);
            console.log(`   🔑 关键词: ${result.analysis.keywords?.slice(0, 5).join(', ') || '无'}`);
            console.log(`   ⚠️  风险等级: ${result.analysis.risk_level || 0}/10`);
            console.log(`   📈 影响力: ${result.analysis.influence_score || 0}/10`);
            console.log(`   📊 趋势预测: ${result.analysis.trend_prediction || 'unknown'}`);
            break;
            
          case 'sentiment':
            console.log(`   💭 情感: ${result.analysis.sentiment || result.analysis.label || '未知'}`);
            if (result.analysis.confidence) {
              console.log(`   🎯 置信度: ${(result.analysis.confidence * 100).toFixed(1)}%`);
            }
            break;
            
          case 'topics':
            console.log(`   🏷️  话题: ${result.analysis.topics?.join(', ') || '无'}`);
            console.log(`   🔑 关键词: ${result.analysis.keywords?.join(', ') || '无'}`);
            break;
            
          case 'risk':
            console.log(`   ⚠️  风险等级: ${result.analysis.risk_level || 0}/10`);
            console.log(`   📋 风险因素: ${result.analysis.risk_factors?.join(', ') || '无'}`);
            break;
        }
        
        if (result.analysis.summary) {
          console.log(`   📝 摘要: ${result.analysis.summary}`);
        }
        
      } else {
        console.log(`❌ 分析失败: ${result.error}`);
      }
      
      console.log('-' .repeat(50));
    }
    
    // 步骤5: 批量分析演示
    console.log('\n📦 步骤5: 批量舆情分析演示');
    const batchContents = [
      '新能源汽车充电桩建设加速，但部分地区仍存在充电难问题。',
      '在线教育平台用户增长放缓，行业进入精细化运营阶段。',
      '社区养老服务需求增长，智能化养老产品受到关注。',
      '短视频平台内容监管加强，优质内容创作者获得更多支持。',
      '远程办公软件用户粘性下降，混合办公模式成为新趋势。'
    ];
    
    console.log(`🔄 批量分析 ${batchContents.length} 条舆情摘要...`);
    const batchStartTime = Date.now();
    const batchResults = await analyzer.batchAnalyze(batchContents, {
      type: 'comprehensive'
    });
    const batchEndTime = Date.now();
    
    const successCount = batchResults.filter(r => r.success).length;
    console.log(`✅ 批量分析完成 (${batchEndTime - batchStartTime}ms)`);
    console.log(`📊 成功率: ${successCount}/${batchResults.length}`);
    
    // 显示统计信息
    console.log('\n📈 步骤6: 舆情分析统计报告');
    console.log('=' .repeat(60));
    
    const sentiments = batchResults.filter(r => r.success).map(r => r.analysis.sentiment?.label || '中性');
    const avgRisk = batchResults.filter(r => r.success).reduce((sum, r) => sum + (r.analysis.risk_level || 0), 0) / successCount;
    const avgInfluence = batchResults.filter(r => r.success).reduce((sum, r) => sum + (r.analysis.influence_score || 0), 0) / successCount;
    
    console.log(`💭 情感分布:`);
    const sentimentCounts = {};
    sentiments.forEach(s => {
      sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
    });
    Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
      console.log(`   ${sentiment}: ${count}条`);
    });
    
    console.log(`📊 平均风险等级: ${avgRisk.toFixed(1)}/10`);
    console.log(`🌟 平均影响力: ${avgInfluence.toFixed(1)}/10`);
    
    // 步骤7: 总结
    console.log('\n🎉 演示总结');
    console.log('=' .repeat(60));
    console.log('✅ 国产LLM舆情分析系统运行正常！');
    console.log(`🤖 使用模型: ${config.provider} - ${config.model}`);
    console.log(`⚡ 平均响应时间: ${((batchEndTime - batchStartTime) / batchResults.length).toFixed(0)}ms/条`);
    console.log(`🎯 分析准确率: ${(successCount / batchResults.length * 100).toFixed(1)}%`);
    console.log('\n💡 系统特点:');
    console.log('   • 支持多种舆情分析类型（情感、主题、风险、综合）');
    console.log('   • 批量处理能力，支持并发分析');
    console.log('   • 智能中文语义理解');
    console.log('   • 多维度舆情评估指标');
    console.log('   • 实时性能监控和统计');
    
  } catch (error) {
    console.error('❌ 演示失败:', error.message);
    console.error('📋 错误详情:', error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  demonstrateDomesticLLM();
}

module.exports = { demonstrateDomesticLLM };