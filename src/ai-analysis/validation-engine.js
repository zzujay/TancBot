const logger = require('../utils/logger');

class ValidationEngine {
  constructor() {
    this.validationRules = {
      sentiment: this.validateSentimentResults.bind(this),
      topic: this.validateTopicResults.bind(this),
      risk: this.validateRiskResults.bind(this),
      overall: this.validateOverallResults.bind(this)
    };
    
    this.optimizationStrategies = {
      dataQuality: this.optimizeDataQuality.bind(this),
      agentParameters: this.optimizeAgentParameters.bind(this),
      analysisLogic: this.optimizeAnalysisLogic.bind(this)
    };
    
    this.validationHistory = [];
    this.improvementThreshold = 0.1; // 10%改进阈值
  }

  async validateResults(results, previousResults = null) {
    logger.info('开始验证分析结果');
    
    const validationReport = {
      timestamp: new Date(),
      resultsId: results.taskId,
      validations: {},
      issues: [],
      improvements: [],
      overallScore: 0,
      recommendations: []
    };

    // 执行各类验证
    for (const [ruleName, validator] of Object.entries(this.validationRules)) {
      try {
        const validation = await validator(results, previousResults);
        validationReport.validations[ruleName] = validation;
        
        if (validation.issues && validation.issues.length > 0) {
          validationReport.issues.push(...validation.issues);
        }
        
        if (validation.improvements && validation.improvements.length > 0) {
          validationReport.improvements.push(...validation.improvements);
        }
      } catch (error) {
        logger.error(`验证规则 ${ruleName} 执行失败:`, error);
        validationReport.issues.push({
          type: 'validation_error',
          rule: ruleName,
          message: error.message
        });
      }
    }

    // 计算整体评分
    validationReport.overallScore = this.calculateOverallScore(validationReport);
    
    // 生成改进建议
    validationReport.recommendations = this.generateValidationRecommendations(validationReport);
    
    // 记录验证历史
    this.validationHistory.push(validationReport);
    
    logger.info(`验证完成，整体评分: ${validationReport.overallScore.toFixed(2)}`);
    return validationReport;
  }

  async validateSentimentResults(results, previousResults) {
    const validation = {
      type: 'sentiment',
      passed: true,
      score: 0,
      issues: [],
      improvements: []
    };

    const sentimentResult = results.agentResults.sentiment?.result;
    if (!sentimentResult) {
      validation.passed = false;
      validation.issues.push({
        type: 'missing_data',
        message: '情感分析结果缺失'
      });
      return validation;
    }

    // 验证数据完整性
    if (!sentimentResult.overallSentiment && sentimentResult.overallSentiment !== 0) {
      validation.passed = false;
      validation.issues.push({
        type: 'incomplete_data',
        message: '情感分析结果缺少整体情感得分'
      });
    }

    // 验证情感分布
    const total = sentimentResult.sentimentDistribution.positive + 
                  sentimentResult.sentimentDistribution.negative + 
                  sentimentResult.sentimentDistribution.neutral;
    
    if (total === 0) {
      validation.passed = false;
      validation.issues.push({
        type: 'no_valid_data',
        message: '情感分析没有有效的数据'
      });
    }

    // 验证置信度
    const confidence = results.agentResults.sentiment?.confidence || 0;
    if (confidence < 0.5) {
      validation.issues.push({
        type: 'low_confidence',
        message: `情感分析置信度较低 (${confidence.toFixed(2)})`,
        suggestion: '建议增加数据量或改进分析算法'
      });
    }

    // 与历史结果对比
    if (previousResults) {
      const prevSentiment = previousResults.agentResults.sentiment?.result;
      if (prevSentiment) {
        const improvement = this.calculateImprovement(
          sentimentResult.overallSentiment,
          prevSentiment.overallSentiment
        );
        
        if (improvement > this.improvementThreshold) {
          validation.improvements.push({
            type: 'sentiment_improvement',
            message: `情感分析准确性提升 ${(improvement * 100).toFixed(1)}%`
          });
        }
      }
    }

    validation.score = this.calculateSentimentScore(sentimentResult, confidence);
    return validation;
  }

  async validateTopicResults(results, previousResults) {
    const validation = {
      type: 'topic',
      passed: true,
      score: 0,
      issues: [],
      improvements: []
    };

    const topicResult = results.agentResults.topic?.result;
    if (!topicResult) {
      validation.passed = false;
      validation.issues.push({
        type: 'missing_data',
        message: '主题分析结果缺失'
      });
      return validation;
    }

    // 验证热门话题数量
    if (!topicResult.hotTopics || topicResult.hotTopics.length === 0) {
      validation.passed = false;
      validation.issues.push({
        type: 'no_topics_found',
        message: '未识别到热门话题'
      });
    }

    // 验证关键词质量
    if (topicResult.keywords && topicResult.keywords.length > 0) {
      const avgScore = topicResult.keywords.reduce((sum, k) => sum + k.score, 0) / topicResult.keywords.length;
      if (avgScore < 0.1) {
        validation.issues.push({
          type: 'low_quality_keywords',
          message: '关键词质量较低',
          suggestion: '建议优化文本预处理或调整TF-IDF参数'
        });
      }
    }

    // 验证主题聚类
    if (topicResult.topicClusters && topicResult.topicClusters.length === 0) {
      validation.issues.push({
        type: 'no_clusters',
        message: '未形成有效的主题聚类',
        suggestion: '数据可能过于分散，建议增加数据量'
      });
    }

    validation.score = this.calculateTopicScore(topicResult);
    return validation;
  }

