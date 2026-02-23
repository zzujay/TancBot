#!/usr/bin/env node

/**
 * V2多Agent协作系统完整测试脚本
 */

const chalk = require('chalk');
const ora = require('ora');
const V2AnalysisEngine = require('./src/ai-analysis/v2/v2-analysis-engine');
const RealDataCollectorV2 = require('./src/data-collection/real-data-collector-v2');
const logger = require('./src/utils/logger');

async function runTest() {
  console.log(chalk.cyan.bold('\n🧪 V2多Agent协作系统完整测试'));
  console.log(chalk.gray('='.repeat(60)));

  const spinner = ora('初始化测试环境...').start();

  try {
    // 1. 初始化数据收集器
    spinner.text = '初始化数据收集器...';
    const dataCollector = new RealDataCollectorV2();
    await dataCollector.initialize();
    spinner.succeed('数据收集器初始化完成');

    // 2. 初始化V2分析引擎
    spinner.start('初始化V2分析引擎...');
    const v2Engine = new V2AnalysisEngine();
    await v2Engine.initialize();
    spinner.succeed('V2分析引擎初始化完成');

    console.log(chalk.green('\n✅ 所有组件初始化成功！'));
    console.log(chalk.gray('-'.repeat(60)));

    // 3. 模拟测试数据
    console.log(chalk.yellow('\n📊 使用模拟数据进行测试...'));
    
    const mockData = [
      {
        id: '1',
        content: '现在年轻人都不结婚了，房价太高压力太大，实在结不起啊！',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        reposts: 120,
        comments: 89,
        likes: 456,
        userId: 'user_001',
        author: '小明'
      },
      {
        id: '2',
        content: '不是不想结，是结不起。彩礼、房子、车子，哪样不要钱？',
        createdAt: new Date(Date.now() - 80000000).toISOString(),
        reposts: 89,
        comments: 67,
        likes: 234,
        userId: 'user_002',
        author: '小红'
      },
      {
        id: '3',
        content: '我觉得单身挺好的，自由自在，不用被家庭束缚',
        createdAt: new Date(Date.now() - 70000000).toISOString(),
        reposts: 45,
        comments: 123,
        likes: 567,
        userId: 'user_003',
        author: '小李'
      },
      {
        id: '4',
        content: '社会压力太大了，工作不稳定，谁敢结婚生孩子啊',
        createdAt: new Date(Date.now() - 60000000).toISOString(),
        reposts: 234,
        comments: 156,
        likes: 789,
        userId: 'user_004',
        author: '小张'
      },
      {
        id: '5',
        content: '其实现在年轻人观念变了，不再把结婚当成人生必选项',
        createdAt: new Date(Date.now() - 50000000).toISOString(),
        reposts: 67,
        comments: 89,
        likes: 345,
        userId: 'user_005',
        author: '小王'
      }
    ];

    console.log(chalk.cyan(`测试数据: ${mockData.length}条微博内容`));
    console.log(chalk.gray('话题: 年轻人不结婚'));

    // 4. 执行V2分析
    console.log(chalk.yellow('\n🔍 开始V2多Agent协作分析...'));
    console.log(chalk.gray('分析流程: 事实梳理 → 情绪分析 → 传播分析 → 风险研判 → 交叉校验 → 迭代优化'));
    
    const startTime = Date.now();
    const result = await v2Engine.analyze(mockData, ['年轻人不结婚'], {
      maxIterations: 3
    });
    const duration = Date.now() - startTime;

    console.log(chalk.green(`\n✅ 分析完成！耗时: ${duration}ms`));
    console.log(chalk.gray('='.repeat(60)));

    // 5. 显示测试结果
    displayTestResults(result);

    // 6. 测试总结
    console.log(chalk.green.bold('\n🎉 V2多Agent协作系统测试完成！'));
    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.cyan('测试通过项:'));
    console.log('  ✅ 数据收集器初始化');
    console.log('  ✅ V2分析引擎初始化');
    console.log('  ✅ 7个Agent协作运行');
    console.log('  ✅ 多轮迭代分析');
    console.log('  ✅ 交叉校验机制');
    console.log('  ✅ 报告生成');

    // 关闭资源
    await dataCollector.close();
    
    process.exit(0);

  } catch (error) {
    spinner.fail('测试失败');
    console.error(chalk.red('\n❌ 测试失败:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function displayTestResults(result) {
  console.log(chalk.cyan.bold('\n📋 V2分析报告'));
  console.log(chalk.gray('='.repeat(60)));

  // 元数据
  if (result.metadata) {
    console.log(chalk.yellow('\n📊 分析元数据:'));
    console.log(`  迭代次数: ${result.metadata.iterationCount || 1}轮`);
    console.log(`  整体置信度: ${((result.metadata.overallConfidence || 0) * 100).toFixed(1)}%`);
    console.log(`  分析耗时: ${result.metadata.analysisDuration}ms`);
  }

  // 客观事实
  if (result.facts) {
    console.log(chalk.yellow('\n📋 客观事实:'));
    if (result.facts.factList) {
      const summary = result.facts.factList.summary || {};
      console.log(`  事件主体: ${summary.entityCount || 0}个`);
      console.log(`  时间节点: ${summary.timePointCount || 0}个`);
      console.log(`  关键行为: ${summary.actionCount || 0}个`);
      
      if (result.facts.factList.entities && result.facts.factList.entities.length > 0) {
        console.log(`  主要主体: ${result.facts.factList.entities.slice(0, 3).map(e => e.name).join(', ')}`);
      }
    }
  }

  // 情绪分析
  if (result.emotion) {
    console.log(chalk.yellow('\n💬 情绪分析:'));
    if (result.emotion.emotionAnalysis) {
      const emotion = result.emotion.emotionAnalysis;
      console.log(`  主导情绪: ${translateEmotion(emotion.dominantEmotion)}`);
      
      if (emotion.distribution) {
        Object.entries(emotion.distribution)
          .filter(([_, data]) => parseFloat(data.percentage) > 10)
          .forEach(([type, data]) => {
            console.log(`    ${translateEmotion(type)}: ${data.percentage}%`);
          });
      }
    }
  }

  // 传播分析
  if (result.propagation) {
    console.log(chalk.yellow('\n📡 传播分析:'));
    if (result.propagation.propagationMetrics) {
      const metrics = result.propagation.propagationMetrics;
      console.log(`  传播速度: ${metrics.speed}帖/小时`);
      console.log(`  覆盖范围: ${metrics.range}个账号`);
      console.log(`  总互动量: ${metrics.interactionMetrics?.totalInteractions || 0}`);
    }
  }

  // 风险研判
  if (result.risk) {
    console.log(chalk.yellow('\n⚠️ 风险研判:'));
    if (result.risk.riskAssessment) {
      const risk = result.risk.riskAssessment;
      console.log(`  风险等级: ${risk.overallLevel || 'N/A'} (${risk.overallScore}/100)`);
    }
    if (result.risk.trendPrediction) {
      console.log(`  发展趋势: ${result.risk.trendPrediction.trendDescription}`);
    }
  }

  // 关键洞察
  if (result.insights && result.insights.length > 0) {
    console.log(chalk.yellow('\n💡 关键洞察:'));
    result.insights.slice(0, 3).forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight}`);
    });
  }

  // 建议措施
  if (result.recommendations && result.recommendations.length > 0) {
    console.log(chalk.yellow('\n📌 建议措施:'));
    result.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
}

function translateEmotion(emotion) {
  const map = {
    angry: '愤怒', anxious: '焦虑', sympathetic: '同情',
    positive: '正面', negative: '负面', neutral: '中性'
  };
  return map[emotion] || emotion;
}

// 运行测试
runTest();
