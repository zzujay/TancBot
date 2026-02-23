/**
 * 迭代优化智能体 (Iteration Optimizer)
 * 针对校验出的问题或调度智能体提出的迭代需求，指导专业智能体重做/补充分析
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class IterationOptimizer extends BaseAgentV2 {
  constructor() {
    super(
      '迭代优化智能体',
      '针对校验问题制定迭代方案，指导专业智能体补充/修正分析',
      'optimizer'
    );
    this.maxIterations = 3;
    this.iterationStrategies = {
      fact_gap: this.optimizeFactGap.bind(this),
      emotion_deviation: this.optimizeEmotionDeviation.bind(this),
      risk_underestimation: this.optimizeRiskUnderestimation.bind(this),
      low_confidence: this.optimizeLowConfidence.bind(this),
      agent_failure: this.optimizeAgentFailure.bind(this)
    };
  }

  async process(validationResult, context = {}) {
    logger.info('[V2] 迭代优化智能体开始制定优化方案');
    this.updateLastUsed();

    try {
      const { validationResult: validation, specialistResults } = validationResult;
      const currentRound = context.round || 1;

      if (currentRound >= this.maxIterations) {
        logger.info('[V2] 已达到最大迭代次数，停止迭代');
        return {
          shouldStop: true,
          reason: 'max_iterations_reached',
          guidance: {}
        };
      }

      // 分析校验结果，确定优化策略
      const optimizationPlan = this.analyzeAndPlan(validation, specialistResults);

      // 生成针对各Agent的具体指导
      const targetGuidance = this.generateTargetGuidance(optimizationPlan, specialistResults);

      // 生成全局调整建议
      const globalAdjustments = this.generateGlobalAdjustments(validation);

      const result = {
        shouldStop: false,
        currentRound,
        nextRound: currentRound + 1,
        optimizationPlan,
        targetGuidance,
        globalAdjustments,
        estimatedImprovement: this.estimateImprovement(optimizationPlan),
        iterationStrategy: this.selectIterationStrategy(validation)
      };

      logger.info(`[V2] 迭代优化方案制定完成，第${currentRound + 1}轮迭代`);
      return result;

    } catch (error) {
      logger.error('[V2] 迭代优化方案制定失败:', error);
      throw error;
    }
  }

  /**
   * 分析校验结果并制定优化计划
   */
  analyzeAndPlan(validation, specialistResults) {
    const plan = {
      priority: [],
      focus: [],
      adjustments: []
    };

    // 处理矛盾冲突
    if (validation.conflicts && validation.conflicts.length > 0) {
      validation.conflicts.forEach(conflict => {
        plan.priority.push({
          type: 'resolve_conflict',
          target: [conflict.agentA.name, conflict.agentB.name],
          issue: conflict.type,
          severity: conflict.severity,
          suggestion: conflict.suggestion
        });
      });
    }

    // 处理信息缺口
    if (validation.gaps && validation.gaps.length > 0) {
      validation.gaps.forEach(gap => {
        if (gap.type === 'fact_gap') {
          plan.focus.push({
            type: 'fill_fact_gap',
            target: '事实梳理智能体',
            category: gap.category,
            description: gap.description
          });
        } else if (gap.type === 'low_confidence') {
          plan.adjustments.push({
            type: 'improve_confidence',
            target: gap.agent,
            currentConfidence: gap.confidence
          });
        }
      });
    }

    // 处理不一致性
    if (validation.inconsistencies && validation.inconsistencies.length > 0) {
      validation.inconsistencies.forEach(inc => {
        plan.adjustments.push({
          type: 'fix_inconsistency',
          target: inc.affectedAgents,
          issue: inc.type,
          description: inc.description
        });
      });
    }

    return plan;
  }

  /**
   * 生成针对各Agent的具体指导
   */
  generateTargetGuidance(plan, specialistResults) {
    const guidance = {};

    // 事实梳理智能体指导
    const factGuidance = this.generateFactAgentGuidance(plan);
    if (factGuidance) {
      guidance['事实梳理智能体'] = factGuidance;
    }

    // 情绪态度分析智能体指导
    const emotionGuidance = this.generateEmotionAgentGuidance(plan, specialistResults);
    if (emotionGuidance) {
      guidance['情绪态度分析智能体'] = emotionGuidance;
    }

    // 传播路径分析智能体指导
    const propagationGuidance = this.generatePropagationAgentGuidance(plan);
    if (propagationGuidance) {
      guidance['传播路径分析智能体'] = propagationGuidance;
    }

    // 风险影响研判智能体指导
    const riskGuidance = this.generateRiskAgentGuidance(plan, specialistResults);
    if (riskGuidance) {
      guidance['风险影响研判智能体'] = riskGuidance;
    }

    return guidance;
  }

  /**
   * 生成事实梳理智能体的指导
   */
  generateFactAgentGuidance(plan) {
    const focusItems = plan.focus.filter(f => f.target === '事实梳理智能体');
    
    if (focusItems.length === 0) return null;

    return {
      action: 'deepen_analysis',
      focus: focusItems.map(f => f.category),
      specificRequirements: focusItems.map(f => ({
        category: f.category,
        task: f.description
      })),
      depth: 'detailed',
      priority: 'high'
    };
  }

  /**
   * 生成情绪态度分析智能体的指导
   */
  generateEmotionAgentGuidance(plan, specialistResults) {
    const conflictItems = plan.priority.filter(p => 
      p.target.includes('情绪态度分析智能体') && p.type === 'resolve_conflict'
    );

    if (conflictItems.length === 0) return null;

    // 获取上一轮的情绪分析结果
    const emotionResult = specialistResults.get('情绪态度分析智能体');
    const dominantEmotion = emotionResult?.result?.emotionAnalysis?.dominantEmotion;

    return {
      action: 'refine_analysis',
      focus: ['emotion_validation', 'stance_verification'],
      specificRequirements: conflictItems.map(c => ({
        issue: c.issue,
        suggestion: c.suggestion
      })),
      context: {
        previousDominantEmotion: dominantEmotion,
        needVerification: true
      },
      depth: 'granular',
      priority: 'high'
    };
  }

  /**
   * 生成传播路径分析智能体的指导
   */
  generatePropagationAgentGuidance(plan) {
    const conflictItems = plan.priority.filter(p => 
      p.target.includes('传播路径分析智能体') && p.type === 'resolve_conflict'
    );

    if (conflictItems.length === 0) return null;

    return {
      action: 'verify_metrics',
      focus: ['speed_validation', 'coverage_verification'],
      specificRequirements: conflictItems.map(c => ({
        issue: c.issue,
        suggestion: c.suggestion
      })),
      depth: 'detailed',
      priority: 'medium'
    };
  }

  /**
   * 生成风险影响研判智能体的指导
   */
  generateRiskAgentGuidance(plan, specialistResults) {
    const conflictItems = plan.priority.filter(p => 
      p.target.includes('风险影响研判智能体') && p.type === 'resolve_conflict'
    );

    const adjustmentItems = plan.adjustments.filter(a => 
      a.target.includes('风险影响研判智能体')
    );

    if (conflictItems.length === 0 && adjustmentItems.length === 0) return null;

    return {
      action: 'reassess_risk',
      focus: ['risk_validation', 'trend_reverification'],
      specificRequirements: [
        ...conflictItems.map(c => ({
          issue: c.issue,
          suggestion: c.suggestion
        })),
        ...adjustmentItems.map(a => ({
          issue: a.type,
          description: a.description
        }))
      ],
      depth: 'comprehensive',
      priority: 'high'
    };
  }

  /**
   * 生成全局调整建议
   */
  generateGlobalAdjustments(validation) {
    const adjustments = {
      dataRequirements: [],
      analysisParameters: {},
      qualityThresholds: {}
    };

    // 根据校验结果调整数据需求
    if (validation.gaps) {
      const factGaps = validation.gaps.filter(g => g.type === 'fact_gap');
      if (factGaps.length > 0) {
        adjustments.dataRequirements.push({
          type: 'supplement_facts',
          priority: 'high',
          categories: factGaps.map(g => g.category)
        });
      }
    }

    // 调整分析参数
    if (validation.overallQuality < 0.5) {
      adjustments.analysisParameters = {
        increaseGranularity: true,
        enableDeepAnalysis: true,
        crossReferenceEnabled: true
      };
    }

    // 调整质量阈值
    adjustments.qualityThresholds = {
      minConfidence: 0.6,
      maxConflicts: 2,
      requiredFactCoverage: 0.8
    };

    return adjustments;
  }

  /**
   * 估算改进效果
   */
  estimateImprovement(plan) {
    let estimatedImprovement = 0;

    // 解决矛盾带来的改进
    const conflictCount = plan.priority.filter(p => p.type === 'resolve_conflict').length;
    estimatedImprovement += conflictCount * 0.15;

    // 填补缺口带来的改进
    const gapCount = plan.focus.filter(f => f.type === 'fill_fact_gap').length;
    estimatedImprovement += gapCount * 0.1;

    // 提升置信度带来的改进
    const confidenceCount = plan.adjustments.filter(a => a.type === 'improve_confidence').length;
    estimatedImprovement += confidenceCount * 0.08;

    return Math.min(0.5, estimatedImprovement);
  }

  /**
   * 选择迭代策略
   */
  selectIterationStrategy(validation) {
    const hasCriticalConflicts = validation.conflicts?.some(c => c.severity === 'high');
    const hasCriticalGaps = validation.gaps?.some(g => g.severity === 'high');

    if (hasCriticalConflicts) {
      return 'conflict_resolution_priority';
    } else if (hasCriticalGaps) {
      return 'gap_filling_priority';
    } else if (validation.overallQuality < 0.6) {
      return 'quality_improvement';
    } else {
      return 'fine_tuning';
    }
  }

  // ========== 具体优化策略实现 ==========

  /**
   * 优化事实缺口
   */
  optimizeFactGap(gap) {
    return {
      targetAgent: '事实梳理智能体',
      action: 'deep_extraction',
      parameters: {
        focusCategory: gap.category,
        extractionDepth: 'detailed',
        verificationRequired: true
      },
      expectedOutcome: `补充${gap.category}类事实信息`
    };
  }

  /**
   * 优化情绪偏差
   */
  optimizeEmotionDeviation(conflict) {
    return {
      targetAgent: '情绪态度分析智能体',
      action: 'recalibrate_analysis',
      parameters: {
        validationSource: '事实梳理智能体',
        recalibrationMethod: 'fact_based_adjustment'
      },
      expectedOutcome: '情绪分析与事实保持一致'
    };
  }

  /**
   * 优化风险评估不足
   */
  optimizeRiskUnderestimation(conflict) {
    return {
      targetAgent: '风险影响研判智能体',
      action: 'reassess_with_propagation',
      parameters: {
        additionalDataSource: '传播路径分析智能体',
        reassessmentScope: 'comprehensive'
      },
      expectedOutcome: '风险等级与传播范围匹配'
    };
  }

  /**
   * 优化低置信度
   */
  optimizeLowConfidence(gap) {
    return {
      targetAgent: gap.agent,
      action: 'enhance_analysis',
      parameters: {
        confidenceBoostStrategy: 'cross_validation',
        additionalFeatures: true
      },
      expectedOutcome: `提升${gap.agent}的置信度至0.6以上`
    };
  }

  /**
   * 优化Agent失败
   */
  optimizeAgentFailure(gap) {
    return {
      targetAgent: gap.agent,
      action: 'retry_with_fallback',
      parameters: {
        retryCount: 2,
        fallbackStrategy: 'simplified_analysis'
      },
      expectedOutcome: `${gap.agent}成功完成分析`
    };
  }
}

module.exports = IterationOptimizer;
