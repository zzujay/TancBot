/**
 * LLM情感分析Agent
 * 基于大语言模型的情感分析
 */

const LLMAgent = require('./llm-agent');
const logger = require('../utils/logger');

/**
 * LLM情感分析Agent
 * 使用大语言模型进行深度情感分析
 */
class LLMSentimentAgent extends LLMAgent {
  constructor(config = {}) {
    super('LLMSentimentAgent', '基于大语言模型的情感分析Agent', {
      provider: config.provider || 'openai',
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 1500,
      temperature: config.temperature || 0.3,
      ...config
    });
    
    this.sentimentCategories = {
      positive: { label: '正面', emoji: '😊', color: '#4CAF50' },
      negative: { label: '负面', emoji: '😞', color: '#F44336' },
      neutral: { label: '中性', emoji: '😐', color: '#9E9E9E' },
      mixed: { label: '混合', emoji: '🤔', color: '#FF9800' }
    };
    
    this.emotionTypes = [
      'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 
      'trust', 'anticipation', 'love', 'hate', 'excitement', 'anxiety'
    ];
  }

  async process(data, context = {}) {
    logger.info(`LLM情感分析开始处理 ${data.length} 条数据`);
    
    const results = {
      overallSentiment: 0,
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
      emotionDistribution: {},
      detailedAnalysis: [],
      keyInsights: [],
      confidence: 0,
      modelInfo: {
        name: this.config.model,
        provider: this.config.provider,
        type: 'LLM'
      }
    };

    let totalScore = 0;
    let validItems = 0;
    let totalConfidence = 0;

    // 批量处理数据以提高效率
    const batchSize = 5; // 每批处理5条数据
    const batches = this.createBatches(data, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`处理第 ${i + 1}/${batches.length} 批数据 (${batch.length} 条)`);
      
      try {
        const batchResults = await this.analyzeBatch(batch, context);
        
        batchResults.forEach((analysis, index) => {
          const item = batch[index];
          
          results.detailedAnalysis.push({
            id: item.id,
            content: item.content,
            sentiment: analysis.sentiment,
            score: analysis.score,
            confidence: analysis.confidence,
            emotions: analysis.emotions,
            aspects: analysis.aspects,
            keywords: analysis.keywords,
            explanation: analysis.explanation,
            language: analysis.language,
            culturalContext: analysis.culturalContext
          });

          totalScore += analysis.score;
          totalConfidence += analysis.confidence;
          validItems++;
          
          // 统计情感分布
          results.sentimentDistribution[analysis.sentiment]++;
          
          // 统计情绪分布
          analysis.emotions.forEach(emotion => {
            results.emotionDistribution[emotion.type] = (results.emotionDistribution[emotion.type] || 0) + emotion.intensity;
          });
        });
        
      } catch (error) {
        logger.error(`批次 ${i + 1} LLM情感分析失败:`, error);
        
        // 如果批次失败，逐个处理
        for (const item of batch) {
          try {
            const analysis = await this.analyzeSingle(item.content, context);
            
            results.detailedAnalysis.push({
              id: item.id,
              content: item.content,
              ...analysis
            });
            
            totalScore += analysis.score;
            totalConfidence += analysis.confidence;
            validItems++;
            results.sentimentDistribution[analysis.sentiment]++;
            
          } catch (singleError) {
            logger.error(`单条数据LLM情感分析失败:`, singleError);
            
            // 使用回退方案
            const fallbackAnalysis = this.generateFallbackAnalysis(item.content);
            results.detailedAnalysis.push({
              id: item.id,
              content: item.content,
              ...fallbackAnalysis
            });
            
            totalScore += fallbackAnalysis.score;
            totalConfidence += fallbackAnalysis.confidence;
            validItems++;
            results.sentimentDistribution[fallbackAnalysis.sentiment]++;
          }
        }
      }
    }

    if (validItems > 0) {
      results.overallSentiment = totalScore / validItems;
      results.confidence = totalConfidence / validItems;
    }

    // 生成高级洞察
    results.keyInsights = this.generateAdvancedInsights(results);
    
    // 设置置信度
    this.setConfidence(results.confidence);
    this.updateLastUsed();

