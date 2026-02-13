const PublicOpinionSystem = require('./src/index');

async function testSystem() {
  console.log('🚀 开始测试舆情研判系统...\n');
  
  const system = new PublicOpinionSystem();
  
  try {
    // 初始化系统
    console.log('📋 初始化系统...');
    await system.initialize();
    console.log('✅ 系统初始化完成\n');

    // 创建测试数据（模拟微博数据）
    const testData = [
      {
        id: 1,
        platform: 'weibo',
        keyword: '华为',
        content: '华为手机真的不错，拍照效果很好，系统也很流畅！支持国产！',
        author: '用户A',
        publish_time: new Date().toISOString(),
        likes: 15,
        comments: 8,
        shares: 3
      },
      {
        id: 2,
        platform: 'weibo',
        keyword: '华为',
        content: '华为的新产品发布会太精彩了，技术创新让人印象深刻，期待更多突破！',
        author: '用户B',
        publish_time: new Date().toISOString(),
        likes: 25,
        comments: 12,
        shares: 7
      },
      {
        id: 3,
        platform: 'weibo',
        keyword: '华为',
        content: '价格有点贵，但是质量确实不错，总体来说还是值得购买的',
        author: '用户C',
        publish_time: new Date().toISOString(),
        likes: 8,
        comments: 5,
        shares: 2
      },
      {
        id: 4,
        platform: 'weibo',
        keyword: '华为',
        content: '华为的技术实力确实很强，在5G领域领先全球，为国产科技点赞！',
        author: '用户D',
        publish_time: new Date().toISOString(),
        likes: 32,
        comments: 18,
        shares: 11
      },
      {
        id: 5,
        platform: 'weibo',
        keyword: '华为',
        content: '系统更新后有些卡顿，希望能尽快优化，其他方面还不错',
        author: '用户E',
        publish_time: new Date().toISOString(),
        likes: 6,
        comments: 9,
        shares: 1
      }
    ];

    console.log('🧪 使用测试数据进行AI分析...');
    console.log(`测试数据量: ${testData.length} 条\n`);

    // 直接调用AI分析（跳过数据采集）
    const result = await system.analyzer.analyze(testData, ['华为']);
    
    console.log('📊 分析结果:');
    console.log('==================');
    console.log(`任务ID: ${result.taskId}`);
    console.log(`分析轮次: ${result.iterations}`);
    console.log(`最终置信度: ${(result.finalConfidence * 100).toFixed(1)}%`);
    console.log('');

    // 显示情感分析结果
    if (result.summary && result.summary.sentiment) {
      const sentiment = result.summary.sentiment;
      console.log('💭 情感分析:');
      console.log(`整体情感得分: ${sentiment.overall.toFixed(2)}`);
      console.log(`积极: ${sentiment.distribution.positive} 条`);
      console.log(`消极: ${sentiment.distribution.negative} 条`);
      console.log(`中性: ${sentiment.distribution.neutral} 条`);
      console.log('');
    }

    // 显示热门话题
    if (result.summary && result.summary.topics && result.summary.topics.length > 0) {
      console.log('🔥 热门话题:');
      result.summary.topics.slice(0, 5).forEach((topic, index) => {
        console.log(`${index + 1}. ${topic.topic} (热度: ${topic.hotness.toFixed(1)})`);
      });
      console.log('');
    }

    // 显示风险评估
    if (result.summary && result.summary.risks) {
      const risks = result.summary.risks;
      console.log('⚠️ 风险评估:');
      console.log(`风险等级: ${risks.level.toUpperCase()}`);
      console.log(`风险评分: ${risks.score.toFixed(2)}`);
      console.log(`高风险项目: ${risks.highRiskCount} 个`);
      console.log('');
    }

    // 显示关键洞察
    if (result.summary && result.summary.keyInsights && result.summary.keyInsights.length > 0) {
      console.log('💡 关键洞察:');
      result.summary.keyInsights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight}`);
      });
      console.log('');
    }

    // 显示建议
    if (result.summary && result.summary.recommendations && result.summary.recommendations.length > 0) {
      console.log('📋 建议措施:');
      result.summary.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // 显示Agent性能
    console.log('🤖 Agent性能:');
    if (result.agentResults) {
      Object.entries(result.agentResults).forEach(([name, agent]) => {
        if (agent.confidence !== undefined) {
          console.log(`${agent.name}: 置信度 ${(agent.confidence * 100).toFixed(1)}%`);
        }
      });
    }

    console.log('\n✅ 测试完成！');
    
    // 关闭系统
    await system.stop();
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testSystem();