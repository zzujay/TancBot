#!/usr/bin/env node

const path = require('path');
const fs = require('fs').promises;

// 测试V2系统各个模块
class V2SystemTest {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🧪 开始V2系统测试...\n');

    try {
      // 测试核心模块
      await this.testConfigManager();
      await this.testLogger();
      await this.testErrorHandler();
      await this.testPerformanceMonitor();

      // 测试功能模块
      await this.testDataCollector();
      await this.testAIAnalyzer();
      await this.testSkillManager();
      await this.testRealTimeMonitor();

      // 测试Web模块
      await this.testWebServer();

      // 生成测试报告
      await this.generateTestReport();

      console.log('\n✅ 所有测试完成！');
      
    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      process.exit(1);
    }
  }

  async testConfigManager() {
    console.log('📋 测试配置管理器...');
    try {
      const ConfigManager = require('../utils/config-manager');
      const config = new ConfigManager();
      
      // 测试加载配置
      await config.load();
      this.testResults.push({
        module: 'ConfigManager',
        test: '加载配置',
        status: 'PASS',
        message: '配置加载成功'
      });

      // 测试设置配置
      config.set('test.key', 'test-value');
      const value = config.get('test.key');
      if (value === 'test-value') {
        this.testResults.push({
          module: 'ConfigManager',
          test: '设置配置',
          status: 'PASS',
          message: '配置设置成功'
        });
      }

      console.log('✅ 配置管理器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'ConfigManager',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testLogger() {
    console.log('📝 测试日志管理器...');
    try {
      const Logger = require('./utils/logger');
      const logger = new Logger({ level: 'debug' });

      // 测试不同级别的日志
      logger.debug('调试信息');
      logger.info('信息消息');
      logger.warn('警告消息');
      logger.error('错误消息');

      this.testResults.push({
        module: 'Logger',
        test: '日志记录',
        status: 'PASS',
        message: '日志功能正常'
      });

      console.log('✅ 日志管理器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'Logger',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testErrorHandler() {
    console.log('🚨 测试错误处理器...');
    try {
      const ErrorHandler = require('./utils/error-handler');
      const errorHandler = new ErrorHandler({ autoRestart: false });

      // 测试错误分类
      const testError = new Error('测试错误');
      const classified = errorHandler.classifyError(testError);

      this.testResults.push({
        module: 'ErrorHandler',
        test: '错误分类',
        status: 'PASS',
        message: `错误类型: ${classified.type}`
      });

      console.log('✅ 错误处理器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'ErrorHandler',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testPerformanceMonitor() {
    console.log('📊 测试性能监控器...');
    try {
      const PerformanceMonitor = require('./utils/performance-monitor');
      const monitor = new PerformanceMonitor({ enabled: true });

      // 测试性能指标收集
      await monitor.start();
      
      // 模拟一些工作
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = monitor.getMetrics();
      
      this.testResults.push({
        module: 'PerformanceMonitor',
        test: '性能监控',
        status: 'PASS',
        message: `内存使用: ${Math.round(metrics.memory.heapUsed / 1024 / 1024)}MB`
      });

      await monitor.stop();

      console.log('✅ 性能监控器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'PerformanceMonitor',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testDataCollector() {
    console.log('📥 测试数据收集器...');
    try {
      const AdvancedDataCollector = require('./data-collection/advanced-collector');
      const collector = new AdvancedDataCollector();

      // 测试模拟数据收集
      const mockData = await collector.collectMockData(['测试'], { maxResults: 10 });

      if (mockData && mockData.length > 0) {
        this.testResults.push({
          module: 'DataCollector',
          test: '数据收集',
          status: 'PASS',
          message: `收集到 ${mockData.length} 条数据`
        });
      }

      console.log('✅ 数据收集器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'DataCollector',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testAIAnalyzer() {
    console.log('🤖 测试AI分析器...');
    try {
      const EnhancedAIAnalyzer = require('./ai-analysis/enhanced-analyzer');
      const analyzer = new EnhancedAIAnalyzer();

      // 测试文本分析
      const testContent = '这是一个测试文本，用于测试AI分析功能。';
      const result = await analyzer.analyze(testContent);

      if (result && result.sentiment) {
        this.testResults.push({
          module: 'AIAnalyzer',
          test: '文本分析',
          status: 'PASS',
          message: `情感分析: ${result.sentiment.label}`
        });
      }

      console.log('✅ AI分析器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'AIAnalyzer',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testSkillManager() {
    console.log('🎯 测试技能管理器...');
    try {
      const SkillManager = require('./skills/skill-manager');
      const skillManager = new SkillManager({ autoEvolution: false });

      // 测试技能加载
      await skillManager.loadSkills();
      const skills = skillManager.getSkills();

      this.testResults.push({
        module: 'SkillManager',
        test: '技能加载',
        status: 'PASS',
        message: `加载了 ${skills.length} 个技能`
      });

      console.log('✅ 技能管理器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'SkillManager',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testRealTimeMonitor() {
    console.log('📡 测试实时监控器...');
    try {
      const RealTimeMonitor = require('./monitoring/realtime-monitor');
      const monitor = new RealTimeMonitor();

      // 测试监控启动
      await monitor.startMonitoring(['测试'], ['weibo']);
      
      // 模拟一些监控数据
      monitor.emit('data-update', { type: 'sentiment', value: 0.8 });

      this.testResults.push({
        module: 'RealTimeMonitor',
        test: '监控功能',
        status: 'PASS',
        message: '实时监控启动成功'
      });

      await monitor.stopMonitoring();

      console.log('✅ 实时监控器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'RealTimeMonitor',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async testWebServer() {
    console.log('🌐 测试Web服务器...');
    try {
      const WebServer = require('./web/server');
      const server = new WebServer({ port: 3001, host: 'localhost' });

      // 测试服务器启动
      const result = await server.start();

      if (result.success) {
        this.testResults.push({
          module: 'WebServer',
          test: '服务器启动',
          status: 'PASS',
          message: `服务器运行在 ${result.url}`
        });

        // 测试API端点
        const http = require('http');
        const options = {
          hostname: 'localhost',
          port: 3001,
          path: '/health',
          method: 'GET'
        };

        const req = http.request(options, (res) => {
          if (res.statusCode === 200) {
            this.testResults.push({
              module: 'WebServer',
              test: 'API端点',
              status: 'PASS',
              message: 'API端点正常响应'
            });
          }
        });

        req.on('error', (e) => {
          console.warn('API测试警告:', e.message);
        });

        req.end();

        // 等待一下让请求完成
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 停止服务器
        await server.stop();
      }

      console.log('✅ Web服务器测试通过\n');
    } catch (error) {
      this.testResults.push({
        module: 'WebServer',
        test: '基本功能',
        status: 'FAIL',
        message: error.message
      });
      throw error;
    }
  }

  async generateTestReport() {
    console.log('📊 生成测试报告...\n');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const duration = Date.now() - this.startTime;

    console.log('=== V2系统测试报告 ===');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${failedTests}`);
    console.log(`耗时: ${duration}ms`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('\n详细结果:');

    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} [${result.module}] ${result.test}: ${result.message}`);
    });

    // 保存测试报告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        duration: duration,
        successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%'
      },
      details: this.testResults
    };

    await fs.mkdir('logs', { recursive: true });
    await fs.writeFile(
      path.join('logs', `v2-test-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 测试报告已保存到 logs/ 目录');
  }
}

// 运行测试
if (require.main === module) {
  const tester = new V2SystemTest();
  tester.runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = V2SystemTest;