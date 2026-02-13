/**
 * 国产LLM测试脚本
 * 测试千问、Kimi等国产模型的集成
 */

const EnhancedLLMAnalyzer = require('./src/ai-analysis/llm-enhanced-analyzer-improved');
const LLMConfigManager = require('./src/ai-analysis/llm-config-manager');

async function testDomesticLLM() {
  console.log('🚀 开始测试国产LLM集成...\n');
  
  try {
    // 步骤1: 初始化配置管理器
    console.log('📋 步骤1: 初始化配置管理器');
    const configManager = LLMConfigManager.getInstance();
    await configManager.initialize();
    
    const config = configManager.getConfigSummary();
    console.log(`✅ 配置管理器初始化完成`);
    console.log(`   提供商: ${config.provider}`);
    console.log(`   模型: ${config.model}`);
    console.log('');
    
    // 步骤2: 初始化分析器
    console.log('🔧 步骤2: 初始化LLM分析器');
    const analyzer = new EnhancedLLMAnalyzer();
    await analyzer.initialize();
    console.log('✅ 分析器初始化完成\n');
    
    // 步骤3: 获取分析器状态
    console.log('📊 步骤3: 检查分析器状态');
    const status = analyzer.getStatus();
    console.log(`   状态: ${status.initialized ? '已初始化' : '未初始化'}`);
    console.log(`   提供商: ${status.provider}`);
    console.log(`   模型: ${status.model}`);
    console.log('');
    
    // 步骤4: 测试不同类型的舆情分析
    console.log('🧪 步骤4: 测试舆情分析功能\n');
    
    // 测试数据
    const testContents = [
      {
        type: 'comprehensive',
        content: `近日，北京市发布新的交通管控措施，旨在缓解城市拥堵问题。该政策引起了市民的广泛关注和讨论。
        有市民表示支持，认为这有助于改善交通状况；也有市民担心可能会带来不便。相关部门表示会密切关注政策实施效果。`,
        description: '综合舆情分析'
      },
      {
        type: 'sentiment',
        content: '今天天气真好，阳光明媚，心情也跟着变好了！感谢环卫工人的辛勤劳动，让我们的城市如此干净整洁。',
        description: '情感分析'
      },
      {
        type: 'topics',
        content: '人工智能技术快速发展，在教育、医疗、金融等领域都有广泛应用。机器学习、深度学习技术不断突破。',
        description: '主题提取'
      },
      {
        type: 'risk',
        content: '某地区发生食品安全事件，多名消费者出现不适症状。相关部门已介入调查，涉事企业已暂停生产。',
        description: '风险评估'
      }
    ];
    
    // 执行测试
    for (const test of testContents) {
      console.log(`📝 测试: ${test.description}`);
      console.log(`📄 内容: ${test.content.substring(0, 60)}...`);
      
      const startTime = Date.now();
      const result = await analyzer.analyzeContent(test.content, {
        type: test.type
      });
      const endTime = Date.now();
      
      if (result.success) {
        console.log(`✅ 分析成功 (${endTime - startTime}ms)`);
        console.log(`📊 结果:`, JSON.stringify(result.analysis, null, 2));
      } else {
        console.log(`❌ 分析失败: ${result.error}`);
      }
      console.log('');
    }
    
    // 步骤5: 批量分析测试
    console.log('📦 步骤5: 测试批量分析功能');
    const batchContents = [
      '新能源汽车销量持续增长，充电基础设施建设加快。',
      '教育部门推出新政策，减轻学生课业负担。',
      '房地产市场调控政策效果显现，房价趋于稳定。',
      '环保意识提升，垃圾分类成为新时尚。',
      '数字经济蓬勃发展，传统产业加速转型。'
    ];
    
    console.log(`🔄 批量分析 ${batchContents.length} 条内容...`);
    const batchStartTime = Date.now();
    const batchResults = await analyzer.batchAnalyze(batchContents, {
      type: 'comprehensive'
    });
    const batchEndTime = Date.now();
    
    const successCount = batchResults.filter(r => r.success).length;
    console.log(`✅ 批量分析完成 (${batchEndTime - batchStartTime}ms)`);
    console.log(`📊 成功: ${successCount}/${batchResults.length}`);
    
    // 显示部分结果
    if (successCount > 0) {
      console.log('🎯 部分结果示例:');
      const sampleResult = batchResults.find(r => r.success);
      if (sampleResult) {
        console.log(JSON.stringify(sampleResult.analysis, null, 2));
      }
    }
    console.log('');
    
    // 步骤6: 性能统计
    console.log('📈 步骤6: 性能统计');
    const finalStatus = analyzer.getStatus();
    console.log(`✅ 测试完成！`);
    console.log(`   当前提供商: ${finalStatus.provider}`);
    console.log(`   当前模型: ${finalStatus.model}`);
    console.log(`   配置时间戳: ${finalStatus.config.timestamp}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('📋 错误详情:', error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testDomesticLLM();
}

module.exports = { testDomesticLLM };