/**
 * LLM增强分析引擎 - Skills集成增强版
 * 集成Skills管理器的多Agent LLM分析系统
 */

const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');
const LLMSentimentAgent = require('./llm-sentiment-agent');
const LLMTopicAgent = require('./llm-topic-agent');
const LLMRiskAgent = require('./llm-risk-agent');
const { SkillsManager } = require('./skills-manager');

/**
 * LLM增强分析引擎 - Skills集成版
 * 支持多轮验证、技能增强的智能分析系统
 */
class LLMEnhancedAnalyzerWithSkills {
  constructor(options = {}) {
    this.llmConfig = {
      provider: options.llmProvider || process.env.LLM_PROVIDER || 'openai',
      model: options.llmModel || process.env.LLM_MODEL || 'gpt-3.5-turbo',
      apiKey: options.llmApiKey || process.env.LLM_API_KEY,
      baseURL: options.llmBaseURL || process.env.LLM_BASE_URL,
      temperature: options.llmTemperature || 0.3,
      maxTokens: options.llmMaxTokens || 2000,
      enableBatchProcessing: options.enableBatchProcessing !== false,
      batchSize: options.batchSize || 5,
      maxRetries: options.maxRetries || 3,
      useSimulatedLLM: options.useSimulatedLLM || !process.env.LLM_API_KEY,
      enableSkills: options.enableSkills !== false,
      skillConfig: options.skillConfig || {}
    };
    
    this.agents = {
      sentiment: null,
      topic: null,
      risk: null
    };
    
    this.skillsManager = null;
    this.analysisStats = {
      totalAnalyses: 0,
      llmCalls: 0,
      successfulLLMCalls: 0,
      skillsApplied: 0,
      verificationRounds: 0,
      averageLLMResponseTime: 0,
      fallbackUsage: 0
    };
    
    this.verificationConfig = {
      maxRounds: options.maxVerificationRounds || 3,
      confidenceThreshold: options.confidenceThreshold || 0.75,
      consensusThreshold: options.consensusThreshold || 0.8,
      enableMultiModal: options.enableMultiModal || false,
      enableCrossValidation: options.enableCrossValidation !== false
    };
    
    this.performanceMetrics = {
      startTime: null,
      agentExecutionTimes: {},
      llmResponseTimes: [],
      skillsExecutionTimes: {},
      verificationTimes: []
    };
  }

  async initialize() {
    logger.info('初始化LLM增强分析引擎 (Skills集成版)...');
    
    try {
      // 初始化LLM Agent
      await this.initializeLLMAgents();
      
      // 初始化Skills管理器
      if (this.llmConfig.enableSkills) {
        await this.initializeSkillsManager();
      }
      
      logger.info('LLM增强分析引擎 (Skills集成版) 初始化完成');
    } catch (error) {
      logger.error('LLM增强分析引擎 (Skills集成版) 初始化失败:', error);
      await errorHandler.handleError(error, { source: 'llm_enhanced_analyzer_skills_initialization' });
      throw error;
    }
  }

  async initializeLLMAgents() {
    logger.info('初始化LLM Agent...');
    
    try {
      // 情感分析Agent
      this.agents.sentiment = new LLMSentimentAgent({
        provider: this.llmConfig.provider,
        model: this.llmConfig.model,
        apiKey: this.llmConfig.apiKey,
        baseURL: this.llmConfig.baseURL,
        temperature: this.llmConfig.temperature,
        maxTokens: this.llmConfig.maxTokens,
        useSimulatedLLM: this.llmConfig.useSimulatedLLM
      });
      
      // 主题建模Agent
      this.agents.topic = new LLMTopicAgent({
        provider: this.llmConfig.provider,
        model: this.llmConfig.model,
        apiKey: this.llmConfig.apiKey,
        baseURL: this.llmConfig.baseURL,
        temperature: this.llmConfig.temperature * 0.8,
        maxTokens: this.llmConfig.maxTokens * 1.2,
        useSimulatedLLM: this.llmConfig.useSimulatedLLM
      });
      
      // 风险评估Agent
      this.agents.risk = new LLMRiskAgent({
        provider: this.llmConfig.provider,
        model: this.llmConfig.model,
        apiKey: this.llmConfig.apiKey,
        baseURL: this.llmConfig.baseURL,
        temperature: this.llmConfig.temperature * 0.6,
        maxTokens: this.llmConfig.maxTokens * 1.5,
        useSimulatedLLM: this.llmConfig.useSimulatedLLM
      });
      
      // 初始化所有Agent
      for (const [agentName, agent] of Object.entries(this.agents)) {
        logger.info(`初始化LLM Agent: ${agentName}`);
        await agent.initialize();
      }
      
      logger.info('所有LLM Agent初始化完成');
      
    } catch (error) {
      logger.error('LLM Agent初始化失败:', error);
      throw error;
    }
  }

