const SkillManager = require('./skill-manager');
const DataCleaningSkill = require('../skills/data-cleaning-skill');
const logger = require('../utils/logger');

/**
 * Skill集成模块
 * 负责将skill系统与主系统集成
 */
class SkillIntegration {
  constructor() {
    this.skillManager = new SkillManager();
    this.registeredSkills = new Map();
    this.skillPerformance = new Map();
    this.evolutionEnabled = true;
  }

  async initialize() {
    logger.info('初始化Skill集成模块');
    
    // 注册内置技能
    await this.registerBuiltinSkills();
    
    // 加载已保存的技能
    await this.skillManager.loadSkills();
    
    logger.info('Skill集成模块初始化完成');
  }

  // 注册内置技能
  async registerBuiltinSkills() {
    logger.info('注册内置技能');
    
    // 数据清洗技能
    const dataCleaningSkill = new DataCleaningSkill();
    await this.registerSkill(dataCleaningSkill);
    
    // 可以在这里添加更多内置技能
    // 例如：情感分析优化技能、主题提取增强技能等
  }

  // 注册技能
  async registerSkill(skill) {
    try {
      await this.skillManager.registerSkill(skill);
      this.registeredSkills.set(skill.name, skill);
      
      logger.info(`技能注册成功: ${skill.name} v${skill.version}`);
      return true;
    } catch (error) {
      logger.error(`技能注册失败: ${skill.name}`, error);
      return false;
    }
  }

  // 执行技能
  async executeSkill(skillName, context, data) {
    const skill = this.registeredSkills.get(skillName);
    if (!skill) {
      throw new Error(`技能 ${skillName} 未注册`);
    }

    try {
      logger.info(`执行技能: ${skillName}`);
      
      const result = await this.skillManager.executeSkill(skillName, context, data);
      
      // 记录性能
      this.recordSkillPerformance(skillName, result);
      
      return result;
    } catch (error) {
      logger.error(`技能执行失败: ${skillName}`, error);
      throw error;
    }
  }

  // 记录技能性能
  recordSkillPerformance(skillName, result) {
    if (!this.skillPerformance.has(skillName)) {
      this.skillPerformance.set(skillName, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTime: 0,
        lastExecution: null,
        performanceHistory: []
      });
    }

    const performance = this.skillPerformance.get(skillName);
    performance.totalExecutions++;
    performance.lastExecution = new Date();

    if (result.success) {
      performance.successfulExecutions++;
    } else {
      performance.failedExecutions++;
    }

