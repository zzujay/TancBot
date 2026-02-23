/**
 * 传播路径分析智能体 (Propagation Agent)
 * 基于LLM的传播分析，分析舆情事件在微博的传播链路、关键节点和影响力
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class PropagationAgent extends BaseAgentV2 {
  constructor() {
    super(
      '传播路径分析智能体',
      '基于LLM分析传播链路、关键节点、传播速度和范围',
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
    logger.info(`[V2] 传播路径分析智能体开始分析，数据量: ${data.length}`);
    this.updateLastUsed();

    try {
      if (!this.llmClient) {
        await this.initialize();
      }

      // 数据验证和调试
      if (data.length > 0) {
        const sample = data[0];
        logger.debug('[V2] 数据样本:', {
          hasShares: 'shares' in sample,
          hasReposts: 'reposts' in sample,
          hasComments: 'comments' in sample,
          hasLikes: 'likes' in sample,
          shares: sample.shares,
          reposts: sample.reposts,
          comments: sample.comments,
          likes: sample.likes
        });
      }

      // 1. 使用LLM提取传播关键节点
      const keyNodes = await this.extractKeyNodesWithLLM(data);

      // 2. 使用LLM梳理传播路径
      const propagationPaths = await this.tracePropagationPathsWithLLM(data, keyNodes);

      // 3. 使用LLM分析传播阶段
      const propagationStages = await this.analyzePropagationStagesWithLLM(data);

      // 4. 使用LLM识别传播助推因素
      const boostingFactors = await this.identifyBoostingFactorsWithLLM(data);

      // 5. 计算传播指标
      const propagationMetrics = this.calculatePropagationMetrics(data);

      // 6. 计算置信度
      const confidence = this.calculateConfidence(keyNodes, propagationMetrics);
      this.setConfidence(confidence);

      const result = {
        confidence,
        keyNodes,
        propagationPaths,
        propagationStages,
        propagationMetrics,
        boostingFactors,
        keyInsights: this.generateInsights(keyNodes, propagationMetrics, boostingFactors),
        recommendations: this.generateRecommendations(propagationMetrics, boostingFactors)
      };

      this.addToHistory(result);
      logger.info(`[V2] 传播路径分析智能体分析完成，置信度: ${confidence.toFixed(2)}`);

      return result;

    } catch (error) {
      logger.error('[V2] 传播路径分析智能体分析失败:', error);
      throw error;
    }
  }

  /**
   * 使用LLM提取传播关键节点
   */
  async extractKeyNodesWithLLM(data) {
    // 准备数据摘要
    const dataSummary = data.map((item, idx) => ({
      index: idx,
      userId: item.userId || item.author || `user_${idx}`,
      content: (item.content || item.text || '').substring(0, 150),
      time: item.createdAt || item.time,
      reposts: item.reposts || item.repostCount || item.shares || 0,
      comments: item.comments || item.commentCount || 0,
      likes: item.likes || item.likeCount || 0,
      followerCount: item.followerCount || 0
    })).slice(0, 25);

    const prompt = `你是一个专业的传播分析专家。请分析以下社交媒体数据的传播关键节点。

数据：
${JSON.stringify(dataSummary, null, 2)}

请输出JSON格式结果：
{
  "summary": {
    "totalNodes": 总节点数,
    "originatorCount": 首发账号数,
    "opinionLeaderCount": 意见领袖数,
    "mediaCount": 媒体账号数,
    "spreaderCount": 传播节点数
  },
  "originators": [
    {
      "userId": "用户ID",
      "content": "内容摘要",
      "timestamp": "时间",
      "influence": 影响力分数
    }
  ],
  "opinionLeaders": [
    {
      "userId": "用户ID",
      "postCount": 发帖数,
      "totalInfluence": 总影响力,
      "followerCount": 粉丝数,
      "influenceLevel": "high/medium/low"
    }
  ],
  "mediaAccounts": [
    {
      "userId": "用户ID",
      "postCount": 发帖数,
      "totalInfluence": 总影响力
    }
  ],
  "spreaders": [
    {
      "userId": "用户ID",
      "postCount": 发帖数,
      "totalInfluence": 总影响力
    }
  ]
}

节点识别标准：
1. originators: 最早发布相关内容的账号
2. opinionLeaders: 粉丝>10万或影响力>1万的账号
3. mediaAccounts: 名称包含媒体关键词的账号
4. spreaders: 有一定影响力但非意见领袖的账号

影响力计算：转发*3 + 评论*2 + 点赞*1`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2500
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM关键节点提取失败:', error);
      return this.getDefaultKeyNodesResult(data);
    }
  }

  /**
   * 使用LLM梳理传播路径
   */
  async tracePropagationPathsWithLLM(data, keyNodes) {
    // 准备数据
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    const dataSummary = sortedData.map((item, idx) => ({
      index: idx,
      userId: item.userId || item.author || `user_${idx}`,
      content: (item.content || item.text || '').substring(0, 100),
      time: item.createdAt || item.time,
      isRepost: item.isRepost || false,
      sourceUser: item.sourceUser || null
    })).slice(0, 20);

    const prompt = `你是一个专业的传播路径分析专家。请分析以下数据的传播路径。

数据：
${JSON.stringify(dataSummary, null, 2)}

关键节点：
${JSON.stringify({
  originators: keyNodes.originators?.slice(0, 3) || [],
  opinionLeaders: keyNodes.opinionLeaders?.slice(0, 3) || []
}, null, 2)}

请输出JSON格式结果：
{
  "stages": [
    {
      "name": "阶段名称(萌芽期/发酵期/爆发期/平稳期)",
      "label": "early/developing/peak/declining",
      "postCount": 帖子数,
      "description": "阶段特征描述"
    }
  ],
  "mainPaths": [
    {
      "type": "路径类型",
      "description": "路径描述",
      "nodes": [
        { "type": "节点类型", "userId": "用户ID" }
      ]
    }
  ],
  "pathCount": 路径数量
}

分析要求：
1. 识别传播的主要阶段
2. 梳理从首发到扩散的传播路径
3. 描述各阶段特征`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM传播路径分析失败:', error);
      return this.getDefaultPropagationPathsResult();
    }
  }

  /**
   * 使用LLM分析传播阶段
   */
  async analyzePropagationStagesWithLLM(data) {
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // 分阶段采样
    const total = sortedData.length;
    const stageSize = Math.ceil(total / 4);
    const stages = [];
    
    for (let i = 0; i < 4 && i * stageSize < total; i++) {
      const startIdx = i * stageSize;
      const endIdx = Math.min((i + 1) * stageSize, total);
      const stageData = sortedData.slice(startIdx, endIdx);
      
      const totalInfluence = stageData.reduce((sum, item) => {
        return sum + (item.reposts || item.shares || 0) * 3 + (item.comments || 0) * 2 + (item.likes || 0);
      }, 0);

      stages.push({
        label: ['early', 'developing', 'peak', 'declining'][i],
        name: ['萌芽期', '发酵期', '爆发期', '平稳期'][i],
        postCount: stageData.length,
        timeRange: {
          start: stageData[0]?.createdAt,
          end: stageData[stageData.length - 1]?.createdAt
        },
        totalInfluence,
        avgInfluence: stageData.length > 0 ? totalInfluence / stageData.length : 0,
        sampleContents: stageData.slice(0, 5).map(item => (item.content || '').substring(0, 100))
      });
    }

    const prompt = `你是一个专业的传播阶段分析专家。请分析以下四个传播阶段的特征。

阶段数据：
${JSON.stringify(stages, null, 2)}

请输出JSON格式结果：
{
  "stages": [
    {
      "name": "阶段名称",
      "label": "标签",
      "postCount": 帖子数,
      "timeRange": { "start": "开始时间", "end": "结束时间" },
      "totalInfluence": 总影响力,
      "avgInfluence": 平均影响力,
      "intensity": "high/medium/low",
      "description": "阶段特征描述",
      "keyCharacteristics": ["特征1", "特征2"]
    }
  ],
  "overallTrend": "整体传播趋势描述"
}

阶段强度判断：
- high: avgInfluence > 1000
- medium: avgInfluence > 500
- low: avgInfluence <= 500`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const result = this.parseLLMResponse(response.content);
      return result.stages || stages;
    } catch (error) {
      logger.error('[V2] LLM传播阶段分析失败:', error);
      return stages;
    }
  }

  /**
   * 使用LLM识别传播助推因素
   */
  async identifyBoostingFactorsWithLLM(data) {
    const dataSummary = data.map((item, idx) => ({
      index: idx,
      content: (item.content || item.text || '').substring(0, 150),
      reposts: item.reposts || item.repostCount || item.shares || 0,
      comments: item.comments || item.commentCount || 0,
      likes: item.likes || item.likeCount || 0
    })).slice(0, 20);

    const prompt = `你是一个专业的传播助推因素分析专家。请分析以下数据的传播助推因素。

数据：
${JSON.stringify(dataSummary, null, 2)}

请输出JSON格式结果：
{
  "factors": [
    {
      "type": "因素类型(hashtag/high_engagement_content/time_cluster/kol_participation)",
      "description": "因素描述",
      "details": [
        { "name": "名称", "count": 数量, "impact": "影响描述" }
      ],
      "impact": "high/medium/low"
    }
  ],
  "primaryDriver": "主要传播驱动力描述"
}

助推因素类型：
1. hashtag: 热门话题标签
2. high_engagement_content: 高互动内容
3. time_cluster: 时间集中爆发
4. kol_participation: KOL参与`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const result = this.parseLLMResponse(response.content);
      return result.factors || [];
    } catch (error) {
      logger.error('[V2] LLM助推因素分析失败:', error);
      return [];
    }
  }

  /**
   * 计算传播指标
   */
  calculatePropagationMetrics(data) {
    if (data.length === 0) {
      return {
        speed: 0,
        duration: 0,
        range: 0,
        coverage: 'minimal',
        interactionMetrics: {}
      };
    }

    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    const startTime = new Date(sortedData[0].createdAt || 0);
    const endTime = new Date(sortedData[sortedData.length - 1].createdAt || 0);
    const duration = (endTime - startTime) / (1000 * 60 * 60);

    const speed = duration > 0 ? data.length / duration : data.length;

    const totalReposts = data.reduce((sum, item) => sum + (item.reposts || item.repostCount || item.shares || 0), 0);
    const totalComments = data.reduce((sum, item) => sum + (item.comments || item.commentCount || 0), 0);
    const totalLikes = data.reduce((sum, item) => sum + (item.likes || item.likeCount || 0), 0);
    const totalInteractions = totalReposts + totalComments + totalLikes;
    
    logger.debug('[V2] 传播指标计算:', {
      dataCount: data.length,
      totalReposts,
      totalComments,
      totalLikes,
      totalInteractions
    });

    const uniqueUsers = new Set(data.map(item => item.userId || item.author)).size;
    let coverage = 'minimal';
    if (uniqueUsers > 1000) coverage = 'wide';
    else if (uniqueUsers > 500) coverage = 'medium';
    else if (uniqueUsers > 100) coverage = 'limited';

    return {
      speed: speed.toFixed(2),
      duration: duration.toFixed(2),
      range: uniqueUsers,
      coverage,
      interactionMetrics: {
        totalReposts,
        totalComments,
        totalLikes,
        totalInteractions,
        avgInteractionsPerPost: data.length > 0 ? (totalInteractions / data.length).toFixed(2) : 0
      }
    };
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
   * 获取默认关键节点结果
   */
  getDefaultKeyNodesResult(data) {
    const uniqueUsers = new Set(data.map(item => item.userId || item.author)).size;
    return {
      summary: {
        totalNodes: uniqueUsers,
        originatorCount: 0,
        opinionLeaderCount: 0,
        mediaCount: 0,
        spreaderCount: 0
      },
      originators: [],
      opinionLeaders: [],
      mediaAccounts: [],
      spreaders: []
    };
  }

  /**
   * 获取默认传播路径结果
   */
  getDefaultPropagationPathsResult() {
    return {
      stages: [],
      mainPaths: [],
      pathCount: 0
    };
  }

  /**
   * 计算置信度
   */
  calculateConfidence(keyNodes, propagationMetrics) {
    let score = 0.6;

    if (keyNodes.summary.totalNodes > 10) score += 0.1;
    if (keyNodes.opinionLeaders?.length > 0) score += 0.1;
    if (keyNodes.mediaAccounts?.length > 0) score += 0.1;
    if (propagationMetrics.interactionMetrics.totalInteractions > 0) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * 生成关键洞察
   */
  generateInsights(keyNodes, propagationMetrics, boostingFactors) {
    const insights = [];

    insights.push(`传播涉及${keyNodes.summary.totalNodes}个账号，覆盖范围${propagationMetrics.coverage === 'wide' ? '广泛' : '有限'}`);

    if (keyNodes.opinionLeaders?.length > 0) {
      insights.push(`识别到${keyNodes.opinionLeaders.length}个意见领袖参与传播`);
    }
    if (keyNodes.mediaAccounts?.length > 0) {
      insights.push(`${keyNodes.mediaAccounts.length}个媒体账号介入，传播进入公共视野`);
    }

    insights.push(`传播速度为${propagationMetrics.speed}帖/小时，总互动量${propagationMetrics.interactionMetrics.totalInteractions}`);

    if (boostingFactors.length > 0) {
      const primaryFactor = boostingFactors[0];
      insights.push(`主要传播助推因素: ${primaryFactor.description}`);
    }

    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(propagationMetrics, boostingFactors) {
    const recommendations = [];

    if (parseFloat(propagationMetrics.speed) > 10) {
      recommendations.push('传播速度较快，建议密切关注舆情走向，及时回应');
    }

    if (propagationMetrics.coverage === 'wide') {
      recommendations.push('传播范围广泛，需准备全面的舆情应对方案');
    }

    const hashtagFactor = boostingFactors.find(f => f.type === 'hashtag');
    if (hashtagFactor) {
      recommendations.push('关注话题标签传播动态，可考虑引导话题走向');
    }

    const interactions = propagationMetrics.interactionMetrics;
    if (interactions.totalReposts > interactions.totalComments * 2) {
      recommendations.push('转发量远高于评论量，存在情绪化传播风险');
    }

    return recommendations;
  }

  /**
   * 调整分析策略
   */
  async adjustStrategy(guidance) {
    logger.info('[V2] 传播路径分析智能体调整策略:', guidance);
    
    if (guidance.focusNodes) {
      this.focusNodes = guidance.focusNodes;
    }
    
    if (guidance.deepPathAnalysis) {
      this.deepPathAnalysis = true;
    }
  }
}

module.exports = PropagationAgent;
