const BaseAgent = require('./base-agent');
const Sentiment = require('sentiment');
const natural = require('natural');
const logger = require('../utils/logger');

class SentimentAgent extends BaseAgent {
  constructor() {
    super('SentimentAgent', '情感分析Agent，分析文本的情感倾向');
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
    this.chineseSentimentWords = {
      positive: [
        '好', '棒', '优秀', '喜欢', '支持', '赞', '爱', '开心', '快乐', '满意',
        '不错', '很好', '太好了', '完美', '精彩', '成功', '胜利', '进步', '提高'
      ],
      negative: [
        '差', '糟糕', '讨厌', '反对', '批评', '愤怒', '生气', '失望', '难过', '痛苦',
        '不好', '很差', '太糟糕', '失败', '问题', '错误', '危险', '担心', '害怕'
      ]
    };
  }

  async initialize() {
    await super.initialize();
    // 移除有问题的语言注册，直接使用内置功能
    logger.info('情感分析Agent初始化完成');
  }

  async process(data, context = {}) {
    logger.info(`情感分析Agent开始处理 ${data.length} 条数据`);
    
    const results = {
      overallSentiment: 0,
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
      detailedAnalysis: [],
      keyInsights: []
    };

    let totalScore = 0;
    let validItems = 0;

    for (const item of data) {
      try {
        const analysis = await this.analyzeSentiment(item.content);
        
        results.detailedAnalysis.push({
          id: item.id,
          content: item.content,
          sentiment: analysis.sentiment,
          score: analysis.score,
          confidence: analysis.confidence,
          keywords: analysis.keywords
        });

        totalScore += analysis.score;
        validItems++;
        
        // 统计情感分布
        if (analysis.sentiment === 'positive') {
          results.sentimentDistribution.positive++;
        } else if (analysis.sentiment === 'negative') {
          results.sentimentDistribution.negative++;
        } else {
          results.sentimentDistribution.neutral++;
        }
      } catch (error) {
        logger.error('情感分析失败:', error);
      }
    }

    if (validItems > 0) {
      results.overallSentiment = totalScore / validItems;
    }

    // 生成关键洞察
    results.keyInsights = this.generateSentimentInsights(results);

    // 设置置信度
    this.setConfidence(this.calculateConfidence(results));
    this.updateLastUsed();

    logger.info(`情感分析完成，整体情感得分: ${results.overallSentiment.toFixed(2)}`);
    return results;
  }

  async analyzeSentiment(text) {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        keywords: []
      };
    }

    // 基础情感分析
    const basicResult = this.sentiment.analyze(text);
    
    // 中文情感分析增强
    const chineseAnalysis = this.analyzeChineseSentiment(text);
    
    // 综合评分
    const combinedScore = (basicResult.score + chineseAnalysis.score) / 2;
    const sentiment = this.classifySentiment(combinedScore);
    
    // 提取情感关键词
    const keywords = this.extractSentimentKeywords(text);

    return {
      sentiment: sentiment,
      score: combinedScore,
      confidence: this.calculateSentimentConfidence(text, combinedScore),
      keywords: keywords
    };
  }

  analyzeChineseSentiment(text) {
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    // 计算积极词汇
    this.chineseSentimentWords.positive.forEach(word => {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      positiveCount += count;
      score += count * 2;
    });

    // 计算消极词汇
    this.chineseSentimentWords.negative.forEach(word => {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      negativeCount += count;
      score -= count * 2;
    });

    return {
      score: score,
      positiveCount: positiveCount,
      negativeCount: negativeCount
    };
  }

  classifySentiment(score) {
    if (score > 1) return 'positive';
    if (score < -1) return 'negative';
    return 'neutral';
  }

  extractSentimentKeywords(text) {
    const words = this.tokenizer.tokenize(text);
    const keywords = [];

    // 提取积极关键词
    this.chineseSentimentWords.positive.forEach(word => {
      if (text.includes(word)) {
        keywords.push({ word: word, type: 'positive' });
      }
    });

    // 提取消极关键词
    this.chineseSentimentWords.negative.forEach(word => {
      if (text.includes(word)) {
        keywords.push({ word: word, type: 'negative' });
      }
    });

    return keywords;
  }

  calculateSentimentConfidence(text, score) {
    // 基于文本长度和情感强度计算置信度
    const length = text.length;
    const intensity = Math.abs(score);
    
    let confidence = 0.5; // 基础置信度
    
    // 文本越长，置信度越高（但有上限）
    if (length > 10) confidence += 0.2;
    if (length > 30) confidence += 0.1;
    
    // 情感强度越高，置信度越高
    if (intensity > 3) confidence += 0.2;
    if (intensity > 5) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  generateSentimentInsights(results) {
    const insights = [];
    const total = results.sentimentDistribution.positive + 
                  results.sentimentDistribution.negative + 
                  results.sentimentDistribution.neutral;

    if (total === 0) return insights;

    const positiveRate = results.sentimentDistribution.positive / total;
    const negativeRate = results.sentimentDistribution.negative / total;

    if (positiveRate > 0.6) {
      insights.push('整体情感倾向积极，用户满意度较高');
    } else if (negativeRate > 0.6) {
      insights.push('整体情感倾向消极，存在较多负面情绪');
    } else {
      insights.push('情感分布相对均衡，用户态度较为中性');
    }

    if (results.overallSentiment > 2) {
      insights.push('情感得分较高，用户反馈偏向正面');
    } else if (results.overallSentiment < -2) {
      insights.push('情感得分较低，需要关注用户不满情绪');
    }

    return insights;
  }

  calculateConfidence(results) {
    const total = results.sentimentDistribution.positive + 
                  results.sentimentDistribution.negative + 
                  results.sentimentDistribution.neutral;
    
    if (total === 0) return 0;

    // 基于数据量和情感分布计算置信度
    const dataQuality = Math.min(total / 50, 1); // 至少需要50条数据
    const clarity = 1 - Math.min(
      results.sentimentDistribution.neutral / total, 
      0.8
    ); // 中性比例越低，清晰度越高

    return (dataQuality + clarity) / 2;
  }
}

module.exports = SentimentAgent;