  async initializeSkillsManager() {
    logger.info('初始化Skills管理器...');
    
    try {
      this.skillsManager = new SkillsManager();
      logger.info('Skills管理器初始化完成');
    } catch (error) {
      logger.error('Skills管理器初始化失败:', error);
      throw error;
    }
  }

  async analyze(data, keywords = [], options = {}) {
    const analysisId = this.generateAnalysisId();
    
    logger.info(`开始LLM增强分析任务 ${analysisId} (Skills集成版)，数据量: ${data.length}，关键词: ${keywords.join(', ')}`);
    
    this.performanceMetrics.startTime = Date.now();
    this.analysisStats.totalAnalyses++;
    
    try {
      // 多轮验证分析
      const verificationResults = await this.performMultiRoundAnalysis(data, keywords, options);
      
      // 生成最终分析结果
      const finalResult = await this.generateFinalResult(verificationResults, data, keywords);
      
      // 更新统计信息
      this.updateAnalysisStats(finalResult);
      
      logger.info(`LLM增强分析任务 ${analysisId} (Skills集成版) 完成，平均置信度: ${(finalResult.metadata.confidence.final * 100).toFixed(1)}%`);
      
      return finalResult;
      
    } catch (error) {
      logger.error(`LLM增强分析任务 ${analysisId} (Skills集成版) 失败:`, error);
      await errorHandler.handleError(error, { 
        source: 'llm_enhanced_analysis_skills',
        analysisId,
        dataSize: data.length,
        keywords
      });
      
      // 使用回退方案
      return await this.fallbackAnalysis(data, keywords, options);
    }
  }

  async performMultiRoundAnalysis(data, keywords, options) {
    logger.info(`开始多轮验证分析，最大轮数: ${this.verificationConfig.maxRounds}`);
    
    const rounds = [];
    let currentData = [...data];
    let currentConfidence = 0;
    let consensusReached = false;
    let roundIndex = 0;

    while (roundIndex < this.verificationConfig.maxRounds && !consensusReached) {
      logger.info(`第 ${roundIndex + 1} 轮分析开始`);
      
      const roundStartTime = Date.now();
      
      try {
        // 数据预处理（应用Skills）
        if (this.llmConfig.enableSkills) {
          currentData = await this.applyDataSkills(currentData, { keywords, round: roundIndex });
        }
        
        // 并行运行LLM Agent分析
        const agentResults = await this.runLLMAgents(currentData, keywords, { ...options, round: roundIndex });
        
        // 应用结果验证Skills
        if (this.llmConfig.enableSkills) {
          const validatedResults = await this.applyResultSkills(agentResults, { keywords, round: roundIndex });
          Object.assign(agentResults, validatedResults);
        }
        
        // 交叉验证
        const crossValidation = await this.performCrossValidation(agentResults, currentData, keywords);
        
        // 共识构建
        const consensusResult = await this.buildConsensus(agentResults, crossValidation, { keywords, round: roundIndex });
        
        // 检查是否达到共识阈值
        currentConfidence = consensusResult.confidence;
        consensusReached = currentConfidence >= this.verificationConfig.consensusThreshold;
        
        const roundResult = {
          round: roundIndex + 1,
          agentResults,
          crossValidation,
          consensusResult,
          confidence: currentConfidence,
          consensusReached,
          executionTime: Date.now() - roundStartTime
        };
        
        rounds.push(roundResult);
        
        logger.info(`第 ${roundIndex + 1} 轮分析完成，置信度: ${(currentConfidence * 100).toFixed(1)}%，共识达成: ${consensusReached}`);
        
        if (!consensusReached && roundIndex < this.verificationConfig.maxRounds - 1) {
          // 准备下一轮分析
          currentData = await this.prepareNextRoundData(currentData, consensusResult, { keywords, round: roundIndex });
        }
        
        roundIndex++;
        
      } catch (error) {
        logger.error(`第 ${roundIndex + 1} 轮分析失败:`, error);
        throw error;
      }
    }

    logger.info(`多轮验证分析完成，共进行 ${rounds.length} 轮，最终置信度: ${(currentConfidence * 100).toFixed(1)}%`);
    
    return {
      rounds,
      finalConfidence: currentConfidence,
      consensusReached,
      totalRounds: rounds.length
    };
  }

