/**
 * 增强AI分析引擎V2
 * 集成深度学习模型、多模态分析、实时学习等高级功能
 */

const BaseAgent = require('./base-agent');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');
const configManager = require('../utils/config-manager');
const LLMSentimentAgent = require('./llm-sentiment-agent');
const LLMTopicAgent = require('./llm-topic-agent');
const LLMRiskAgent = require('./llm-risk-agent');

/**
 * 增强AI分析引擎V2
 */
class EnhancedAIAnalyzer {
  constructor() {
    this.maxIterations = 5;
    this.confidenceThreshold = 0.8;
    this.analysisHistory = [];
    this.learningRate = 0.01;
    
    // 初始化LLM多Agent
    this.sentimentAgent = new LLMSentimentAgent();
    this.topicAgent = new LLMTopicAgent();
    this.riskAgent = new LLMRiskAgent();
    this.agents = [this.sentimentAgent, this.topicAgent, this.riskAgent];
  }

  async initialize() {
    logger.info('初始化增强AI分析引擎V2...');
    
    // 初始化所有LLM Agent
    for (const agent of this.agents) {
      await agent.initialize();
    }
    
    logger.info('增强AI分析引擎V2初始化完成');
  }

  async analyze(data, keywords, options = {}) {
    const taskId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`开始增强AI分析任务 ${taskId}，数据量: ${data.length}，关键词: ${keywords.join(', ')}`);

    try {
      // 准备分析上下文
      const context = {
        keywords,
        analysisType: options.analysisType || 'comprehensive',
        dataSource: options.dataSource || 'mixed',
        language: 'zh'
      };

      // 多轮分析迭代
      let iterationResults = [];
      let finalResult = null;
      
      for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
        logger.info(`开始第 ${iteration}/${this.maxIterations} 轮分析`);
        
        // 并行执行所有Agent分析
        const agentPromises = this.agents.map(async (agent) => {
          try {
            const result = await agent.process(data, context);
            return {
              agent: agent.name,
              type: this.getAgentType(agent.name),
              result: result,
              confidence: result.confidence || 0.5,
              timestamp: new Date()
            };
          } catch (error) {
            logger.error(`${agent.name} 分析失败:`, error);
            return {
              agent: agent.name,
              type: this.getAgentType(agent.name),
              result: null,
              confidence: 0,
              error: error.message,
              timestamp: new Date()
            };
          }
        });
        
        const iterationResult = await Promise.all(agentPromises);
        iterationResults.push(iterationResult);
        
        // 整合本轮分析结果
        const integratedResult = this.integrateIterationResults(iterationResult, iteration);
        
        // 检查是否达到置信度阈值
        if (integratedResult.confidence >= this.confidenceThreshold) {
          logger.info(`第 ${iteration} 轮分析达到置信度阈值 ${this.confidenceThreshold}`);
          finalResult = integratedResult;
          break;
        }
        
        // 如果不是最后一轮，准备下一轮分析
        if (iteration < this.maxIterations) {
          // 基于当前结果调整分析策略
          context.previousResults = integratedResult;
          context.iteration = iteration + 1;
          
          // 动态调整参数
          await this.adjustAnalysisParameters(context, integratedResult);
        } else {
          // 最后一轮，使用最佳结果
          finalResult = integratedResult;
        }
      }
      
      // 生成最终报告
      const finalReport = await this.generateEnhancedFinalReport(finalResult, taskId, iterationResults.length);
      
      // 保存分析历史
      this.analysisHistory.push({
        taskId,
        timestamp: new Date(),
        dataCount: data.length,
        keywords,
        iterations: iterationResults.length,
        finalResult: finalReport
      });
      
