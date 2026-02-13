const logger = require('../utils/logger');
const SentimentAgent = require('./sentiment-agent');
const TopicAgent = require('./topic-agent');
const RiskAssessmentAgent = require('./risk-assessment-agent');
const { v4: uuidv4 } = require('uuid');

class AIAnalyzer {
  constructor() {
    this.agents = {
      sentiment: new SentimentAgent(),
      topic: new TopicAgent(),
      risk: new RiskAssessmentAgent()
    };
    this.maxIterations = 3;
    this.confidenceThreshold = 0.7;
    this.analysisHistory = [];
  }

  async initialize() {
    logger.info('AI分析引擎初始化中...');
    
    // 初始化所有Agent
    for (const [name, agent] of Object.entries(this.agents)) {
      try {
        await agent.initialize();
        logger.info(`Agent ${name} 初始化完成`);
      } catch (error) {
        logger.error(`Agent ${name} 初始化失败:`, error);
      }
    }

    logger.info('AI分析引擎初始化完成');
  }

  async analyze(data, keywords, options = {}) {
    const taskId = uuidv4();
    logger.info(`开始AI分析任务 ${taskId}，数据量: ${data.length}，关键词: ${keywords.join(', ')}`);

    let iteration = 1;
    let finalResult = null;
    let maxConfidence = 0;

    while (iteration <= this.maxIterations) {
      logger.info(`第 ${iteration} 轮分析开始`);
      
      try {
        const iterationResult = await this.performIteration(data, keywords, iteration);
        const avgConfidence = this.calculateAverageConfidence(iterationResult);
        
        logger.info(`第 ${iteration} 轮分析完成，平均置信度: ${avgConfidence.toFixed(2)}`);

        // 记录分析历史
        this.analysisHistory.push({
          taskId,
          iteration,
          result: iterationResult,
          confidence: avgConfidence,
          timestamp: new Date()
        });

        // 如果置信度达到阈值，提前结束
        if (avgConfidence >= this.confidenceThreshold) {
          logger.info(`达到置信度阈值，分析完成`);
          finalResult = iterationResult;
          break;
        }

        // 记录最高置信度的结果
        if (avgConfidence > maxConfidence) {
          maxConfidence = avgConfidence;
          finalResult = iterationResult;
        }

        // 如果不是最后一轮，进行改进
        if (iteration < this.maxIterations) {
          data = await this.improveDataQuality(data, iterationResult, iteration);
        }

        iteration++;
      } catch (error) {
        logger.error(`第 ${iteration} 轮分析失败:`, error);
        break;
      }
    }

    if (!finalResult) {
      finalResult = await this.performIteration(data, keywords, iteration);
    }

    // 生成最终报告
    const finalReport = await this.generateFinalReport(finalResult, taskId, iteration - 1);
    
    logger.info(`AI分析任务 ${taskId} 完成，共进行 ${iteration - 1} 轮分析`);
    return finalReport;
  }

  async performIteration(data, keywords, iteration) {
    const context = {
      iteration,
      keywords,
      previousResults: this.getPreviousResults(),
      agentHistory: this.getAgentHistory()
    };

    const results = {
      taskId: uuidv4(),
      iteration,
      timestamp: new Date(),
      dataCount: data.length,
      agentResults: {},
      summary: {},
      confidence: 0
    };

    // 并行运行所有Agent
    const agentPromises = Object.entries(this.agents).map(async ([name, agent]) => {
      try {
        logger.info(`运行Agent: ${name}`);
        const agentResult = await agent.process(data, context);
        
        results.agentResults[name] = {
          name: agent.name,
          result: agentResult,
          confidence: agent.getConfidence(),
          executionTime: new Date() - context.startTime
        };
        
        logger.info(`Agent ${name} 完成，置信度: ${agent.getConfidence().toFixed(2)}`);
      } catch (error) {
        logger.error(`Agent ${name} 执行失败:`, error);
        results.agentResults[name] = {
          name: agent.name,
          error: error.message,
          confidence: 0
        };
      }
    });

    context.startTime = new Date();
    await Promise.all(agentPromises);

    // 生成综合分析摘要
    results.summary = await this.generateSummary(results.agentResults);
    results.confidence = this.calculateAverageConfidence(results);

    return results;
  }

