const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logger = require('./utils/logger');
const DataCollector = require('./data-collection/collector');
const AIAnalyzer = require('./ai-analysis/analyzer');
const DatabaseManager = require('./utils/simple-database');
const ValidationEngine = require('./ai-analysis/validation-engine');
const SkillIntegration = require('./services/skill-integration');

class PublicOpinionSystem {
  constructor() {
    this.db = new DatabaseManager();
    this.collector = new DataCollector();
    this.analyzer = new AIAnalyzer();
    this.validator = new ValidationEngine();
    this.skillIntegration = new SkillIntegration();
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info('正在初始化舆情研判系统...');
      await this.db.initialize();
      await this.collector.initialize();
      await this.analyzer.initialize();
      await this.skillIntegration.initialize();
      logger.info('系统初始化完成');
    } catch (error) {
      logger.error('系统初始化失败:', error);
      throw error;
    }
  }

  async start(keywords, options = {}) {
    try {
      this.isRunning = true;
      logger.info(`开始舆情分析任务，关键词: ${keywords.join(', ')}`);
      
      // 1. 数据采集
      logger.info('开始数据采集...');
      const rawData = await this.collector.collect(keywords, options);
      logger.info(`数据采集完成，共采集 ${rawData.length} 条数据`);

      // 2. 使用技能增强数据质量
      logger.info('使用技能增强数据质量...');
      const enhancedDataResult = await this.skillIntegration.enhanceDataCollection(rawData, options);
      const processedData = enhancedDataResult.success ? enhancedDataResult.data : rawData;
      logger.info(`数据增强完成，处理 ${processedData.length} 条数据`);

      // 3. 数据存储
      await this.db.saveRawData(processedData);

      // 4. AI分析
      logger.info('开始AI分析...');
      const analysisResult = await this.analyzer.analyze(processedData, keywords);
      
      // 5. 验证分析结果
      logger.info('验证分析结果...');
      const validationResult = await this.validator.validateResults(analysisResult);
      
      // 6. 使用技能增强分析结果
      logger.info('使用技能增强分析结果...');
      const enhancedAnalysisResult = await this.skillIntegration.enhanceAIAnalysis(analysisResult, {
        validation: validationResult
      });

      // 7. 自适应学习
      logger.info('执行自适应学习...');
      await this.skillIntegration.adaptiveLearning(enhancedAnalysisResult.results, validationResult);

      // 8. 结果存储
      await this.db.saveAnalysisResult(enhancedAnalysisResult.results);
      
      logger.info('舆情分析任务完成');
      return enhancedAnalysisResult.results;
    } catch (error) {
      logger.error('舆情分析任务失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async stop() {
    this.isRunning = false;
    await this.db.close();
    logger.info('舆情研判系统已停止');
  }
}

// 如果直接运行此文件，启动CLI
if (require.main === module) {
  const CLI = require('./cli');
  const cli = new CLI();
  cli.run();
}

module.exports = PublicOpinionSystem;