#!/usr/bin/env node

// 首先加载环境变量
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const chalk = require('chalk');
const ora = require('ora');
const configManager = require('../utils/config-manager');
const RealDataCollectorV2 = require('../data-collection/real-data-collector-v2');
const EnhancedAIAnalyzer = require('../ai-analysis/enhanced-analyzer');
const V2AnalysisEngine = require('../ai-analysis/v2/v2-analysis-engine');
const SkillManager = require('../services/skill-manager');
const RealTimeMonitor = require('../monitoring/realtime-monitor');
const fs = require('fs');
const readline = require('readline');

const logger = require('../utils/logger');

class TancBotCLI {
  constructor() {
    this.configManager = configManager;
    this.dataCollector = null;
    this.aiAnalyzer = null;
    this.v2Analyzer = null;
    this.skillManager = null;
    this.monitor = null;
    this.isInitialized = false;
    this.isLoggedIn = false;
    this.rl = null;
    this.useV2 = true; // 默认使用V2引擎
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log(chalk.cyan.bold('\n🚀 TancBot 舆情研判系统'));
    console.log(chalk.gray('='.repeat(50)));
    
    const spinner = ora('正在初始化系统...').start();
    
    try {
      spinner.text = '初始化数据收集器...';
      this.dataCollector = new RealDataCollectorV2();
      await this.dataCollector.initialize();
      
      spinner.text = '初始化AI分析器...';
      if (this.useV2) {
        this.v2Analyzer = new V2AnalysisEngine();
        await this.v2Analyzer.initialize();
        spinner.text = 'V2多Agent协作引擎已加载';
      } else {
        this.aiAnalyzer = new EnhancedAIAnalyzer();
        await this.aiAnalyzer.initialize();
      }
      
      spinner.text = '初始化技能管理器...';
      this.skillManager = new SkillManager();
      
      spinner.text = '初始化监控器...';
      this.monitor = new RealTimeMonitor();
      
      this.isInitialized = true;
      spinner.succeed('系统初始化完成！');
      
      if (this.useV2) {
        console.log(chalk.green('✅ V2多Agent协作引擎已启用'));
      }
      
    } catch (error) {
      spinner.fail('系统初始化失败');
      logger.error('初始化失败:', error.message);
      throw error;
    }
  }

  async ensureLogin() {
    if (this.isLoggedIn) return true;
    
    if (!this.dataCollector.weiboSearcher.isLoggedIn) {
      console.log(chalk.yellow('\n📱 检测到未登录，开始微博登录流程...'));
      const loginResult = await this.dataCollector.weiboSearcher.login();
      if (!loginResult.success) {
        console.log(chalk.red('❌ 微博登录失败'));
        return false;
      }
      this.isLoggedIn = true;
      console.log(chalk.green('✅ 微博登录成功！'));
    }
    return true;
  }

  async analyzeEvent(description, maxResults = 10) {
    if (!description || description.trim().length === 0) {
      console.log(chalk.red('❌ 请输入有效的事件描述'));
      return null;
    }

    // 暂停readline以避免冲突
    if (this.rl) {
      this.rl.pause();
    }

    const spinner = ora('正在分析舆情事件...').start();
    
    try {
      spinner.text = '检查登录状态...';
      const loggedIn = await this.ensureLogin();
      if (!loggedIn) {
        spinner.fail('登录失败');
        return null;
      }
      
      spinner.text = `正在收集"${description}"相关数据...`;
      const data = await this.dataCollector.collectData([description.trim()], ['weibo'], maxResults);
      
      if (data.length === 0) {
        spinner.warn('未收集到相关数据');
        console.log(chalk.yellow('💡 建议：尝试使用更热门的关键词或调整搜索范围'));
        return null;
      }
      
      spinner.succeed(`收集到 ${data.length} 条数据`);
      
      // 使用V2或V1分析引擎
      let analysisResult;
      if (this.useV2 && this.v2Analyzer) {
        spinner.start('正在进行V2多Agent协作分析...');
        analysisResult = await this.v2Analyzer.analyze(data, [description.trim()], {
          maxIterations: 3
        });
        spinner.succeed('V2多Agent协作分析完成');
      } else {
        spinner.start('正在进行AI分析...');
        analysisResult = await this.aiAnalyzer.analyze(data, [description.trim()], {
          maxIterations: 3
        });
        spinner.succeed('AI分析完成');
      }
      
      // 显示结果
      if (this.useV2) {
        this.displayV2Results(analysisResult, description);
      } else {
        this.displayResults(analysisResult, description);
      }
      
      // 保存结果
      await this.saveResults(analysisResult, description);
      
      return analysisResult;
      
    } catch (error) {
      spinner.fail('分析失败');
      logger.error('分析失败:', error.message);
      console.log(chalk.red(`❌ 分析失败: ${error.message}`));
      return null;
    } finally {
      // 恢复readline
      if (this.rl) {
        this.rl.resume();
        this.rl.prompt(true);
      }
    }
  }

