#!/usr/bin/env node

const chalk = require('chalk');
const ora = require('ora');
const configManager = require('../utils/config-manager');
const RealDataCollectorV2 = require('../data-collection/real-data-collector-v2');
const EnhancedAIAnalyzer = require('../ai-analysis/enhanced-analyzer');
const SkillManager = require('../services/skill-manager');
const RealTimeMonitor = require('../monitoring/realtime-monitor');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logger = require('../utils/logger');

class TancBotCLI {
  constructor() {
    this.configManager = configManager;
    this.dataCollector = null;
    this.aiAnalyzer = null;
    this.skillManager = null;
    this.monitor = null;
    this.isInitialized = false;
    this.isLoggedIn = false;
    this.rl = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log(chalk.cyan.bold('\n🚀 TancBot 舆情研判系统 V1'));
    console.log(chalk.gray('='.repeat(50)));
    
    const spinner = ora('正在初始化系统...').start();
    
    try {
      spinner.text = '初始化数据收集器...';
      this.dataCollector = new RealDataCollectorV2();
      await this.dataCollector.initialize();
      
      spinner.text = '初始化AI分析器...';
      this.aiAnalyzer = new EnhancedAIAnalyzer();
      await this.aiAnalyzer.initialize();
      
      spinner.text = '初始化技能管理器...';
      this.skillManager = new SkillManager();
      
      spinner.text = '初始化监控器...';
      this.monitor = new RealTimeMonitor();
      
      this.isInitialized = true;
      spinner.succeed('系统初始化完成！');
      
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
      
      spinner.start('正在进行AI分析...');
      const analysisResult = await this.aiAnalyzer.analyze(data, [description.trim()], {
        maxIterations: 3
      });
      
      spinner.succeed('AI分析完成');
      
      this.displayResults(analysisResult, description);
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

  async saveResults(result, description) {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `analysis-${description.substring(0, 20)}-${timestamp}.json`;
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
  status             查看系统状态
  help               显示帮助信息
  exit / quit        退出程序

${chalk.yellow('示例:')}
  年轻人不结婚
  analyze 年轻人不结婚
  status
  help
`);
  }

  showStatus() {
    console.log(chalk.cyan.bold('\n📊 系统状态'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(`初始化状态: ${this.isInitialized ? chalk.green('✅ 已初始化') : chalk.red('❌ 未初始化')}`);
    console.log(`登录状态: ${this.isLoggedIn ? chalk.green('✅ 已登录') : chalk.yellow('⚠️ 未登录')}`);
    
    if (this.aiAnalyzer && this.aiAnalyzer.agents) {
      console.log(`\n${chalk.cyan('AI Agent 状态:')}`);
      for (const [name, agent] of Object.entries(this.aiAnalyzer.agents)) {
        const status = agent.isConfigured ? chalk.green('✅') : chalk.red('❌');
        console.log(`  ${status} ${name}`);
      }
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
        
      case 'status':
        this.showStatus();
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
