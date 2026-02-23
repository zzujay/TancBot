/**
 * 研判调度智能体 (Coordinator Agent)
 * 多Agent体系的总指挥，负责任务分发、进度管控、结果汇总、迭代触发、冲突仲裁
 */

const BaseAgentV2 = require('./base-agent-v2');
const logger = require('../../utils/logger');

class CoordinatorAgent extends BaseAgentV2 {
  constructor() {
    super(
      '研判调度智能体',
      '多Agent体系的总指挥，负责任务分发、结果汇总和迭代管理',
      'coordinator'
    );
    this.specialistAgents = new Map();
    this.validatorAgents = new Map();
    this.optimizerAgents = new Map();
    this.publicInfoPool = {}; // 公共信息池
    this.iterationCount = 0;
    this.maxIterations = 3;
    this.conflictThreshold = 3; // 矛盾点阈值
    this.gapThreshold = 2; // 事实缺口阈值
  }

  /**
   * 注册专业分析智能体
   */
  registerSpecialistAgent(agent) {
    this.specialistAgents.set(agent.name, agent);
    logger.info(`[V2] 调度智能体注册专业Agent: ${agent.name}`);
  }

  /**
   * 注册校验智能体
   */
  registerValidatorAgent(agent) {
    this.validatorAgents.set(agent.name, agent);
    logger.info(`[V2] 调度智能体注册校验Agent: ${agent.name}`);
  }

  /**
   * 注册优化智能体
   */
  registerOptimizerAgent(agent) {
    this.optimizerAgents.set(agent.name, agent);
    logger.info(`[V2] 调度智能体注册优化Agent: ${agent.name}`);
  }