  async generateSummary(agentResults) {
    const summary = {
      sentiment: null,
      topics: [],
      risks: null,
      overallAssessment: '',
      keyInsights: [],
      recommendations: []
    };

    // 汇总情感分析结果
    if (agentResults.sentiment && agentResults.sentiment.result) {
      const sentimentResult = agentResults.sentiment.result;
      summary.sentiment = {
        overall: sentimentResult.overallSentiment,
        distribution: sentimentResult.sentimentDistribution,
        confidence: agentResults.sentiment.confidence
      };
      summary.keyInsights.push(...sentimentResult.keyInsights);
    }

    // 汇总主题分析结果
    if (agentResults.topic && agentResults.topic.result) {
      const topicResult = agentResults.topic.result;
      summary.topics = topicResult.hotTopics.slice(0, 10);
      summary.keyInsights.push(...topicResult.keyInsights);
    }

    // 汇总风险评估结果
    if (agentResults.risk && agentResults.risk.result) {
      const riskResult = agentResults.risk.result;
      summary.risks = {
        level: riskResult.overallRisk,
        score: riskResult.riskScore,
        categories: riskResult.riskCategories,
        highRiskCount: riskResult.highRiskItems.length,
        confidence: agentResults.risk.confidence
      };
      summary.recommendations.push(...riskResult.recommendations);
    }

    // 生成整体评估
    summary.overallAssessment = this.generateOverallAssessment(summary);

    return summary;
  }

  generateOverallAssessment(summary) {
    let assessment = '基于多Agent分析结果，';
    
    // 情感评估
    if (summary.sentiment) {
      if (summary.sentiment.overall > 1) {
        assessment += '整体情感倾向积极，用户态度较为正面；';
      } else if (summary.sentiment.overall < -1) {
        assessment += '整体情感倾向消极，存在较多负面情绪；';
      } else {
        assessment += '整体情感相对中性，用户态度较为平衡；';
      }
    }

    // 主题评估
    if (summary.topics && summary.topics.length > 0) {
      assessment += `主要讨论话题集中在${summary.topics.slice(0, 3).map(t => `"${t.topic}"`).join('、')}等方面；`;
    }

    // 风险评估
    if (summary.risks) {
      if (summary.risks.level === 'high') {
        assessment += `存在较高风险，需要立即关注和处理；`;
      } else if (summary.risks.level === 'medium') {
        assessment += `存在中等风险，建议持续监控和防范；`;
      } else {
        assessment += `风险水平较低，保持正常监测即可；`;
      }
    }

    return assessment;
  }

  calculateAverageConfidence(result) {
    const confidences = Object.values(result.agentResults)
      .map(agent => agent.confidence || 0)
      .filter(confidence => confidence > 0);

    if (confidences.length === 0) return 0;
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  async improveDataQuality(data, previousResult, iteration) {
    logger.info(`第 ${iteration} 轮数据质量改进`);
    
    // 基于前一轮结果改进数据
    const improvedData = data.filter(item => {
      // 保留高质量数据（这里可以根据具体需求实现更复杂的过滤逻辑）
      return item.content && item.content.length > 10;
    });

    // 可以在这里添加数据增强、噪声过滤等操作
    logger.info(`数据质量改进完成，保留 ${improvedData.length}/${data.length} 条数据`);
    
    return improvedData;
  }

  getPreviousResults() {
    return this.analysisHistory.slice(-1)[0] || null;
  }

  getAgentHistory() {
    return this.analysisHistory.map(record => ({
      iteration: record.iteration,
      confidence: record.confidence,
      agentResults: record.result.agentResults
    }));
  }

  async generateFinalReport(finalResult, taskId, iterations) {
    const report = {
      taskId,
      timestamp: new Date(),
      iterations,
      finalConfidence: finalResult.confidence,
      summary: finalResult.summary,
      detailedResults: finalResult.agentResults,
      analysisHistory: this.analysisHistory.slice(-iterations),
      nextSteps: this.generateNextSteps(finalResult)
    };

    return report;
  }

  generateNextSteps(result) {
    const steps = [];
    
    if (result.confidence < this.confidenceThreshold) {
      steps.push('分析置信度较低，建议增加数据量或调整分析参数');
    }

    if (result.summary.risks && result.summary.risks.level === 'high') {
      steps.push('风险等级较高，建议立即启动应急响应机制');
    }

    if (result.summary.sentiment && result.summary.sentiment.overall < -1) {
      steps.push('负面情绪较多，建议制定情感修复策略');
    }

    steps.push('持续监控相关话题的发展变化');
    steps.push('定期更新分析模型和Agent参数');

    return steps;
  }

  // 获取Agent信息
  getAgentInfo() {
    return Object.entries(this.agents).map(([key, agent]) => ({
      key,
      ...agent.getInfo()
    }));
  }

  // 更新Agent配置
  updateAgentConfig(agentName, config) {
    if (this.agents[agentName]) {
      logger.info(`更新Agent ${agentName} 配置`);
      // 这里可以实现具体的配置更新逻辑
      return true;
    }
    return false;
  }
}

module.exports = AIAnalyzer;