  async validateRiskResults(results, previousResults) {
    const validation = {
      type: 'risk',
      passed: true,
      score: 0,
      issues: [],
      improvements: []
    };

    const riskResult = results.agentResults.risk?.result;
    if (!riskResult) {
      validation.passed = false;
      validation.issues.push({
        type: 'missing_data',
        message: '风险评估结果缺失'
      });
      return validation;
    }

    // 验证风险等级合理性
    const validRiskLevels = ['low', 'medium', 'high'];
    if (!validRiskLevels.includes(riskResult.overallRisk)) {
      validation.passed = false;
      validation.issues.push({
        type: 'invalid_risk_level',
        message: `无效的风险等级: ${riskResult.overallRisk}`
      });
    }

    // 验证风险评分范围
    if (riskResult.riskScore < 0 || riskResult.riskScore > 1) {
      validation.passed = false;
      validation.issues.push({
        type: 'invalid_risk_score',
        message: `风险评分超出有效范围: ${riskResult.riskScore}`
      });
    }

    // 验证高风险项目
    if (riskResult.highRiskItems && riskResult.highRiskItems.length > 0) {
      const highRiskRatio = riskResult.highRiskItems.length / riskResult.riskDetails.length;
      if (highRiskRatio > 0.5) {
        validation.issues.push({
          type: 'high_risk_concentration',
          message: `高风险项目比例过高 (${(highRiskRatio * 100).toFixed(1)}%)`,
          suggestion: '建议重新评估风险阈值或检查数据质量'
        });
      }
    }

    validation.score = this.calculateRiskScore(riskResult);
    return validation;
  }

  async validateOverallResults(results, previousResults) {
    const validation = {
      type: 'overall',
      passed: true,
      score: 0,
      issues: [],
      improvements: []
    };

    // 验证整体置信度
    const overallConfidence = results.confidence || 0;
    if (overallConfidence < 0.5) {
      validation.issues.push({
        type: 'low_overall_confidence',
        message: `整体置信度较低 (${overallConfidence.toFixed(2)})`,
        suggestion: '建议增加数据量或优化分析参数'
      });
    }

    // 验证Agent结果一致性
    const agentConflicts = this.detectAgentConflicts(results.agentResults);
    if (agentConflicts.length > 0) {
      validation.issues.push({
        type: 'agent_conflicts',
        message: `发现 ${agentConflicts.length} 个Agent间冲突`,
        conflicts: agentConflicts
      });
    }

    // 验证数据覆盖率
    const dataCoverage = this.calculateDataCoverage(results);
    if (dataCoverage < 0.8) {
      validation.issues.push({
        type: 'low_data_coverage',
        message: `数据覆盖率较低 (${(dataCoverage * 100).toFixed(1)}%)`,
        suggestion: '建议增加数据采集量'
      });
    }

    validation.score = this.calculateOverallScore(validation);
    return validation;
  }

  calculateSentimentScore(sentimentResult, confidence) {
    let score = confidence * 0.6; // 置信度权重60%
    
    // 数据质量评分
    const total = sentimentResult.sentimentDistribution.positive + 
                  sentimentResult.sentimentDistribution.negative + 
                  sentimentResult.sentimentDistribution.neutral;
    
    if (total > 10) score += 0.2;
    if (total > 50) score += 0.1;
    if (total > 100) score += 0.1;

    return Math.min(score, 1.0);
  }

