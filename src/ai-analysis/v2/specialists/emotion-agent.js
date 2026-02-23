/**
 * 情绪/态度分析智能体 (Emotion Agent)
 * 基于LLM的情绪分析，分析微博内容中不同主体的情绪、态度和立场
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class EmotionAgent extends BaseAgentV2 {
  constructor() {
    super(
      '情绪态度分析智能体',
      '基于LLM分析情绪类型、立场倾向、情绪演变',
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
    logger.info(`[V2] 情绪态度分析智能体开始分析，数据量: ${data.length}`);
    this.updateLastUsed();

    try {
      if (!this.llmClient) {
        await this.initialize();
      }

      // 1. 使用LLM分析情绪类型和强度
      const emotionAnalysis = await this.analyzeEmotionsWithLLM(data);

      // 2. 使用LLM分析立场倾向
      const stanceAnalysis = await this.analyzeStanceWithLLM(data);

      // 3. 使用LLM追踪情绪演变
      const emotionEvolution = await this.trackEmotionEvolutionWithLLM(data);

      // 4. 识别关键情绪拐点
      const turningPoints = this.identifyTurningPoints(emotionEvolution);

      // 5. 计算置信度
      const confidence = this.calculateConfidence(emotionAnalysis, stanceAnalysis);
      this.setConfidence(confidence);

      const result = {
        confidence,
        emotionAnalysis,
        stanceAnalysis,
        emotionEvolution,
        turningPoints,
        keyInsights: this.generateInsights(emotionAnalysis, stanceAnalysis, turningPoints),
        recommendations: this.generateRecommendations(emotionAnalysis)
      };

      this.addToHistory(result);
      logger.info(`[V2] 情绪态度分析智能体分析完成，置信度: ${confidence.toFixed(2)}`);

      return result;

    } catch (error) {
      logger.error('[V2] 情绪态度分析智能体分析失败:', error);
      throw error;
    }
  }

  /**
   * 使用LLM分析情绪类型和强度
   */
  async analyzeEmotionsWithLLM(data) {
    // 准备数据摘要（限制token数量）
    const dataSummary = data.map((item, idx) => ({
      index: idx,
      content: (item.content || item.text || '').substring(0, 200),
      time: item.createdAt || item.time
    })).slice(0, 20); // 最多分析20条

    const prompt = `你是一个专业的情绪分析专家。请分析以下社交媒体内容的情绪特征。

数据：
${JSON.stringify(dataSummary, null, 2)}

请输出JSON格式结果：
{
  "dominantEmotion": "主导情绪类型(angry/anxious/sympathetic/positive/negative/neutral)",
  "emotionDistribution": {
    "angry": { "count": 数量, "percentage": 百分比, "avgIntensity": 平均强度1-5 },
    "anxious": { "count": 数量, "percentage": 百分比, "avgIntensity": 平均强度1-5 },
    "sympathetic": { "count": 数量, "percentage": 百分比, "avgIntensity": 平均强度1-5 },
    "positive": { "count": 数量, "percentage": 百分比, "avgIntensity": 平均强度1-5 },
    "negative": { "count": 数量, "percentage": 百分比, "avgIntensity": 平均强度1-5 },
    "neutral": { "count": 数量, "percentage": 百分比, "avgIntensity": 平均强度1-5 }
  },
  "emotionDetails": {
    "angry": { "examples": [{"index": 索引, "content": "内容片段", "intensity": 强度}] },
    "anxious": { "examples": [{"index": 索引, "content": "内容片段", "intensity": 强度}] },
    ...
  },
  "totalAnalyzed": 分析总数
}

分析要求：
1. 基于内容语义判断情绪，不要仅依赖关键词
2. 考虑上下文和语境
3. 识别隐含情绪（如反讽、隐喻）
4. 强度评分1-5，5为最强烈`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM情绪分析失败:', error);
      // 返回默认结果
      return this.getDefaultEmotionResult(data.length);
    }
  }

  /**
   * 使用LLM分析立场倾向
   */
  async analyzeStanceWithLLM(data) {
    const dataSummary = data.map((item, idx) => ({
      index: idx,
      content: (item.content || item.text || '').substring(0, 200),
      author: item.userId || item.author || `user_${idx}`
    })).slice(0, 20);

    const prompt = `你是一个专业的立场分析专家。请分析以下社交媒体内容的立场倾向。

数据：
${JSON.stringify(dataSummary, null, 2)}

请输出JSON格式结果：
{
  "dominantStance": "主导立场(support/oppose/question/neutral)",
  "stanceDistribution": {
    "support": { "count": 数量, "percentage": 百分比, "uniqueUsers": 独立用户数 },
    "oppose": { "count": 数量, "percentage": 百分比, "uniqueUsers": 独立用户数 },
    "question": { "count": 数量, "percentage": 百分比, "uniqueUsers": 独立用户数 },
    "neutral": { "count": 数量, "percentage": 百分比, "uniqueUsers": 独立用户数 }
  },
  "stanceDetails": {
    "support": { "examples": [{"index": 索引, "userId": "用户ID", "content": "内容片段"}] },
    "oppose": { "examples": [{"index": 索引, "userId": "用户ID", "content": "内容片段"}] },
    ...
  },
  "totalAnalyzed": 分析总数
}

分析要求：
1. support: 明确支持、赞同、同意某一方
2. oppose: 明确反对、抵制、批评某一方
3. question: 质疑、疑问、不解
4. neutral: 中立、客观、仅陈述事实`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM立场分析失败:', error);
      return this.getDefaultStanceResult(data.length);
    }
  }

  /**
   * 使用LLM追踪情绪演变
   */
  async trackEmotionEvolutionWithLLM(data) {
    // 按时间排序
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || a.time || 0) - new Date(b.createdAt || b.time || 0);
    });

    // 分阶段采样
    const total = sortedData.length;
    const stageSize = Math.ceil(total / 4);
    const stages = [];
    
    for (let i = 0; i < 4 && i * stageSize < total; i++) {
      const startIdx = i * stageSize;
      const endIdx = Math.min((i + 1) * stageSize, total);
      const stageData = sortedData.slice(startIdx, endIdx);
      
      stages.push({
        label: ['early', 'developing', 'peak', 'declining'][i],
        name: ['初期', '发酵期', '高峰期', '平息期'][i],
        data: stageData.map((item, idx) => ({
          index: startIdx + idx,
          content: (item.content || item.text || '').substring(0, 150),
          time: item.createdAt || item.time
        }))
      });
    }

    const prompt = `你是一个专业的情绪演变分析专家。请分析以下四个阶段的情绪变化。

阶段数据：
${JSON.stringify(stages, null, 2)}

请输出JSON格式结果：
{
  "early": {
    "label": "初期",
    "dominantEmotion": "主导情绪",
    "emotions": { "angry": 数量, "anxious": 数量, ... },
    "dataCount": 数据量,
    "description": "阶段情绪特征描述"
  },
  "developing": { ... },
  "peak": { ... },
  "declining": { ... }
}

分析要求：
1. 识别每个阶段的主导情绪
2. 对比各阶段情绪变化
3. 描述情绪演变趋势`;

    try {
      const response = await this.llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      const result = this.parseLLMResponse(response.content);
      return result;
    } catch (error) {
      logger.error('[V2] LLM情绪演变分析失败:', error);
      return this.getDefaultEvolutionResult();
    }
  }

  /**
   * 解析LLM响应
   */
  parseLLMResponse(response) {
    try {
      // 尝试直接解析
      return JSON.parse(response);
    } catch (e) {
      // 尝试从代码块中提取
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }
      // 尝试提取JSON对象
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法解析LLM响应');
    }
  }

  /**
   * 获取默认情绪结果
   */
  getDefaultEmotionResult(total) {
    return {
      totalAnalyzed: total,
      dominantEmotion: 'neutral',
      distribution: {
        angry: { count: 0, percentage: 0, avgIntensity: 0 },
        anxious: { count: 0, percentage: 0, avgIntensity: 0 },
        sympathetic: { count: 0, percentage: 0, avgIntensity: 0 },
        positive: { count: 0, percentage: 0, avgIntensity: 0 },
        negative: { count: 0, percentage: 0, avgIntensity: 0 },
        neutral: { count: total, percentage: 100, avgIntensity: 1 }
      },
      emotionDetails: {}
    };
  }

  /**
   * 获取默认立场结果
   */
  getDefaultStanceResult(total) {
    return {
      totalAnalyzed: total,
      dominantStance: 'neutral',
      distribution: {
        support: { count: 0, percentage: 0, uniqueUsers: 0 },
        oppose: { count: 0, percentage: 0, uniqueUsers: 0 },
        question: { count: 0, percentage: 0, uniqueUsers: 0 },
        neutral: { count: total, percentage: 100, uniqueUsers: total }
      },
      stanceDetails: {}
    };
  }

  /**
   * 获取默认演变结果
   */
  getDefaultEvolutionResult() {
    return {
      early: { label: '初期', dominantEmotion: 'neutral', emotions: {}, dataCount: 0, description: '无数据' },
      developing: { label: '发酵期', dominantEmotion: 'neutral', emotions: {}, dataCount: 0, description: '无数据' },
      peak: { label: '高峰期', dominantEmotion: 'neutral', emotions: {}, dataCount: 0, description: '无数据' },
      declining: { label: '平息期', dominantEmotion: 'neutral', emotions: {}, dataCount: 0, description: '无数据' }
    };
  }

  /**
   * 识别关键情绪拐点
   */
  identifyTurningPoints(emotionEvolution) {
    const turningPoints = [];
    const stages = Object.entries(emotionEvolution);
    
    for (let i = 1; i < stages.length; i++) {
      const prevStage = stages[i - 1][1];
      const currStage = stages[i][1];
      
      if (prevStage.dominantEmotion !== currStage.dominantEmotion) {
        turningPoints.push({
          from: prevStage.label,
          to: currStage.label,
          emotionChange: `${prevStage.dominantEmotion} → ${currStage.dominantEmotion}`,
          significance: this.calculateTurningSignificance(prevStage, currStage)
        });
      }
    }

    return turningPoints;
  }

  /**
   * 计算拐点重要性
   */
  calculateTurningSignificance(prevStage, currStage) {
    const negativeEmotions = ['angry', 'anxious', 'negative'];
    const positiveEmotions = ['positive', 'sympathetic'];
    
    if (negativeEmotions.includes(prevStage.dominantEmotion) && 
        positiveEmotions.includes(currStage.dominantEmotion)) {
      return 'high';
    }
    
    if (positiveEmotions.includes(prevStage.dominantEmotion) && 
        negativeEmotions.includes(currStage.dominantEmotion)) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * 计算置信度
   */
  calculateConfidence(emotionAnalysis, stanceAnalysis) {
    let score = 0.7;
    
    const totalAnalyzed = emotionAnalysis?.totalAnalyzed || 0;
    if (totalAnalyzed > 10) score += 0.1;
    if (totalAnalyzed > 50) score += 0.1;
    
    const distribution = emotionAnalysis?.distribution || {};
    const hasClearDominant = Object.values(distribution)
      .some(e => parseFloat(e?.percentage || 0) > 30);
    if (hasClearDominant) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * 生成关键洞察
   */
  generateInsights(emotionAnalysis, stanceAnalysis, turningPoints) {
    const insights = [];

    const dominantEmotion = emotionAnalysis?.dominantEmotion || 'neutral';
    const emotionDistribution = emotionAnalysis?.distribution || {};
    const emotionPercent = emotionDistribution[dominantEmotion]?.percentage || 0;
    insights.push(`主导情绪为${this.translateEmotion(dominantEmotion)}，占比${emotionPercent}%`);

    const dominantStance = stanceAnalysis?.dominantStance || 'neutral';
    const stanceDistribution = stanceAnalysis?.distribution || {};
    const stancePercent = stanceDistribution[dominantStance]?.percentage || 0;
    insights.push(`主要立场倾向为${this.translateStance(dominantStance)}，占比${stancePercent}%`);

    if (turningPoints && turningPoints.length > 0) {
      insights.push(`检测到${turningPoints.length}个关键情绪拐点`);
      turningPoints.forEach((point, i) => {
        if (point.significance === 'high') {
          const [from, to] = (point.emotionChange || '').split(' → ');
          if (from && to) {
            insights.push(`重要拐点${i + 1}: ${point.from}→${point.to}，情绪从${this.translateEmotion(from)}转为${this.translateEmotion(to)}`);
          }
        }
      });
    }

    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(emotionAnalysis) {
    const recommendations = [];
    const dominantEmotion = emotionAnalysis?.dominantEmotion || 'neutral';
    const distribution = emotionAnalysis?.distribution || {};

    if (dominantEmotion === 'angry' || dominantEmotion === 'negative') {
      recommendations.push('负面情绪占主导，建议及时回应关切，平息公众情绪');
      recommendations.push('关注愤怒情绪源头，针对性解决问题');
    } else if (dominantEmotion === 'anxious') {
      recommendations.push('公众存在焦虑情绪，建议加强信息透明度，消除不确定性');
    } else if (dominantEmotion === 'sympathetic') {
      recommendations.push('公众情绪偏向同情支持，可顺势引导正面舆论');
    }

    const emotionData = distribution[dominantEmotion] || {};
    const avgIntensity = parseFloat(emotionData.avgIntensity || 0);
    if (avgIntensity > 2) {
      recommendations.push('情绪强度较高，需密切关注舆情发展，防止事态升级');
    }

    return recommendations;
  }

  /**
   * 翻译情绪类型
   */
  translateEmotion(emotion) {
    const map = {
      angry: '愤怒',
      anxious: '焦虑',
      sympathetic: '同情',
      positive: '正面',
      negative: '负面',
      neutral: '中性'
    };
    return map[emotion] || emotion;
  }

  /**
   * 翻译立场类型
   */
  translateStance(stance) {
    const map = {
      support: '支持',
      oppose: '反对',
      question: '质疑',
      neutral: '中立'
    };
    return map[stance] || stance;
  }

  /**
   * 调整分析策略
   */
  async adjustStrategy(guidance) {
    logger.info('[V2] 情绪态度分析智能体调整策略:', guidance);
    
    if (guidance.focusEmotions) {
      this.focusEmotions = guidance.focusEmotions;
    }
    
    if (guidance.deepAnalysis) {
      this.deepAnalysis = true;
    }
  }
}

module.exports = EmotionAgent;