    logger.info(`LLM情感分析完成，整体情感得分: ${results.overallSentiment.toFixed(2)}，置信度: ${results.confidence.toFixed(2)}`);
    return results;
  }

  createBatches(data, batchSize) {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  async analyzeBatch(batch, context) {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getBatchAnalysisPrompt(batch, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseBatchResponse(response, batch);
  }

  async analyzeSingle(text, context) {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getSingleAnalysisPrompt(text, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseSingleResponse(response);
  }

  getSystemPrompt() {
    return `你是一个专业的中文情感分析专家。请对用户提供的文本进行深度情感分析，包括：

1. 情感分类：positive（正面）、negative（负面）、neutral（中性）、mixed（混合）
2. 情感强度：-1.0（极度负面）到1.0（极度正面）
3. 置信度：0.0到1.0
4. 情绪识别：识别具体的情绪类型和强度
5. 关键方面：识别文本中提到的关键方面或主题
6. 关键词提取：提取与情感相关的关键词
7. 解释说明：提供情感判断的理由
8. 文化背景：考虑中文文化背景对情感表达的影响

请以JSON格式返回分析结果，确保结果准确、详细、专业。`;
  }

  getBatchAnalysisPrompt(batch, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    let prompt = `请对以下${batch.length}条关于"${keyword}"的文本进行批量情感分析：\n\n`;
    
    batch.forEach((item, index) => {
      prompt += `${index + 1}. ${item.content}\n`;
    });
    
    prompt += `
请为每条文本提供详细的情感分析，包括情感分类、强度、置信度、情绪识别、关键方面、关键词和解释说明。

返回格式：
{
  "results": [
    {
      "sentiment": "positive|negative|neutral|mixed",
      "score": 0.75,
      "confidence": 0.85,
      "emotions": [
        {"type": "joy", "intensity": 0.8},
        {"type": "trust", "intensity": 0.6}
      ],
      "aspects": ["产品质量", "服务态度"],
      "keywords": ["满意", "推荐"],
      "explanation": "用户表达了对产品的满意...",
      "language": "zh",
      "culturalContext": "中文表达习惯"
    }
  ]
}`;

    return prompt;
  }

  getSingleAnalysisPrompt(text, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    return `请对以下关于"${keyword}"的文本进行深度情感分析：

文本内容：
"${text}"

请提供详细的情感分析，包括：
1. 情感分类（positive/negative/neutral/mixed）
2. 情感强度（-1.0到1.0）
3. 置信度（0.0到1.0）
4. 具体情绪识别（如joy、sadness、anger等）
5. 关键方面识别
6. 情感关键词提取
7. 分析解释
8. 语言和文化背景考虑

请以JSON格式返回结果。`;
  }

  parseBatchResponse(response, batch) {
    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(response);
      
      if (parsed.results && Array.isArray(parsed.results)) {
        return parsed.results.map(result => this.normalizeAnalysis(result));
      }
      
      // 如果不是预期格式，尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        if (extracted.results) {
          return extracted.results.map(result => this.normalizeAnalysis(result));
        }
      }
      
      throw new Error('无法解析LLM响应格式');
      
    } catch (error) {
      logger.warn(`LLM响应解析失败，使用备用解析: ${error.message}`);
      return this.parseTextResponse(response, batch.length);
    }
  }

  parseSingleResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return this.normalizeAnalysis(parsed);
    } catch (error) {
      logger.warn(`单条LLM响应解析失败，使用备用解析: ${error.message}`);
      return this.parseTextResponse(response, 1)[0];
    }
  }

  parseTextResponse(text, count) {
    // 备用解析：从文本中提取关键信息
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const sentiment = this.extractSentimentFromText(text);
      const score = this.extractScoreFromText(text);
      const confidence = this.extractConfidenceFromText(text);
      
      results.push({
        sentiment: sentiment,
        score: score,
        confidence: confidence,
        emotions: this.extractEmotionsFromText(text),
        aspects: this.extractAspectsFromText(text),
        keywords: this.extractKeywordsFromText(text),
        explanation: text.substring(0, 200),
        language: 'zh',
        culturalContext: '中文语境'
      });
    }
    
    return results;
  }

  normalizeAnalysis(analysis) {
    return {
      sentiment: this.normalizeSentiment(analysis.sentiment),
      score: this.normalizeScore(analysis.score),
      confidence: this.normalizeConfidence(analysis.confidence),
      emotions: this.normalizeEmotions(analysis.emotions || []),
      aspects: this.normalizeAspects(analysis.aspects || []),
      keywords: this.normalizeKeywords(analysis.keywords || []),
      explanation: analysis.explanation || '基于LLM分析',
      language: analysis.language || 'zh',
      culturalContext: analysis.culturalContext || '中文语境'
    };
  }

  normalizeSentiment(sentiment) {
    const validSentiments = ['positive', 'negative', 'neutral', 'mixed'];
    const normalized = sentiment?.toLowerCase()?.trim();
    return validSentiments.includes(normalized) ? normalized : 'neutral';
  }

  normalizeScore(score) {
    const numScore = parseFloat(score) || 0;
    return Math.max(-1, Math.min(1, numScore));
  }

  normalizeConfidence(confidence) {
    const numConfidence = parseFloat(confidence) || 0.5;
    return Math.max(0, Math.min(1, numConfidence));
  }

  normalizeEmotions(emotions) {
    if (!Array.isArray(emotions)) return [];
    
    return emotions.map(emotion => ({
      type: emotion.type || 'unknown',
      intensity: Math.max(0, Math.min(1, parseFloat(emotion.intensity) || 0.5))
    })).filter(emotion => this.emotionTypes.includes(emotion.type));
  }

  normalizeAspects(aspects) {
    if (!Array.isArray(aspects)) return [];
    return aspects.filter(aspect => typeof aspect === 'string' && aspect.length > 0);
  }

  normalizeKeywords(keywords) {
    if (!Array.isArray(keywords)) return [];
    return keywords.filter(keyword => typeof keyword === 'string' && keyword.length > 0);
  }

  // 文本提取备用方法
  extractSentimentFromText(text) {
    if (text.includes('正面') || text.includes('积极') || text.includes('positive')) return 'positive';
    if (text.includes('负面') || text.includes('消极') || text.includes('negative')) return 'negative';
    if (text.includes('中性') || text.includes('neutral')) return 'neutral';
    return 'neutral';
  }

  extractScoreFromText(text) {
    const scoreMatch = text.match(/(-?\d+(?:\.\d+)?)/);
    return scoreMatch ? parseFloat(scoreMatch[1]) : 0;
  }

  extractConfidenceFromText(text) {
    const confidenceMatch = text.match(/置信度[:：]\s*(-?\d+(?:\.\d+)?)/);
    return confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
  }

  extractEmotionsFromText(text) {
    const emotions = [];
    this.emotionTypes.forEach(emotion => {
      if (text.includes(emotion)) {
        emotions.push({
          type: emotion,
          intensity: 0.6
        });
      }
    });
    return emotions.length > 0 ? emotions : [{ type: 'neutral', intensity: 0.5 }];
  }

  extractAspectsFromText(text) {
    return ['产品质量', '服务态度', '价格合理性']; // 简化版本
  }

  extractKeywordsFromText(text) {
    return ['关键词1', '关键词2']; // 简化版本
  }

  generateFallbackAnalysis(text) {
    // 基于规则的情感分析作为回退方案
    const sentiment = this.ruleBasedSentimentAnalysis(text);
    
    return {
      sentiment: sentiment.sentiment,
      score: sentiment.score,
      confidence: sentiment.confidence * 0.6, // 降低置信度
      emotions: sentiment.emotions,
      aspects: sentiment.aspects,
      keywords: sentiment.keywords,
      explanation: '基于规则的情感分析（LLM调用失败时的回退方案）',
      language: 'zh',
      culturalContext: '中文语境'
    };
  }

  ruleBasedSentimentAnalysis(text) {
    const positiveWords = ['好', '棒', '优秀', '喜欢', '支持', '赞', '爱', '开心', '满意', '不错', '很好', '推荐'];
    const negativeWords = ['差', '糟糕', '讨厌', '反对', '批评', '愤怒', '失望', '难过', '痛苦', '不好', '垃圾'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });
    
    const totalWords = positiveScore + negativeScore;
    const confidence = totalWords > 0 ? Math.min(0.8, totalWords * 0.2) : 0.3;
    
    let sentiment, score;
    
    if (positiveScore > negativeScore) {
      sentiment = 'positive';
      score = positiveScore / totalWords;
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';
      score = -negativeScore / totalWords;
    } else {
      sentiment = 'neutral';
      score = 0;
    }
    
    return {
      sentiment: sentiment,
      score: score,
      confidence: confidence,
      emotions: [{ type: sentiment, intensity: Math.abs(score) }],
      aspects: ['整体评价'],
      keywords: positiveScore > negativeScore ? positiveWords.filter(w => text.includes(w)) : negativeWords.filter(w => text.includes(w))
    };
  }

  generateAdvancedInsights(results) {
    const insights = [];
    
    // 基于情感分布的洞察
    const total = Object.values(results.sentimentDistribution).reduce((a, b) => a + b, 0);
    const positiveRatio = results.sentimentDistribution.positive / total;
    const negativeRatio = results.sentimentDistribution.negative / total;
    
    if (positiveRatio > 0.6) {
      insights.push('LLM分析显示整体情感偏向正面，用户态度积极');
    } else if (negativeRatio > 0.4) {
      insights.push('LLM检测到较多负面情绪，建议关注用户不满的具体原因');
    } else {
      insights.push('LLM分析显示情感分布相对均衡，用户态度较为中性');
    }
    
    // 基于置信度的洞察
    if (results.confidence < 0.7) {
      insights.push('模型置信度较低，建议增加数据量或检查文本质量');
    }
    
    // 基于情绪分布的洞察
    const dominantEmotion = Object.entries(results.emotionDistribution)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (dominantEmotion) {
      insights.push(`最突出的情绪是"${dominantEmotion[0]}"，相关度${(dominantEmotion[1] / total).toFixed(1)}`);
    }
    
    return insights;
  }
}

module.exports = LLMSentimentAgent;