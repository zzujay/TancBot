/**
 * 舆情研判系统V2 CLI版本
 * 纯命令行界面，无Web组件
 */

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

// 导入核心模块
const ConfigManager = require('../utils/config-manager');
const PerformanceMonitor = require('../utils/performance-monitor');
const ErrorHandler = require('../utils/error-handler');
const Logger = require('../utils/logger');
const AdvancedDataCollector = require('../data-collection/advanced-collector');
const EnhancedAIAnalyzer = require('../ai-analysis/enhanced-analyzer');
const SkillManager = require('../services/skill-manager');
const RealTimeMonitor = require('../monitoring/realtime-monitor');

class PublicOpinionSystemV2CLI {
  constructor() {
    this.config = null;
    this.logger = null;
    this.errorHandler = null;
    this.performanceMonitor = null;
    this.dataCollector = null;
    this.aiAnalyzer = null;
    this.skillManager = null;
    this.realTimeMonitor = null;
    
    this.isRunning = false;
    this.startTime = null;
    
    this.setupCommandLine();
  }
  
  setupCommandLine() {
    program
      .name('舆情研判系统V2 CLI')
      .description('基于AI的多智能体舆情分析与研判系统 - 纯命令行版本')
      .version('2.0.0')
      .option('-c, --config <path>', '配置文件路径', 'config/system.json')
      .option('-d, --debug', '调试模式')
      .option('--no-monitor', '禁用实时监控')
      .option('--no-collector', '禁用数据收集')
      .option('--no-analyzer', '禁用AI分析')
      .action(async (options) => {
        await this.start(options);
      });
      
    // 数据分析命令
    program
      .command('analyze')
      .description('执行舆情分析')
      .option('-k, --keywords <keywords>', '关键词列表，用逗号分隔', '疫情,疫苗')
      .option('-p, --platforms <platforms>', '平台列表，用逗号分隔', 'weibo,zhihu')
      .option('-m, --max-results <number>', '最大结果数', '100')
      .option('-t, --analysis-type <type>', '分析类型', 'comprehensive')
      .action(async (options) => {
        await this.performAnalysis(options);
      });
      
    // 实时监控命令
    program
      .command('monitor')
      .description('启动实时监控')
      .option('-k, --keywords <keywords>', '监控关键词', '疫情')
      .option('-p, --platforms <platforms>', '监控平台', 'weibo')
      .option('-i, --interval <seconds>', '监控间隔(秒)', '60')
      .action(async (options) => {
        await this.startMonitoring(options);
      });
      
    // 数据收集命令
    program
      .command('collect')
      .description('收集舆情数据')
      .option('-k, --keywords <keywords>', '关键词列表', '测试')
      .option('-p, --platforms <platforms>', '平台列表', 'weibo')
      .option('-m, --max-results <number>', '最大结果数', '50')
      .option('-o, --output <file>', '输出文件')
      .action(async (options) => {
        await this.collectData(options);
      });
      
    // 系统管理命令
    program
      .command('status')
      .description('查看系统状态')
      .action(async () => {
        await this.showStatus();
      });
      
    program
      .command('config')
      .description('管理系统配置')
      .option('--show', '显示当前配置')
      .option('--edit', '编辑配置')
      .option('--reset', '重置为默认配置')
      .action(async (options) => {
        await this.manageConfig(options);
      });
      
    program
      .command('benchmark')
      .description('运行性能基准测试')
      .option('-t, --test <type>', '测试类型', 'all')
      .option('-i, --iterations <number>', '测试迭代次数', '10')
      .action(async (options) => {
        await this.runBenchmark(options);
      });
      
    program
      .command('interactive')
      .description('启动交互式模式')
      .action(async () => {
        await this.startInteractiveMode();
      });
      
    program.parse();
  }
  
  async start(options) {
    try {
      console.log(chalk.blue.bold('🚀 正在启动舆情研判系统V2 CLI...'));
      
      this.startTime = Date.now();
      
      // 初始化核心组件
      await this.initializeCoreComponents(options);
      
      // 初始化功能模块
      await this.initializeModules(options);
      
      this.isRunning = true;
      
      console.log(chalk.green.bold('✅ 舆情研判系统V2 CLI启动成功！'));
      console.log(chalk.cyan('📊 系统已就绪，可以使用各种命令进行操作'));
      console.log(chalk.yellow('💡 使用 --help 查看所有可用命令'));
      
      // 如果直接运行没有子命令，启动交互式模式
      if (process.argv.length <= 2) {
        await this.startInteractiveMode();
      }
      
    } catch (error) {
      console.error(chalk.red.bold('❌ 系统启动失败:'), error.message);
      await this.cleanup();
      process.exit(1);
    }
  }
  
