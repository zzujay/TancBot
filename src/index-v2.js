#!/usr/bin/env node

const path = require('path');
const fs = require('fs').promises;
const { program } = require('commander');

// 导入核心模块
const ConfigManager = require('./utils/config-manager');
const PerformanceMonitor = require('./utils/performance-monitor');
const ErrorHandler = require('./utils/error-handler');
const Logger = require('./utils/logger');
const AdvancedDataCollector = require('./data-collection/advanced-collector');
const EnhancedAIAnalyzer = require('./ai-analysis/enhanced-analyzer');
const SkillManager = require('./services/skill-manager');
const RealTimeMonitor = require('./monitoring/realtime-monitor');


class PublicOpinionSystemV2 {
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
      .name('舆情研判系统V2')
      .description('基于AI的多智能体舆情分析与研判系统')
      .version('2.0.0')
      .option('-c, --config <path>', '配置文件路径', 'config/system.json')
      .option('--no-monitor', '禁用实时监控')
      .option('--no-collector', '禁用数据收集')
      .option('--no-analyzer', '禁用AI分析')
      .option('-d, --debug', '调试模式')
      .option('--dev', '开发模式')
      .action(async (options) => {
        await this.start(options);
      });
      
    program
      .command('config')
      .description('管理配置文件')
      .option('--show', '显示当前配置')
      .option('--edit', '编辑配置')
      .option('--reset', '重置为默认配置')
      .action(async (options) => {
        await this.manageConfig(options);
      });
      
    program
      .command('backup')
      .description('创建系统备份')
      .option('--data', '包含数据文件')
      .option('--config', '包含配置文件')
      .option('--logs', '包含日志文件')
      .action(async (options) => {
        await this.createBackup(options);
      });
      
    program
      .command('restore <backupId>')
      .description('恢复系统备份')
      .action(async (backupId, options) => {
        await this.restoreBackup(backupId, options);
      });
      
    program
      .command('status')
      .description('查看系统状态')
      .action(async () => {
        await this.showStatus();
      });
      
    program
      .command('stop')
      .description('停止系统')
      .action(async () => {
        await this.stop();
      });
      
