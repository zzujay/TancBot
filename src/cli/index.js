#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PublicOpinionSystem = require('../index');
const logger = require('../utils/logger');

class CLI {
  constructor() {
    this.program = new Command();
    this.system = new PublicOpinionSystem();
    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('pos')
      .description('舆情研判系统V1 CLI版本')
      .version('1.0.0');

    // 分析命令
    this.program
      .command('analyze')
      .description('开始舆情分析')
      .option('-k, --keywords <keywords>', '关键词列表，用逗号分隔')
      .option('-p, --platforms <platforms>', '平台列表，用逗号分隔 (默认: weibo)')
      .option('-m, --max-results <number>', '最大结果数', '100')
      .option('-t, --time-range <range>', '时间范围 (1h, 6h, 24h, 7d)', '24h')
      .option('-i, --interactive', '交互模式')
      .action(async (options) => {
        await this.handleAnalyze(options);
      });

    // 配置命令
    this.program
      .command('config')
      .description('系统配置管理')
      .option('-s, --show', '显示当前配置')
      .option('-e, --edit', '编辑配置')
      .action(async (options) => {
        await this.handleConfig(options);
      });

    // 历史命令
    this.program
      .command('history')
      .description('查看分析历史')
      .option('-l, --limit <number>', '显示条数', '10')
      .action(async (options) => {
        await this.handleHistory(options);
      });

    // 状态命令
    this.program
      .command('status')
      .description('查看系统状态')
      .action(async () => {
        await this.handleStatus();
      });

    // 初始化命令
    this.program
      .command('init')
      .description('初始化系统')
      .action(async () => {
        await this.handleInit();
      });
  }

  async run() {
    try {
      await this.system.initialize();
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error(chalk.red('错误:'), error.message);
      logger.error('CLI执行失败:', error);
      process.exit(1);
    }
  }