  async applyDataSkills(data, context) {
    if (!this.skillsManager) return data;
    
    logger.info('应用数据预处理Skills');
    
    let enhancedData = data;
    
    // 数据验证
    enhancedData = await this.skillsManager.applySkill('dataValidation', enhancedData, context);
    
    // 偏见检测
    enhancedData = await this.skillsManager.applySkill('biasDetection', enhancedData, context);
    
    // 多模态融合（如果启用）
    if (this.verificationConfig.enableMultiModal) {
      enhancedData = await this.skillsManager.applySkill('multiModalFusion', enhancedData, context);
    }
    
    return enhancedData;
  }

  async runLLMAgents(data, keywords, options) {
    logger.info('并行运行LLM Agent分析...');
    
    const agentPromises = [];
    const agentResults = {};
    
    // 并行执行所有Agent
    for (const [agentName, agent] of Object.entries(this.agents)) {
      if (agent) {
        const promise = this.runAgentWithMetrics(agentName, agent, data, { keywords, ...options });
        agentPromises.push({ name: agentName, promise });
      }
    }
    
    // 等待所有Agent完成
    const results = await Promise.allSettled(agentPromises.map(p => p.promise));
    
    // 处理结果
    results.forEach((result, index) => {
      const agentName = agentPromises[index].name;
      
      if (result.status === 'fulfilled') {
        agentResults[agentName] = result.value;
        logger.info(`LLM Agent ${agentName} 分析完成，置信度: ${(result.value.confidence * 100).toFixed(1)}%`);
      } else {
        logger.error(`LLM Agent ${agentName} 分析失败:`, result.reason);
        agentResults[agentName] = this.generateAgentFallback(agentName, data, keywords);
      }
    });
    
    return agentResults;
  }

  async applyResultSkills(agentResults, context) {
    if (!this.skillsManager) return agentResults;
    
    logger.info('应用结果验证和增强Skills');
    
    let enhancedResults = { ...agentResults };
    
    // 结果验证
    enhancedResults = await this.skillsManager.applySkill('resultVerification', enhancedResults, context);
    
    // 置信度校准
    enhancedResults = await this.skillsManager.applySkill('confidenceCalibration', enhancedResults, context);
    
    // 质量增强
    enhancedResults = await this.skillsManager.applySkill('qualityEnhancement', enhancedResults, context);
    
    // 因果推理（高级功能）
    if (context.round > 0) {
      enhancedResults = await this.skillsManager.applySkill('causalReasoning', enhancedResults, context);
    }
    
    // 元认知（高级功能）
    if (context.round >= this.verificationConfig.maxRounds - 1) {
      enhancedResults = await this.skillsManager.applySkill('metaCognition', enhancedResults, context);
    }
    
    return enhancedResults;
  }

  async performCrossValidation(agentResults, data, keywords) {
    logger.info('执行交叉验证...');
    
    try {
      // 使用LLM进行跨Agent验证
      const crossValidationPrompt = this.generateCrossValidationPrompt(agentResults, data, keywords);
      const systemPrompt = `你是专业的舆情分析验证专家，擅长识别不同分析结果之间的一致性和矛盾。`;
      
      const response = await this.callLLMForAnalysis(crossValidationPrompt, systemPrompt);
      
      return this.parseCrossValidationResponse(response);
      
    } catch (error) {
      logger.error('交叉验证失败:', error);
      return this.generateFallbackCrossValidation(agentResults, keywords);
    }
  }

  async buildConsensus(agentResults, crossValidation, context) {
    logger.info('构建分析共识...');
    
    try {
      // 使用LLM构建共识
      const consensusPrompt = this.generateConsensusPrompt(agentResults, crossValidation, context);
      const systemPrompt = `你是专业的舆情分析共识构建专家，擅长整合多维度分析结果，达成一致的结论。`;
      
      const response = await this.callLLMForAnalysis(consensusPrompt, systemPrompt);
      
      return this.parseConsensusResponse(response);
      
    } catch (error) {
      logger.error('共识构建失败:', error);
      return this.generateFallbackConsensus(agentResults, crossValidation, context);
    }
  }

