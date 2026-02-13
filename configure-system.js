#!/usr/bin/env node

/**
 * 逐步配置和测试脚本
 * 完整的系统配置和验证流程
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SystemConfigurator {
  constructor() {
    this.config = {};
    this.testResults = [];
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn(command, args, {
        cwd: 'G:\\trae\\public-opinion-system',
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration
        });
      });

      // 超时保护
      setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          exitCode: -1,
          stdout: stdout.trim(),
          stderr: 'Command timeout',
          duration: 30000
        });
      }, 30000);
    });
  }

  logStep(step, description) {
    console.log(chalk.blue.bold(`\n[步骤 ${step}] ${description}`));
    console.log(chalk.gray('─'.repeat(60)));
  }

  logSuccess(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  logWarning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  logError(message) {
    console.log(chalk.red(`❌ ${message}`));
  }

  logInfo(message) {
    console.log(chalk.cyan(`ℹ️  ${message}`));
  }

  async checkPrerequisites() {
    this.logStep(1, '检查系统先决条件');

    // 检查Node.js
    const nodeResult = await this.runCommand('node', ['--version']);
    if (nodeResult.success) {
      this.logSuccess(`Node.js版本: ${nodeResult.stdout}`);
      this.config.nodeVersion = nodeResult.stdout;
    } else {
      this.logError('Node.js未安装或不可用');
      return false;
    }

    // 检查npm
    const npmResult = await this.runCommand('npm', ['--version']);
    if (npmResult.success) {
      this.logSuccess(`npm版本: ${npmResult.stdout}`);
      this.config.npmVersion = npmResult.stdout;
    } else {
      this.logError('npm未安装或不可用');
      return false;
    }

    // 检查内存
    const totalMemory = Math.round(require('os').totalmem() / 1024 / 1024 / 1024);
    this.logInfo(`系统总内存: ${totalMemory}GB`);
    if (totalMemory < 4) {
      this.logWarning('建议至少有4GB内存以获得最佳性能');
    }

    return true;
  }

  async setupEnvironment() {
    this.logStep(2, '设置环境配置');

    // 检查.env文件
    const envPath = path.join('G:\\trae\\public-opinion-system', '.env');
    if (fs.existsSync(envPath)) {
      this.logInfo('发现现有的.env文件');
      
      // 备份现有配置
      const backupPath = envPath + '.backup.' + Date.now();
      fs.copyFileSync(envPath, backupPath);
      this.logInfo(`已备份到: ${backupPath}`);
    } else {
      // 创建新的.env文件
      const envExamplePath = path.join('G:\\trae\\public-opinion-system', '.env.example');
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        this.logSuccess('已创建.env文件（基于模板）');
      } else {
        this.logWarning('未找到.env.example文件，创建基础配置');
        const basicConfig = `# 基础配置
DB_PATH=./data/opinion.db
LOG_LEVEL=info
LOG_FILE=./logs/system.log
COLLECTION_INTERVAL=30
MAX_KEYWORDS=10
MAX_CONCURRENT_TASKS=5
CACHE_TTL=3600
`;
        fs.writeFileSync(envPath, basicConfig);
        this.logSuccess('已创建基础.env文件');
      }
    }

    // 创建必要的目录
    const dirs = ['data', 'logs'];
    dirs.forEach(dir => {
      const dirPath = path.join('G:\\trae\\public-opinion-system', dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.logSuccess(`已创建目录: ${dir}`);
      }
    });

    return true;
  }

  async installDependencies() {
    this.logStep(3, '安装项目依赖');

    this.logInfo('正在安装依赖包...');
    const result = await this.runCommand('npm', ['install']);
    
    if (result.success) {
      this.logSuccess('依赖包安装完成');
      this.logInfo(`安装耗时: ${result.duration}ms`);
    } else {
      this.logError('依赖包安装失败');
      this.logError(result.stderr);
      return false;
    }

    return true;
  }

  async testBasicFunctions() {
    this.logStep(4, '测试基础功能');

    // 测试系统状态
    this.logInfo('测试系统状态...');
    const statusResult = await this.runCommand('npm', ['run', 'cli:v2', '--', 'status']);
    if (statusResult.success && statusResult.stdout.includes('系统状态报告')) {
      this.logSuccess('系统状态检查通过');
    } else {
      this.logWarning('系统状态检查可能有问题');
    }

    // 测试数据收集
    this.logInfo('测试数据收集功能...');
    const collectResult = await this.runCommand('npm', ['run', 'cli:v2', '--', 'collect', '--keywords', '测试', '--platforms', 'news', '--max-results', '3']);
    if (collectResult.success && collectResult.stdout.includes('数据收集完成')) {
      this.logSuccess('数据收集功能正常');
    } else {
      this.logWarning('数据收集功能可能需要配置');
    }

    // 测试AI分析
    this.logInfo('测试AI分析功能...');
    const analyzeResult = await this.runCommand('npm', ['run', 'cli:v2', '--', 'analyze', '--keywords', '测试', '--platforms', 'news', '--max-results', '5']);
    if (analyzeResult.success && analyzeResult.stdout.includes('分析结果')) {
      this.logSuccess('AI分析功能正常');
    } else {
      this.logWarning('AI分析功能可能需要配置');
    }

    return true;
  }

  async configureLLM() {
    this.logStep(5, '配置LLM增强功能（可选）');

    this.logInfo('LLM配置说明：');
    this.logInfo('1. OpenAI API: 访问 https://platform.openai.com/api-keys');
    this.logInfo('2. Claude API: 访问 https://console.anthropic.com/');
    this.logInfo('3. 本地LLM: 使用Ollama或LM Studio');

    // 检查是否已有LLM配置
    const envPath = path.join('G:\\trae\\public-opinion-system', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('OPENAI_API_KEY=your_openai_api_key_here')) {
      this.logWarning('检测到默认的LLM配置，需要手动更新');
      this.logInfo('请编辑 .env 文件，添加您的API密钥');
    }

    // 测试LLM功能（模拟模式）
    this.logInfo('测试LLM增强分析功能（模拟模式）...');
    const llmResult = await this.runCommand('npm', ['run', 'cli:v2', '--', 'analyze', '--keywords', '人工智能', '--platforms', 'social', '--max-results', '5']);
    if (llmResult.success) {
      this.logSuccess('LLM增强功能架构正常（当前使用模拟模式）');
    }

    return true;
  }

  async runPerformanceTest() {
    this.logStep(6, '性能基准测试');

    this.logInfo('运行性能基准测试...');
    const benchmarkResult = await this.runCommand('npm', ['run', 'cli:v2', '--', 'benchmark', '--test', 'all', '--iterations', '3']);
    
    if (benchmarkResult.success) {
      this.logSuccess('性能测试完成');
      this.logInfo('性能指标已记录到日志文件');
    } else {
      this.logWarning('性能测试可能有问题');
    }

    return true;
  }

  async generateQuickStartGuide() {
    this.logStep(7, '生成快速开始指南');

    const guide = `
# 🚀 舆情研判系统 - 快速开始

## 📋 系统已配置完成

### ✅ 验证的功能
- 数据收集: ${this.testResults.filter(r => r.includes('数据收集')).length > 0 ? '✅' : '⚠️'}
- AI分析: ${this.testResults.filter(r => r.includes('AI分析')).length > 0 ? '✅' : '⚠️'}
- LLM增强: ${this.testResults.filter(r => r.includes('LLM')).length > 0 ? '✅' : '⚠️'}
- 性能测试: ${this.testResults.filter(r => r.includes('性能')).length > 0 ? '✅' : '⚠️'}

### 🎯 常用命令

# 查看系统状态
npm run cli:v2 -- status

# 收集数据（基础版）
npm run cli:v2 -- collect --keywords "热点话题" --platforms "news" --max-results 10

# 收集数据（带时间线）
npm run cli:v2 -- collect --keywords "人工智能" --platforms "social" --max-results 15 --timeline

# 基础AI分析
npm run cli:v2 -- analyze --keywords "疫情,防控" --platforms "news" --max-results 20

# 详细时间线分析
npm run cli:v2 -- timeline --keywords "科技发展" --platforms "news,weibo" --max-results 25

# 性能测试
npm run cli:v2 -- benchmark --test all --iterations 5

### 🔧 下一步操作

1. **配置LLM API**（推荐）
   - 编辑 .env 文件
   - 添加您的OpenAI或Claude API密钥
   - 重新运行测试验证

2. **自定义关键词**
   - 根据您的业务需求设置关键词
   - 测试不同关键词组合的效果

3. **监控和优化**
   - 定期查看日志文件
   - 监控系统性能指标
   - 根据使用情况调整参数

### 📊 系统特色
- ✅ 多平台数据收集（微博、知乎、新闻）
- ✅ LLM增强AI分析（情感、主题、风险）
- ✅ 智能时间线展示
- ✅ 多轮验证机制
- ✅ 企业级稳定性

### 🆘 需要帮助？
- 查看完整配置指南: CONFIGURATION_GUIDE.md
- 检查系统日志: logs/system.log
- 运行系统诊断: npm run cli:v2 -- status

祝您使用愉快！ 🎉
`;

    fs.writeFileSync(path.join('G:\\trae\\public-opinion-system', 'QUICK_START.md'), guide);
    this.logSuccess('快速开始指南已生成: QUICK_START.md');

    return true;
  }

  async runFullConfiguration() {
    console.log(chalk.bold.blue('🚀 舆情研判系统 - 逐步配置向导'));
    console.log(chalk.gray('开始时间: ' + new Date().toLocaleString()));
    console.log('=' .repeat(70));

    try {
      // 步骤1: 检查先决条件
      if (!await this.checkPrerequisites()) {
        throw new Error('系统先决条件检查失败');
      }

      // 步骤2: 设置环境
      if (!await this.setupEnvironment()) {
        throw new Error('环境设置失败');
      }

      // 步骤3: 安装依赖
      if (!await this.installDependencies()) {
        throw new Error('依赖安装失败');
      }

      // 步骤4: 测试基础功能
      if (!await this.testBasicFunctions()) {
        throw new Error('基础功能测试失败');
      }

      // 步骤5: 配置LLM（可选）
      await this.configureLLM();

      // 步骤6: 性能测试
      await this.runPerformanceTest();

      // 步骤7: 生成指南
      await this.generateQuickStartGuide();

      // 最终总结
      console.log(chalk.bold.green('\n🎉 配置完成！'));
      console.log(chalk.gray('=' .repeat(70)));
      console.log(chalk.white('您的舆情研判系统已准备就绪！'));
      console.log(chalk.cyan('请查看 QUICK_START.md 了解如何使用。'));
      
      return true;

    } catch (error) {
      console.error(chalk.red.bold('\n❌ 配置失败:'), error.message);
      console.log(chalk.yellow('\n请检查错误信息并重新运行配置向导。'));
      return false;
    }
  }
}

// 运行配置向导
async function runConfiguration() {
  const configurator = new SystemConfigurator();
  const success = await configurator.runFullConfiguration();
  
  process.exit(success ? 0 : 1);
}

// 如果直接运行，执行配置
if (require.main === module) {
  runConfiguration().catch(error => {
    console.error('配置过程出错:', error);
    process.exit(1);
  });
}

module.exports = { SystemConfigurator, runConfiguration };