  async handleAnalyze(options) {
    console.log(chalk.blue.bold('\n🔍 舆情研判系统V1\n'));

    let keywords, platforms, maxResults, timeRange;

    if (options.interactive) {
      // 交互模式
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'keywords',
          message: '请输入关键词（用逗号分隔）:',
          validate: (input) => input.trim() ? true : '关键词不能为空'
        },
        {
          type: 'checkbox',
          name: 'platforms',
          message: '选择数据采集平台:',
          choices: [
            { name: '微博 (weibo)', value: 'weibo', checked: true }
          ],
          validate: (input) => input.length > 0 ? true : '至少选择一个平台'
        },
        {
          type: 'input',
          name: 'maxResults',
          message: '最大结果数:',
          default: '100',
          validate: (input) => /^\d+$/.test(input) ? true : '请输入有效的数字'
        },
        {
          type: 'list',
          name: 'timeRange',
          message: '时间范围:',
          choices: [
            { name: '1小时', value: '1h' },
            { name: '6小时', value: '6h' },
            { name: '24小时', value: '24h' },
            { name: '7天', value: '7d' }
          ],
          default: '24h'
        }
      ]);

      keywords = answers.keywords.split(',').map(k => k.trim());
      platforms = answers.platforms;
      maxResults = parseInt(answers.maxResults);
      timeRange = answers.timeRange;
    } else {
      // 命令行模式
      if (!options.keywords) {
        console.error(chalk.red('错误: 必须提供关键词'));
        return;
      }

      keywords = options.keywords.split(',').map(k => k.trim());
      platforms = options.platforms ? options.platforms.split(',').map(p => p.trim()) : ['weibo'];
      maxResults = parseInt(options.maxResults) || 100;
      timeRange = options.timeRange || '24h';
    }

    console.log(chalk.cyan('\n📋 分析参数:'));
    console.log(`   关键词: ${keywords.join(', ')}`);
    console.log(`   平台: ${platforms.join(', ')}`);
    console.log(`   最大结果数: ${maxResults}`);
    console.log(`   时间范围: ${timeRange}`);
    console.log('');

    // 开始分析
    const spinner = ora('正在执行舆情分析...').start();

    try {
      const startTime = Date.now();
      
      const result = await this.system.start(keywords, {
        platforms,
        maxResults,
        timeRange
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      spinner.succeed(`分析完成！用时 ${duration} 秒`);
      
      // 显示结果
      await this.displayResults(result);

    } catch (error) {
      spinner.fail('分析失败');
      console.error(chalk.red('错误详情:'), error.message);
      logger.error('分析失败:', error);
    }
  }

  async displayResults(result) {
    console.log(chalk.green.bold('\n📊 分析结果\n'));

    // 基本信息
    console.log(chalk.yellow('基本信息:'));
    console.log(`   任务ID: ${result.taskId}`);
    console.log(`   分析轮次: ${result.iterations}`);
    console.log(`   最终置信度: ${(result.finalConfidence * 100).toFixed(1)}%`);
    console.log(`   分析时间: ${new Date(result.timestamp).toLocaleString()}`);
    console.log('');

    // 整体评估
    if (result.summary) {
      console.log(chalk.yellow('整体评估:'));
      console.log(`   ${result.summary.overallAssessment}`);
      console.log('');

      // 情感分析
      if (result.summary.sentiment) {
        console.log(chalk.yellow('情感分析:'));
        const sentiment = result.summary.sentiment;
        console.log(`   整体情感得分: ${sentiment.overall.toFixed(2)}`);
        console.log(`   积极: ${sentiment.distribution.positive} 条`);
        console.log(`   消极: ${sentiment.distribution.negative} 条`);
        console.log(`   中性: ${sentiment.distribution.neutral} 条`);
        console.log('');
      }

      // 热门话题
      if (result.summary.topics && result.summary.topics.length > 0) {
        console.log(chalk.yellow('热门话题:'));
        result.summary.topics.slice(0, 5).forEach((topic, index) => {
          console.log(`   ${index + 1}. ${topic.topic} (热度: ${topic.hotness.toFixed(1)})`);
        });
        console.log('');
      }

      // 风险评估
      if (result.summary.risks) {
        const risks = result.summary.risks;
        const riskColor = risks.level === 'high' ? chalk.red : 
                         risks.level === 'medium' ? chalk.yellow : chalk.green;
        
        console.log(chalk.yellow('风险评估:'));
        console.log(`   风险等级: ${riskColor(risks.level.toUpperCase())}`);
        console.log(`   风险评分: ${risks.score.toFixed(2)}`);
        console.log(`   高风险项目: ${risks.highRiskCount} 个`);
        console.log('');
      }

      // 关键洞察
      if (result.summary.keyInsights && result.summary.keyInsights.length > 0) {
        console.log(chalk.yellow('关键洞察:'));
        result.summary.keyInsights.forEach((insight, index) => {
          console.log(`   ${index + 1}. ${insight}`);
        });
        console.log('');
      }

      // 建议
      if (result.summary.recommendations && result.summary.recommendations.length > 0) {
        console.log(chalk.yellow('建议措施:'));
        result.summary.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
        console.log('');
      }
    }

    // 后续步骤
    if (result.nextSteps && result.nextSteps.length > 0) {
      console.log(chalk.yellow('后续步骤:'));
      result.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
      console.log('');
    }

    console.log(chalk.cyan('💡 提示: 使用 "pos history" 查看分析历史'));
  }

  async handleConfig(options) {
    if (options.show) {
      console.log(chalk.blue.bold('\n⚙️  系统配置\n'));
      console.log(`数据库路径: ${process.env.DB_PATH}`);
      console.log(`日志级别: ${process.env.LOG_LEVEL}`);
      console.log(`微博Cookie: ${process.env.WEIBO_COOKIE ? '已配置' : '未配置'}`);
      console.log(`最大并发任务: ${process.env.MAX_CONCURRENT_TASKS}`);
      console.log(`采集间隔: ${process.env.COLLECTION_INTERVAL}分钟`);
      console.log('');
    } else if (options.edit) {
      console.log(chalk.yellow('配置编辑功能开发中...'));
    } else {
      console.log(chalk.yellow('请使用 --show 或 --edit 参数'));
    }
  }

  async handleHistory(options) {
    const limit = parseInt(options.limit) || 10;
    console.log(chalk.blue.bold(`\n📜 最近 ${limit} 条分析历史\n`));
    console.log(chalk.yellow('功能开发中...'));
    console.log('');
  }

  async handleStatus() {
    console.log(chalk.blue.bold('\n📈 系统状态\n'));
    console.log(chalk.yellow('Agent状态:'));
    
    try {
      const agentInfo = this.system.analyzer.getAgentInfo();
      agentInfo.forEach(agent => {
        const status = agent.confidence > 0.5 ? chalk.green('正常') : chalk.red('需关注');
        console.log(`   ${agent.name}: ${status} (置信度: ${(agent.confidence * 100).toFixed(1)}%)`);
      });
    } catch (error) {
      console.log('   Agent信息获取失败');
    }

    console.log('');
    console.log(chalk.yellow('数据采集模块:'));
    console.log('   微博采集器: ' + chalk.green('就绪'));
    console.log('');
  }

  async handleInit() {
    console.log(chalk.blue.bold('\n🚀 系统初始化\n'));
    
    const spinner = ora('正在初始化系统...').start();
    
    try {
      await this.system.initialize();
      spinner.succeed('系统初始化成功！');
      
      console.log(chalk.green('\n✅ 系统已就绪，可以使用以下命令:'));
      console.log(chalk.cyan('   pos analyze -k "关键词"    # 开始分析'));
      console.log(chalk.cyan('   pos status               # 查看状态'));
      console.log(chalk.cyan('   pos config --show       # 查看配置'));
      console.log('');
      
    } catch (error) {
      spinner.fail('系统初始化失败');
      console.error(chalk.red('错误:'), error.message);
      logger.error('初始化失败:', error);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new CLI();
  cli.run().catch(error => {
    console.error(chalk.red('CLI错误:'), error);
    process.exit(1);
  });
}

module.exports = CLI;