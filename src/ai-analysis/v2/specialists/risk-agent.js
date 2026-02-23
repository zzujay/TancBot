/**
 * 风险/影响研判智能体 (Risk Agent)
 * 聚焦"潜在影响"，基于事实和传播特征，分析舆情事件的潜在风险、影响范围和程度
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class RiskAgent extends BaseAgentV2 {
  constructor() {
    super(
      '风险影响研判智能体',
      '聚焦潜在影响，识别风险类型、评估风险等级、预判发展趋势',
      'analyzer'
    );
    this.riskTypes = {
      social: { name: '社会稳定风险', weight: 1.0 },
      reputation: { name: '品牌声誉风险', weight: 0.9 },
      legal: { name: '法律合规风险', weight: 0.95 },
      economic: { name: '经济损失风险', weight: 0.8 },
      political: { name: '政治敏感风险', weight: 1.0 }
    };
  }

  async process(data, context = {}) {
    logger.info(`[V2] 风险影响研判智能体开始分析，数据量: ${data.length}`);
    this.updateLastUsed();

    try {
      // 1. 识别风险类型
      const riskIdentification = this.identifyRisks(data, context);

      // 2. 评估风险等级
      const riskAssessment = this.assessRiskLevels(riskIdentification, data);

      // 3. 预判发展趋势
      const trendPrediction = this.predictTrend(data, context, riskAssessment);

      // 4. 计算置信度
      const confidence = this.calculateConfidence(riskAssessment, trendPrediction);
      this.setConfidence(confidence);

      const result = {
        confidence,
        riskIdentification,
        riskAssessment,
        trendPrediction,
        keyInsights: this.generateInsights(riskAssessment, trendPrediction),
        recommendations: this.generateRecommendations(riskAssessment, trendPrediction)
      };

      this.addToHistory(result);
      logger.info(`[V2] 风险影响研判智能体分析完成，置信度: ${confidence.toFixed(2)}`);

      return result;

    } catch (error) {
      logger.error('[V2] 风险影响研判智能体分析失败:', error);
      throw error;
    }
  }

  /**
   * 识别风险类型
   */
  identifyRisks(data, context) {
    const identifiedRisks = [];

    // 分析每条数据的风险信号
    data.forEach((item, index) => {
      const content = item.content || item.text || '';
      
      // 社会稳定风险信号
      const socialSignals = ['聚集', '抗议', '游行', '示威', '群体性', '集体', '维权', '上访'];
      socialSignals.forEach(signal => {
        if (content.includes(signal)) {
          identifiedRisks.push({
            type: 'social',
            signal,
            content: content.substring(0, 100),
            index,
            severity: 'high'
          });
        }
      });

      // 品牌声誉风险信号
      const reputationSignals = ['质量', '假货', '欺骗', '虚假宣传', '服务态度', '售后', '投诉'];
      reputationSignals.forEach(signal => {
        if (content.includes(signal)) {
          identifiedRisks.push({
            type: 'reputation',
            signal,
            content: content.substring(0, 100),
            index,
            severity: 'medium'
          });
        }
      });

      // 法律合规风险信号
      const legalSignals = ['违法', '违规', '侵权', '犯罪', '造假', '贿赂', '腐败', '贪污'];
      legalSignals.forEach(signal => {
        if (content.includes(signal)) {
          identifiedRisks.push({
            type: 'legal',
            signal,
            content: content.substring(0, 100),
            index,
            severity: 'high'
          });
        }
      });

      // 经济损失风险信号
      const economicSignals = ['亏损', '破产', '裁员', '倒闭', '债务', '赔偿', '罚款'];
      economicSignals.forEach(signal => {
        if (content.includes(signal)) {
          identifiedRisks.push({
            type: 'economic',
            signal,
            content: content.substring(0, 100),
            index,
            severity: 'medium'
          });
        }
      });

      // 政治敏感风险信号
      const politicalSignals = ['政府', '官员', '政策', '体制', '制度', '领导', '部门'];
      politicalSignals.forEach(signal => {
        if (content.includes(signal)) {
          identifiedRisks.push({
            type: 'political',
            signal,
            content: content.substring(0, 100),
            index,
            severity: 'high'
          });
        }
      });
    });

    // 统计各类风险
    const riskSummary = {};
    Object.keys(this.riskTypes).forEach(type => {
      const typeRisks = identifiedRisks.filter(r => r.type === type);
      riskSummary[type] = {
        count: typeRisks.length,
        severity: typeRisks.length > 0 ? Math.max(...typeRisks.map(r => r.severity === 'high' ? 2 : 1)) : 0,
        examples: typeRisks.slice(0, 3)
      };
    });

    return {
      totalSignals: identifiedRisks.length,
      riskSummary,
      allSignals: identifiedRisks
    };
  }

  /**
   * 评估风险等级
   */
  assessRiskLevels(riskIdentification, data) {
    const assessments = {};
    let overallScore = 0;
    let overallLevel = 'low';

    // 计算传播指标
    const totalReposts = data.reduce((sum, item) => sum + (item.reposts || 0), 0);
    const totalComments = data.reduce((sum, item) => sum + (item.comments || 0), 0);
    const totalLikes = data.reduce((sum, item) => sum + (item.likes || 0), 0);
    const totalEngagement = totalReposts + totalComments + totalLikes;
    const uniqueUsers = new Set(data.map(item => item.userId || item.author)).size;

    // 评估每类风险
    Object.entries(riskIdentification.riskSummary).forEach(([type, info]) => {
      if (info.count === 0) {
        assessments[type] = {
          level: 'low',
          score: 0,
          description: `未发现${this.riskTypes[type].name}`
        };
        return;
      }

      // 基础分数（基于风险信号数量）
      let score = Math.min(100, info.count * 10);

      // 根据传播范围调整
      if (uniqueUsers > 1000) score += 15;
      else if (uniqueUsers > 500) score += 10;
      else if (uniqueUsers > 100) score += 5;

      // 根据互动量调整
      if (totalEngagement > 10000) score += 15;
      else if (totalEngagement > 5000) score += 10;
      else if (totalEngagement > 1000) score += 5;

      // 根据严重程度调整
      if (info.severity === 2) score += 10;

      // 加权
      score = score * this.riskTypes[type].weight;
      score = Math.min(100, score);

      // 确定等级
      let level = 'low';
      if (score >= 80) level = 'critical';
      else if (score >= 60) level = 'high';
      else if (score >= 40) level = 'medium';

      assessments[type] = {
        level,
        score: Math.round(score),
        description: `发现${info.count}个${this.riskTypes[type].name}信号`,
        affectedAreas: this.identifyAffectedAreas(type, data),
        examples: info.examples
      };

      // 更新整体风险
      if (score > overallScore) {
        overallScore = score;
        overallLevel = level;
      }
    });

    return {
      overallLevel,
      overallScore: Math.round(overallScore),
      individualRisks: assessments,
      riskDistribution: this.calculateRiskDistribution(assessments)
    };
  }

  /**
   * 识别受影响领域
   */
  identifyAffectedAreas(riskType, data) {
    const areas = new Set();
    
    data.forEach(item => {
      const content = item.content || '';
      
      if (riskType === 'reputation') {
        if (content.includes('产品')) areas.add('产品声誉');
        if (content.includes('服务')) areas.add('服务声誉');
        if (content.includes('品牌')) areas.add('品牌形象');
      } else if (riskType === 'economic') {
        if (content.includes('销售')) areas.add('销售业绩');
        if (content.includes('股价')) areas.add('股价市值');
        if (content.includes('投资')) areas.add('投资者信心');
      }
    });

    return Array.from(areas);
  }

  /**
   * 计算风险分布
   */
  calculateRiskDistribution(assessments) {
    const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
    
    Object.values(assessments).forEach(assessment => {
      distribution[assessment.level]++;
    });

    return distribution;
  }

  /**
   * 预判发展趋势
   */
  predictTrend(data, context, riskAssessment) {
    // 按时间排序
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // 分析近期趋势（最近30%的数据）
    const recentStart = Math.floor(sortedData.length * 0.7);
    const recentData = sortedData.slice(recentStart);
    const earlyData = sortedData.slice(0, Math.floor(sortedData.length * 0.3));

    // 计算近期vs早期的互动变化
    const recentEngagement = recentData.reduce((sum, item) => {
      return sum + (item.reposts || 0) + (item.comments || 0) + (item.likes || 0);
    }, 0);

    const earlyEngagement = earlyData.reduce((sum, item) => {
      return sum + (item.reposts || 0) + (item.comments || 0) + (item.likes || 0);
    }, 0);

    const engagementTrend = earlyEngagement > 0 ? 
      (recentEngagement / earlyEngagement - 1) * 100 : 0;

    // 分析情绪趋势
    const recentNegative = recentData.filter(item => {
      const content = item.content || '';
      return content.includes('愤怒') || content.includes('不满') || content.includes('反对');
    }).length;

    const negativeRatio = recentData.length > 0 ? recentNegative / recentData.length : 0;

    // 判断趋势
    let trend = 'stable';
    let trendDescription = '舆情发展平稳';

    if (engagementTrend > 50 && negativeRatio > 0.5) {
      trend = 'escalating';
      trendDescription = '舆情呈升级趋势，负面情绪占主导';
    } else if (engagementTrend > 20) {
      trend = 'growing';
      trendDescription = '舆情持续发酵，关注度上升';
    } else if (engagementTrend < -30) {
      trend = 'declining';
      trendDescription = '舆情逐渐平息，关注度下降';
    } else if (engagementTrend < -10) {
      trend = 'cooling';
      trendDescription = '舆情降温中';
    }

    // 预测未来走向
    let prediction = '';
    const overallRisk = riskAssessment.overallLevel;
    
    if (overallRisk === 'critical' || overallRisk === 'high') {
      if (trend === 'escalating' || trend === 'growing') {
        prediction = '如不及时干预，舆情可能进一步升级，引发更大范围关注';
      } else {
        prediction = '当前风险较高，需持续关注防止反弹';
      }
    } else if (overallRisk === 'medium') {
      prediction = '舆情可控，但需防范潜在风险点';
    } else {
      prediction = '舆情风险较低，预计将逐步平息';
    }

    return {
      currentTrend: trend,
      trendDescription,
      engagementChange: engagementTrend.toFixed(1) + '%',
      negativeEmotionRatio: (negativeRatio * 100).toFixed(1) + '%',
      prediction,
      suggestedActions: this.suggestActions(trend, overallRisk)
    };
  }

  /**
   * 建议应对措施
   */
  suggestActions(trend, riskLevel) {
    const actions = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      actions.push('立即启动危机公关预案');
      actions.push('成立专项应对小组');
      actions.push('准备官方声明和回应口径');
    }

    if (trend === 'escalating') {
      actions.push('加强舆情监测频率（每小时）');
      actions.push('主动联系关键意见领袖');
      actions.push('准备多渠道回应方案');
    } else if (trend === 'growing') {
      actions.push('密切关注舆情走向');
      actions.push('收集整理事实依据');
      actions.push('评估是否需要主动回应');
    }

    if (actions.length === 0) {
      actions.push('保持常规监测');
      actions.push('做好应对准备');
    }

    return actions;
  }

  /**
   * 计算置信度
   */
  calculateConfidence(riskAssessment, trendPrediction) {
    let score = 0.7;

    // 基于风险识别完整性
    const identifiedRiskTypes = Object.values(riskAssessment.individualRisks)
      .filter(r => r.score > 0).length;
    if (identifiedRiskTypes >= 3) score += 0.1;

    // 基于趋势预测数据支撑
    if (trendPrediction.engagementChange) score += 0.1;

    // 基于整体风险等级清晰度
    if (riskAssessment.overallLevel !== 'low') score += 0.1;

    return Math.min(1, score);
  }

  /**
   * 生成关键洞察
   */
  generateInsights(riskAssessment, trendPrediction) {
    const insights = [];

    // 整体风险洞察
    const overallLevel = riskAssessment.overallLevel;
    const overallScore = riskAssessment.overallScore;
    insights.push(`整体风险等级为${this.translateRiskLevel(overallLevel)}，评分${overallScore}/100`);

    // 主要风险类型洞察
    const highRisks = Object.entries(riskAssessment.individualRisks)
      .filter(([_, r]) => r.level === 'high' || r.level === 'critical')
      .map(([type, _]) => this.riskTypes[type].name);
    
    if (highRisks.length > 0) {
      insights.push(`主要风险类型: ${highRisks.join('、')}`);
    }

    // 趋势洞察
    insights.push(`舆情趋势: ${trendPrediction.trendDescription}`);
    insights.push(`互动量变化: ${trendPrediction.engagementChange}`);

    // 预测洞察
    insights.push(`发展预测: ${trendPrediction.prediction}`);

    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(riskAssessment, trendPrediction) {
    const recommendations = [...trendPrediction.suggestedActions];

    // 基于风险等级的建议
    if (riskAssessment.overallLevel === 'critical') {
      recommendations.push('建议立即上报高层，启动最高级别响应');
    } else if (riskAssessment.overallLevel === 'high') {
      recommendations.push('建议24小时内发布官方回应');
    }

    // 基于趋势的建议
    if (trendPrediction.currentTrend === 'escalating') {
      recommendations.push('建议主动联系核心传播节点，争取舆论转向');
    }

    return recommendations;
  }

  /**
   * 翻译风险等级
   */
  translateRiskLevel(level) {
    const map = {
      critical: '极高',
      high: '高',
      medium: '中',
      low: '低'
    };
    return map[level] || level;
  }

  /**
   * 调整分析策略
   */
  async adjustStrategy(guidance) {
    logger.info('[V2] 风险影响研判智能体调整策略:', guidance);
    
    if (guidance.focusRiskTypes) {
      this.focusRiskTypes = guidance.focusRiskTypes;
    }
    
    if (guidance.adjustThresholds) {
      // 调整风险阈值
      Object.assign(this.riskTypes, guidance.adjustThresholds);
    }
  }
}

module.exports = RiskAgent;
