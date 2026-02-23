/**
 * 风险/影响研判智能体 (Risk Agent)
 * 基于LLM的风险研判，分析舆情事件的潜在风险和影响
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class RiskAgent extends BaseAgentV2 {
  constructor() {
    super(
      '风险影响研判智能体',
      '基于LLM分析潜在风险、影响范围和应对建议',
      'analyzer'
    );
    this.llmClient = null;
  }

  async initialize() {
    const LLMClient = require('../../../services/llm-client');
    this.llmClient = LLMClient;
    // 确保LLMClient已初始化
    if (!this.llmClient.client) {
      await this.llmClient.initialize();
    }
  }

  async process(data, context = {}) {
    logger.info(`[V2] 风险影响研判智能体开始分析，数据量: ${data.length}`);
    this.updateLastUsed();

    try {
      if (!this.llmClient) {
        await this.initialize();
      }

      // 1. 使用LLM识别风险信号
      const riskSignals = await this.identifyRiskSignalsWithLLM(data);

      // 2. 使用LLM评估风险等级
      const riskAssessment = await this.assessRiskLevelWithLLM(data, riskSignals);

      // 3. 使用LLM分析影响范围
      const impactAnalysis = await this.analyzeImpactWithLLM(data, riskSignals);

      // 4. 使用LLM预测发展趋势
      const trendPrediction = await this.predictTrendWithLLM(data, riskAssessment);

      // 5. 计算置信度
      const confidence = this.calculateConfidence(riskSignals, riskAssessment);
      this.setConfidence(confidence);

      const result = {
        confidence,
        riskSignals,
        riskAssessment,
        impactAnalysis,
        trendPrediction,
        keyInsights: this.generateInsights(riskAssessment, impactAnalysis, trendPrediction),
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
   * 使用LLM识别风险信号
   */
  async identifyRiskSignalsWithLLM(data) {
    const dataSummary = data.map((item, idx) => ({
      index: idx,
      content: (item.content || item.text || '').substring(0, 200),
      time: item.createdAt || item.time,
      reposts: item.reposts || item.repostCount || item.shares || 0,
      comments: item.comments || item.commentCount || 0,
      likes: item.likes || item.likeCount || 0
    })).slice(0, 25);

    const prompt = `你是一个专业的风险识别专家。请分析以下社交媒体数据中的风险信号。

数据：
${JSON.stringify(dataSummary, null, 2)}

请输出JSON格式结果：
{
  "signals": [
    {
      "type": "风险类型(social/reputation/legal/economic/political)",
      "name": "风险名称",
      "severity": "严重程度(1-3, 3最严重)",
      "count": 出现次数,
      "examples": [
        { "index": 索引, "content": "内容片段", "context": "上下文" }
      ],
      "description": "风险描述"
    }
  ],
  "totalSignals": 风险信号总数,
  "primaryRiskType": "主要风险类型"
}

风险类型定义：
1. social: 社会稳定风险（聚集、抗议、维权、上访等）
2. reputation: 品牌声誉风险（质量、假货、欺骗、虚假宣传等）
3. legal: 法律合规风险（违法、违规、侵权、犯罪等）
4. economic: 经济损失风险（亏损、破产、裁员、赔偿等）
5. political: 政治敏感风险（涉及政府、政策、体制等敏感话题）

分析要求：
1. 基于内容语义识别风险，不要仅依赖关键词
2. 考虑上下文判断风险严重程度
3. 区分真实风险和情绪化表达`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2500
      });

      const result = this.parseLLMResponse(response.content);
      return result.signals || [];
    } catch (error) {
      logger.error('[V2] LLM风险信号识别失败:', error);
      return [];
    }
  }

  /**
   * 使用LLM评估风险等级
   */
  async assessRiskLevelWithLLM(data, riskSignals) {
    const dataSummary = {
      totalPosts: data.length,
      uniqueUsers: new Set(data.map(item => item.userId || item.author)).size,
      totalInteractions: data.reduce((sum, item) => {
        return sum + (item.reposts || item.shares || 0) + (item.comments || 0) + (item.likes || 0);
      }, 0),
      timeSpan: this.calculateTimeSpan(data)
    };

    const prompt = `你是一个专业的风险评估专家。请基于以下信息评估风险等级。

数据概况：
${JSON.stringify(dataSummary, null, 2)}

风险信号：
${JSON.stringify(riskSignals.slice(0, 10), null, 2)}

请输出JSON格式结果：
{
  "overallLevel": "总体风险等级(critical/high/medium/low)",
  "overallScore": 风险分数(0-100),
  "typeAssessments": [
    {
      "type": "风险类型",
      "name": "风险名称",
      "level": "风险等级",
      "score": 分数,
      "weight": 权重,
      "weightedScore": 加权分数,
      "reasoning": "评估理由"
    }
  ],
  "assessmentFactors": {
    "signalStrength": { "score": 信号强度分数, "reasoning": "理由" },
    "propagationRange": { "score": 传播范围分数, "reasoning": "理由" },
    "interactionScale": { "score": 互动规模分数, "reasoning": "理由" },
    "emotionIntensity": { "score": 情绪激烈分数, "reasoning": "理由" },
    "timeUrgency": { "score": 时间紧迫分数, "reasoning": "理由" }
  }
}

风险等级标准：
- critical (80-100): 极高风险，需立即响应
- high (60-79): 高风险，需密切关注
- medium (40-59): 中等风险，需持续监测
- low (0-39): 低风险，常规关注

评分因素：
1. signalStrength: 风险信号的数量和严重程度
2. propagationRange: 传播覆盖的用户数量
3. interactionScale: 总互动量（转发、评论、点赞）
4. emotionIntensity: 负面情绪的强度和集中度
5. timeUrgency: 舆情发展速度和响应时间窗口`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2500
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM风险评估失败:', error);
      return this.getDefaultRiskAssessment();
    }
  }

  /**
   * 使用LLM分析影响范围
   */
  async analyzeImpactWithLLM(data, riskSignals) {
    const dataSummary = data.map((item, idx) => ({
      index: idx,
      content: (item.content || item.text || '').substring(0, 150),
      author: item.userId || item.author || `user_${idx}`
    })).slice(0, 20);

    const prompt = `你是一个专业的影响分析专家。请分析以下舆情事件的潜在影响范围。

数据：
${JSON.stringify(dataSummary, null, 2)}

主要风险信号：
${JSON.stringify(riskSignals.slice(0, 5), null, 2)}

请输出JSON格式结果：
{
  "affectedEntities": [
    {
      "type": "实体类型(individual/organization/brand/government/industry)",
      "name": "实体名称或描述",
      "impactLevel": "影响程度(high/medium/low)",
      "impactDescription": "影响描述"
    }
  ],
  "affectedAreas": [
    {
      "area": "影响领域",
      "severity": "严重程度",
      "description": "具体影响"
    }
  ],
  "potentialConsequences": [
    {
      "type": "后果类型",
      "probability": "可能性(high/medium/low)",
      "severity": "严重程度",
      "description": "后果描述",
      "timeframe": "时间框架"
    }
  ],
  "escalationRisk": {
    "level": "升级风险等级",
    "factors": ["升级因素1", "升级因素2"],
    "triggers": ["触发条件1", "触发条件2"]
  }
}

实体类型：
- individual: 个人（当事人、相关人物）
- organization: 组织（企业、机构）
- brand: 品牌
- government: 政府部门
- industry: 行业

影响领域：
- reputation: 声誉影响
- economic: 经济影响
- social: 社会影响
- legal: 法律影响
- political: 政治影响`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2500
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM影响分析失败:', error);
      return this.getDefaultImpactAnalysis();
    }
  }

  /**
   * 使用LLM预测发展趋势
   */
  async predictTrendWithLLM(data, riskAssessment) {
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // 分早期和近期
    const midPoint = Math.floor(sortedData.length / 2);
    const earlyData = sortedData.slice(0, midPoint);
    const recentData = sortedData.slice(midPoint);

    const trendData = {
      early: {
        postCount: earlyData.length,
        avgInteractions: this.calculateAvgInteractions(earlyData),
        dominantEmotion: '待分析'
      },
      recent: {
        postCount: recentData.length,
        avgInteractions: this.calculateAvgInteractions(recentData),
        dominantEmotion: '待分析'
      },
      overall: {
        totalPosts: data.length,
        timeSpan: this.calculateTimeSpan(data),
        currentRiskLevel: riskAssessment.overallLevel
      }
    };

    const prompt = `你是一个专业的趋势预测专家。请基于以下信息预测舆情发展趋势。

趋势数据：
${JSON.stringify(trendData, null, 2)}

当前风险等级：${riskAssessment.overallLevel}

请输出JSON格式结果：
{
  "trend": "趋势类型(escalating/brewing/stable/de-escalating/resolving)",
  "trendDescription": "趋势描述",
  "confidence": "预测置信度(high/medium/low)",
  "reasoning": "预测理由",
  "predictedDevelopments": [
    {
      "timeframe": "时间框架(24h/48h/1w)",
      "prediction": "预测内容",
      "probability": "可能性"
    }
  ],
  "keyIndicators": {
    "volumeChange": { "value": "变化值", "trend": "趋势" },
    "emotionChange": { "value": "变化值", "trend": "趋势" },
    "engagementChange": { "value": "变化值", "trend": "趋势" }
  },
  "milestones": [
    {
      "event": "可能事件",
      "probability": "可能性",
      "impact": "影响"
    }
  ]
}

趋势类型：
- escalating: 升级趋势（负面指标持续上升）
- brewing: 发酵趋势（传播范围扩大但情绪尚未激化）
- stable: 平稳趋势（各项指标波动较小）
- de-escalating: 降温趋势（负面指标开始下降）
- resolving: 平息趋势（各项指标回归正常）`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM趋势预测失败:', error);
      return this.getDefaultTrendPrediction();
    }
  }

  /**
   * 计算时间跨度
   */
  calculateTimeSpan(data) {
    if (data.length < 2) return 0;
    
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
    
    const start = new Date(sortedData[0].createdAt || 0);
    const end = new Date(sortedData[sortedData.length - 1].createdAt || 0);
    
    return (end - start) / (1000 * 60 * 60); // 返回小时数
  }

  /**
   * 计算平均互动量
   */
  calculateAvgInteractions(data) {
    if (data.length === 0) return 0;
    
    const total = data.reduce((sum, item) => {
      return sum + (item.reposts || item.shares || 0) + (item.comments || 0) + (item.likes || 0);
    }, 0);
    
    return Math.round(total / data.length);
  }

  /**
   * 解析LLM响应
   */
  parseLLMResponse(response) {
    try {
      return JSON.parse(response);
    } catch (e) {
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法解析LLM响应');
    }
  }

  /**
   * 获取默认风险评估
   */
  getDefaultRiskAssessment() {
    return {
      overallLevel: 'low',
      overallScore: 20,
      typeAssessments: [],
      assessmentFactors: {
        signalStrength: { score: 20, reasoning: '无明显风险信号' },
        propagationRange: { score: 20, reasoning: '传播范围有限' },
        interactionScale: { score: 20, reasoning: '互动量较低' },
        emotionIntensity: { score: 20, reasoning: '情绪相对平稳' },
        timeUrgency: { score: 20, reasoning: '时间窗口充足' }
      }
    };
  }

  /**
   * 获取默认影响分析
   */
  getDefaultImpactAnalysis() {
    return {
      affectedEntities: [],
      affectedAreas: [],
      potentialConsequences: [],
      escalationRisk: {
        level: 'low',
        factors: [],
        triggers: []
      }
    };
  }

  /**
   * 获取默认趋势预测
   */
  getDefaultTrendPrediction() {
    return {
      trend: 'stable',
      trendDescription: '舆情发展相对平稳',
      confidence: 'medium',
      reasoning: '数据不足以做出准确预测',
      predictedDevelopments: [],
      keyIndicators: {},
      milestones: []
    };
  }

  /**
   * 计算置信度
   */
  calculateConfidence(riskSignals, riskAssessment) {
    let score = 0.6;

    if (riskSignals.length > 0) score += 0.1;
    if (riskSignals.length > 3) score += 0.1;
    if (riskAssessment.typeAssessments?.length > 0) score += 0.1;
    if (riskAssessment.assessmentFactors) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * 生成关键洞察
   */
  generateInsights(riskAssessment, impactAnalysis, trendPrediction) {
    const insights = [];

    const levelMap = {
      critical: '极高',
      high: '高',
      medium: '中等',
      low: '低'
    };
    insights.push(`总体风险等级为${levelMap[riskAssessment.overallLevel] || riskAssessment.overallLevel}，风险分数${riskAssessment.overallScore}`);

    if (riskAssessment.typeAssessments?.length > 0) {
      const primaryRisk = riskAssessment.typeAssessments[0];
      insights.push(`主要风险类型: ${primaryRisk.name}，风险等级${levelMap[primaryRisk.level] || primaryRisk.level}`);
    }

    if (impactAnalysis.affectedEntities?.length > 0) {
      const highImpactEntities = impactAnalysis.affectedEntities.filter(e => e.impactLevel === 'high');
      if (highImpactEntities.length > 0) {
        insights.push(`识别到${highImpactEntities.length}个高影响实体`);
      }
    }

    const trendMap = {
      escalating: '升级',
      brewing: '发酵',
      stable: '平稳',
      'de-escalating': '降温',
      resolving: '平息'
    };
    insights.push(`舆情呈${trendMap[trendPrediction.trend] || trendPrediction.trend}趋势，预测置信度${trendPrediction.confidence === 'high' ? '高' : trendPrediction.confidence === 'medium' ? '中' : '低'}`);

    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(riskAssessment, trendPrediction) {
    const recommendations = [];

    if (riskAssessment.overallLevel === 'critical' || riskAssessment.overallLevel === 'high') {
      recommendations.push('风险等级较高，建议立即启动应急响应机制');
      recommendations.push('成立专项工作组，制定应对预案');
    } else if (riskAssessment.overallLevel === 'medium') {
      recommendations.push('风险等级中等，建议持续监测舆情动态');
      recommendations.push('准备应对预案，做好随时响应准备');
    }

    if (trendPrediction.trend === 'escalating') {
      recommendations.push('舆情呈升级趋势，需密切关注并及时干预');
    } else if (trendPrediction.trend === 'brewing') {
      recommendations.push('舆情处于发酵期，建议主动引导舆论走向');
    }

    const highUrgency = riskAssessment.assessmentFactors?.timeUrgency?.score > 60;
    if (highUrgency) {
      recommendations.push('时间窗口紧迫，需快速响应');
    }

    return recommendations;
  }

  /**
   * 调整分析策略
   */
  async adjustStrategy(guidance) {
    logger.info('[V2] 风险影响研判智能体调整策略:', guidance);
    
    if (guidance.focusRiskTypes) {
      this.focusRiskTypes = guidance.focusRiskTypes;
    }
    
    if (guidance.deepRiskAnalysis) {
      this.deepRiskAnalysis = true;
    }
  }
}

module.exports = RiskAgent;