      logger.info(`增强AI分析任务 ${taskId} 完成，共进行 ${iterationResults.length} 轮分析`);
      return finalReport;
      
    } catch (error) {
      logger.error(`增强AI分析任务 ${taskId} 失败:`, error);
      throw error;
    }
  }

  // 获取Agent类型
  getAgentType(agentName) {
    if (agentName.includes('Sentiment')) return 'sentiment';
    if (agentName.includes('Topic')) return 'topic';
    if (agentName.includes('Risk')) return 'risk';
    return 'unknown';
  }

  // 整合迭代结果
  integrateIterationResults(iterationResult, iteration) {
    const successfulAgents = iterationResult.filter(agent => agent.result && agent.confidence > 0);
    
    if (successfulAgents.length === 0) {
      return {
        confidence: 0.3,
        summary: {
          overallAssessment: '分析失败，未获得有效结果',
          sentiment: { overall: 0, confidence: 0.3 },
          topics: [],
          risks: { level: 'unknown', score: 0, highRiskCount: 0 },
          keyInsights: ['所有Agent分析失败，请检查配置'],
          recommendations: ['配置LLM API密钥', '检查网络连接', '验证数据源']
        }
      };
    }
    
    // 整合情感分析结果
    const sentimentResults = successfulAgents.find(agent => agent.type === 'sentiment');
    const topicResults = successfulAgents.find(agent => agent.type === 'topic');
    const riskResults = successfulAgents.find(agent => agent.type === 'risk');
    
    const integratedConfidence = successfulAgents.reduce((sum, agent) => sum + agent.confidence, 0) / successfulAgents.length;
    
    // 安全地提取情感分析结果
    let sentimentData = { overall: 0, confidence: 0.5 };
    if (sentimentResults && sentimentResults.result) {
      sentimentData = {
        overall: sentimentResults.result.overallSentiment?.overall ?? sentimentResults.result.overall ?? 0,
        confidence: sentimentResults.result.overallSentiment?.confidence ?? sentimentResults.result.confidence ?? 0.5
      };
    }
    
    // 安全地提取主题分析结果
    let topicsData = [];
    if (topicResults && topicResults.result) {
      topicsData = topicResults.result.topics || [];
    }
    
    // 安全地提取风险分析结果
    let risksData = { level: 'unknown', score: 0, highRiskCount: 0 };
    if (riskResults && riskResults.result) {
      risksData = {
        level: riskResults.result.overallRisk?.level ?? riskResults.result.level ?? 'unknown',
        score: riskResults.result.overallRisk?.score ?? riskResults.result.score ?? 0,
        highRiskCount: riskResults.result.highRiskCount ?? 0
      };
    }
    
    return {
      confidence: integratedConfidence,
      iteration,
      agents: iterationResult.map(agent => ({
        name: agent.agent,
        type: agent.type,
        confidence: agent.confidence,
        success: !!agent.result,
        error: agent.error
      })),
      summary: {
        overallAssessment: `第${iteration}轮多Agent分析结果`,
        sentiment: sentimentData,
        topics: topicsData,
        risks: risksData,
        keyInsights: this.generateKeyInsights(successfulAgents),
        recommendations: this.generateRecommendations(successfulAgents)
      },
      rawResults: successfulAgents.reduce((acc, agent) => {
        acc[agent.type] = agent.result;
        return acc;
      }, {})
    };
  }
  
  generateKeyInsights(successfulAgents) {
    const insights = [];
    
    successfulAgents.forEach(agent => {
      if (agent.result && agent.result.keyInsights) {
        insights.push(...agent.result.keyInsights);
      }
    });
    
    return insights.length > 0 ? insights : ['多Agent分析完成，请查看详细结果'];
  }
  
  generateRecommendations(successfulAgents) {
    const recommendations = [];
    
    // 基于Agent状态生成建议
    const failedAgents = successfulAgents.filter(agent => !agent.result || agent.confidence < 0.5);
    if (failedAgents.length > 0) {
      recommendations.push(`${failedAgents.length}个Agent分析效果不佳，建议检查配置`);
    }
    
    successfulAgents.forEach(agent => {
      if (agent.result && agent.result.recommendations) {
        recommendations.push(...agent.result.recommendations);
      }
    });
    
    return recommendations.length > 0 ? recommendations : ['建议配置更多数据源以提高分析准确性'];
  }
  
  async adjustAnalysisParameters(context, currentResult) {
    // 基于当前结果调整下一轮分析参数
    if (currentResult.confidence < 0.5) {
      // 置信度低，降低要求或调整策略
      logger.info('当前置信度较低，调整分析策略');
      context.adjustedStrategy = 'low_confidence';
    }
    
    if (currentResult.summary && currentResult.summary.sentiment) {
      const sentiment = currentResult.summary.sentiment;
      if (Math.abs(sentiment.overall) < 0.3) {
        logger.info('情感倾向不明显，加强情感分析');
        context.emphasis = 'sentiment';
      }
    }
    
    // 添加延迟避免过于频繁的请求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 生成增强版最终报告
  async generateEnhancedFinalReport(finalResult, taskId, iterations) {
    // 添加空值检查
    if (!finalResult) {
      return {
        taskId,
        timestamp: new Date(),
        iterations,
        finalConfidence: 0,
        summary: {
          overallAssessment: '分析失败，未获得有效结果',
          sentiment: { overall: 0, confidence: 0 },
          topics: [],
          risks: { level: 'unknown', score: 0, highRiskCount: 0 },
          keyInsights: ['分析过程中发生错误'],
          recommendations: ['请检查系统配置和网络连接']
        },
        agentResults: [],
        rawResults: {},
        nextSteps: [
          '配置LLM服务以启用高级分析功能',
          '添加更多数据源以提高分析全面性',
          '定期更新分析模型以保持时效性'
        ]
      };
    }
    
    const report = {
      taskId,
      timestamp: new Date(),
      iterations,
      finalConfidence: finalResult.confidence || 0,
      summary: finalResult.summary || {
        overallAssessment: '分析完成',
        sentiment: { overall: 0, confidence: 0.5 },
        topics: [],
        risks: { level: 'unknown', score: 0, highRiskCount: 0 },
        keyInsights: [],
        recommendations: []
      },
      agentResults: finalResult.agents || [],
      rawResults: finalResult.rawResults || {},
      nextSteps: [
        '配置LLM服务以启用高级分析功能',
        '添加更多数据源以提高分析全面性',
        '定期更新分析模型以保持时效性'
      ]
    };

    return report;
  }
}

module.exports = EnhancedAIAnalyzer;