/**
 * V2 多Agent协作分析引擎
 * 整合所有V2智能体，实现完整的分析流程
 */

const CoordinatorAgent = require('./coordinator-agent');
const FactAgent = require('./specialists/fact-agent');
const EmotionAgent = require('./specialists/emotion-agent');
const PropagationAgent = require('./specialists/propagation-agent');
const RiskAgent = require('./specialists/risk-agent');
const EventNarrativeAgent = require('./specialists/event-narrative-agent');
const CrossValidator = require('./validators/cross-validator');
const IterationOptimizer = require('./optimizers/iteration-optimizer');
const llmClient = require('../../services/llm-client');
const logger = require('../../utils/logger');

class V2AnalysisEngine {
  constructor() {
    this.coordinator = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    logger.info('[V2] 初始化多Agent协作分析引擎...');

    // 初始化LLM客户端
    try {
      await llmClient.initialize();
      logger.info('[V2] LLM客户端初始化成功');
    } catch (error) {
      logger.error('[V2] LLM客户端初始化失败:', error.message);
      logger.warn('[V2] 将继续使用规则分析模式');
    }

    // 创建调度智能体
    this.coordinator = new CoordinatorAgent();
    await this.coordinator.initialize();

    // 创建并注册专业分析智能体
    const factAgent = new FactAgent();
    const emotionAgent = new EmotionAgent();
    const propagationAgent = new PropagationAgent();
    const riskAgent = new RiskAgent();
    const eventNarrativeAgent = new EventNarrativeAgent();

    await factAgent.initialize();
    await emotionAgent.initialize();
    await propagationAgent.initialize();
    await riskAgent.initialize();
    await eventNarrativeAgent.initialize();

    this.coordinator.registerSpecialistAgent(factAgent);
    this.coordinator.registerSpecialistAgent(emotionAgent);
    this.coordinator.registerSpecialistAgent(propagationAgent);
    this.coordinator.registerSpecialistAgent(riskAgent);
    this.coordinator.registerSpecialistAgent(eventNarrativeAgent);

    // 创建并注册校验智能体
    const crossValidator = new CrossValidator();
    await crossValidator.initialize();
    this.coordinator.registerValidatorAgent(crossValidator);

    // 创建并注册优化智能体
    const iterationOptimizer = new IterationOptimizer();
    await iterationOptimizer.initialize();
    this.coordinator.registerOptimizerAgent(iterationOptimizer);

    this.initialized = true;
    logger.info('[V2] 多Agent协作分析引擎初始化完成');
  }

  async analyze(data, keywords, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info(`[V2] 开始多Agent协作分析，数据量: ${data.length}`);

    try {
      // 使用协调器执行完整的分析流程
      const result = await this.coordinator.process(data, {
        keywords,
        ...options
      });

      // 格式化最终报告
      return this.formatReport(result);

    } catch (error) {
      logger.error('[V2] 多Agent协作分析失败:', error);
      throw error;
    }
  }

  formatReport(result) {
    return {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      analysisType: 'multi-agent-collaboration',

      // 事件经过（整合后）
      eventNarrative: result.eventNarrative,

      // 客观事实
      facts: result.objectiveFacts,

      // 情绪分析
      emotion: result.emotionAnalysis,

      // 传播分析
      propagation: result.propagationFeatures,

      // 风险研判
      risk: result.riskAssessment,

      // 综合洞察
      insights: result.keyInsights,

      // 建议措施
      recommendations: result.recommendations,

      // 元数据
      metadata: {
        totalRounds: result.totalRounds,
        iterationCount: result.iterationCount,
        overallConfidence: result.metadata?.overallConfidence,
        analysisDuration: result.metadata?.analysisDuration
      }
    };
  }
}

module.exports = V2AnalysisEngine;
