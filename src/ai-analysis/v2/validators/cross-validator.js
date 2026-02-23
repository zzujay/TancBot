/**
 * 交叉校验智能体 (Cross Validator)
 * 对各专业智能体的分析结果进行交叉验证，识别矛盾、偏差和错误
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class CrossValidator extends BaseAgentV2 {
  constructor() {
    super(
      '交叉校验智能体',
      '对各专业智能体的分析结果进行交叉验证，识别矛盾、偏差和错误',
      'validator'
    );
    this.validationRules = [
      'fact_emotion_consistency',    // 事实与情绪一致性
      'risk_propagation_alignment',  // 风险与传播匹配性
      'timeline_logic',              // 时间线逻辑
      'confidence_threshold'         // 置信度阈值
    ];
  }

  async process(specialistResults, context = {}) {
    logger.info('[V2] 交叉校验智能体开始校验');
    this.updateLastUsed();

    try {
      const conflicts = [];
      const gaps = [];
      const inconsistencies = [];

      // 1. 校验事实与情绪的一致性
      const factEmotionCheck = this.validateFactEmotionConsistency(specialistResults);
      if (factEmotionCheck.conflicts.length > 0) {
        conflicts.push(...factEmotionCheck.conflicts);
      }

      // 2. 校验风险与传播的匹配性
      const riskPropagationCheck = this.validateRiskPropagationAlignment(specialistResults);
      if (riskPropagationCheck.conflicts.length > 0) {
        conflicts.push(...riskPropagationCheck.conflicts);
      }

      // 3. 校验时间线逻辑
      const timelineCheck = this.validateTimelineLogic(specialistResults);
      if (timelineCheck.inconsistencies.length > 0) {
        inconsistencies.push(...timelineCheck.inconsistencies);
      }

      // 4. 识别信息缺口
      const gapAnalysis = this.identifyInformationGaps(specialistResults);
      if (gapAnalysis.gaps.length > 0) {
        gaps.push(...gapAnalysis.gaps);
      }

      // 5. 计算整体质量
      const overallQuality = this.calculateOverallQuality(
        conflicts, gaps, inconsistencies, specialistResults
      );

      const result = {
        conflicts,
        gaps,
        inconsistencies,
        overallQuality,
        summary: {
          conflictCount: conflicts.length,
          gapCount: gaps.length,
          inconsistencyCount: inconsistencies.length,
          needIteration: conflicts.length >= 3 || gaps.length >= 2
        },
        detailedReport: this.generateValidationReport(conflicts, gaps, inconsistencies)
      };

      logger.info(`[V2] 交叉校验完成: ${conflicts.length}个矛盾, ${gaps.length}个缺口`);
      return result;

    } catch (error) {
      logger.error('[V2] 交叉校验失败:', error);
      throw error;
    }
  }

  /**
   * 校验事实与情绪的一致性
   */
  validateFactEmotionConsistency(specialistResults) {
    const conflicts = [];

    const factAgent = specialistResults.get('事实梳理智能体');
    const emotionAgent = specialistResults.get('情绪态度分析智能体');

    if (!factAgent?.success || !emotionAgent?.success) {
      return { conflicts };
    }

    const facts = factAgent.result;
    const emotions = emotionAgent.result;

    // 检查：如果事实严重缺失，但情绪非常负面，可能存在信息偏差
    if (facts.gaps?.length >= 3 && emotions.emotionAnalysis?.dominantEmotion === 'angry') {
      conflicts.push({
        type: 'fact_emotion_mismatch',
        severity: 'high',
        description: '事实缺口较多但情绪极度负面，可能存在情绪化传播',
        agentA: { name: '事实梳理智能体', confidence: facts.confidence },
        agentB: { name: '情绪态度分析智能体', confidence: emotions.confidence },
        suggestion: '建议补充事实信息后再评估情绪'
      });
    }

    // 检查：如果事实清晰但情绪混乱，可能存在认知分歧
    if (facts.gaps?.length === 0 && emotions.emotionAnalysis?.distribution) {
      const distribution = emotions.emotionAnalysis.distribution;
      const hasBalancedEmotions = Object.values(distribution)
        .filter(e => parseFloat(e.percentage) > 20).length >= 3;
      
      if (hasBalancedEmotions) {
        conflicts.push({
          type: 'fact_emotion_divergence',
          severity: 'medium',
          description: '事实清晰但情绪分歧较大，公众对同一事实有不同解读',
          agentA: { name: '事实梳理智能体', confidence: facts.confidence },
          agentB: { name: '情绪态度分析智能体', confidence: emotions.confidence },
          suggestion: '需要深入分析不同群体的立场差异'
        });
      }
    }

    return { conflicts };
  }

  /**
   * 校验风险与传播的匹配性
   */
  validateRiskPropagationAlignment(specialistResults) {
    const conflicts = [];

    const riskAgent = specialistResults.get('风险影响研判智能体');
    const propagationAgent = specialistResults.get('传播路径分析智能体');

    if (!riskAgent?.success || !propagationAgent?.success) {
      return { conflicts };
    }

    const risks = riskAgent.result;
    const propagation = propagationAgent.result;

    // 检查：风险等级高但传播范围小
    if (risks.riskAssessment?.overallLevel === 'high' || 
        risks.riskAssessment?.overallLevel === 'critical') {
      if (propagation.propagationMetrics?.coverage === 'limited') {
        conflicts.push({
          type: 'risk_propagation_mismatch',
          severity: 'medium',
          description: '风险等级高但传播范围有限，可能存在误判',
          agentA: { name: '风险影响研判智能体', confidence: risks.confidence },
          agentB: { name: '传播路径分析智能体', confidence: propagation.confidence },
          suggestion: '重新评估风险等级或检查传播数据完整性'
        });
      }
    }

    // 检查：传播范围广但风险等级低
    if (propagation.propagationMetrics?.coverage === 'wide' &&
        risks.riskAssessment?.overallLevel === 'low') {
      conflicts.push({
        type: 'propagation_risk_gap',
        severity: 'low',
        description: '传播范围广泛但风险等级低，可能遗漏风险信号',
        agentA: { name: '传播路径分析智能体', confidence: propagation.confidence },
        agentB: { name: '风险影响研判智能体', confidence: risks.confidence },
        suggestion: '建议重新扫描风险信号'
      });
    }

    // 检查：传播速度快但趋势平稳
    if (parseFloat(propagation.propagationMetrics?.speed) > 10 &&
        risks.trendPrediction?.currentTrend === 'stable') {
      conflicts.push({
        type: 'speed_trend_inconsistency',
        severity: 'medium',
        description: '传播速度快但趋势判断为平稳，可能存在滞后判断',
        agentA: { name: '传播路径分析智能体', confidence: propagation.confidence },
        agentB: { name: '风险影响研判智能体', confidence: risks.confidence },
        suggestion: '建议重新评估发展趋势'
      });
    }

    return { conflicts };
  }

  /**
   * 校验时间线逻辑
   */
  validateTimelineLogic(specialistResults) {
    const inconsistencies = [];

    const factAgent = specialistResults.get('事实梳理智能体');
    const emotionAgent = specialistResults.get('情绪态度分析智能体');

    if (!factAgent?.success || !emotionAgent?.success) {
      return { inconsistencies };
    }

    const facts = factAgent.result;
    const emotions = emotionAgent.result;

    // 检查时间线有效性
    if (facts.timelineValidation && !facts.timelineValidation.isValid) {
      inconsistencies.push({
        type: 'timeline_logic_error',
        severity: 'high',
        description: '时间线逻辑存在问题',
        details: facts.timelineValidation.issues,
        affectedAgents: ['事实梳理智能体']
      });
    }

    // 检查情绪演变与时间线的匹配
    if (emotions.emotionEvolution) {
      const stages = Object.entries(emotions.emotionEvolution);
      for (let i = 1; i < stages.length; i++) {
        const [currName, currStage] = stages[i];
        const [prevName, prevStage] = stages[i - 1];
        
        // 检查情绪跳变是否合理
        if (this.isAbruptChange(prevStage.dominantEmotion, currStage.dominantEmotion)) {
          inconsistencies.push({
            type: 'emotion_evolution_abrupt',
            severity: 'medium',
            description: `${prevName}到${currName}情绪发生剧烈变化，需核实是否有重大事件`,
            from: prevStage.dominantEmotion,
            to: currStage.dominantEmotion,
            affectedAgents: ['情绪态度分析智能体']
          });
        }
      }
    }

    return { inconsistencies };
  }

  /**
   * 判断情绪变化是否剧烈
   */
  isAbruptChange(from, to) {
    const oppositePairs = [
      ['angry', 'positive'],
      ['positive', 'angry'],
      ['anxious', 'positive'],
      ['positive', 'anxious']
    ];
    
    return oppositePairs.some(pair => 
      (pair[0] === from && pair[1] === to)
    );
  }

  /**
   * 识别信息缺口
   */
  identifyInformationGaps(specialistResults) {
    const gaps = [];

    // 检查各Agent的置信度
    specialistResults.forEach((result, agentName) => {
      if (!result.success) {
        gaps.push({
          type: 'agent_failure',
          severity: 'high',
          description: `${agentName}分析失败，该维度信息缺失`,
          agent: agentName,
          error: result.error
        });
        return;
      }

      if (result.confidence < 0.5) {
        gaps.push({
          type: 'low_confidence',
          severity: 'medium',
          description: `${agentName}置信度较低(${result.confidence.toFixed(2)})，分析结果可靠性存疑`,
          agent: agentName,
          confidence: result.confidence
        });
      }
    });

    // 检查事实缺口
    const factAgent = specialistResults.get('事实梳理智能体');
    if (factAgent?.success && factAgent.result?.gaps) {
      factAgent.result.gaps.forEach(gap => {
        gaps.push({
          type: 'fact_gap',
          severity: gap.severity,
          description: gap.description,
          category: gap.type,
          source: '事实梳理智能体'
        });
      });
    }

    return { gaps };
  }

  /**
   * 计算整体质量
   */
  calculateOverallQuality(conflicts, gaps, inconsistencies, specialistResults) {
    let score = 1.0;

    // 根据问题数量扣减
    score -= conflicts.length * 0.1;
    score -= gaps.filter(g => g.severity === 'high').length * 0.15;
    score -= gaps.filter(g => g.severity === 'medium').length * 0.08;
    score -= inconsistencies.length * 0.05;

    // 根据Agent成功率调整
    let successCount = 0;
    specialistResults.forEach(result => {
      if (result.success) successCount++;
    });
    const successRate = specialistResults.size > 0 ? 
      successCount / specialistResults.size : 0;
    score = score * (0.5 + 0.5 * successRate);

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 生成校验报告
   */
  generateValidationReport(conflicts, gaps, inconsistencies) {
    return {
      validationTime: new Date().toISOString(),
      summary: {
        totalIssues: conflicts.length + gaps.length + inconsistencies.length,
        criticalIssues: conflicts.filter(c => c.severity === 'high').length +
                       gaps.filter(g => g.severity === 'high').length,
        warnings: conflicts.filter(c => c.severity === 'medium').length +
                 gaps.filter(g => g.severity === 'medium').length +
                 inconsistencies.length
      },
      conflictDetails: conflicts,
      gapDetails: gaps,
      inconsistencyDetails: inconsistencies,
      recommendations: this.generateValidationRecommendations(conflicts, gaps)
    };
  }

  /**
   * 生成校验建议
   */
  generateValidationRecommendations(conflicts, gaps) {
    const recommendations = [];

    if (conflicts.length > 0) {
      recommendations.push('存在Agent间结论冲突，建议启动迭代分析解决矛盾');
    }

    const highSeverityGaps = gaps.filter(g => g.severity === 'high');
    if (highSeverityGaps.length > 0) {
      recommendations.push(`存在${highSeverityGaps.length}个关键信息缺口，建议补充数据后重新分析`);
    }

    const failedAgents = gaps.filter(g => g.type === 'agent_failure');
    if (failedAgents.length > 0) {
      recommendations.push('部分Agent分析失败，建议检查Agent配置或重试');
    }

    if (recommendations.length === 0) {
      recommendations.push('校验通过，各Agent分析结果一致性良好');
    }

    return recommendations;
  }
}

module.exports = CrossValidator;