  async prepareNextRoundData(data, consensusResult, context) {
    logger.info('准备下一轮分析数据...');
    
    // 基于共识结果调整数据权重或筛选重点数据
    const adjustedData = data.map(item => ({
      ...item,
      _consensusWeight: this.calculateConsensusWeight(item, consensusResult),
      _round: context.round + 1
    }));
    
    // 根据置信度排序，优先分析置信度较低的数据
    return adjustedData.sort((a, b) => (a._consensusWeight || 0) - (b._consensusWeight || 0));
  }

  calculateConsensusWeight(item, consensusResult) {
    // 基于共识结果计算数据权重
    // 权重越低表示需要更多关注
    const baseWeight = 0.5;
    const confidenceFactor = 1 - (consensusResult.confidence || 0);
    return Math.max(0.1, Math.min(1.0, baseWeight + confidenceFactor * 0.5));
  }

  generateAnalysisId() {
    return `llm_skills_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 其他辅助方法...
  async runAgentWithMetrics(agentName, agent, data, context) {
    const startTime = Date.now();
    
    try {
      const result = await agent.process(data, context);
      
      const executionTime = Date.now() - startTime;
      this.performanceMetrics.agentExecutionTimes[agentName] = executionTime;
      this.analysisStats.llmCalls++;
      
      if (result.confidence > 0) {
        this.analysisStats.successfulLLMCalls++;
      }
      
      return {
        ...result,
        executionTime,
        agentName
      };
      
    } catch (error) {
      logger.error(`Agent ${agentName} 执行失败:`, error);
      throw error;
    }
  }

  async callLLMForAnalysis(prompt, systemPrompt = null) {
    // 使用第一个可用的LLM Agent进行调用
    const availableAgent = Object.values(this.agents).find(agent => agent && agent.isConfigured);
    
    if (availableAgent) {
      return await availableAgent.callLLM(prompt, systemPrompt);
    } else {
      // 如果没有配置LLM，使用模拟响应
      logger.warn('没有可用的LLM配置，使用模拟分析');
      return this.generateSimulatedAnalysis(prompt);
    }
  }

  generateSimulatedAnalysis(prompt) {
    // 生成模拟的LLM分析响应
    if (prompt.includes('交叉验证')) {
      return JSON.stringify({
        consistency: 0.85,
        conflicts: [],
        recommendations: ['继续观察', '增加数据量'],
        confidence: 0.8
      });
    } else if (prompt.includes('共识构建')) {
      return JSON.stringify({
        consensus: {
          level: 'high',
          confidence: 0.82,
          unifiedResult: '整体分析结果一致'
        },
        finalRecommendation: '维持当前分析结论'
      });
    }
    
    return '基于当前分析结果，建议维持正常监控水平';
  }

  // 其他方法实现...
  generateAgentFallback(agentName, data, keywords) {
    // 生成Agent失败时的回退结果
    const fallbackResults = {
      sentiment: {
        overallSentiment: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: data.length },
        confidence: 0.3,
        executionTime: 0
      },
      topic: {
        topics: [{ name: '一般讨论', weight: 1.0, keywords: ['话题'] }],
        confidence: 0.3,
        executionTime: 0
      },
      risk: {
        overallRisk: { level: 'low', score: 0.1, confidence: 0.3 },
        confidence: 0.3,
        executionTime: 0
      }
    };
    
    return fallbackResults[agentName] || { confidence: 0.3, executionTime: 0 };
  }

  generateCrossValidationPrompt(agentResults, data, keywords) {
    return `请对以下舆情分析结果进行交叉验证：

情感分析结果：
- 整体情感：${agentResults.sentiment?.overallSentiment || 0}
- 置信度：${(agentResults.sentiment?.confidence * 100 || 0).toFixed(1)}%

主题分析结果：
- 主要主题：${agentResults.topic?.topics?.map(t => t.name).join(', ') || '无'}
- 置信度：${(agentResults.topic?.confidence * 100 || 0).toFixed(1)}%

风险评估结果：
- 整体风险：${agentResults.risk?.overallRisk?.level || 'unknown'}
- 置信度：${(agentResults.risk?.confidence * 100 || 0).toFixed(1)}%

请分析这些结果之间的一致性和可能的矛盾，并提供验证建议。`;
  }

  generateConsensusPrompt(agentResults, crossValidation, context) {
    return `基于以下舆情分析结果，请构建分析共识：

Agent分析结果：${JSON.stringify(agentResults, null, 2)}

交叉验证结果：${JSON.stringify(crossValidation, null, 2)}

请提供统一的分析结论，包括置信度评估和最终建议。`;
  }

  parseCrossValidationResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        consistency: parsed.consistency || 0.8,
        conflicts: parsed.conflicts || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      return {
        consistency: 0.7,
        conflicts: [],
        recommendations: ['继续监控'],
        confidence: 0.7
      };
    }
  }

  parseConsensusResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        consensus: parsed.consensus || { level: 'medium', confidence: 0.7 },
        finalRecommendation: parsed.finalRecommendation || '维持当前分析',
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      return {
        consensus: { level: 'medium', confidence: 0.7 },
        finalRecommendation: '维持当前分析',
        confidence: 0.7
      };
    }
  }

  generateFallbackCrossValidation(agentResults, keywords) {
    return {
      consistency: 0.7,
      conflicts: [],
      recommendations: ['继续分析'],
      confidence: 0.7
    };
  }

  generateFallbackConsensus(agentResults, crossValidation, context) {
    return {
      consensus: { level: 'medium', confidence: 0.7 },
      finalRecommendation: '基于当前结果继续监控',
      confidence: 0.7
    };
  }

  async generateFinalResult(verificationResults, originalData, keywords) {
    const finalRound = verificationResults.rounds[verificationResults.rounds.length - 1];
    const executionTime = Date.now() - this.performanceMetrics.startTime;
    
    const finalResult = {
      summary: {
        overallAssessment: this.generateOverallAssessment(finalRound.consensusResult),
        sentiment: this.generateSentimentSummary(finalRound.agentResults.sentiment),
        topics: this.generateTopicSummary(finalRound.agentResults.topic),
        risks: this.generateRiskSummary(finalRound.agentResults.risk),
        keyInsights: this.generateKeyInsights(finalRound.consensusResult, verificationResults),
        recommendations: this.generateFinalRecommendations(finalRound.consensusResult, verificationResults)
      },
      detailedResults: {
        rounds: verificationResults.rounds,
        finalRound: finalRound,
        verificationSummary: {
          totalRounds: verificationResults.totalRounds,
          consensusReached: verificationResults.consensusReached,
          finalConfidence: verificationResults.finalConfidence
        }
      },
      metadata: {
        analysisId: this.generateAnalysisId(),
        executionTime,
        dataSize: originalData.length,
        keywords,
        confidence: {
          sentiment: finalRound.agentResults.sentiment?.confidence || 0,
          topic: finalRound.agentResults.topic?.confidence || 0,
          risk: finalRound.agentResults.risk?.confidence || 0,
          final: verificationResults.finalConfidence,
          consensus: finalRound.consensusResult.confidence
        },
        verification: {
          rounds: verificationResults.totalRounds,
          consensusReached: verificationResults.consensusReached,
          maxRounds: this.verificationConfig.maxRounds,
          consensusThreshold: this.verificationConfig.consensusThreshold
        },
        skills: this.llmConfig.enableSkills ? this.skillsManager.getSkillStats() : null,
        performance: this.getPerformanceMetrics()
      }
    };
    
    return finalResult;
  }

  // 其他辅助方法...
  generateOverallAssessment(consensusResult) {
    return consensusResult.finalRecommendation || '基于多轮验证的综合分析结论';
  }

  generateSentimentSummary(sentimentResult) {
    if (!sentimentResult) return { overall: 0, confidence: 0, distribution: {} };
    
    return {
      overall: sentimentResult.overallSentiment || 0,
      confidence: sentimentResult.confidence || 0,
      distribution: sentimentResult.sentimentDistribution || {},
      emotions: sentimentResult.emotionDistribution || {}
    };
  }

  generateTopicSummary(topicResult) {
    if (!topicResult) return { topics: [], keywords: [], confidence: 0 };
    
    return {
      topics: topicResult.topics?.slice(0, 5) || [],
      keywords: topicResult.keywords?.slice(0, 10) || [],
      confidence: topicResult.confidence || 0
    };
  }

  generateRiskSummary(riskResult) {
    if (!riskResult) return { level: 'low', score: 0, confidence: 0 };
    
    return {
      level: riskResult.overallRisk?.level || 'low',
      score: riskResult.overallRisk?.score || 0,
      confidence: riskResult.confidence || 0,
      categories: riskResult.riskCategories || {},
      earlyWarnings: riskResult.earlyWarnings || [],
      recommendations: riskResult.recommendations || []
    };
  }

  generateKeyInsights(consensusResult, verificationResults) {
    const insights = [];
    
    // 基于验证轮次的洞察
    if (verificationResults.totalRounds > 1) {
      insights.push(`经过${verificationResults.totalRounds}轮验证分析，结果具有较高可靠性`);
    }
    
    // 基于共识达成的洞察
    if (verificationResults.consensusReached) {
      insights.push(`多Agent达成分析共识，置信度为${(verificationResults.finalConfidence * 100).toFixed(1)}%`);
    } else {
      insights.push('分析结果存在一定分歧，建议增加数据量或延长观察期');
    }
    
    // 基于最终结论的洞察
    if (consensusResult.consensus) {
      insights.push(`综合分析结论：${consensusResult.consensus.level}级别共识达成`);
    }
    
    return insights;
  }

  generateFinalRecommendations(consensusResult, verificationResults) {
    const recommendations = [];
    
    // 基于验证结果的建议
    if (verificationResults.consensusReached) {
      recommendations.push('基于多Agent共识，可以信任当前分析结论');
    } else {
      recommendations.push('由于存在分析分歧，建议谨慎使用当前结论');
    }
    
    // 基于置信度的建议
    if (verificationResults.finalConfidence < 0.7) {
      recommendations.push('置信度较低，建议增加数据量或延长分析时间');
    }
    
    // 基于验证轮次的建议
    if (verificationResults.totalRounds >= this.verificationConfig.maxRounds) {
      recommendations.push('已达到最大验证轮次，建议接受当前结果或重新设计分析方案');
    }
    
    // 添加共识结果的具体建议
    if (consensusResult.finalRecommendation) {
      recommendations.push(consensusResult.finalRecommendation);
    }
    
    return recommendations;
  }

  updateAnalysisStats(finalResult) {
    this.analysisStats.totalAnalyses++;
    
    // 更新验证轮次统计
    if (finalResult.detailedResults.verificationSummary) {
      this.analysisStats.verificationRounds += finalResult.detailedResults.verificationSummary.totalRounds;
    }
    
    // 更新Skills应用统计
    if (finalResult.metadata.skills) {
      Object.values(finalResult.metadata.skills).forEach(skillStats => {
        this.analysisStats.skillsApplied += skillStats.applied || 0;
      });
    }
    
    // 更新回退使用统计
    if (finalResult.metadata.confidence.final < this.verificationConfig.confidenceThreshold) {
      this.analysisStats.fallbackUsage++;
    }
  }

  getPerformanceMetrics() {
    return {
      agentExecutionTimes: this.performanceMetrics.agentExecutionTimes,
      skillsExecutionTimes: this.performanceMetrics.skillsExecutionTimes,
      verificationTimes: this.performanceMetrics.verificationTimes,
      totalExecutionTime: Date.now() - this.performanceMetrics.startTime,
      averageRoundTime: this.performanceMetrics.verificationTimes.length > 0 ?
        this.performanceMetrics.verificationTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.verificationTimes.length : 0
    };
  }

  async fallbackAnalysis(data, keywords, options) {
    logger.warn('使用回退分析方案');
    
    // 使用原有的增强分析器作为回退
    const EnhancedAnalyzer = require('./enhanced-analyzer');
    const fallbackAnalyzer = new EnhancedAnalyzer(options);
    await fallbackAnalyzer.initialize();
    
    return await fallbackAnalyzer.analyze(data, keywords, options);
  }

  getStats() {
    return {
      ...this.analysisStats,
      llmSuccessRate: this.analysisStats.llmCalls > 0 ? 
        this.analysisStats.successfulLLMCalls / this.analysisStats.llmCalls : 0,
      averageVerificationRounds: this.analysisStats.totalAnalyses > 0 ?
        this.analysisStats.verificationRounds / this.analysisStats.totalAnalyses : 0,
      skillsApplicationRate: this.analysisStats.totalAnalyses > 0 ?
        this.analysisStats.skillsApplied / this.analysisStats.totalAnalyses : 0,
      fallbackRate: this.analysisStats.totalAnalyses > 0 ?
        this.analysisStats.fallbackUsage / this.analysisStats.totalAnalyses : 0
    };
  }
}

module.exports = LLMEnhancedAnalyzerWithSkills;