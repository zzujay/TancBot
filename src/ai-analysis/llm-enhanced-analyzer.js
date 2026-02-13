/**
 * LLM增强分析引擎
 * 基于大语言模型的多智能体舆情分析系统
 */

const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');
const LLMSentimentAgent = require('./llm-sentiment-agent');
const LLMTopicAgent = require('./llm-topic-agent');
const LLMRiskAgent = require('./llm-risk-agent');

/**
 * LLM增强分析引擎
 * 集成多个LLM Agent进行深度舆情分析
 */
class LLMEnhancedAnalyzer {
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
      useSimulatedLLM: options.useSimulatedLLM || !process.env.LLM_API_KEY
    };
    
    this.agents = {
      sentiment: null,
      topic: null,
      risk: null
    };
    
    this.analysisStats = {
      totalAnalyses: 0,
      llmCalls: 0,
      successfulLLMCalls: 0,
      averageLLMResponseTime: 0,
      fallbackUsage: 0
    };
    
    this.performanceMetrics = {
      startTime: null,
      agentExecutionTimes: {},
      llmResponseTimes: []
    };
  }

  async initialize() {
    logger.info('初始化LLM增强分析引擎...');
    
    try {
      // 初始化LLM Agent
      await this.initializeLLMAgents();
      
      logger.info('LLM增强分析引擎初始化完成');
    } catch (error) {
      logger.error('LLM增强分析引擎初始化失败:', error);
      await errorHandler.handleError(error, { source: 'llm_analyzer_initialization' });
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
        maxTokens: this.llmConfig.maxTokens
      });
      
      // 主题建模Agent
      this.agents.topic = new LLMTopicAgent({
        provider: this.llmConfig.provider,
        model: this.llmConfig.model,
        apiKey: this.llmConfig.apiKey,
        baseURL: this.llmConfig.baseURL,
        temperature: this.llmConfig.temperature * 0.8, // 主题分析需要更确定性
        maxTokens: this.llmConfig.maxTokens * 1.2
      });
      
      // 风险评估Agent
      this.agents.risk = new LLMRiskAgent({
        provider: this.llmConfig.provider,
        model: this.llmConfig.model,
        apiKey: this.llmConfig.apiKey,
        baseURL: this.llmConfig.baseURL,
        temperature: this.llmConfig.temperature * 0.6, // 风险评估需要更高确定性
        maxTokens: this.llmConfig.maxTokens * 1.5
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

  async analyze(data, keywords = [], options = {}) {
    const analysisId = this.generateAnalysisId();
    
    logger.info(`开始LLM增强分析任务 ${analysisId}，数据量: ${data.length}，关键词: ${keywords.join(', ')}`);
    
    this.performanceMetrics.startTime = Date.now();
    this.analysisStats.totalAnalyses++;
    
    try {
      // 数据预处理
      const processedData = await this.preprocessData(data, keywords);
      
      // 并行运行LLM Agent分析
      const agentResults = await this.runLLMAgents(processedData, keywords, options);
      
      // LLM增强分析
      const enhancedResults = await this.performLLMEnhancement(agentResults, processedData, keywords);
      
      // 生成最终分析结果
      const finalResult = await this.generateFinalResult(enhancedResults, processedData, keywords);
      
      // 更新统计信息
      this.updateAnalysisStats(finalResult);
      
      logger.info(`LLM增强分析任务 ${analysisId} 完成，平均置信度: ${(finalResult.finalConfidence * 100).toFixed(1)}%`);
      
      return finalResult;
      
    } catch (error) {
      logger.error(`LLM增强分析任务 ${analysisId} 失败:`, error);
      await errorHandler.handleError(error, { 
        source: 'llm_enhanced_analysis',
        analysisId,
        dataSize: data.length,
        keywords
      });
      
      // 使用回退方案
      return await this.fallbackAnalysis(data, keywords, options);
    }
  }

  async runLLMAgents(data, keywords, options) {
    logger.info('并行运行LLM Agent分析...');
    
    const agentPromises = [];
    const agentResults = {};
    
    // 并行执行所有Agent
    for (const [agentName, agent] of Object.entries(this.agents)) {
      if (agent && this.llmConfig.enableBatchProcessing) {
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

  async runAgentWithMetrics(agentName, agent, data, context) {
    const startTime = Date.now();
    
    try {
      const result = await agent.process(data, context);
      
      const executionTime = Date.now() - startTime;
      this.performanceMetrics.agentExecutionTimes[agentName] = executionTime;
      
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

  async performLLMEnhancement(agentResults, data, keywords) {
    logger.info('执行LLM增强分析...');
    
    try {
      // 跨Agent综合分析
      const crossAnalysis = await this.performCrossAgentAnalysis(agentResults, data, keywords);
      
      // 上下文增强理解
      const contextEnhancement = await this.performContextEnhancement(agentResults, data, keywords);
      
      // 推理和洞察生成
      const reasoningResults = await this.performLLMReasoning(agentResults, data, keywords);
      
      return {
        agentResults,
        crossAnalysis,
        contextEnhancement,
        reasoningResults,
        enhancementConfidence: this.calculateEnhancementConfidence(agentResults)
      };
      
    } catch (error) {
      logger.error('LLM增强分析失败:', error);
      return {
        agentResults,
        crossAnalysis: {},
        contextEnhancement: {},
        reasoningResults: {},
        enhancementConfidence: 0.5
      };
    }
  }

  async performCrossAgentAnalysis(agentResults, data, keywords) {
    logger.info('执行跨Agent综合分析...');
    
    try {
      // 使用LLM进行跨Agent分析
      const crossAnalysisPrompt = this.generateCrossAnalysisPrompt(agentResults, data, keywords);
      const systemPrompt = `你是专业的舆情分析专家，擅长整合多维度分析结果，提供综合性的深度分析。`;
      
      const response = await this.callLLMForAnalysis(crossAnalysisPrompt, systemPrompt);
      
      return this.parseCrossAnalysisResponse(response);
      
    } catch (error) {
      logger.error('跨Agent分析失败:', error);
      return this.generateFallbackCrossAnalysis(agentResults, keywords);
    }
  }

  async performContextEnhancement(agentResults, data, keywords) {
    logger.info('执行上下文增强理解...');
    
    try {
      // 使用LLM理解上下文和背景
      const contextPrompt = this.generateContextEnhancementPrompt(agentResults, data, keywords);
      const systemPrompt = `你是专业的中文语境分析专家，擅长理解文本的社会文化背景和深层含义。`;
      
      const response = await this.callLLMForAnalysis(contextPrompt, systemPrompt);
      
      return this.parseContextEnhancementResponse(response);
      
    } catch (error) {
      logger.error('上下文增强失败:', error);
      return this.generateFallbackContextEnhancement(agentResults, keywords);
    }
  }

  async performLLMReasoning(agentResults, data, keywords) {
    logger.info('执行LLM推理分析...');
    
    try {
      // 使用LLM进行逻辑推理和洞察生成
      const reasoningPrompt = this.generateReasoningPrompt(agentResults, data, keywords);
      const systemPrompt = `你是专业的推理分析专家，擅长从数据中发现模式、趋势和深层洞察。`;
      
      const response = await this.callLLMForAnalysis(reasoningPrompt, systemPrompt);
      
      return this.parseReasoningResponse(response);
      
    } catch (error) {
      logger.error('LLM推理分析失败:', error);
      return this.generateFallbackReasoning(agentResults, keywords);
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

  generateCrossAnalysisPrompt(agentResults, data, keywords) {
    const keywordStr = keywords.join(', ');
    
    return `请对以下关于"${keywordStr}"的多维度舆情分析结果进行综合评估：

【情感分析结果】
整体情感得分: ${agentResults.sentiment?.overallSentiment?.toFixed(2) || 0}
情感分布: ${JSON.stringify(agentResults.sentiment?.sentimentDistribution || {})}
主要情绪: ${agentResults.sentiment?.emotionDistribution ? Object.keys(agentResults.sentiment.emotionDistribution).slice(0, 3).join(', ') : '无'}
置信度: ${(agentResults.sentiment?.confidence * 100 || 0).toFixed(1)}%

【主题分析结果】
主要主题: ${agentResults.topic?.topics?.slice(0, 3).map(t => `${t.name}(${t.weight.toFixed(2)})`).join(', ') || '无'}
关键词: ${agentResults.topic?.keywords?.slice(0, 5).join(', ') || '无'}
置信度: ${(agentResults.topic?.confidence * 100 || 0).toFixed(1)}%

【风险评估结果】
整体风险: ${agentResults.risk?.overallRisk?.level || 'unknown'} (评分: ${agentResults.risk?.overallRisk?.score?.toFixed(2) || 0})
高风险类别: ${Object.entries(agentResults.risk?.riskCategories || {}).filter(([,cat]) => cat.level === 'high' || cat.level === 'critical').map(([name]) => name).join(', ') || '无'}
置信度: ${(agentResults.risk?.confidence * 100 || 0).toFixed(1)}%

数据量: ${data.length}条

请提供：
1. 综合评估结论
2. 跨维度关联分析
3. 整体风险等级判断
4. 关键洞察和发现
5. 优先级建议

确保分析专业、准确、有深度。`;
  }

  generateContextEnhancementPrompt(agentResults, data, keywords) {
    const keywordStr = keywords.join(', ');
    
    return `请对以下关于"${keywordStr}"的舆情分析结果进行上下文增强理解：

【分析背景】
数据时间范围: ${this.getTimeRange(data)}
数据来源: 多平台社交媒体数据
文化背景: 中文语境
社会背景: 当前社会环境和网络文化

【多维度分析结果】
${JSON.stringify(agentResults, null, 2)}

请提供：
1. 社会文化背景解读
2. 网络语境和流行文化影响
3. 历史对比和趋势分析
4. 地域和文化差异考虑
5. 政策和社会环境影响
6. 媒体和舆论引导因素

考虑中文表达习惯、网络文化特点、社会心理等因素。`;
  }

  generateReasoningPrompt(agentResults, data, keywords) {
    const keywordStr = keywords.join(', ');
    
    return `请基于以下关于"${keywordStr}"的舆情分析结果进行深度推理和洞察生成：

【多维度数据】
数据量: ${data.length}条文本
时间分布: ${this.getTimeDistribution(data)}
平台分布: ${this.getPlatformDistribution(data)}

【综合分析结果】
${JSON.stringify(agentResults, null, 2)}

请进行：
1. 模式识别和趋势预测
2. 因果关系推理
3. 潜在风险预警
4. 机会识别和把握
5. 策略建议和方向
6. 未来发展趋势预测

基于逻辑推理、数据模式、历史经验等提供前瞻性洞察。`;
  }

  generateSimulatedAnalysis(prompt) {
    // 生成模拟的LLM分析响应
    if (prompt.includes('综合评估')) {
      return `
综合评估结论：
基于多维度分析，当前舆情整体呈现中性偏正面态势，风险水平较低。

跨维度关联分析：
情感分析与主题分析结果高度一致，主要讨论集中在产品质量和用户体验方面。

整体风险等级：low

关键洞察：
1. 用户情感相对稳定，没有明显的负面倾向
2. 讨论主题聚焦明确，未出现敏感话题扩散
3. 风险评估各项指标均在安全范围内

优先级建议：
维持正常监控，关注用户体验持续优化。
      `.trim();
    } else if (prompt.includes('上下文增强')) {
      return `
社会文化背景解读：
当前讨论符合中文网络表达习惯，用户态度理性客观。

网络语境影响：
讨论未涉及敏感话题，整体氛围健康积极。

历史对比分析：
与历史数据相比，当前舆情态势保持稳定。

地域文化考虑：
讨论内容具有普遍性，未显示明显的地域文化差异。

政策环境影响：
当前政策环境稳定，对讨论内容无显著影响。
      `.trim();
    } else if (prompt.includes('推理分析')) {
      return `
模式识别：
用户讨论呈现周期性特征，与产品更新周期相关。

趋势预测：
预计短期内舆情将保持稳定，无重大风险迹象。

因果关系：
正面情感主要来源于产品功能优化，负面情感多与服务体验相关。

风险预警：
当前未发现需要特别关注的潜在风险因素。

机会识别：
用户对产品创新持开放态度，为功能优化提供机会。

策略建议：
继续加强产品质量管控，提升用户服务体验。
      `.trim();
    }
    
    return '基于当前分析结果，建议维持正常监控水平。';
  }

  generateFinalResult(enhancedResults, data, keywords) {
    const { agentResults, crossAnalysis, contextEnhancement, reasoningResults, enhancementConfidence } = enhancedResults;
    
    const executionTime = Date.now() - this.performanceMetrics.startTime;
    
    const finalResult = {
      summary: {
        overallAssessment: this.generateOverallAssessment(crossAnalysis, contextEnhancement, reasoningResults),
        sentiment: this.generateSentimentSummary(agentResults.sentiment),
        topics: this.generateTopicSummary(agentResults.topic),
        risks: this.generateRiskSummary(agentResults.risk),
        keyInsights: this.generateKeyInsights(crossAnalysis, contextEnhancement, reasoningResults),
        recommendations: this.generateRecommendations(crossAnalysis, reasoningResults)
      },
      detailedResults: {
        sentiment: agentResults.sentiment,
        topic: agentResults.topic,
        risk: agentResults.risk,
        crossAnalysis,
        contextEnhancement,
        reasoningResults
      },
      metadata: {
        analysisId: this.generateAnalysisId(),
        executionTime,
        dataSize: data.length,
        keywords,
        confidence: {
          sentiment: agentResults.sentiment?.confidence || 0,
          topic: agentResults.topic?.confidence || 0,
          risk: agentResults.risk?.confidence || 0,
          enhancement: enhancementConfidence,
          final: this.calculateFinalConfidence(agentResults, enhancementConfidence)
        },
        llmStats: this.getLLMStats(),
        performance: this.getPerformanceMetrics()
      }
    };
    
    return finalResult;
  }

  // 其他辅助方法...
  generateAnalysisId() {
    return `llm_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTimeRange(data) {
    if (data.length === 0) return '无数据';
    
    const times = data.map(item => new Date(item.publish_time || item.collection_time || Date.now()));
    const oldest = new Date(Math.min(...times));
    const newest = new Date(Math.max(...times));
    
    const diffHours = Math.floor((newest - oldest) / (1000 * 60 * 60));
    return diffHours < 24 ? `${diffHours}小时` : `${Math.floor(diffHours / 24)}天`;
  }

  getTimeDistribution(data) {
    if (data.length === 0) return '无数据';
    
    const hours = data.map(item => new Date(item.publish_time || item.collection_time || Date.now()).getHours());
    const hourCounts = {};
    hours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
    return peakHour ? `${peakHour[0]}:00-${peakHour[1]}条` : '分布均匀';
  }

  getPlatformDistribution(data) {
    const platforms = {};
    data.forEach(item => {
      platforms[item.platform] = (platforms[item.platform] || 0) + 1;
    });
    
    return Object.entries(platforms).map(([platform, count]) => `${platform}(${count})`).join(', ');
  }

  getLLMStats() {
    const stats = {
      totalCalls: 0,
      successfulCalls: 0,
      averageResponseTime: 0
    };
    
    for (const agent of Object.values(this.agents)) {
      if (agent && agent.getRequestStats) {
        const agentStats = agent.getRequestStats();
        stats.totalCalls += agentStats.totalRequests;
        stats.successfulCalls += agentStats.successfulRequests;
        stats.averageResponseTime += agentStats.averageResponseTime;
      }
    }
    
    if (stats.totalCalls > 0) {
      stats.averageResponseTime = stats.averageResponseTime / Object.keys(this.agents).length;
      stats.successRate = stats.successfulCalls / stats.totalCalls;
    }
    
    return stats;
  }

  getPerformanceMetrics() {
    return {
      agentExecutionTimes: this.performanceMetrics.agentExecutionTimes,
      llmResponseTimes: this.performanceMetrics.llmResponseTimes,
      totalExecutionTime: Date.now() - this.performanceMetrics.startTime
    };
  }

  // 其他方法实现...
  generateOverallAssessment(crossAnalysis, contextEnhancement, reasoningResults) {
    return crossAnalysis.overallAssessment || '基于LLM多维度分析的综合评估';
  }

  generateSentimentSummary(sentimentResult) {
    if (!sentimentResult) return { overall: 0, confidence: 0, distribution: {} };
    
    return {
      overall: sentimentResult.overallSentiment || 0,
      confidence: sentimentResult.confidence || 0,
      distribution: sentimentResult.sentimentDistribution || {}
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
      categories: riskResult.riskCategories || {}
    };
  }

  generateKeyInsights(crossAnalysis, contextEnhancement, reasoningResults) {
    const insights = [];
    
    if (crossAnalysis.insights) {
      insights.push(...crossAnalysis.insights);
    }
    
    if (contextEnhancement.insights) {
      insights.push(...contextEnhancement.insights);
    }
    
    if (reasoningResults.insights) {
      insights.push(...reasoningResults.insights);
    }
    
    return insights.length > 0 ? insights : ['LLM分析完成，基于多维度综合评估'];
  }

  generateRecommendations(crossAnalysis, reasoningResults) {
    const recommendations = [];
    
    if (crossAnalysis.recommendations) {
      recommendations.push(...crossAnalysis.recommendations);
    }
    
    if (reasoningResults.recommendations) {
      recommendations.push(...reasoningResults.recommendations);
    }
    
    return recommendations.length > 0 ? recommendations : ['建议维持正常监控水平'];
  }

  calculateFinalConfidence(agentResults, enhancementConfidence) {
    const agentConfidences = [
      agentResults.sentiment?.confidence || 0,
      agentResults.topic?.confidence || 0,
      agentResults.risk?.confidence || 0
    ];
    
    const avgAgentConfidence = agentConfidences.reduce((a, b) => a + b, 0) / agentConfidences.length;
    
    return (avgAgentConfidence + enhancementConfidence) / 2;
  }

  updateAnalysisStats(finalResult) {
    this.analysisStats.totalAnalyses++;
    
    // 更新LLM调用统计
    const llmStats = finalResult.metadata?.llmStats;
    if (llmStats) {
      this.analysisStats.llmCalls += llmStats.totalCalls;
      this.analysisStats.successfulLLMCalls += llmStats.successfulCalls;
      this.analysisStats.averageLLMResponseTime = llmStats.averageResponseTime;
    }
    
    // 更新回退使用统计
    if (finalResult.metadata?.confidence?.final < 0.7) {
      this.analysisStats.fallbackUsage++;
    }
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
      fallbackRate: this.analysisStats.totalAnalyses > 0 ? 
        this.analysisStats.fallbackUsage / this.analysisStats.totalAnalyses : 0
    };
  }
}

module.exports = LLMEnhancedAnalyzer;