  async initializeCoreComponents(options) {
    // 初始化配置管理器
    this.config = ConfigManager;
    
    if (options.debug) {
      this.config.set('system.debug', true);
    }
    
    // 初始化日志器
    this.logger = Logger;
    
    // 初始化错误处理器
    this.errorHandler = ErrorHandler;
    
    // 初始化性能监控器
    this.performanceMonitor = new PerformanceMonitor({
      enabled: true,
      checkInterval: 60000
    });
    
    this.logger.info('核心组件初始化完成');
  }
  
  async initializeModules(options) {
    // 初始化数据收集器
    if (!options.noCollector) {
      this.dataCollector = new AdvancedDataCollector();
      await this.dataCollector.initialize();
      console.log(chalk.green('✅ 数据收集器初始化完成'));
    }
    
    // 初始化AI分析器
    if (!options.noAnalyzer) {
      this.aiAnalyzer = new EnhancedAIAnalyzer();
      await this.aiAnalyzer.initialize();
      console.log(chalk.green('✅ AI分析器初始化完成'));
    }
    
    // 初始化技能管理器
    this.skillManager = new SkillManager();
    await this.skillManager.start();
    console.log(chalk.green('✅ 技能管理器初始化完成'));
    
    // 初始化实时监控器
    if (!options.noMonitor) {
      this.realTimeMonitor = new RealTimeMonitor();
      console.log(chalk.green('✅ 实时监控器初始化完成'));
    }
    
    console.log(chalk.green('✅ 功能模块初始化完成'));
  }
  
  async performAnalysis(options) {
    const spinner = ora('正在初始化系统...').start();
    
    try {
      // 确保系统已初始化
      if (!this.dataCollector || !this.aiAnalyzer) {
        spinner.text = '正在初始化分析模块...';
        await this.initializeModules({});
      }
      
      const keywords = options.keywords.split(',').map(k => k.trim());
      const platforms = options.platforms.split(',').map(p => p.trim());
      const maxResults = parseInt(options.maxResults);
      
      console.log(chalk.blue(`\n📊 分析参数:`));
      console.log(`关键词: ${keywords.join(', ')}`);
      console.log(`平台: ${platforms.join(', ')}`);
      console.log(`最大结果数: ${maxResults}`);
      console.log(`分析类型: ${options.analysisType}`);
      
      // 数据收集
      spinner.text = '正在收集数据...';
      const collectedData = await this.dataCollector.collect(keywords, {
        platforms: platforms,
        maxResults: maxResults,
        timeRange: '24h'
      });
      
      console.log(chalk.green(`✅ 数据收集完成，共 ${collectedData.length} 条数据`));
      
      // AI分析
      spinner.text = '正在进行AI分析...';
      const analysisResult = await this.aiAnalyzer.analyze(
        collectedData,
        keywords,
        { analysisType: options.analysisType }
      );
      
      spinner.succeed('AI分析完成！');
      
      // 显示结果
      this.displayAnalysisResults(analysisResult);
      
    } catch (error) {
      spinner.fail('分析失败');
      console.error(chalk.red('错误详情:'), error.message);
      this.logger.error('舆情分析失败:', error);
    }
  }
  
  async startMonitoring(options) {
    const spinner = ora('正在初始化监控系统...').start();
    
    try {
      // 确保实时监控系统已初始化
      if (!this.realTimeMonitor) {
        spinner.text = '正在初始化监控模块...';
        await this.initializeModules({});
      }
      
      spinner.succeed('监控系统初始化完成');
      
      const keywords = options.keywords.split(',').map(k => k.trim());
      const platforms = options.platforms.split(',').map(p => p.trim());
      const interval = parseInt(options.interval) * 1000;
      
      console.log(chalk.blue.bold('\n📡 启动实时监控系统'));
      console.log(`监控关键词: ${keywords.join(', ')}`);
      console.log(`监控平台: ${platforms.join(', ')}`);
      console.log(`监控间隔: ${options.interval}秒`);
      console.log(chalk.yellow('\n按 Ctrl+C 停止监控\n'));
      
      // 启动实时监控
      await this.realTimeMonitor.startMonitoring(keywords, platforms);
      
      // 设置定期报告
      const reportInterval = setInterval(async () => {
        await this.generateMonitoringReport();
      }, interval);
      
      // 监听停止信号
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\n正在停止监控...'));
        clearInterval(reportInterval);
        this.realTimeMonitor.stopMonitoring();
        process.exit(0);
      });
      