    program.parse();
  }
  
  async start(options) {
    try {
      console.log('🚀 正在启动舆情研判系统V2...');
      
      this.startTime = Date.now();
      
      // 初始化核心组件
      await this.initializeCoreComponents(options);
      
      // 初始化功能模块
      await this.initializeModules(options);
      
      // 启动服务
      await this.startServices(options);
      
      this.isRunning = true;
      
      console.log('✅ 舆情研判系统V2启动成功！');
      console.log(`🔧 配置文件: ${options.config}`);
      console.log(`🕐 启动时间: ${new Date().toLocaleString()}`);
      console.log('💡 系统已切换为纯CLI模式，所有操作通过命令行完成');
      console.log('📋 可用命令:');
      console.log('   npm run cli          - 启动CLI界面');
      console.log('   npm run weibo:login  - 微博二维码登录');
      console.log('   npm run weibo:collect - 采集微博数据');
      console.log('   npm run weibo:analyze - 分析微博数据');
      console.log('   npm run test         - 运行系统测试');
      
      // 设置优雅关闭
      this.setupGracefulShutdown();
      
      // 保持进程运行
      this.keepAlive();
      
    } catch (error) {
      console.error('❌ 系统启动失败:', error.message);
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
    
    if (options.dev) {
      this.config.set('system.environment', 'development');
    }
    
    // 初始化日志器
    this.logger = Logger;
    
    // 初始化错误处理器
    this.errorHandler = ErrorHandler;
    
    // 初始化性能监控器
    this.performanceMonitor = new PerformanceMonitor({
      enabled: this.config.get('monitoring.enabled') || true,
      checkInterval: this.config.get('monitoring.checkInterval') || 60000
    });
    
    this.logger.info('核心组件初始化完成');
  }
  
  async initializeModules(options) {
    // 初始化数据收集器
    if (!options.noCollector) {
      this.dataCollector = new AdvancedDataCollector({
        proxyPool: this.config.get('dataCollection.proxyPool') || [],
        requestDelay: this.config.get('dataCollection.requestDelay') || 1000,
        maxRetries: this.config.get('dataCollection.maxRetries') || 3,
        logger: this.logger
      });
      
      this.logger.info('数据收集器初始化完成');
    }
    
    // 初始化AI分析器
    if (!options.noAnalyzer) {
      this.aiAnalyzer = new EnhancedAIAnalyzer({
        modelType: this.config.get('aiAnalysis.modelType') || 'advanced',
        confidenceThreshold: this.config.get('aiAnalysis.confidenceThreshold') || 0.8,
        sentimentThreshold: this.config.get('aiAnalysis.sentimentThreshold') || 0.3,
        riskThreshold: this.config.get('aiAnalysis.riskThreshold') || 0.7,
        logger: this.logger
      });
      
      this.logger.info('AI分析器初始化完成');
    }
    
    // 初始化技能管理器
    this.skillManager = new SkillManager({
      autoEvolution: this.config.get('skills.autoEvolution') || true,
      evolutionInterval: this.config.get('skills.evolutionInterval') || 3600000,
      logger: this.logger
    });
    
    // 初始化实时监控器
    if (!options.noMonitor) {
      this.realTimeMonitor = new RealTimeMonitor({
        checkInterval: this.config.get('monitoring.checkInterval') || 60000,
        alertThreshold: this.config.get('monitoring.alertThreshold') || 0.8,
        logger: this.logger
      });
      
      this.logger.info('实时监控器初始化完成');
    }
    
    this.logger.info('功能模块初始化完成');
  }
  
  async startServices(options) {
    // 启动性能监控
    if (this.performanceMonitor) {
      await this.performanceMonitor.start();
    }
    
    // 启动实时监控
    if (this.realTimeMonitor) {
      await this.realTimeMonitor.start();
    }
    
    // 启动技能管理器
    if (this.skillManager) {
      await this.skillManager.start();
    }
    
    this.logger.info('所有服务启动完成');
  }
  
  async manageConfig(options) {
    try {
      const configManager = new ConfigManager();
      await configManager.load();
      
      if (options.show) {
        console.log('当前配置:');
        console.log(JSON.stringify(configManager.config, null, 2));
      } else if (options.edit) {
        const configPath = configManager.configPath;
        console.log(`请编辑配置文件: ${configPath}`);
        
        // 尝试打开默认编辑器
        const { spawn } = require('child_process');
        const editor = process.env.EDITOR || 'notepad';
        spawn(editor, [configPath], { stdio: 'inherit' });
      } else if (options.reset) {
        await configManager.reset();
        console.log('配置已重置为默认值');
      }
    } catch (error) {
      console.error('配置管理失败:', error.message);
    }
  }
  
  async createBackup(options) {
    try {
      const backupManager = new (require('./utils/backup-manager'))();
      const backupId = await backupManager.create({
        includeData: options.data,
        includeConfig: options.config,
        includeLogs: options.logs
      });
      
      console.log(`备份创建成功: ${backupId}`);
    } catch (error) {
      console.error('备份创建失败:', error.message);
    }
  }
  
  async restoreBackup(backupId, options) {
    try {
      const backupManager = new (require('./utils/backup-manager'))();
      await backupManager.restore(backupId);
      console.log(`备份恢复成功: ${backupId}`);
    } catch (error) {
      console.error('备份恢复失败:', error.message);
    }
  }
  
  async showStatus() {
    try {
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
      
      console.log('系统状态:');
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('获取状态失败:', error.message);
    }
  }
  
  async stop() {
    console.log('🛑 正在停止系统...');
    await this.cleanup();
    console.log('✅ 系统已停止');
    process.exit(0);
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
  
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📤 接收到 ${signal} 信号，正在优雅关闭...`);
      await this.cleanup();
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2'));
    
    // Windows支持
    if (process.platform === 'win32') {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('SIGINT', () => shutdown('SIGINT'));
    }
  }
  
  keepAlive() {
    // 保持进程运行
    process.stdin.resume();
    
    // 定期健康检查
    setInterval(() => {
      if (this.isRunning) {
        const memoryUsage = process.memoryUsage();
        
        // 内存使用过高警告
        if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
          this.logger.warn('内存使用过高', {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
          });
        }
      }
    }, 60000); // 每分钟检查一次
  }
}

// 如果直接运行此文件
if (require.main === module) {
  new PublicOpinionSystemV2();
}

module.exports = PublicOpinionSystemV2;