    // 记录执行时间
    if (result.executionTime) {
      performance.performanceHistory.push({
        timestamp: new Date(),
        executionTime: result.executionTime,
        success: result.success
      });

      // 保持历史记录在合理大小内
      if (performance.performanceHistory.length > 50) {
        performance.performanceHistory.shift();
      }

      // 重新计算平均执行时间
      const recentExecutions = performance.performanceHistory.slice(-10);
      const validTimes = recentExecutions.filter(e => e.executionTime > 0);
      if (validTimes.length > 0) {
        performance.avgExecutionTime = validTimes.reduce((sum, e) => sum + e.executionTime, 0) / validTimes.length;
      }
    }
  }

  // 在数据采集流程中使用技能
  async enhanceDataCollection(data, options = {}) {
    logger.info('使用技能增强数据采集');
    
    const context = {
      stage: 'data_collection',
      options: options,
      timestamp: new Date()
    };

    let enhancedData = data;

    try {
      // 使用数据清洗技能
      if (this.registeredSkills.has('DataCleaningSkill')) {
        const cleaningResult = await this.executeSkill('DataCleaningSkill', context, enhancedData);
        if (cleaningResult.success) {
          enhancedData = cleaningResult.cleanedData;
          logger.info(`数据清洗完成，清洗后数据量: ${enhancedData.length}`);
        }
      }

      // 可以添加更多数据处理技能
      
      return {
        success: true,
        data: enhancedData,
        originalCount: data.length,
        enhancedCount: enhancedData.length,
        skillsApplied: ['DataCleaningSkill']
      };
    } catch (error) {
      logger.error('数据增强失败', error);
      return {
        success: false,
        data: data,
        error: error.message
      };
    }
  }

  // 在AI分析流程中使用技能
  async enhanceAIAnalysis(results, options = {}) {
    logger.info('使用技能增强AI分析');
    
    const context = {
      stage: 'ai_analysis',
      options: options,
      timestamp: new Date(),
      originalResults: results
    };

    const enhancedResults = { ...results };
    const appliedSkills = [];

    try {
      // 根据分析结果类型应用相应的技能
      if (results.agentResults) {
        // 可以添加针对特定Agent结果的技能
        
        // 例如：结果验证技能
        if (this.registeredSkills.has('ResultValidationSkill')) {
          // 执行结果验证
        }
        
        // 例如：结果优化技能
        if (this.registeredSkills.has('ResultOptimizationSkill')) {
          // 执行结果优化
        }
      }

      return {
        success: true,
        results: enhancedResults,
        skillsApplied: appliedSkills
      };
    } catch (error) {
      logger.error('AI分析增强失败', error);
      return {
        success: false,
        results: results,
        error: error.message
      };
    }
  }

  // 技能进化
  async evolveSkill(skillName, feedback = {}) {
    if (!this.evolutionEnabled) {
      logger.info('技能进化功能已禁用');
      return null;
    }

    const skill = this.registeredSkills.get(skillName);
    if (!skill) {
      logger.error(`技能 ${skillName} 不存在，无法进化`);
      return null;
    }

    try {
      logger.info(`开始进化技能: ${skillName}`);
      
      // 获取技能性能数据
      const performance = this.skillManager.calculateSkillPerformance(skillName);
      
      // 生成进化上下文
      const evolutionContext = {
        performance: performance,
        feedback: feedback,
        usageHistory: this.skillPerformance.get(skillName),
        timestamp: new Date()
      };

      // 执行技能进化
      const evolvedSkill = await skill.evolve(evolutionContext);
      
      if (evolvedSkill) {
        // 更新技能注册
        this.registeredSkills.set(skillName, evolvedSkill);
        
        logger.info(`技能 ${skillName} 进化成功，新版本: ${evolvedSkill.version}`);
        
        return evolvedSkill;
      }
      
      return null;
    } catch (error) {
      logger.error(`技能进化失败: ${skillName}`, error);
      return null;
    }
  }

  // 自适应学习
  async adaptiveLearning(analysisResults, validationResults) {
    logger.info('开始自适应学习');
    
    const learningContext = {
      analysisResults: analysisResults,
      validationResults: validationResults,
      timestamp: new Date()
    };

    // 基于验证结果调整技能
    if (validationResults && validationResults.issues) {
      for (const issue of validationResults.issues) {
        await this.handleValidationIssue(issue, learningContext);
      }
    }

    // 基于分析结果优化技能
    if (analysisResults && analysisResults.summary) {
      await this.optimizeSkillsFromResults(analysisResults.summary, learningContext);
    }

    logger.info('自适应学习完成');
  }

  // 处理验证问题
  async handleValidationIssue(issue, context) {
    logger.info(`处理验证问题: ${issue.type}`);
    
    switch (issue.type) {
      case 'low_confidence':
        // 置信度低，可能需要调整数据清洗技能
        if (this.registeredSkills.has('DataCleaningSkill')) {
          await this.evolveSkill('DataCleaningSkill', {
            type: 'confidence_improvement',
            issue: issue
          });
        }
        break;
        
      case 'no_valid_data':
        // 无有效数据，增强数据清洗技能
        if (this.registeredSkills.has('DataCleaningSkill')) {
          await this.evolveSkill('DataCleaningSkill', {
            type: 'data_quality_enhancement',
            issue: issue
          });
        }
        break;
        
      case 'agent_conflicts':
        // Agent冲突，可能需要协调技能
        break;
        
      default:
        logger.warn(`未处理的验证问题类型: ${issue.type}`);
    }
  }

  // 基于结果优化技能
  async optimizeSkillsFromResults(summary, context) {
    // 根据情感分析结果优化
    if (summary.sentiment && summary.sentiment.confidence < 0.7) {
      logger.info('情感分析置信度较低，考虑优化相关技能');
      // 可以创建或进化情感分析相关的技能
    }

    // 根据主题分析结果优化
    if (summary.topics && summary.topics.length === 0) {
      logger.info('未提取到有效主题，考虑优化主题分析技能');
      // 可以创建或进化主题提取相关的技能
    }

    // 根据风险评估结果优化
    if (summary.risks && summary.risks.confidence < 0.6) {
      logger.info('风险评估置信度较低，考虑优化相关技能');
      // 可以创建或进化风险评估相关的技能
    }
  }

  // 获取技能统计
  getSkillStatistics() {
    const stats = {
      totalSkills: this.registeredSkills.size,
      skillDetails: [],
      overallPerformance: {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0
      }
    };

    let totalExecutions = 0;
    let totalSuccesses = 0;
    let totalExecutionTime = 0;

    this.skillPerformance.forEach((performance, skillName) => {
      const successRate = performance.totalExecutions > 0 ? 
        performance.successfulExecutions / performance.totalExecutions : 0;
      
      stats.skillDetails.push({
        name: skillName,
        totalExecutions: performance.totalExecutions,
        successfulExecutions: performance.successfulExecutions,
        failedExecutions: performance.failedExecutions,
        successRate: successRate,
        avgExecutionTime: performance.avgExecutionTime,
        lastExecution: performance.lastExecution
      });

      totalExecutions += performance.totalExecutions;
      totalSuccesses += performance.successfulExecutions;
      totalExecutionTime += performance.avgExecutionTime * performance.totalExecutions;
    });

    // 计算整体统计
    stats.overallPerformance = {
      totalExecutions: totalExecutions,
      successRate: totalExecutions > 0 ? totalSuccesses / totalExecutions : 0,
      avgExecutionTime: totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0
    };

    return stats;
  }

  // 获取技能建议
  getSkillRecommendations(analysisContext) {
    const recommendations = [];
    
    // 基于分析上下文推荐技能
    if (analysisContext.dataQuality && analysisContext.dataQuality < 0.7) {
      recommendations.push({
        type: 'data_enhancement',
        skill: 'DataCleaningSkill',
        reason: '数据质量较低，建议使用数据清洗技能'
      });
    }

    if (analysisContext.confidence && analysisContext.confidence < 0.6) {
      recommendations.push({
        type: 'confidence_improvement',
        skill: 'AnalysisOptimizationSkill',
        reason: '分析置信度较低，建议使用分析优化技能'
      });
    }

    return recommendations;
  }

  // 启用/禁用进化
  setEvolutionEnabled(enabled) {
    this.evolutionEnabled = enabled;
    logger.info(`技能进化功能已${enabled ? '启用' : '禁用'}`);
  }

  // 导出技能配置
  exportSkillConfigs() {
    const configs = {};
    
    this.registeredSkills.forEach((skill, name) => {
      configs[name] = {
        name: skill.name,
        version: skill.version,
        description: skill.description,
        config: skill.config || {}
      };
    });

    return configs;
  }

  // 导入技能配置
  async importSkillConfigs(configs) {
    for (const [name, config] of Object.entries(configs)) {
      try {
        // 这里需要根据配置重新创建技能实例
        logger.info(`导入技能配置: ${name}`);
        // 具体实现取决于技能类型
      } catch (error) {
        logger.error(`导入技能配置失败: ${name}`, error);
      }
    }
  }
}

module.exports = SkillIntegration;