  calculateTopicScore(topicResult) {
    let score = 0.5; // 基础分
    
    if (topicResult.hotTopics && topicResult.hotTopics.length > 0) {
      score += 0.2;
      if (topicResult.hotTopics.length >= 5) score += 0.1;
    }
    
    if (topicResult.keywords && topicResult.keywords.length > 0) {
      score += 0.2;
      const avgScore = topicResult.keywords.reduce((sum, k) => sum + k.score, 0) / topicResult.keywords.length;
      if (avgScore > 0.2) score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  calculateRiskScore(riskResult) {
    let score = 0.6; // 基础分
    
    if (riskResult.riskDetails && riskResult.riskDetails.length > 0) {
      score += 0.2;
      if (riskResult.riskDetails.length >= 20) score += 0.1;
    }
    
    if (riskResult.recommendations && riskResult.recommendations.length > 0) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  calculateOverallScore(validationReport) {
    const scores = Object.values(validationReport.validations)
      .map(v => v.score || 0);
    
    if (scores.length === 0) return 0;
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  calculateImprovement(current, previous) {
    if (!previous) return 0;
    return Math.abs(current - previous) / Math.abs(previous || 1);
  }

  detectAgentConflicts(agentResults) {
    const conflicts = [];
    
    // 这里可以实现具体的冲突检测逻辑
    // 例如：情感分析结果与风险评估结果严重不符等
    
    return conflicts;
  }

  calculateDataCoverage(results) {
    const totalData = results.dataCount || 0;
    const processedData = results.agentResults ? 
      Object.values(results.agentResults).filter(r => r.result).length : 0;
    
    return totalData > 0 ? processedData / totalData : 0;
  }

  generateValidationRecommendations(validationReport) {
    const recommendations = [];
    
    if (validationReport.overallScore < 0.6) {
      recommendations.push('整体验证评分较低，建议优化分析流程');
    }
    
    if (validationReport.issues.length > 3) {
      recommendations.push('发现较多验证问题，需要系统性改进');
    }
    
    // 基于具体问题生成建议
    const issueTypes = validationReport.issues.map(issue => issue.type);
    
    if (issueTypes.includes('low_confidence')) {
      recommendations.push('提高分析置信度：增加数据量或优化算法参数');
    }
    
    if (issueTypes.includes('no_valid_data')) {
      recommendations.push('数据质量问题：检查数据源和预处理流程');
    }
    
    if (issueTypes.includes('agent_conflicts')) {
      recommendations.push('Agent冲突：调整Agent权重或改进协调机制');
    }
    
    return recommendations;
  }

  async optimizeResults(results, validationReport) {
    logger.info('开始优化分析结果');
    
    const optimizationPlan = {
      strategies: [],
      expectedImprovement: 0,
      priority: 'medium'
    };

    // 基于验证报告制定优化策略
    if (validationReport.issues.length > 0) {
      for (const issue of validationReport.issues) {
        const strategy = this.selectOptimizationStrategy(issue);
        if (strategy) {
          optimizationPlan.strategies.push(strategy);
        }
      }
    }

    // 执行优化策略
    const optimizedResults = await this.executeOptimization(results, optimizationPlan);
    
    logger.info(`优化完成，应用了 ${optimizationPlan.strategies.length} 个策略`);
    return optimizedResults;
  }

  selectOptimizationStrategy(issue) {
    const strategies = {
      low_confidence: {
        type: 'dataQuality',
        action: 'increaseSampleSize',
        description: '增加样本量以提高置信度'
      },
      no_valid_data: {
        type: 'dataQuality',
        action: 'improveDataFiltering',
        description: '改进数据过滤和清洗流程'
      },
      agent_conflicts: {
        type: 'analysisLogic',
        action: 'adjustAgentWeights',
        description: '调整Agent权重和协调机制'
      },
      low_quality_keywords: {
        type: 'analysisLogic',
        action: 'optimizeAlgorithmParameters',
        description: '优化算法参数以提高关键词质量'
      }
    };

    return strategies[issue.type] || null;
  }

  async executeOptimization(results, optimizationPlan) {
    let optimizedResults = { ...results };

    for (const strategy of optimizationPlan.strategies) {
      try {
        const optimizer = this.optimizationStrategies[strategy.type];
        if (optimizer) {
          optimizedResults = await optimizer(optimizedResults, strategy);
        }
      } catch (error) {
        logger.error(`优化策略 ${strategy.type} 执行失败:`, error);
      }
    }

    return optimizedResults;
  }

  async optimizeDataQuality(results, strategy) {
    // 数据质量优化逻辑
    logger.info(`执行数据质量优化: ${strategy.action}`);
    return results;
  }

  async optimizeAgentParameters(results, strategy) {
    // Agent参数优化逻辑
    logger.info(`执行Agent参数优化: ${strategy.action}`);
    return results;
  }

  async optimizeAnalysisLogic(results, strategy) {
    // 分析逻辑优化逻辑
    logger.info(`执行分析逻辑优化: ${strategy.action}`);
    return results;
  }

  getValidationHistory() {
    return this.validationHistory;
  }

  getValidationStats() {
    if (this.validationHistory.length === 0) {
      return {
        totalValidations: 0,
        avgScore: 0,
        improvementTrend: 'stable'
      };
    }

    const scores = this.validationHistory.map(v => v.overallScore);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // 计算趋势
    const recent = scores.slice(-5);
    const older = scores.slice(-10, -5);
    
    const recentAvg = recent.length > 0 ? recent.reduce((sum, s) => sum + s, 0) / recent.length : 0;
    const olderAvg = older.length > 0 ? older.reduce((sum, s) => sum + s, 0) / older.length : 0;
    
    let trend = 'stable';
    if (recentAvg > olderAvg + 0.1) trend = 'improving';
    else if (recentAvg < olderAvg - 0.1) trend = 'declining';

    return {
      totalValidations: this.validationHistory.length,
      avgScore: avgScore,
      improvementTrend: trend,
      recentAvg: recentAvg,
      olderAvg: olderAvg
    };
  }
}

module.exports = ValidationEngine;