      // 初始报告
      await this.generateMonitoringReport();
      
    } catch (error) {
      spinner.fail('监控启动失败');
      console.error(chalk.red('监控启动失败:'), error.message);
      this.logger.error('实时监控启动失败:', error);
    }
  }
  
  async collectData(options) {
    const spinner = ora('正在初始化系统...').start();
    
    try {
      // 确保数据收集器已初始化
      if (!this.dataCollector) {
        spinner.text = '正在初始化数据收集模块...';
        await this.initializeModules({});
      }
      
      spinner.text = '正在收集数据...';
      const keywords = options.keywords.split(',').map(k => k.trim());
      const platforms = options.platforms.split(',').map(p => p.trim());
      const maxResults = parseInt(options.maxResults);
      
      const data = await this.dataCollector.collect(keywords, {
        platforms: platforms,
        maxResults: maxResults,
        timeRange: '24h'
      });
      
      spinner.succeed(`数据收集完成，共 ${data.length} 条记录`);
      
      // 显示数据摘要
      this.displayDataSummary(data);
      
      // 保存到文件（如果指定）
      if (options.output) {
        const fs = require('fs-extra');
        await fs.writeJson(options.output, data, { spaces: 2 });
        console.log(chalk.green(`数据已保存到: ${options.output}`));
      }
      
    } catch (error) {
      spinner.fail('数据收集失败');
      console.error(chalk.red('错误详情:'), error.message);
      this.logger.error('数据收集失败:', error);
    }
  }
  
  async showStatus() {
    console.log(chalk.blue.bold('\n📊 系统状态报告'));
    console.log('=' .repeat(50));
    
    const status = {
      system: {
        status: this.isRunning ? '运行中' : '已停止',
        uptime: this.startTime ? Date.now() - this.startTime : 0,
        pid: process.pid,
        version: '2.0.0',
        nodeVersion: process.version,
        platform: process.platform
      },
      services: {
        dataCollector: this.dataCollector ? '运行中' : '未启动',
        aiAnalyzer: this.aiAnalyzer ? '运行中' : '未启动',
        realTimeMonitor: this.realTimeMonitor ? '运行中' : '未启动',
        skillManager: this.skillManager ? '运行中' : '未启动'
      },
      resources: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
    
    console.log(chalk.cyan('系统信息:'));
    console.log(`  状态: ${status.system.status}`);
    console.log(`  PID: ${status.system.pid}`);
    console.log(`  版本: ${status.system.version}`);
    console.log(`  Node.js: ${status.system.nodeVersion}`);
    console.log(`  平台: ${status.system.platform}`);
    
    if (this.startTime) {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      console.log(`  运行时间: ${uptime}秒`);
    }
    
    console.log(chalk.cyan('\n服务状态:'));
    Object.entries(status.services).forEach(([service, state]) => {
      const color = state === '运行中' ? chalk.green : chalk.red;
      console.log(`  ${service}: ${color(state)}`);
    });
    
    console.log(chalk.cyan('\n资源使用:'));
    const memory = status.resources.memory;
    console.log(`  内存使用: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
    console.log(`  RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
    console.log(`  外部内存: ${Math.round(memory.external / 1024 / 1024)}MB`);
  }
  
  async manageConfig(options) {
    if (options.show) {
      console.log(chalk.blue.bold('\n📋 当前配置'));
      console.log(JSON.stringify(this.config.config, null, 2));
    } else if (options.edit) {
      console.log(chalk.yellow('配置编辑功能开发中...'));
      console.log('配置文件路径:', this.config.configPath);
    } else if (options.reset) {
      await this.config.reset();
      console.log(chalk.green('✅ 配置已重置为默认值'));
    }
  }
  
  async runBenchmark(options) {
    const spinner = ora('正在初始化系统...').start();
    
    try {
      // 确保必要的模块已初始化
      const modules = {};
      if (options.test === 'all' || options.test === 'collection') {
        modules.dataCollector = true;
      }
      if (options.test === 'all' || options.test === 'analysis') {
        modules.dataCollector = true;
        modules.aiAnalyzer = true;
      }
      
      await this.initializeModules(modules);
      spinner.succeed('系统初始化完成');
      
      console.log(chalk.blue.bold('\n🏃 运行性能基准测试'));
      
      const iterations = parseInt(options.iterations);
      const results = {
        dataCollection: [],
        aiAnalysis: [],
        overall: []
      };
      
      // 数据收集性能测试
      if (options.test === 'all' || options.test === 'collection') {
        console.log(chalk.cyan('\n📊 数据收集性能测试'));
        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          await this.dataCollector.collect(['测试'], { maxResults: 50 });
          const duration = Date.now() - start;
          results.dataCollection.push(duration);
          process.stdout.write(`.`);
        }
        console.log();
      }
      
      // AI分析性能测试
      if (options.test === 'all' || options.test === 'analysis') {
        console.log(chalk.cyan('\n🤖 AI分析性能测试'));
        const testData = await this.dataCollector.collect(['测试'], { 
          platforms: ['weibo'], 
          maxResults: 10,
          timeRange: '24h'
        });
        
        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          await this.aiAnalyzer.analyze(testData, ['测试']);
          const duration = Date.now() - start;
          results.aiAnalysis.push(duration);
          process.stdout.write(`.`);
        }
        console.log();
      }
      
      // 显示结果
      this.displayBenchmarkResults(results);
      
    } catch (error) {
      spinner.fail('基准测试失败');
      console.error(chalk.red('错误详情:'), error.message);
      this.logger.error('基准测试失败:', error);
    }
  }
  
  async startInteractiveMode() {
    console.log(chalk.blue.bold('\n🎯 交互式模式'));
    console.log(chalk.cyan('请输入命令或选择操作:'));
    
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '选择操作:',
          choices: [
            { name: '📊 执行舆情分析', value: 'analyze' },
            { name: '📡 启动实时监控', value: 'monitor' },
            { name: '📥 收集数据', value: 'collect' },
            { name: '📋 查看系统状态', value: 'status' },
            { name: '⚙️  管理配置', value: 'config' },
            { name: '🏃 性能测试', value: 'benchmark' },
            { name: '🚪 退出', value: 'exit' }
          ]
        }
      ]);
      
      if (action === 'exit') {
        console.log(chalk.yellow('再见！'));
        break;
      }
      
      await this.handleInteractiveAction(action);
    }
  }
  
  async handleInteractiveAction(action) {
    switch (action) {
      case 'analyze':
        const analyzeOpts = await inquirer.prompt([
          { type: 'input', name: 'keywords', message: '输入关键词(用逗号分隔):', default: '疫情,疫苗' },
          { type: 'input', name: 'platforms', message: '输入平台(用逗号分隔):', default: 'weibo,zhihu' },
          { type: 'number', name: 'maxResults', message: '最大结果数:', default: 100 }
        ]);
        await this.performAnalysis(analyzeOpts);
        break;
        
      case 'monitor':
        const monitorOpts = await inquirer.prompt([
          { type: 'input', name: 'keywords', message: '监控关键词:', default: '疫情' },
          { type: 'input', name: 'platforms', message: '监控平台:', default: 'weibo' },
          { type: 'number', name: 'interval', message: '监控间隔(秒):', default: 60 }
        ]);
        await this.startMonitoring(monitorOpts);
        break;
        
      case 'collect':
        const collectOpts = await inquirer.prompt([
          { type: 'input', name: 'keywords', message: '关键词:', default: '测试' },
          { type: 'input', name: 'platforms', message: '平台:', default: 'weibo' },
          { type: 'number', name: 'maxResults', message: '最大结果数:', default: 50 }
        ]);
        await this.collectData(collectOpts);
        break;
        
      case 'status':
        await this.showStatus();
        break;
        
      case 'config':
        await this.manageConfig({ show: true });
        break;
        
      case 'benchmark':
        const benchmarkOpts = await inquirer.prompt([
          { type: 'list', name: 'test', message: '测试类型:', choices: ['all', 'collection', 'analysis'], default: 'all' },
          { type: 'number', name: 'iterations', message: '迭代次数:', default: 10 }
        ]);
        await this.runBenchmark(benchmarkOpts);
        break;
    }
  }
  
  // 结果显示方法
  displayAnalysisResults(result) {
    console.log(chalk.green.bold('\n📊 分析结果'));
    console.log('=' .repeat(50));
    
    if (result.summary) {
      console.log(chalk.cyan('整体评估:'));
      console.log(result.summary.overallAssessment);
      
      if (result.summary.sentiment) {
        console.log(chalk.cyan('\n情感分析:'));
        console.log(`整体情感: ${result.summary.sentiment.overall.toFixed(2)}`);
        console.log(`置信度: ${(result.summary.sentiment.confidence * 100).toFixed(1)}%`);
      }
      
      if (result.summary.risks) {
        console.log(chalk.cyan('\n风险评估:'));
        console.log(`风险等级: ${result.summary.risks.level}`);
        console.log(`风险评分: ${result.summary.risks.score.toFixed(2)}`);
        console.log(`高风险项目: ${result.summary.risks.highRiskCount}`);
      }
      
      if (result.summary.topics && result.summary.topics.length > 0) {
        console.log(chalk.cyan('\n主要话题:'));
        result.summary.topics.slice(0, 5).forEach(topic => {
          console.log(`- ${topic.name} (权重: ${(topic.weight * 100).toFixed(1)}%)`);
        });
      }
      
      if (result.summary.keyInsights && result.summary.keyInsights.length > 0) {
        console.log(chalk.cyan('\n关键洞察:'));
        result.summary.keyInsights.forEach(insight => {
          console.log(`• ${insight}`);
        });
      }
      
      if (result.summary.recommendations && result.summary.recommendations.length > 0) {
        console.log(chalk.cyan('\n建议措施:'));
        result.summary.recommendations.forEach(rec => {
          console.log(`• ${rec}`);
        });
      }
    }
    
    console.log(chalk.gray(`\n分析完成时间: ${new Date().toLocaleString()}`));
  }
  
  displayDataSummary(data) {
    console.log(chalk.cyan('\n📈 数据摘要'));
    console.log(`总记录数: ${data.length}`);
    
    if (data.length > 0) {
      const platforms = {};
      const sentiments = {};
      
      data.forEach(item => {
        platforms[item.platform] = (platforms[item.platform] || 0) + 1;
        sentiments[item.sentiment] = (sentiments[item.sentiment] || 0) + 1;
      });
      
      console.log('\n平台分布:');
      Object.entries(platforms).forEach(([platform, count]) => {
        console.log(`  ${platform}: ${count}`);
      });
      
      console.log('\n情感分布:');
      Object.entries(sentiments).forEach(([sentiment, count]) => {
        console.log(`  ${sentiment}: ${count}`);
      });
    }
  }
  
  displayBenchmarkResults(results) {
    console.log(chalk.blue.bold('\n📊 性能基准测试结果'));
    console.log('=' .repeat(50));
    
    const formatResults = (data, name) => {
      if (data.length === 0) return;
      
      const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
      const min = Math.min(...data);
      const max = Math.max(...data);
      
      console.log(chalk.cyan(`${name}:`));
      console.log(`  平均耗时: ${avg.toFixed(2)}ms`);
      console.log(`  最快: ${min}ms`);
      console.log(`  最慢: ${max}ms`);
      console.log(`  测试次数: ${data.length}`);
    };
    
    formatResults(results.dataCollection, '数据收集');
    formatResults(results.aiAnalysis, 'AI分析');
    
    console.log(chalk.gray(`\n测试完成时间: ${new Date().toLocaleString()}`));
  }
  
  async generateMonitoringReport() {
    const stats = this.realTimeMonitor.getStats();
    
    console.clear();
    console.log(chalk.blue.bold('\n📡 实时监控报告'));
    console.log('=' .repeat(60));
    console.log(chalk.gray(`生成时间: ${new Date().toLocaleString()}`));
    
    if (stats) {
      console.log(chalk.cyan('\n📊 监控统计:'));
      console.log(`总数据量: ${stats.totalData}`);
      console.log(`平均情感: ${stats.avgSentiment.toFixed(3)}`);
      console.log(`风险指数: ${(stats.riskIndex * 100).toFixed(1)}%`);
      console.log(`异常检测: ${stats.anomalyCount}`);
      
      if (stats.alerts && stats.alerts.length > 0) {
        console.log(chalk.red.bold('\n🚨 预警信息:'));
        stats.alerts.forEach(alert => {
          console.log(`[${alert.level}] ${alert.message}`);
        });
      }
      
      if (stats.trends && stats.trends.length > 0) {
        console.log(chalk.cyan('\n📈 趋势分析:'));
        stats.trends.forEach(trend => {
          console.log(`${trend.metric}: ${trend.direction} (${trend.change.toFixed(2)})`);
        });
      }
    }
    
    console.log(chalk.gray('\n' + '-'.repeat(60)));
  }
  
  async cleanup() {
    try {
      this.isRunning = false;
      
      // 停止所有服务
      if (this.performanceMonitor) {
        await this.performanceMonitor.stop();
      }
      
      if (this.realTimeMonitor) {
        await this.realTimeMonitor.stop();
      }
      
      if (this.skillManager) {
        await this.skillManager.stop();
      }
      
      if (this.logger) {
        this.logger.info('系统清理完成');
      }
      
    } catch (error) {
      console.error('清理过程中出错:', error.message);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new PublicOpinionSystemV2CLI();
  
  // 处理优雅关闭
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n正在关闭系统...'));
    await cli.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n\n收到终止信号，正在关闭系统...'));
    await cli.cleanup();
    process.exit(0);
  });
}

module.exports = PublicOpinionSystemV2CLI;