  displayResults(result, description) {
    console.log(chalk.green.bold('\n📋 舆情事件研判报告'));
    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.cyan(`\n📝 分析话题: ${description}`));
    console.log(chalk.gray(`📅 分析时间: ${new Date().toLocaleString()}`));
    
    if (result && result.summary) {
      console.log(chalk.green.bold('\n📊 分析结果'));
      console.log(chalk.gray('-'.repeat(40)));
      
      if (result.summary.sentiment) {
        const sentiment = result.summary.sentiment;
        const overall = sentiment.overall;
        const confidence = sentiment.confidence;
        
        console.log(chalk.cyan('\n💬 情感分析:'));
        const sentimentEmoji = overall > 0.3 ? '😊' : (overall < -0.3 ? '😟' : '😐');
        console.log(`   整体情感: ${sentimentEmoji} ${overall !== undefined ? overall.toFixed(2) : 'N/A'}`);
        console.log(`   置信度: ${confidence !== undefined ? (confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      }
      
      if (result.summary.risks) {
        const risks = result.summary.risks;
        console.log(chalk.cyan('\n⚠️ 风险评估:'));
        const levelEmoji = { 'low': '🟢', 'medium': '🟡', 'high': '🟠', 'critical': '🔴' };
        console.log(`   风险等级: ${levelEmoji[risks.level] || '⚪'} ${risks.level || 'N/A'}`);
        console.log(`   风险评分: ${risks.score !== undefined ? risks.score.toFixed(2) : 'N/A'}`);
      }
      
      if (result.summary.keyInsights && result.summary.keyInsights.length > 0) {
        console.log(chalk.cyan('\n💡 关键洞察:'));
        result.summary.keyInsights.slice(0, 5).forEach(insight => {
          console.log(`   • ${insight}`);
        });
      }
      
      if (result.summary.recommendations && result.summary.recommendations.length > 0) {
        console.log(chalk.cyan('\n📌 建议措施:'));
        result.summary.recommendations.slice(0, 5).forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
    }
    
    console.log(chalk.gray('\n' + '='.repeat(60)));
  }

  displayV2Results(result, description) {
    console.log(chalk.green.bold('\n📋 V2 舆情事件研判报告'));
    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.cyan(`\n📝 分析话题: ${description}`));
    console.log(chalk.gray(`📅 分析时间: ${new Date().toLocaleString()}`));
    console.log(chalk.gray(`🔧 分析引擎: V2多Agent协作 (版本 ${result.version || '2.0.0'})`));
    
    if (result.metadata) {
      console.log(chalk.gray(`🔄 迭代次数: ${result.metadata.iterationCount || 1}轮`));
      console.log(chalk.gray(`📊 整体置信度: ${((result.metadata.overallConfidence || 0) * 100).toFixed(1)}%`));
    }
    
    // 事件经过（整合后）
    if (result.eventNarrative) {
      console.log(chalk.green.bold('\n📖 事件经过'));
      console.log(chalk.gray('-'.repeat(40)));
      
      const narrative = result.eventNarrative;
      
      // 显示完整的事件经过文本（包含一、二、三、四结构）
      if (narrative.narrative && narrative.narrative.fullText) {
        console.log(chalk.white(narrative.narrative.fullText));
      }
      
      // 完整性评估
      if (narrative.completeness) {
        const completenessScore = Math.round((narrative.completeness.completenessScore || 0) * 100);
        console.log(chalk.gray(`\n   完整性: ${completenessScore}%`));
      }
      
      // 信息缺口
      if (narrative.gaps && narrative.gaps.length > 0) {
        console.log(chalk.yellow(`   ⚠️ 信息缺口: ${narrative.gaps.length}个`));
        narrative.gaps.slice(0, 3).forEach((gap, i) => {
          console.log(chalk.yellow(`      ${i + 1}. ${gap.description}`));
        });
      }
    }
    
    // 客观事实
    if (result.facts) {
      console.log(chalk.green.bold('\n📋 客观事实清单'));
      console.log(chalk.gray('-'.repeat(40)));
      if (result.facts.factList) {
        const summary = result.facts.factList.summary || {};
        console.log(`   事件主体: ${summary.entityCount || 0}个`);
        console.log(`   时间节点: ${summary.timePointCount || 0}个`);
        console.log(`   关键行为: ${summary.actionCount || 0}个`);
        if (result.facts.factList.identifiedGaps && result.facts.factList.identifiedGaps.length > 0) {
          console.log(chalk.yellow(`   ⚠️ 事实缺口: ${result.facts.factList.identifiedGaps.length}个`));
        }
      }
    }
    
    // 情绪分析
    if (result.emotion) {
      console.log(chalk.green.bold('\n💬 情绪/态度分析'));
      console.log(chalk.gray('-'.repeat(40)));
      if (result.emotion.emotionAnalysis) {
        const emotion = result.emotion.emotionAnalysis;
        console.log(`   主导情绪: ${this.translateEmotion(emotion.dominantEmotion)} (${emotion.distribution?.[emotion.dominantEmotion]?.percentage || 0}%)`);
        console.log(`   主要立场: ${this.translateStance(result.emotion.stanceAnalysis?.dominantStance)}`);
      }
    }
    
    // 传播分析
    if (result.propagation) {
      console.log(chalk.green.bold('\n📡 传播路径分析'));
      console.log(chalk.gray('-'.repeat(40)));
      if (result.propagation.propagationMetrics) {
        const metrics = result.propagation.propagationMetrics;
        console.log(`   传播速度: ${metrics.speed}帖/小时`);
        console.log(`   覆盖范围: ${metrics.range}个账号`);
        console.log(`   总互动量: ${metrics.interactionMetrics?.totalInteractions || 0}`);
      }
      if (result.propagation.keyNodes) {
        const nodes = result.propagation.keyNodes.summary || {};
        console.log(`   意见领袖: ${nodes.opinionLeaderCount || 0}个`);
        console.log(`   媒体账号: ${nodes.mediaCount || 0}个`);
      }
    }
    
    // 风险研判
    if (result.risk) {
      console.log(chalk.green.bold('\n⚠️ 风险/影响研判'));
      console.log(chalk.gray('-'.repeat(40)));
      if (result.risk.riskAssessment) {
        const risk = result.risk.riskAssessment;
        const levelEmoji = { 'low': '🟢', 'medium': '🟡', 'high': '🟠', 'critical': '🔴' };
        console.log(`   风险等级: ${levelEmoji[risk.overallLevel] || '⚪'} ${risk.overallLevel || 'N/A'} (${risk.overallScore}/100)`);
      }
      if (result.risk.trendPrediction) {
        console.log(`   发展趋势: ${result.risk.trendPrediction.trendDescription}`);
        console.log(`   发展预测: ${result.risk.trendPrediction.prediction}`);
      }
    }
    
    // 关键洞察
    if (result.insights && result.insights.length > 0) {
      console.log(chalk.green.bold('\n💡 关键洞察'));
      console.log(chalk.gray('-'.repeat(40)));
      result.insights.slice(0, 5).forEach((insight, i) => {
        console.log(`   ${i + 1}. ${insight}`);
      });
    }
    
    // 建议措施
    if (result.recommendations && result.recommendations.length > 0) {
      console.log(chalk.green.bold('\n📌 建议措施'));
      console.log(chalk.gray('-'.repeat(40)));
      result.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log(chalk.gray('\n' + '='.repeat(60)));
  }

  translateEmotion(emotion) {
    const map = {
      angry: '愤怒', anxious: '焦虑', sympathetic: '同情',
      positive: '正面', negative: '负面', neutral: '中性'
    };
    return map[emotion] || emotion;
  }

  translateStance(stance) {
    const map = {
      support: '支持', oppose: '反对', question: '质疑', neutral: '中立'
    };
    return map[stance] || stance;
  }

  async saveResults(result, description) {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const version = this.useV2 ? 'v2' : 'v1';
      const filename = `analysis-${version}-${description.substring(0, 20)}-${timestamp}.json`;
      const filepath = path.join(dataDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(chalk.gray(`\n💾 分析结果已保存: ${filename}`));
    } catch (error) {
      logger.error('保存结果失败:', error.message);
    }
  }

  showHelp() {
    console.log(chalk.cyan.bold('\n📖 TancBot 使用帮助'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(`
${chalk.yellow('命令:')}
  <话题>              直接输入话题进行分析
  analyze <话题>      分析指定话题的舆情
  v1 <话题>           使用V1引擎分析
  v2 <话题>           使用V2引擎分析(默认)
  status             查看系统状态
  engine             切换分析引擎(V1/V2)
  help               显示帮助信息
  exit / quit        退出程序

${chalk.yellow('示例:')}
  年轻人不结婚
  analyze 年轻人不结婚
  v1 年轻人不结婚
  v2 年轻人不结婚
  status
  engine
  help
`);
  }

  showStatus() {
    console.log(chalk.cyan.bold('\n📊 系统状态'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(`初始化状态: ${this.isInitialized ? chalk.green('✅ 已初始化') : chalk.red('❌ 未初始化')}`);
    console.log(`登录状态: ${this.isLoggedIn ? chalk.green('✅ 已登录') : chalk.yellow('⚠️ 未登录')}`);
    console.log(`分析引擎: ${this.useV2 ? chalk.green('V2多Agent协作') : chalk.blue('V1增强分析')}`);
    
    if (this.useV2 && this.v2Analyzer) {
      console.log(chalk.cyan('\nV2引擎状态:'));
      console.log('  ✅ 研判调度智能体');
      console.log('  ✅ 事实梳理智能体');
      console.log('  ✅ 情绪态度分析智能体');
      console.log('  ✅ 传播路径分析智能体');
      console.log('  ✅ 风险影响研判智能体');
      console.log('  ✅ 交叉校验智能体');
      console.log('  ✅ 迭代优化智能体');
    }
  }

  toggleEngine() {
    this.useV2 = !this.useV2;
    console.log(chalk.cyan(`\n🔄 已切换至 ${this.useV2 ? 'V2多Agent协作' : 'V1增强分析'} 引擎`));
    
    // 重新初始化分析器
    if (this.useV2 && !this.v2Analyzer) {
      this.v2Analyzer = new V2AnalysisEngine();
      this.v2Analyzer.initialize().then(() => {
        console.log(chalk.green('✅ V2引擎初始化完成'));
      });
    }
  }

  async processCommand(input) {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    
    const parts = trimmedInput.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    switch (cmd) {
      case 'analyze':
        if (args) {
          await this.analyzeEvent(args, 10);
        } else {
          console.log(chalk.yellow('用法: analyze <话题>'));
        }
        break;

      case 'v1':
        this.useV2 = false;
        if (args) {
          await this.analyzeEvent(args, 10);
        } else {
          console.log(chalk.yellow('用法: v1 <话题>'));
        }
        this.useV2 = true; // 恢复默认
        break;

      case 'v2':
        this.useV2 = true;
        if (args) {
          await this.analyzeEvent(args, 10);
        } else {
          console.log(chalk.yellow('用法: v2 <话题>'));
        }
        break;
        
      case 'status':
        this.showStatus();
        break;

      case 'engine':
        this.toggleEngine();
        break;
        
      case 'help':
      case '?':
        this.showHelp();
        break;
        
      case 'exit':
      case 'quit':
      case 'q':
        console.log(chalk.yellow('\n👋 感谢使用 TancBot，再见！'));
        if (this.dataCollector) {
          await this.dataCollector.close();
        }
        process.exit(0);
        
      default:
        // 当作话题处理
        if (trimmedInput.length > 0) {
          await this.analyzeEvent(trimmedInput, 10);
        }
    }
  }

  async run() {
    console.log(chalk.cyan.bold('\n🤖 欢迎使用 TancBot 舆情研判系统'));
    console.log(chalk.gray('输入 "help" 查看帮助，输入 "exit" 退出\n'));
    
    await this.initialize();
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('tancbot> ')
    });
    
    this.rl.prompt();
    
    this.rl.on('line', async (input) => {
      try {
        await this.processCommand(input);
      } catch (error) {
        console.log(chalk.red(`❌ 错误: ${error.message}`));
      }
      console.log('');
      this.rl.prompt();
    });
    
    this.rl.on('close', async () => {
      console.log(chalk.yellow('\n👋 感谢使用 TancBot，再见！'));
      if (this.dataCollector) {
        await this.dataCollector.close();
      }
      process.exit(0);
    });
  }
}

const cli = new TancBotCLI();
cli.run().catch(error => {
  console.error(chalk.red('系统错误:', error.message));
  process.exit(1);
});