  /**
   * 主控流程：接收数据并开始分析流程
   */
  async process(data, context = {}) {
    logger.info('[V2] ========== 研判调度智能体启动分析流程 ==========');
    
    const taskId = `v2_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.publicInfoPool = {
      taskId,
      rawData: data,
      context,
      startTime: new Date(),
      specialistResults: {},
      validationResults: {},
      iterationHistory: []
    };

    try {
      // 第一轮：专业智能体并行分析
      let round = 1;
      let needIteration = true;

      while (needIteration && round <= this.maxIterations) {
        logger.info(`[V2] ========== 第 ${round}/${this.maxIterations} 轮分析 ==========`);
        
        // 1. 分发任务给专业智能体
        const specialistResults = await this.dispatchToSpecialists(data, context, round);
        this.publicInfoPool.specialistResults[round] = specialistResults;

        // 2. 交叉校验
        const validationResult = await this.performCrossValidation(specialistResults, round);
        this.publicInfoPool.validationResults[round] = validationResult;

        // 3. 判断是否需要迭代
        needIteration = this.shouldIterate(validationResult);

        if (needIteration && round < this.maxIterations) {
          // 4. 生成迭代指导方案
          const optimizationGuidance = await this.generateOptimizationGuidance(validationResult, specialistResults);
          
          // 5. 分发迭代指导给专业智能体
          await this.distributeOptimizationGuidance(optimizationGuidance);
          
          // 记录迭代历史
          this.publicInfoPool.iterationHistory.push({
            round,
            specialistResults,
            validationResult,
            optimizationGuidance
          });
        }

        round++;
      }

      // 生成最终研判报告
      const finalReport = await this.generateFinalReport();
      
      logger.info('[V2] ========== 研判调度智能体分析流程完成 ==========');
      return finalReport;

    } catch (error) {
      logger.error('[V2] 研判调度智能体分析流程失败:', error);
      throw error;
    }
  }

  /**
   * 分发任务给专业智能体（并行执行）
   * 注意：事件经过整合智能体在其他Agent完成后执行
   */
  async dispatchToSpecialists(data, context, round) {
    logger.info(`[V2] 调度智能体分发任务给 ${this.specialistAgents.size} 个专业Agent`);

    // 分离基础分析Agent和整合Agent
    const baseAgents = [];
    const integrationAgents = [];
    
    for (const [name, agent] of this.specialistAgents) {
      if (name.includes('事件经过整合')) {
        integrationAgents.push({ name, agent });
      } else {
        baseAgents.push({ name, agent });
      }
    }

    // 第一步：并行执行基础分析Agent
    const basePromises = baseAgents.map(({ name, agent }) => {
      return agent.process(data, {
        ...context,
        round,
        publicInfoPool: this.publicInfoPool,
        priority: this.getAgentPriority(name)
      }).then(result => ({
        agentName: name,
        success: true,
        result,
        confidence: result.confidence || 0
      })).catch(error => {
        logger.error(`[V2] ${name} 分析失败:`, error.message);
        return {
          agentName: name,
          success: false,
          error: error.message,
          confidence: 0
        };
      });
    });

    const baseResults = await Promise.all(basePromises);
    
    // 将基础结果存入公共信息池
    baseResults.forEach(r => {
      if (!this.publicInfoPool.specialistResults[round]) {
        this.publicInfoPool.specialistResults[round] = new Map();
      }
      this.publicInfoPool.specialistResults[round].set(r.agentName, r);
    });

    // 第二步：执行整合Agent（依赖基础Agent的结果）
    const integrationPromises = integrationAgents.map(({ name, agent }) => {
      return agent.process(data, {
        ...context,
        round,
        publicInfoPool: this.publicInfoPool,
        priority: this.getAgentPriority(name)
      }).then(result => ({
        agentName: name,
        success: true,
        result,
        confidence: result.confidence || 0
      })).catch(error => {
        logger.error(`[V2] ${name} 整合失败:`, error.message);
        return {
          agentName: name,
          success: false,
          error: error.message,
          confidence: 0
        };
      });
    });

    const integrationResults = await Promise.all(integrationPromises);

    // 合并所有结果
    const allResults = [...baseResults, ...integrationResults];
    
    // 转换为Map便于后续处理
    const resultMap = new Map();
    allResults.forEach(r => resultMap.set(r.agentName, r));
    
    return resultMap;
  }

  /**
   * 获取Agent优先级（事实梳理Agent优先级最高，事件经过整合次之）
   */
  getAgentPriority(agentName) {
    if (agentName.includes('事实梳理')) return 1;
    if (agentName.includes('事件经过整合')) return 2;
    if (agentName.includes('情绪')) return 3;
    if (agentName.includes('传播')) return 4;
    if (agentName.includes('风险')) return 5;
    return 6;
  }

  /**
   * 执行交叉校验
   */
  async performCrossValidation(specialistResults, round) {
    logger.info('[V2] 调度智能体启动交叉校验');
    
    const validationPromises = [];
    
    for (const [name, validator] of this.validatorAgents) {
      const promise = validator.process(specialistResults, {
        round,
        publicInfoPool: this.publicInfoPool
      });
      validationPromises.push(promise);
    }

    const validationResults = await Promise.all(validationPromises);
    
    // 整合校验结果
    const consolidatedValidation = {
      round,
      timestamp: new Date(),
      conflicts: [],
      gaps: [],
      inconsistencies: [],
      overallQuality: 0,
      needIteration: false
    };

    validationResults.forEach(result => {
      if (result.conflicts) consolidatedValidation.conflicts.push(...result.conflicts);
      if (result.gaps) consolidatedValidation.gaps.push(...result.gaps);
      if (result.inconsistencies) consolidatedValidation.inconsistencies.push(...result.inconsistencies);
    });

    // 计算整体质量分数
    const totalIssues = consolidatedValidation.conflicts.length + 
                       consolidatedValidation.gaps.length + 
                       consolidatedValidation.inconsistencies.length;
    consolidatedValidation.overallQuality = Math.max(0, 1 - (totalIssues * 0.1));
    
    logger.info(`[V2] 交叉校验完成: ${consolidatedValidation.conflicts.length}个矛盾, ${consolidatedValidation.gaps.length}个缺口`);
    
    return consolidatedValidation;
  }

  /**
   * 判断是否需要迭代
   */
  shouldIterate(validationResult) {
    const { conflicts, gaps, overallQuality } = validationResult;
    
    // 触发条件：
    // 1. 矛盾点≥阈值
    // 2. 核心事实缺口≥阈值
    // 3. 整体质量分数低于0.6
    const needIterate = conflicts.length >= this.conflictThreshold ||
                       gaps.length >= this.gapThreshold ||
                       overallQuality < 0.6;
    
    if (needIterate) {
      logger.info(`[V2] 触发迭代: 矛盾=${conflicts.length}, 缺口=${gaps.length}, 质量=${overallQuality.toFixed(2)}`);
    } else {
      logger.info(`[V2] 无需迭代: 质量=${overallQuality.toFixed(2)}`);
    }
    
    return needIterate;
  }

  /**
   * 生成迭代优化指导方案
   */
  async generateOptimizationGuidance(validationResult, specialistResults) {
    logger.info('[V2] 调度智能体生成迭代优化指导方案');
    
    const guidancePromises = [];
    
    for (const [name, optimizer] of this.optimizerAgents) {
      const promise = optimizer.process({
        validationResult,
        specialistResults
      }, {
        publicInfoPool: this.publicInfoPool
      });
      guidancePromises.push(promise);
    }

    const guidanceResults = await Promise.all(guidancePromises);
    
    // 整合所有优化指导
    const consolidatedGuidance = {
      timestamp: new Date(),
      targetAgents: {},
      globalAdjustments: {}
    };

    guidanceResults.forEach(guidance => {
      if (guidance.targetAgents) {
        Object.assign(consolidatedGuidance.targetAgents, guidance.targetAgents);
      }
      if (guidance.globalAdjustments) {
        Object.assign(consolidatedGuidance.globalAdjustments, guidance.globalAdjustments);
      }
    });

    return consolidatedGuidance;
  }

  /**
   * 分发迭代指导给专业智能体
   */
  async distributeOptimizationGuidance(guidance) {
    logger.info('[V2] 调度智能体分发迭代指导方案');
    
    const promises = [];
    
    for (const [agentName, agentGuidance] of Object.entries(guidance.targetAgents)) {
      const agent = this.specialistAgents.get(agentName);
      if (agent && agent.adjustStrategy) {
        promises.push(agent.adjustStrategy(agentGuidance));
      }
    }

    await Promise.all(promises);
  }

  /**
   * 仲裁冲突（当交叉校验后仍存在无法调和的冲突时）
   */
  arbitrateConflicts(conflicts) {
    logger.info(`[V2] 调度智能体执行冲突仲裁: ${conflicts.length}个冲突`);
    
    const arbitrationResults = conflicts.map(conflict => {
      // 仲裁原则：事实优先、数据支撑
      if (conflict.type === 'fact_emotion_mismatch') {
        // 事实与情绪不匹配，以事实为准
        return {
          ...conflict,
          resolution: 'fact_priority',
          winner: '事实梳理智能体',
          reason: '事实优先原则'
        };
      }
      
      if (conflict.type === 'risk_propagation_mismatch') {
        // 风险与传播不匹配，以传播数据为准
        return {
          ...conflict,
          resolution: 'data_priority',
          winner: '传播路径分析智能体',
          reason: '数据支撑原则'
        };
      }
      
      // 默认：置信度高的胜出
      const winner = conflict.agentA.confidence > conflict.agentB.confidence ? 
                    conflict.agentA.name : conflict.agentB.name;
      
      return {
        ...conflict,
        resolution: 'confidence_priority',
        winner,
        reason: '置信度优先原则'
      };
    });

    return arbitrationResults;
  }

  /**
   * 生成最终研判报告
   */
  async generateFinalReport() {
    logger.info('[V2] 调度智能体生成最终研判报告');
    
    const { specialistResults, validationResults, iterationHistory } = this.publicInfoPool;
    
    // 获取最后一轮的结果
    const lastRound = Math.max(...Object.keys(specialistResults).map(Number));
    const finalSpecialistResults = specialistResults[lastRound];
    
    // 整合各智能体结果
    const report = {
      taskId: this.publicInfoPool.taskId,
      timestamp: new Date(),
      totalRounds: lastRound,
      iterationCount: iterationHistory.length,

      // 事件经过（整合后）
      eventNarrative: this.extractEventNarrative(finalSpecialistResults),

      // 客观事实清单
      objectiveFacts: this.extractObjectiveFacts(finalSpecialistResults),

      // 情绪/立场分析
      emotionAnalysis: this.extractEmotionAnalysis(finalSpecialistResults),

      // 传播特征
      propagationFeatures: this.extractPropagationFeatures(finalSpecialistResults),

      // 风险研判
      riskAssessment: this.extractRiskAssessment(finalSpecialistResults),

      // 关键洞察
      keyInsights: this.generateKeyInsights(finalSpecialistResults),

      // 建议措施
      recommendations: this.generateRecommendations(finalSpecialistResults),

      // 元数据
      metadata: {
        agentCount: this.specialistAgents.size,
        validationRounds: Object.keys(validationResults).length,
        overallConfidence: this.calculateOverallConfidence(finalSpecialistResults),
        analysisDuration: Date.now() - this.publicInfoPool.startTime.getTime()
      }
    };

    return report;
  }

  // 提取各维度结果的方法
  extractEventNarrative(results) {
    const narrativeAgent = results.get('事件经过整合智能体');
    return narrativeAgent?.success ? narrativeAgent.result : null;
  }

  extractObjectiveFacts(results) {
    const factAgent = results.get('事实梳理智能体');
    return factAgent?.success ? factAgent.result : null;
  }

  extractEmotionAnalysis(results) {
    const emotionAgent = results.get('情绪态度分析智能体');
    return emotionAgent?.success ? emotionAgent.result : null;
  }

  extractPropagationFeatures(results) {
    const propagationAgent = results.get('传播路径分析智能体');
    return propagationAgent?.success ? propagationAgent.result : null;
  }

  extractRiskAssessment(results) {
    const riskAgent = results.get('风险影响研判智能体');
    return riskAgent?.success ? riskAgent.result : null;
  }

  generateKeyInsights(results) {
    const insights = [];
    results.forEach((result, name) => {
      if (result.success && result.result?.keyInsights) {
        insights.push(...result.result.keyInsights);
      }
    });
    return [...new Set(insights)]; // 去重
  }

  generateRecommendations(results) {
    const recommendations = [];
    results.forEach((result, name) => {
      if (result.success && result.result?.recommendations) {
        recommendations.push(...result.result.recommendations);
      }
    });
    return [...new Set(recommendations)]; // 去重
  }

  calculateOverallConfidence(results) {
    let totalConfidence = 0;
    let count = 0;
    results.forEach(result => {
      if (result.success) {
        totalConfidence += result.confidence;
        count++;
      }
    });
    return count > 0 ? totalConfidence / count : 0;
  }
}

module.exports = CoordinatorAgent;
