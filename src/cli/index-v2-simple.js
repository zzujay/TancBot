/**
 * 舆情研判系统V2 CLI版本 - 简化版
 * 纯命令行界面，无Web组件
 */

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');

// 导入核心模块
const ConfigManager = require('../utils/config-manager');
const PerformanceMonitor = require('../utils/performance-monitor');
const ErrorHandler = require('../utils/error-handler');
const Logger = require('../utils/logger');
const RealDataCollectorV2 = require('../data-collection/real-data-collector-v2');
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
      .option('--debug', '调试模式')  // 移除短选项-d，避免与子命令冲突
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
      .option('-p, --platforms <platforms>', '平台列表，用逗号分隔', 'weibo')
      .option('-m, --max-results <number>', '最大结果数', '10')
      .option('-t, --analysis-type <type>', '分析类型', 'comprehensive')
      .option('--show-timeline', '显示数据时间线')
      .action(async (options) => {
        await this.performAnalysis(options);
      });
      
    // 舆情事件分析命令
    program
      .command('event')
      .description('分析舆情事件')
      .option('-d, --description <description>', '舆情事件详细叙述')
      .option('-m, --max-results <number>', '最大结果数', '50')
      .option('--show-timeline', '显示数据时间线')
      .option('--login', '强制登录微博')
      .action(async (options) => {
        await this.analyzeEvent(options);
      });
      
    // 数据收集命令
    program
      .command('collect')
      .description('收集舆情数据')
      .option('-k, --keywords <keywords>', '关键词列表', '测试')
      .option('-p, --platforms <platforms>', '平台列表', 'weibo')
      .option('-m, --max-results <number>', '最大结果数', '10')
      .option('-o, --output <file>', '输出文件')
      .option('-t, --timeline', '按时间线显示结果')
      .option('--time-range <range>', '时间范围 (24h, 7d, 30d)', '7d')
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
      .option('--reset', '重置为默认配置')
      .action(async (options) => {
        await this.manageConfig(options);
      });
      
    program
      .command('timeline')
      .description('查看数据时间线')
      .option('-k, --keywords <keywords>', '关键词列表', '疫情')
      .option('-p, --platforms <platforms>', '平台列表', 'news')
      .option('-m, --max-results <number>', '最大结果数', '20')
      .option('--time-range <range>', '时间范围 (24h, 7d, 30d)', '7d')
      .action(async (options) => {
        await this.showTimelineData(options);
      });
      
    program
      .command('benchmark')
      .description('运行性能基准测试')
      .option('-t, --test <type>', '测试类型', 'all')
      .option('-i, --iterations <number>', '测试迭代次数', '5')
      .action(async (options) => {
        await this.runBenchmark(options);
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
      
      // 显示快速开始菜单
      if (process.argv.length <= 2) {
        await this.showQuickMenu();
      }
      
    } catch (error) {
      console.error(chalk.red.bold('❌ 系统启动失败:'), error.message);
      await this.cleanup();
      process.exit(1);
    }
  }
  
  async showQuickMenu() {
    console.log(chalk.blue.bold('\n📋 快速开始菜单'));
    console.log('=' .repeat(50));
    console.log('1. 执行舆情分析');
    console.log('2. 执行舆情分析（带时间线）');
    console.log('3. 收集数据');
    console.log('4. 收集数据（带时间线）');
    console.log('5. 查看系统状态');
    console.log('6. 查看配置');
    console.log('7. 运行性能测试');
    console.log('8. 退出');
    console.log('=' .repeat(50));
    
    // 简单的命令行输入
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer.trim());
        });
      });
    };
    
    try {
      const choice = await askQuestion('\n请选择操作 (1-8): ');
      
      switch (choice) {
        case '1':
          await this.quickAnalyze();
          break;
        case '2':
          await this.quickAnalyze(true);
          break;
        case '3':
          await this.quickCollect();
          break;
        case '4':
          await this.quickCollect(true);
          break;
        case '5':
          await this.showStatus();
          break;
        case '6':
          await this.manageConfig({ show: true });
          break;
        case '7':
          await this.runBenchmark({ test: 'all', iterations: '3' });
          break;
        case '8':
          console.log(chalk.yellow('再见！'));
          break;
        default:
          console.log(chalk.red('无效选择'));
      }
      
      rl.close();
    } catch (error) {
      console.error(chalk.red('输入错误:'), error.message);
      rl.close();
    }
  }
  
  async quickAnalyze(showTimeline = false) {
    console.log(chalk.blue('\n🚀 快速舆情分析'));
    const keywords = '疫情,疫苗,防控';
    const platforms = 'weibo,zhihu';
    const maxResults = 20;
    
    console.log(chalk.cyan(`关键词: ${keywords}`));
    console.log(chalk.cyan(`平台: ${platforms}`));
    console.log(chalk.cyan(`最大结果数: ${maxResults}`));
    
    await this.performAnalysis({
      keywords,
      platforms,
      maxResults: maxResults.toString(),
      analysisType: 'comprehensive',
      showTimeline: showTimeline
    });
  }
  
  async quickCollect(showTimeline = false) {
    console.log(chalk.blue('\n📥 快速数据收集'));
    const keywords = '热点,新闻';
    const platforms = 'weibo,zhihu';
    const maxResults = 15;
    
    console.log(chalk.cyan(`关键词: ${keywords}`));
    console.log(chalk.cyan(`平台: ${platforms}`));
    console.log(chalk.cyan(`最大结果数: ${maxResults}`));
    
    await this.collectData({
      keywords,
      platforms,
      maxResults: maxResults.toString(),
      timeline: showTimeline
    });
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
    console.log(chalk.blue('开始初始化功能模块...'));
    
    // 初始化数据收集器
    if (!options.noCollector) {
      console.log(chalk.cyan('初始化数据收集器...'));
      this.dataCollector = new RealDataCollectorV2();
      console.log(chalk.green('✅ 数据收集器初始化完成'));
    }
    
    // 初始化AI分析器
    if (!options.noAnalyzer) {
      console.log(chalk.cyan('初始化AI分析器...'));
      this.aiAnalyzer = new EnhancedAIAnalyzer();
      await this.aiAnalyzer.initialize();
      console.log(chalk.green('✅ AI分析器初始化完成'));
    }
    
    // 初始化技能管理器
    console.log(chalk.cyan('初始化技能管理器...'));
    this.skillManager = new SkillManager();
    await this.skillManager.start();
    console.log(chalk.green('✅ 技能管理器初始化完成'));
    
    // 初始化实时监控器
    if (!options.noMonitor) {
      console.log(chalk.cyan('初始化实时监控器...'));
      this.realTimeMonitor = new RealTimeMonitor();
      console.log(chalk.green('✅ 实时监控器初始化完成'));
    }
    
    console.log(chalk.green('✅ 功能模块初始化完成'));
  }
  
  async performAnalysis(options) {
    let spinner = ora('正在初始化系统...').start();
    
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
      const collectedData = await this.dataCollector.collectData(keywords, platforms, maxResults);
      
      console.log(chalk.green(`✅ 数据收集完成，共 ${collectedData.length} 条数据`));
      
      // 显示时间线（如果请求）
      if (options.showTimeline) {
        console.log(chalk.cyan('\n📊 数据预览'));
        this.displayTimeline(collectedData);
      }
      
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
    } finally {
      // 不清理资源以保持微博登录状态
      // await this.cleanup();
    }
  }
  

  
  async collectData(options) {
    let spinner = ora('正在初始化系统...').start();
    
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
      
      const data = await this.dataCollector.collectData(keywords, platforms, maxResults);
      
      spinner.succeed(`数据收集完成，共 ${data.length} 条记录`);
      
      // 显示数据摘要或时间线
      if (options.timeline) {
        this.displayTimeline(data);
      } else {
        this.displayDataSummary(data);
      }
      
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
  
  async showTimelineData(options) {
    let spinner = ora('正在初始化系统...').start();
    
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
      
      const data = await this.dataCollector.collectData(keywords, platforms, maxResults);
      
      spinner.succeed(`数据收集完成，共 ${data.length} 条记录`);
      
      // 显示详细时间线
      this.displayDetailedTimeline(data, keywords, platforms);
      
    } catch (error) {
      spinner.fail('时间线数据获取失败');
      console.error(chalk.red('错误详情:'), error.message);
      this.logger.error('时间线数据获取失败:', error);
    }
  }
  
  displayDetailedTimeline(data, keywords, platforms) {
    console.log(chalk.blue.bold('\n📅 详细数据时间线'));
    console.log('=' .repeat(60));
    console.log(chalk.cyan(`关键词: ${keywords.join(', ')}`));
    console.log(chalk.cyan(`平台: ${platforms.join(', ')}`));
    console.log(chalk.cyan(`数据量: ${data.length} 条`));
    console.log('=' .repeat(60));
    
    if (data.length === 0) {
      console.log(chalk.yellow('⚠️  未找到相关数据'));
      return;
    }
    
    // 按时间排序（最新的在前）
    const sortedData = [...data].sort((a, b) => {
      const timeA = new Date(a.publish_time || a.collection_time || Date.now());
      const timeB = new Date(b.publish_time || b.collection_time || Date.now());
      return timeB - timeA;
    });
    
    console.log(chalk.cyan(`时间范围: ${this.formatTimeRange(sortedData)}`));
    console.log('');
    
    // 按日期分组显示
    const groupedByDate = this.groupDataByDate(sortedData);
    
    Object.entries(groupedByDate).forEach(([date, items]) => {
      console.log(chalk.bold.blue(`\n📅 ${date} (${items.length} 条)`));
      console.log('-'.repeat(50));
      
      items.forEach((item, index) => {
        this.displayTimelineItem(item, index + 1);
      });
    });
    
    // 显示统计信息
    this.displayTimelineStats(data);
  }
  
  groupDataByDate(data) {
    const groups = {};
    
    data.forEach(item => {
      const date = new Date(item.publish_time || item.collection_time || Date.now());
      const dateKey = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(item);
    });
    
    return groups;
  }
  
  displayTimelineItem(item, index) {
    const time = new Date(item.publish_time || item.collection_time || Date.now());
    const timeStr = this.formatRelativeTime(time);
    const platformIcon = this.getPlatformIcon(item.platform);
    const sentimentColor = this.getSentimentColor(item.sentiment);
    
    console.log(`\n  ${index}. ${platformIcon} ${chalk.gray(timeStr)}`);
    console.log(`     ${chalk.white(item.content || '无内容')}`);
    
    const sentimentText = this.applySentimentColor(`情感: ${item.sentiment || '未知'}`, item.sentiment);
    console.log(`     ${sentimentText} | 平台: ${item.platform} | 作者: ${item.author || '匿名'}`);
    
    // 显示互动数据
    const stats = [];
    if (item.likes !== undefined) stats.push(`👍 ${item.likes}`);
    if (item.comments !== undefined) stats.push(`💬 ${item.comments}`);
    if (item.shares !== undefined) stats.push(`🔄 ${item.shares}`);
    
    if (stats.length > 0) {
      console.log(`     ${chalk.gray(stats.join(' | '))}`);
    }
    
    // 显示关键词匹配
    if (item.keyword) {
      console.log(`     ${chalk.cyan(`关键词: ${item.keyword}`)}`);
    }
    
    // 显示数据源
    if (item.source) {
      console.log(`     ${chalk.gray(`来源: ${item.source}`)}`);
    }
  }
  
  displayTimelineStats(data) {
    console.log(chalk.blue.bold('\n📊 时间线统计'));
    console.log('=' .repeat(40));
    
    const platforms = {};
    const sentiments = {};
    const hours = new Array(24).fill(0);
    
    data.forEach(item => {
      // 平台统计
      platforms[item.platform] = (platforms[item.platform] || 0) + 1;
      
      // 情感统计
      sentiments[item.sentiment] = (sentiments[item.sentiment] || 0) + 1;
      
      // 小时统计
      const hour = new Date(item.publish_time || item.collection_time || Date.now()).getHours();
      hours[hour]++;
    });
    
    console.log(chalk.cyan('平台分布:'));
    Object.entries(platforms).forEach(([platform, count]) => {
      const percentage = ((count / data.length) * 100).toFixed(1);
      console.log(`  ${this.getPlatformIcon(platform)} ${platform}: ${count} (${percentage}%)`);
    });
    
    console.log(chalk.cyan('\n情感分布:'));
    Object.entries(sentiments).forEach(([sentiment, count]) => {
      const percentage = ((count / data.length) * 100).toFixed(1);
      const colorFn = this.getSentimentColor(sentiment);
      console.log(`  ${colorFn(`${sentiment}: ${count} (${percentage}%)`)}`);
    });
    
    // 活跃时间段
    const activeHours = hours.map((count, hour) => ({ hour, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    if (activeHours.length > 0) {
      console.log(chalk.cyan('\n活跃时间段:'));
      activeHours.forEach(item => {
        console.log(`  ${item.hour}:00 - ${item.count} 条数据`);
      });
    }
    
    console.log(chalk.gray(`\n统计时间: ${new Date().toLocaleString()}`));
  }
  
  async showStatus() {
    console.log(chalk.blue.bold('\n📊 系统状态报告'));
    console.log('=' .repeat(50));
    console.log(chalk.cyan('系统信息:'));
    console.log(`  状态: ${this.isRunning ? chalk.green('运行中') : chalk.red('已停止')}`);
    console.log(`  PID: ${process.pid}`);
    console.log(`  版本: 2.0.0`);
    console.log(`  Node.js: ${process.version}`);
    console.log(`  平台: ${process.platform}`);
    
    if (this.startTime) {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      console.log(`  运行时间: ${uptime}秒`);
    }
    
    console.log(chalk.cyan('\n服务状态:'));
    const services = {
      dataCollector: this.dataCollector ? chalk.green('运行中') : chalk.red('未启动'),
      aiAnalyzer: this.aiAnalyzer ? chalk.green('运行中') : chalk.red('未启动'),
      realTimeMonitor: this.realTimeMonitor ? chalk.green('运行中') : chalk.red('未启动'),
      skillManager: this.skillManager ? chalk.green('运行中') : chalk.red('未启动')
    };
    
    Object.entries(services).forEach(([service, state]) => {
      console.log(`  ${service}: ${state}`);
    });
    
    console.log(chalk.cyan('\n资源使用:'));
    const memory = process.memoryUsage();
    console.log(`  内存使用: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
    console.log(`  RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
    console.log(`  外部内存: ${Math.round(memory.external / 1024 / 1024)}MB`);
  }
  
  async manageConfig(options) {
    if (options.show) {
      console.log(chalk.blue.bold('\n📋 当前配置'));
      console.log(JSON.stringify(this.config.config, null, 2));
    } else if (options.reset) {
      // 创建默认配置
      const defaultConfig = {
        system: {
          name: '舆情研判系统V2 CLI',
          version: '2.0.0',
          environment: 'development',
          debug: false
        },
        dataCollection: {
          maxResults: 100,
          requestDelay: 1000,
          retryAttempts: 3,
          proxyEnabled: false
        },
        aiAnalysis: {
          sentimentThreshold: 0.3,
          riskThreshold: 0.7,
          confidenceLevel: 0.8,
          modelType: 'advanced'
        },
        monitoring: {
          enabled: true,
          checkInterval: 60000,
          alertThreshold: 0.8
        }
      };
      
      // 保存默认配置
      const fs = require('fs-extra');
      const path = require('path');
      const configPath = path.join(process.cwd(), 'config', 'system.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      
      console.log(chalk.green('✅ 配置已重置为默认值'));
    }
  }
  
  async runBenchmark(options) {
    let spinner = ora('正在初始化系统...').start();
    
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
          await this.dataCollector.collect(['测试'], { maxResults: 10 });
          const duration = Date.now() - start;
          results.dataCollection.push(duration);
          process.stdout.write(`.`);
        }
        console.log();
      }
      
      // AI分析性能测试
      if (options.test === 'all' || options.test === 'analysis') {
        console.log(chalk.cyan('\n🤖 AI分析性能测试'));
        
        // 使用真实数据收集器获取测试数据
        let testData = [];
        try {
          testData = await this.dataCollector.collectData(['测试'], ['weibo'], 5);
        } catch (error) {
          console.log(chalk.yellow('\n⚠️  真实数据获取失败，跳过AI分析测试'));
        }
        
        if (testData.length > 0) {
          for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            await this.aiAnalyzer.analyze(testData, ['测试']);
            const duration = Date.now() - start;
            results.aiAnalysis.push(duration);
            process.stdout.write(`.`);
          }
          console.log();
        }
      }
      
      // 显示结果
      this.displayBenchmarkResults(results);
      
    } catch (error) {
      spinner.fail('基准测试失败');
      console.error(chalk.red('错误详情:'), error.message);
      this.logger.error('基准测试失败:', error);
    }
  }
  
  async analyzeEvent(options) {
    console.log(chalk.blue.bold('\n🚀 舆情事件分析'));
    console.log('=' .repeat(60));
    
    // 调试输出
    console.log(chalk.gray('调试信息 - 接收到的选项:'), JSON.stringify(options, null, 2));
    
    let spinner = ora('正在初始化系统...').start();
    
    try {
      // 确保系统已初始化
      await this.initializeModules({});
      
      // 系统初始化完成，停止 spinner
      spinner.succeed('系统初始化完成！');
      
      // 获取舆情事件叙述
      let eventDescription = options.description;
      if (!eventDescription) {
        // 交互模式获取事件叙述
        const readline = require('readline');
        const rl = readline.createInterface({ 
          input: process.stdin, 
          output: process.stdout,
          terminal: true // 确保输入显示
        });
        
        const askQuestion = (question) => {
          return new Promise((resolve) => {
            rl.question(question, (answer) => {
              resolve(answer.trim());
            });
          });
        };
        
        console.log('\n请详细描述舆情事件（按Enter键完成）:');
        console.log('例如: 某公司产品出现质量问题，用户在微博上大量投诉，引起广泛关注');
        console.log('-' .repeat(60));
        
        // 确保spinner停止，避免输入显示问题
        if (spinner) {
          spinner.stop();
        }
        
        eventDescription = await askQuestion('\n事件叙述: ');
        rl.close();
        
        if (!eventDescription) {
          throw new Error('事件叙述不能为空');
        }
      }
      
      console.log('\n📝 事件叙述:');
      console.log(chalk.cyan(eventDescription));
      console.log('');
      
      // 从事件叙述中提取关键词
      spinner = ora('正在从事件叙述中提取关键词...').start();
      const keywords = this.extractKeywordsFromDescription(eventDescription);
      spinner.succeed('关键词提取完成');
      
      console.log('🔍 提取的关键词:');
      console.log(chalk.green(keywords.join(', ')));
      console.log('');
      
      // 登录微博（如果需要）- Playwright会自动处理
      if (options.login) {
        spinner = ora('正在准备微博登录...').start();
        spinner.succeed('微博登录将在数据收集时自动进行');
        console.log(chalk.blue('💡 提示：首次使用需要扫码登录微博，后续将自动复用登录状态'));
      }
      
      // 数据收集（只从微博平台，使用Playwright）
      spinner = ora('正在从微博收集相关信息...').start();
      const maxResults = parseInt(options.maxResults) || 50;
      console.log(chalk.blue(`\n🔍 开始从微博搜索关键词: ${keywords.join(', ')}`));
      
      let collectedData;
      
      try {
        collectedData = await this.dataCollector.collectData(keywords, ['social'], maxResults);
        
        if (collectedData.length === 0) {
          spinner.warn('未收集到相关微博数据');
          console.log(chalk.yellow('⚠️  可能原因：关键词过于冷门、网络问题或微博搜索限制'));
          console.log(chalk.yellow('💡 建议：尝试使用更热门的关键词或调整搜索时间范围'));
          // 不抛出错误，继续后续流程
        } else {
          spinner.succeed(`成功从微博收集到 ${collectedData.length} 条相关数据`);
        }
      } catch (collectError) {
        spinner.fail('微博数据收集失败');
        console.log(chalk.red(`收集错误: ${collectError.message}`));
        
        if (collectError.message.includes('登录') || collectError.message.includes('扫码')) {
          console.log(chalk.yellow('💡 提示：请确保成功扫码登录微博'));
        }
        
        throw new Error(`微博数据收集失败: ${collectError.message}`);
      }
      
      // 按时间线排序和存储
      spinner.text = '正在按时间线整理数据...';
      const timelineData = this.sortDataByTimeline(collectedData);
      const timelineFilePath = this.saveTimelineData(timelineData, keywords);
      console.log(chalk.cyan(`📅 时间线数据已保存到: ${timelineFilePath}`));
      
      // 显示时间线（如果请求）
      if (options.showTimeline) {
        console.log(chalk.cyan('\n📊 事件时间线预览'));
        this.displayDetailedTimeline(timelineData, keywords, ['social']);
      }
      
      // AI分析
      spinner.text = '正在使用LLM多Agent进行分析...';
      let analysisResult;
      
      try {
        analysisResult = await this.aiAnalyzer.analyze(timelineData, keywords, { analysisType: 'comprehensive' });
        spinner.succeed('AI分析完成！');
      } catch (analysisError) {
        spinner.fail('AI分析失败');
        console.log(chalk.red(`分析错误: ${analysisError.message}`));
        throw new Error(`AI分析失败: ${analysisError.message}`);
      }
      
      // 生成研判报告
      console.log(chalk.green.bold('\n📋 舆情事件研判报告'));
      console.log('=' .repeat(60));
      this.displayAnalysisResults(analysisResult);
      
      // 保存分析结果
      const analysisFilePath = this.saveAnalysisResult(analysisResult, keywords);
      console.log(chalk.cyan(`\n📄 分析报告已保存到: ${analysisFilePath}`));
      
    } catch (error) {
      spinner.fail('事件分析失败');
      console.error(chalk.red('错误详情:'), error.message);
      this.logger.error('事件分析失败:', error);
    }
  }
  
  extractKeywordsFromDescription(description) {
    // 简单的关键词提取逻辑
    // 实际应用中可以使用NLP库进行更准确的提取
    const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
    
    // 分词并过滤停用词
    const words = description
      .split(/[^\u4e00-\u9fa5a-zA-Z0-9]+/)
      .filter(word => word.length > 1 && !stopWords.includes(word));
    
    // 去重并取前10个关键词
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 10);
  }
  
  async loginWeibo() {
    // 使用playwright-weibo-qr-login.js进行登录
    const WeiboPlaywrightQRLogin = require('../../playwright-weibo-qr-login');
    const login = new WeiboPlaywrightQRLogin({ headless: true });
    
    try {
      const result = await login.start();
      return result.success;
    } catch (error) {
      console.error('微博登录失败:', error.message);
      throw error;
    }
  }
  
  sortDataByTimeline(data) {
    // 按发布时间排序
    return [...data].sort((a, b) => {
      const timeA = new Date(a.publish_time || a.collection_time || Date.now());
      const timeB = new Date(b.publish_time || b.collection_time || Date.now());
      return timeA - timeB; // 时间线顺序（从早到晚）
    });
  }
  
  saveTimelineData(data, keywords) {
    const fs = require('fs-extra');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `timeline-${keywords.join('-')}-${timestamp}.json`;
    const filePath = path.join('data', fileName);
    
    // 确保目录存在
    fs.ensureDirSync('data');
    
    // 保存数据
    fs.writeJSONSync(filePath, data, { spaces: 2 });
    
    return filePath;
  }
  
  saveAnalysisResult(result, keywords) {
    const fs = require('fs-extra');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `analysis-${keywords.join('-')}-${timestamp}.json`;
    const filePath = path.join('data', fileName);
    
    // 确保目录存在
    fs.ensureDirSync('data');
    
    // 保存数据
    fs.writeJSONSync(filePath, result, { spaces: 2 });
    
    return filePath;
  }

  /**
   * 清理资源（保持Playwright登录状态）
   */
  async cleanup() {
    try {
      // 保持微博登录状态，不关闭浏览器
      if (this.dataCollector && this.dataCollector.collectors && this.dataCollector.collectors.social) {
        logger.info('保持微博登录状态，不关闭浏览器');
        // await this.dataCollector.collectors.social.close(); // 不关闭以保持登录状态
      }
    } catch (error) {
      logger.error('清理资源时出错:', error.message);
    }
  }
  
  // 演示数据和基础分析功能已移除 - 系统要求使用真实LLM API和真实数据
  
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
      
      // 显示时间线
      this.displayTimeline(data);
    }
  }
  
  displayTimeline(data) {
    console.log(chalk.cyan('\n📅 数据时间线'));
    
    if (data.length === 0) {
      console.log('  暂无数据');
      return;
    }
    
    // 按时间排序
    const sortedData = [...data].sort((a, b) => {
      const timeA = new Date(a.publish_time || a.collection_time || Date.now());
      const timeB = new Date(b.publish_time || b.collection_time || Date.now());
      return timeB - timeA; // 最新的在前
    });
    
    console.log(`  时间范围: ${this.formatTimeRange(sortedData)}`);
    console.log(`  最新 ${Math.min(10, sortedData.length)} 条数据:`);
    console.log('');
    
    sortedData.slice(0, 10).forEach((item, index) => {
      const time = new Date(item.publish_time || item.collection_time || Date.now());
      const timeStr = this.formatRelativeTime(time);
      const platformIcon = this.getPlatformIcon(item.platform);
      const sentimentColor = this.getSentimentColor(item.sentiment);
      
      console.log(`  ${index + 1}. ${platformIcon} ${chalk.gray(timeStr)}`);
      console.log(`     ${chalk.white(item.content?.substring(0, 80) || '无内容')}...`);
      const sentimentText = this.applySentimentColor(`情感: ${item.sentiment || '未知'}`, item.sentiment);
      console.log(`     ${sentimentText} | 平台: ${item.platform} | 作者: ${item.author || '匿名'}`);
      
      if (item.likes !== undefined || item.comments !== undefined) {
        const stats = [];
        if (item.likes !== undefined) stats.push(`👍 ${item.likes}`);
        if (item.comments !== undefined) stats.push(`💬 ${item.comments}`);
        if (item.shares !== undefined) stats.push(`🔄 ${item.shares}`);
        console.log(`     ${chalk.gray(stats.join(' | '))}`);
      }
      
      console.log('');
    });
  }
  
  formatTimeRange(data) {
    if (data.length === 0) return '无数据';
    
    const times = data.map(item => new Date(item.publish_time || item.collection_time || Date.now()));
    const oldest = new Date(Math.min(...times));
    const newest = new Date(Math.max(...times));
    
    const formatDate = (date) => {
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;
      
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    };
    
    return `${formatDate(oldest)} - ${formatDate(newest)}`;
  }
  
  formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  getPlatformIcon(platform) {
    const icons = {
      weibo: '🐦',
      zhihu: '🤔',
      news: '📰',
      douyin: '🎵',
      bilibili: '📺',
      xiaohongshu: '📝',
      social: '💬'
    };
    
    return icons[platform] || '📄';
  }
  
  getSentimentColor(sentiment) {
    switch (sentiment) {
      case 'positive': return chalk.green;
      case 'negative': return chalk.red;
      case 'neutral': return chalk.yellow;
      default: return chalk.gray;
    }
  }
  
  applySentimentColor(text, sentiment) {
    const colorFn = this.getSentimentColor(sentiment);
    return colorFn(text);
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