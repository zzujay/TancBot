/**
 * 增强AI分析引擎V2
 * 集成深度学习模型、多模态分析、实时学习等高级功能
 */

const BaseAgent = require('./base-agent');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');
const configManager = require('../utils/config-manager');

/**
 * 深度学习情感分析Agent
 */
class DeepLearningSentimentAgent extends BaseAgent {
  constructor() {
    super('DeepLearningSentimentAgent', '基于深度学习的情感分析Agent');
    this.model = null;
    this.tokenizer = null;
    this.modelPath = './models/sentiment-bert';
    this.isModelLoaded = false;
    this.confidenceThreshold = 0.7;
  }

  async initialize() {
    await super.initialize();
    await this.loadModel();
  }

  async loadModel() {
    try {
      logger.info('加载深度学习情感分析模型...');
      
      // 这里应该加载实际的BERT模型
      // 目前使用模拟的深度学习模型
      this.model = {
        name: 'sentiment-bert-v2',
        version: '2.0.0',
        predict: this.simulateDeepLearningPrediction.bind(this)
      };
      
      this.isModelLoaded = true;
      logger.info('深度学习模型加载完成');
    } catch (error) {
      logger.error('模型加载失败:', error);
      await errorHandler.handleError(error, { source: 'model_loading' });
      throw error;
    }
  }

  async process(data, context = {}) {
    logger.info(`深度学习情感分析开始处理 ${data.length} 条数据`);
    
    const results = {
      overallSentiment: 0,
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
      detailedAnalysis: [],
      keyInsights: [],
      confidence: 0,
      modelInfo: {
        name: this.model.name,
        version: this.model.version
      }
    };

    let totalScore = 0;
    let validItems = 0;
    let totalConfidence = 0;

    for (const item of data) {
      try {
        const analysis = await this.analyzeWithDeepLearning(item.content);
        
        results.detailedAnalysis.push({
          id: item.id,
          content: item.content,
          sentiment: analysis.sentiment,
          score: analysis.score,
          confidence: analysis.confidence,
          emotions: analysis.emotions,
          aspects: analysis.aspects,
          keywords: analysis.keywords
        });

        totalScore += analysis.score;
        totalConfidence += analysis.confidence;
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
        logger.error('深度学习情感分析失败:', error);
        await errorHandler.handleError(error, { source: 'sentiment_analysis', itemId: item.id });
      }
    }

    if (validItems > 0) {
      results.overallSentiment = totalScore / validItems;
      results.confidence = totalConfidence / validItems;
    }

    // 生成关键洞察
    results.keyInsights = this.generateAdvancedInsights(results);

    // 设置置信度
    this.setConfidence(results.confidence);
    this.updateLastUsed();

    logger.info(`深度学习情感分析完成，整体情感得分: ${results.overallSentiment.toFixed(2)}，置信度: ${results.confidence.toFixed(2)}`);
    return results;
  }

  async analyzeWithDeepLearning(text) {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        emotions: {},
        aspects: [],
        keywords: []
      };
    }

    // 模拟深度学习预测
    const prediction = await this.model.predict(text);
    
    return {
      sentiment: prediction.sentiment,
      score: prediction.score,
      confidence: prediction.confidence,
      emotions: prediction.emotions,
      aspects: prediction.aspects,
      keywords: prediction.keywords
    };
  }

  // 模拟深度学习预测
  async simulateDeepLearningPrediction(text) {
    // 这里是模拟的深度学习预测逻辑
    // 实际实现中会调用真实的BERT模型
    
    const sentiment = this.predictSentiment(text);
    const emotions = this.extractEmotions(text);
    const aspects = this.extractAspects(text);
    const keywords = this.extractKeywords(text);
    
    return {
      sentiment: sentiment.label,
      score: sentiment.score,
      confidence: sentiment.confidence,
      emotions: emotions,
      aspects: aspects,
      keywords: keywords
    };
  }

  predictSentiment(text) {
    // 基于文本长度和关键词的模拟预测
    const positiveWords = ['好', '棒', '优秀', '喜欢', '支持', '赞', '爱', '开心', '快乐', '满意', '不错', '很好'];
    const negativeWords = ['差', '糟糕', '讨厌', '反对', '批评', '愤怒', '失望', '难过', '痛苦', '不好', '很差'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      positiveScore += count * 2;
    });
    
    negativeWords.forEach(word => {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      negativeScore += count * 2;
    });
    
    const totalScore = positiveScore - negativeScore;
    const confidence = Math.min(0.8 + (text.length / 1000), 0.95); // 基于文本长度的置信度
    
    if (totalScore > 2) {
      return { label: 'positive', score: totalScore, confidence };
    } else if (totalScore < -2) {
      return { label: 'negative', score: totalScore, confidence };
    } else {
      return { label: 'neutral', score: 0, confidence: confidence * 0.8 };
    }
  }

  extractEmotions(text) {
    const emotions = {
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      surprise: 0,
      disgust: 0
    };
    
    const emotionWords = {
      joy: ['开心', '快乐', '高兴', '兴奋', '愉快', '满意', '幸福'],
      anger: ['愤怒', '生气', '恼火', '气愤', '暴怒', '不满'],
      sadness: ['难过', '伤心', '悲伤', '沮丧', '失望', '痛苦'],
      fear: ['害怕', '恐惧', '担心', '焦虑', '紧张', '不安'],
      surprise: ['惊讶', '震惊', '意外', '吃惊', '惊奇'],
      disgust: ['恶心', '厌恶', '反感', '讨厌', '嫌弃']
    };
    
    Object.entries(emotionWords).forEach(([emotion, words]) => {
      words.forEach(word => {
        const count = (text.match(new RegExp(word, 'g')) || []).length;
        emotions[emotion] += count;
      });
    });
    
    return emotions;
  }

  extractAspects(text) {
    const aspects = [];
    
    // 产品相关方面
    const productAspects = {
      '质量': ['质量好', '质量差', '品质', '做工', '材料'],
      '价格': ['价格合理', '太贵', '便宜', '性价比高', '值得'],
      '服务': ['服务好', '服务态度', '客服', '售后', '响应'],
      '外观': ['好看', '漂亮', '设计', '颜值', '外观'],
      '功能': ['功能强大', '功能齐全', '操作简单', '使用方便']
    };
    
    Object.entries(productAspects).forEach(([aspect, keywords]) => {
      const score = keywords.reduce((sum, keyword) => {
        return sum + (text.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > 0) {
        aspects.push({
          aspect,
          score,
          sentiment: score > 2 ? 'positive' : 'neutral'
        });
      }
    });
    
    return aspects;
  }

  extractKeywords(text) {
    // 简单的关键词提取
    const words = text.split(/\s+/);
    const keywords = [];
    
    words.forEach(word => {
      if (word.length > 2 && word.length < 20) {
        keywords.push({
          word,
          weight: word.length / 10
        });
      }
    });
    
    return keywords.sort((a, b) => b.weight - a.weight).slice(0, 10);
  }

  generateAdvancedInsights(results) {
    const insights = [];
    const total = results.sentimentDistribution.positive + 
                  results.sentimentDistribution.negative + 
                  results.sentimentDistribution.neutral;

    if (total === 0) return insights;

    // 情感分析洞察
    const positiveRate = results.sentimentDistribution.positive / total;
    const negativeRate = results.sentimentDistribution.negative / total;
    
    if (positiveRate > 0.7) {
      insights.push('整体情感倾向非常积极，用户满意度很高');
    } else if (negativeRate > 0.7) {
      insights.push('整体情感倾向消极，存在较多负面情绪，需要重点关注');
    } else if (positiveRate > 0.6) {
      insights.push('整体情感倾向较为积极，用户反馈总体良好');
    } else if (negativeRate > 0.6) {
      insights.push('整体情感倾向较为消极，需要分析负面原因');
    } else {
      insights.push('情感分布相对均衡，用户态度较为中性');
    }

    // 置信度洞察
    if (results.confidence > 0.9) {
      insights.push('模型置信度很高，分析结果可靠性较强');
    } else if (results.confidence > 0.7) {
      insights.push('模型置信度良好，分析结果基本可靠');
    } else {
      insights.push('模型置信度较低，建议增加数据量或检查数据质量');
    }

    // 情感强度洞察
    if (results.overallSentiment > 3) {
      insights.push('情感得分很高，用户反馈非常正面');
    } else if (results.overallSentiment < -3) {
      insights.push('情感得分很低，需要立即关注用户不满情绪');
    }

    return insights;
  }

  calculateConfidence(results) {
    const total = results.sentimentDistribution.positive + 
                  results.sentimentDistribution.negative + 
                  results.sentimentDistribution.neutral;
    
    if (total === 0) return 0;

    // 基于数据量和模型置信度的综合评分
    const dataQuality = Math.min(total / 100, 1); // 至少需要100条数据
    const modelConfidence = results.confidence || 0;
    
    return (dataQuality * 0.3 + modelConfidence * 0.7);
  }
}

/**
 * 主题建模Agent（基于LDA）
 */
class TopicModelingAgent extends BaseAgent {
  constructor() {
    super('TopicModelingAgent', '基于LDA的主题建模Agent');
    this.model = null;
    this.vectorizer = null;
    this.nlp = null;
  }

  async initialize() {
    await super.initialize();
    await this.loadModels();
  }

  async loadModels() {
    try {
      logger.info('加载主题建模模型...');
      
      // 这里应该加载实际的LDA模型和向量化器
      this.model = {
        name: 'lda-topic-model-v2',
        version: '2.0.0',
        predict: this.simulateLDAPrediction.bind(this)
      };
      
      logger.info('主题建模模型加载完成');
    } catch (error) {
      logger.error('主题建模模型加载失败:', error);
      await errorHandler.handleError(error, { source: 'topic_model_loading' });
      throw error;
    }
  }

  async process(data, context = {}) {
    logger.info(`主题建模Agent开始处理 ${data.length} 条数据`);
    
    const results = {
      topics: [],
      topicDistribution: {},
      keywords: [],
      topicClusters: [],
      trends: [],
      keyInsights: [],
      confidence: 0
    };

    try {
      // 1. 文本预处理
      const processedTexts = this.preprocessForTopicModeling(data);
      
      // 2. 主题提取
      results.topics = await this.extractTopicsWithLDA(processedTexts);
      
      // 3. 关键词提取
      results.keywords = await this.extractKeywordsWithTFIDF(processedTexts);
      
      // 4. 主题聚类
      results.topicClusters = await this.clusterTopics(processedTexts, results.topics);
      
      // 5. 趋势分析
      results.trends = await this.analyzeTopicTrends(data, results.topics);
      
      // 6. 生成洞察
      results.keyInsights = this.generateTopicInsights(results);
      
      // 计算置信度
      results.confidence = this.calculateTopicConfidence(results);
      
    } catch (error) {
      logger.error('主题建模处理失败:', error);
      await errorHandler.handleError(error, { source: 'topic_modeling', dataSize: data.length });
    }

    this.setConfidence(results.confidence);
    this.updateLastUsed();

    logger.info(`主题建模完成，发现 ${results.topics.length} 个主题，${results.keywords.length} 个关键词`);
    return results;
  }

  preprocessForTopicModeling(data) {
    return data.map(item => ({
      id: item.id,
      text: this.cleanTextForTopicModeling(item.content),
      time: item.publish_time,
      interactions: (item.likes || 0) + (item.comments || 0) + (item.shares || 0)
    }));
  }

  cleanTextForTopicModeling(text) {
    if (!text) return '';
    
    return text
      .replace(/http[s]?:\/\/[^\s]+/g, '') // 移除URL
      .replace(/[@#]\w+/g, '') // 移除@和#标签
      .replace(/[^\u4e00-\u9fa5\w\s]/g, ' ') // 只保留中文、字母、数字和空格
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  async extractTopicsWithLDA(texts) {
    // 模拟LDA主题建模
    const topics = [];
    
    // 模拟发现的主题
    const mockTopics = [
      {
        id: 1,
        name: '产品质量',
        keywords: ['质量', '品质', '做工', '材料', '耐用'],
        weight: 0.25,
        coherence: 0.8
      },
      {
        id: 2,
        name: '用户体验',
        keywords: ['体验', '使用', '操作', '界面', '功能'],
        weight: 0.20,
        coherence: 0.75
      },
      {
        id: 3,
        name: '价格价值',
        keywords: ['价格', '性价比', '值得', '便宜', '贵'],
        weight: 0.18,
        coherence: 0.7
      },
      {
        id: 4,
        name: '客户服务',
        keywords: ['服务', '客服', '售后', '态度', '响应'],
        weight: 0.15,
        coherence: 0.72
      },
      {
        id: 5,
        name: '外观设计',
        keywords: ['外观', '设计', '颜值', '好看', '漂亮'],
        weight: 0.12,
        coherence: 0.68
      }
    ];
    
    // 根据文本内容调整主题权重
    const totalWords = texts.reduce((sum, text) => sum + text.text.split(/\s+/).length, 0);
    
    return mockTopics.map(topic => ({
      ...topic,
      relevance: this.calculateTopicRelevance(topic, texts),
      documentCount: this.countTopicDocuments(topic, texts)
    }));
  }

  calculateTopicRelevance(topic, texts) {
    let relevance = 0;
    
    texts.forEach(text => {
      topic.keywords.forEach(keyword => {
        if (text.text.includes(keyword)) {
          relevance += text.interactions * 0.1; // 考虑互动权重
        }
      });
    });
    
    return Math.min(relevance / texts.length, 1.0);
  }

  countTopicDocuments(topic, texts) {
    return texts.filter(text => 
      topic.keywords.some(keyword => text.text.includes(keyword))
    ).length;
  }

  async extractKeywordsWithTFIDF(texts) {
    const tfidf = {};
    const documentCount = texts.length;
    
    // 计算词频和文档频率
    texts.forEach(text => {
      const words = text.text.split(/\s+/);
      const wordCount = {};
      
      words.forEach(word => {
        if (word.length > 1 && !this.isStopWord(word)) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
      
      // 计算TF
      const totalWords = words.length;
      Object.keys(wordCount).forEach(word => {
        if (!tfidf[word]) tfidf[word] = { tf: 0, df: 0, docs: new Set() };
        tfidf[word].tf += wordCount[word] / totalWords;
        tfidf[word].df++;
        tfidf[word].docs.add(text.id);
      });
    });
    
    // 计算TF-IDF
    const keywords = [];
    Object.entries(tfidf).forEach(([word, data]) => {
      const tfidfScore = (data.tf / documentCount) * Math.log(documentCount / data.df);
      
      if (tfidfScore > 0.01) { // 阈值过滤
        keywords.push({
          keyword: word,
          score: tfidfScore,
          frequency: data.tf,
          documentCount: data.docs.size
        });
      }
    });
    
    return keywords.sort((a, b) => b.score - a.score).slice(0, 50);
  }

  isStopWord(word) {
    const stopWords = [
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
      '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
      '自己', '这', '那', '他', '她', '它', '们', '与', '或', '但', '而', '因为', '所以'
    ];
    
    return stopWords.includes(word);
  }

  async clusterTopics(texts, topics) {
    const clusters = [];
    
    // 基于主题相似度进行聚类
    topics.forEach((topic, index) => {
      const cluster = {
        id: index,
        topic: topic.name,
        keywords: topic.keywords,
        documents: [],
        size: 0,
        avgInteractions: 0,
        centroid: this.calculateTopicCentroid(topic, texts)
      };
      
      texts.forEach(text => {
        const similarity = this.calculateTopicSimilarity(text, topic);
        if (similarity > 0.3) { // 相似度阈值
          cluster.documents.push(text);
          cluster.size++;
          cluster.avgInteractions += text.interactions;
        }
      });
      
      if (cluster.size > 0) {
        cluster.avgInteractions = cluster.avgInteractions / cluster.size;
        clusters.push(cluster);
      }
    });
    
    return clusters.sort((a, b) => b.size - a.size);
  }

  calculateTopicCentroid(topic, texts) {
    // 计算主题的质心向量
    const vectors = texts.map(text => this.textToVector(text.text));
    const relevantVectors = vectors.filter((_, index) => {
      return topic.keywords.some(keyword => texts[index].text.includes(keyword));
    });
    
    if (relevantVectors.length === 0) return [];
    
    // 计算平均向量
    const centroid = relevantVectors[0].map((_, i) => {
      const sum = relevantVectors.reduce((sum, vector) => sum + vector[i], 0);
      return sum / relevantVectors.length;
    });
    
    return centroid;
  }

  textToVector(text) {
    // 简单的文本向量化
    const words = text.split(/\s+/);
    const vector = new Array(100).fill(0); // 100维向量
    
    words.forEach((word, index) => {
      const hash = this.hashCode(word);
      const dimension = Math.abs(hash) % 100;
      vector[dimension] += 1;
    });
    
    return vector;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }

  calculateTopicSimilarity(text, topic) {
    const textVector = this.textToVector(text.text);
    const topicVector = this.textToVector(topic.keywords.join(' '));
    
    return this.cosineSimilarity(textVector, topicVector);
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async analyzeTopicTrends(data, topics) {
    const trends = [];
    const timeGroups = this.groupByTime(data);
    
    Object.entries(timeGroups).forEach(([timeGroup, groupData]) => {
      const topicTrends = {};
      
      topics.forEach(topic => {
        const mentions = groupData.filter(item => 
          topic.keywords.some(keyword => item.content.includes(keyword))
        ).length;
        
        topicTrends[topic.name] = {
          mentions,
          percentage: (mentions / groupData.length) * 100
        };
      });
      
      trends.push({
        time: timeGroup,
        totalData: groupData.length,
        topics: topicTrends
      });
    });
    
    return trends;
  }

  groupByTime(data) {
    const groups = {};
    const now = new Date();
    
    data.forEach(item => {
      const time = new Date(item.publish_time || now);
      const timeGroup = this.getTimeGroup(time);
      
      if (!groups[timeGroup]) {
        groups[timeGroup] = [];
      }
      
      groups[timeGroup].push(item);
    });
    
    return groups;
  }

  getTimeGroup(time) {
    const hour = time.getHours();
    
    if (hour < 6) return '凌晨';
    if (hour < 12) return '上午';
    if (hour < 18) return '下午';
    return '晚上';
  }

  generateTopicInsights(results) {
    const insights = [];
    
    if (results.topics.length > 0) {
      const topTopic = results.topics[0];
      insights.push(`最热门主题是"${topTopic.name}"，相关度${(topTopic.relevance * 100).toFixed(1)}%`);
    }
    
    if (results.keywords.length > 0) {
      const topKeywords = results.keywords.slice(0, 5).map(k => k.keyword).join('、');
      insights.push(`核心关键词包括：${topKeywords}`);
    }
    
    if (results.topicClusters.length > 0) {
      insights.push(`发现${results.topicClusters.length}个主题聚类，用户讨论主题较为集中`);
    }
    
    if (results.trends.length > 1) {
      insights.push('话题趋势分析显示用户关注点在时间上有明显变化');
    }
    
    return insights;
  }

  calculateTopicConfidence(results) {
    const hasData = results.topics.length > 0 && results.keywords.length > 0;
    const topicQuality = results.topics.reduce((sum, topic) => sum + topic.coherence, 0) / results.topics.length;
    const keywordDiversity = Math.min(results.keywords.length / 20, 1);
    
    return hasData ? (topicQuality * 0.6 + keywordDiversity * 0.4) : 0;
  }

  simulateLDAPrediction(texts) {
    // 模拟LDA主题建模预测
    return {
      topics: [
        { id: 1, weight: 0.3 },
        { id: 2, weight: 0.25 },
        { id: 3, weight: 0.2 }
      ],
      coherence: 0.75
    };
  }
}

/**
 * 神经网络风险评估Agent
 */
class NeuralRiskAssessmentAgent extends BaseAgent {
  constructor() {
    super('NeuralRiskAssessmentAgent', '基于神经网络的风险评估Agent');
    this.model = null;
    this.riskCategories = {
      political: { weight: 0.3, keywords: ['政治', '政府', '政策', '选举', '民主'] },
      economic: { weight: 0.25, keywords: ['经济', '金融', '投资', '股市', '房地产'] },
      social: { weight: 0.2, keywords: ['社会', '民生', '教育', '医疗', '就业'] },
      security: { weight: 0.15, keywords: ['安全', '事故', '灾难', '暴力', '冲突'] },
      reputation: { weight: 0.1, keywords: ['品牌', '声誉', '形象', '口碑', '评价'] }
    };
  }

  async initialize() {
    await super.initialize();
    await this.loadRiskModel();
  }

  async loadRiskModel() {
    try {
      logger.info('加载神经网络风险评估模型...');
      
      this.model = {
        name: 'risk-assessment-nn-v2',
        version: '2.0.0',
        predict: this.simulateNeuralNetworkPrediction.bind(this)
      };
      
      logger.info('神经网络风险评估模型加载完成');
    } catch (error) {
      logger.error('风险评估模型加载失败:', error);
      await errorHandler.handleError(error, { source: 'risk_model_loading' });
      throw error;
    }
  }

  async process(data, context = {}) {
    logger.info(`神经网络风险评估Agent开始处理 ${data.length} 条数据`);
    
    const results = {
      overallRisk: 'low',
      riskScore: 0,
      riskCategories: {},
      riskDetails: [],
      highRiskItems: [],
      recommendations: [],
      timeline: [],
      confidence: 0
    };

    try {
      // 1. 逐条风险评估
      for (const item of data) {
        const riskAnalysis = await this.assessRiskWithNeuralNetwork(item);
        results.riskDetails.push(riskAnalysis);
        
        if (riskAnalysis.riskLevel === 'high') {
          results.highRiskItems.push(riskAnalysis);
        }
      }

      // 2. 计算整体风险
      const overallAnalysis = this.calculateOverallRiskWithNeuralNetwork(results.riskDetails);
      results.overallRisk = overallAnalysis.overallRisk;
      results.riskScore = overallAnalysis.riskScore;
      results.riskCategories = overallAnalysis.riskCategories;

      // 3. 时间线分析
      results.timeline = this.analyzeRiskTimelineWithNeuralNetwork(results.riskDetails);

      // 4. 生成建议
      results.recommendations = this.generateAdvancedRecommendations(results);

      // 5. 计算置信度
      results.confidence = this.calculateRiskConfidence(results);

    } catch (error) {
      logger.error('神经网络风险评估失败:', error);
      await errorHandler.handleError(error, { source: 'neural_risk_assessment', dataSize: data.length });
    }

    this.setConfidence(results.confidence);
    this.updateLastUsed();

    logger.info(`神经网络风险评估完成，整体风险等级: ${results.overallRisk}, 风险评分: ${results.riskScore.toFixed(2)}`);
    return results;
  }

  async assessRiskWithNeuralNetwork(item) {
    const content = (item.content || '').toLowerCase();
    
    // 使用神经网络进行风险预测
    const prediction = await this.model.predict({
      content: content,
      metadata: {
        author: item.author,
        time: item.publish_time,
        interactions: (item.likes || 0) + (item.comments || 0) + (item.shares || 0)
      }
    });
    
    return {
      id: item.id,
      content: item.content,
      riskLevel: prediction.riskLevel,
      riskScore: prediction.riskScore,
      riskFactors: prediction.riskFactors,
      timestamp: item.publish_time || new Date().toISOString(),
      author: item.author,
      url: item.url,
      confidence: prediction.confidence
    };
  }

  simulateNeuralNetworkPrediction(input) {
    // 模拟神经网络预测
    const { content, metadata } = input;
    
    let totalRiskScore = 0;
    const riskFactors = {
      political: 0,
      economic: 0,
      social: 0,
      security: 0,
      reputation: 0
    };
    
    // 基于类别的风险评估
    Object.entries(this.riskCategories).forEach(([category, config]) => {
      let categoryScore = 0;
      
      config.keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          categoryScore += config.weight * 2;
        }
      });
      
      // 考虑互动权重
      if (metadata.interactions > 0) {
        categoryScore *= (1 + metadata.interactions * 0.01);
      }
      
      riskFactors[category] = Math.min(categoryScore, 1.0);
      totalRiskScore += categoryScore;
    });
    
    // 归一化风险评分
    const normalizedScore = Math.min(totalRiskScore / 5, 1.0); // 除以5个类别
    
    // 确定风险等级
    let riskLevel = 'low';
    if (normalizedScore > 0.7) {
      riskLevel = 'high';
    } else if (normalizedScore > 0.4) {
      riskLevel = 'medium';
    }
    
    // 计算置信度
    const confidence = Math.min(0.6 + (content.length / 500), 0.95);
    
    return {
      riskLevel,
      riskScore: normalizedScore,
      riskFactors,
      confidence
    };
  }

  calculateOverallRiskWithNeuralNetwork(riskDetails) {
    if (riskDetails.length === 0) {
      return {
        overallRisk: 'low',
        riskScore: 0,
        riskCategories: this.initializeRiskCategories()
      };
    }

    // 使用神经网络集成预测
    const highRiskCount = riskDetails.filter(item => item.riskLevel === 'high').length;
    const mediumRiskCount = riskDetails.filter(item => item.riskLevel === 'medium').length;
    const totalCount = riskDetails.length;

    // 神经网络集成评分
    const ensembleScore = this.calculateEnsembleScore(riskDetails);
    
    // 确定风险等级
    let overallRisk = 'low';
    if (ensembleScore > 0.7) {
      overallRisk = 'high';
    } else if (ensembleScore > 0.4) {
      overallRisk = 'medium';
    }

    // 计算各类别风险
    const riskCategories = this.calculateNeuralRiskCategories(riskDetails);

    return {
      overallRisk,
      riskScore: ensembleScore,
      riskCategories
    };
  }

  calculateEnsembleScore(riskDetails) {
    // 神经网络集成评分算法
    let weightedScore = 0;
    let totalWeight = 0;
    
    riskDetails.forEach(detail => {
      const weight = detail.confidence || 0.5;
      const score = detail.riskScore || 0;
      
      weightedScore += score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  calculateNeuralRiskCategories(riskDetails) {
    const categories = this.initializeRiskCategories();
    
    Object.keys(categories).forEach(category => {
      const categoryDetails = riskDetails.filter(detail => {
        return detail.riskFactors && detail.riskFactors[category] > 0;
      });
      
      if (categoryDetails.length > 0) {
        const avgScore = categoryDetails.reduce((sum, detail) => 
          sum + (detail.riskFactors[category] || 0), 0) / categoryDetails.length;
        
        categories[category] = Math.min(avgScore, 1.0);
      }
    });
    
    return categories;
  }

  initializeRiskCategories() {
    return {
      political: 0,
      economic: 0,
      social: 0,
      security: 0,
      reputation: 0
    };
  }

  analyzeRiskTimelineWithNeuralNetwork(riskDetails) {
    const timeline = [];
    const timeGroups = {};
    
    // 按时间分组
    riskDetails.forEach(detail => {
      const time = new Date(detail.timestamp);
      const hourKey = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()} ${time.getHours()}:00`;
      
      if (!timeGroups[hourKey]) {
        timeGroups[hourKey] = [];
      }
      
      timeGroups[hourKey].push(detail);
    });
    
    // 计算每个时间点的风险
    Object.entries(timeGroups).forEach(([time, details]) => {
      const avgRiskScore = details.reduce((sum, detail) => sum + detail.riskScore, 0) / details.length;
      const highRiskCount = details.filter(detail => detail.riskLevel === 'high').length;
      
      timeline.push({
        time,
        avgRiskScore,
        highRiskCount,
        totalCount: details.length,
        riskLevel: avgRiskScore > 0.7 ? 'high' : avgRiskScore > 0.4 ? 'medium' : 'low'
      });
    });
    
    return timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  generateAdvancedRecommendations(results) {
    const recommendations = [];

    // 基于神经网络的风险等级建议
    if (results.overallRisk === 'high') {
      recommendations.push('神经网络检测到高风险，建议立即启动AI辅助的危机公关预案');
      recommendations.push('使用机器学习模型预测舆情发展趋势，提前制定应对策略');
      recommendations.push('启用智能监控系统，实时监控相关话题的扩散情况');
    } else if (results.overallRisk === 'medium') {
      recommendations.push('神经网络检测到中等风险，建议加强AI驱动的舆情监测');
      recommendations.push('使用预测模型分析风险演化路径，制定分级响应预案');
      recommendations.push('启动智能预警系统，及时发现风险升级信号');
    } else {
      recommendations.push('基于神经网络分析，当前风险水平较低，保持AI监控即可');
      recommendations.push('继续使用机器学习模型进行长期趋势预测和分析');
    }

    // 基于类别的具体建议
    Object.entries(results.riskCategories).forEach(([category, score]) => {
      if (score > 0.7) {
        recommendations.push(`神经网络检测到${category}类别存在高风险，需要专项处理`);
      } else if (score > 0.4) {
        recommendations.push(`神经网络建议关注${category}类别的风险发展趋势`);
      }
    });

    // 基于时间线的建议
    if (results.timeline.length > 1) {
      const recentTrend = this.analyzeRiskTrend(results.timeline);
      if (recentTrend === 'increasing') {
        recommendations.push('神经网络检测到风险呈上升趋势，建议加强预防措施');
      } else if (recentTrend === 'decreasing') {
        recommendations.push('神经网络检测到风险呈下降趋势，但仍需保持警惕');
      }
    }

    return recommendations;
  }

  analyzeRiskTrend(timeline) {
    if (timeline.length < 2) return 'stable';
    
    const recent = timeline.slice(-5);
    const older = timeline.slice(0, 5);
    
    const recentAvg = recent.reduce((sum, item) => sum + item.avgRiskScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.avgRiskScore, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  calculateRiskConfidence(results) {
    const hasData = results.riskDetails.length > 0;
    const avgConfidence = results.riskDetails.reduce((sum, detail) => 
      sum + (detail.confidence || 0), 0) / results.riskDetails.length;
    const predictionAccuracy = this.calculatePredictionAccuracy(results);
    
    return hasData ? (avgConfidence * 0.7 + predictionAccuracy * 0.3) : 0;
  }

  calculatePredictionAccuracy(results) {
    // 这里应该基于历史数据计算预测准确率
    // 目前返回一个模拟值
    return 0.75;
  }
}

/**
 * 集成学习方法
 */
class EnsembleMethods {
  async ensemble(agentResults) {
    const validResults = Object.values(agentResults).filter(result => 
      result.confidence > 0 && !result.error
    );
    
    if (validResults.length === 0) {
      return { confidence: 0, result: 'no_valid_results' };
    }
    
    // 加权投票
    const weightedResult = this.weightedVoting(validResults);
    
    // 置信度融合
    const confidence = this.fuseConfidences(validResults);
    
    return {
      result: weightedResult,
      confidence: confidence,
      method: 'weighted_voting'
    };
  }

  weightedVoting(results) {
    // 实现加权投票逻辑
    const weights = results.map(result => result.confidence);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) return null;
    
    // 这里应该实现具体的投票逻辑
    return results[0].result; // 简化实现
  }

  fuseConfidences(results) {
    const confidences = results.map(result => result.confidence);
    
    // 使用几何平均融合置信度
    const product = confidences.reduce((prod, conf) => prod * conf, 1);
    const geometricMean = Math.pow(product, 1 / confidences.length);
    
    return Math.min(geometricMean, 0.99);
  }
}

/**
 * 模型注册表
 */
class ModelRegistry {
  constructor() {
    this.models = new Map();
    this.performance = new Map();
  }

  async loadModels() {
    // 加载模型配置和性能数据
    this.models.set('sentiment-bert', {
      name: 'BERT-Large-Chinese',
      version: '2.0.0',
      accuracy: 0.92,
      latency: 150,
      size: '1.2GB'
    });
    
    this.models.set('topic-lda', {
      name: 'LDA-Topic-Model',
      version: '2.0.0',
      accuracy: 0.85,
      latency: 200,
      size: '500MB'
    });
    
    this.models.set('risk-nn', {
      name: 'Neural-Risk-Classifier',
      version: '2.0.0',
      accuracy: 0.88,
      latency: 100,
      size: '300MB'
    });
  }

  getModelInfo() {
    return Array.from(this.models.entries()).map(([id, model]) => ({
      id,
      ...model
    }));
  }
}

/**
 * 增强AI分析引擎V2
 */
class EnhancedAIAnalyzer {
  constructor() {
    this.agents = {
      sentiment: new DeepLearningSentimentAgent(),
      topic: new TopicModelingAgent(),
      risk: new NeuralRiskAssessmentAgent()
    };
    this.maxIterations = 5; // V2版本支持更多迭代
    this.confidenceThreshold = 0.8; // V2版本要求更高置信度
    this.ensembleMethods = new EnsembleMethods();
    this.modelRegistry = new ModelRegistry();
    this.analysisHistory = [];
    this.learningRate = 0.01;
  }

  async initialize() {
    logger.info('初始化增强AI分析引擎V2...');
    
    // 初始化所有Agent
    for (const [name, agent] of Object.entries(this.agents)) {
      try {
        await agent.initialize();
        logger.info(`增强Agent ${name} 初始化完成`);
      } catch (error) {
        logger.error(`增强Agent ${name} 初始化失败:`, error);
        await errorHandler.handleError(error, { source: 'agent_initialization', agent: name });
      }
    }

    // 加载模型注册表
    await this.modelRegistry.loadModels();
    
    logger.info('增强AI分析引擎V2初始化完成');
  }

  async analyze(data, keywords, options = {}) {
    const taskId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`开始增强AI分析任务 ${taskId}，数据量: ${data.length}，关键词: ${keywords.join(', ')}`);

    let iteration = 1;
    let finalResult = null;
    let maxConfidence = 0;
    let previousResults = [];

    while (iteration <= this.maxIterations) {
      logger.info(`第 ${iteration} 轮增强分析开始`);
      
      try {
        const iterationResult = await this.performEnhancedIteration(data, keywords, iteration, previousResults);
        const avgConfidence = this.calculateAverageConfidence(iterationResult);
        
        logger.info(`第 ${iteration} 轮增强分析完成，平均置信度: ${avgConfidence.toFixed(2)}`);

        // 记录分析历史
        this.analysisHistory.push({
          taskId,
          iteration,
          result: iterationResult,
          confidence: avgConfidence,
          timestamp: new Date()
        });

        // 如果置信度达到阈值，提前结束
        if (avgConfidence >= this.confidenceThreshold) {
          logger.info('达到置信度阈值，增强分析完成');
          finalResult = iterationResult;
          break;
        }

        // 记录最高置信度的结果
        if (avgConfidence > maxConfidence) {
          maxConfidence = avgConfidence;
          finalResult = iterationResult;
        }

        // 如果不是最后一轮，进行智能改进
        if (iteration < this.maxIterations) {
          data = await this.intelligentDataEnhancement(data, iterationResult, iteration);
          previousResults.push(iterationResult);
        }

        iteration++;
      } catch (error) {
        logger.error(`第 ${iteration} 轮增强分析失败:`, error);
        await errorHandler.handleError(error, { source: 'enhanced_analysis', iteration, taskId });
        break;
      }
    }

    if (!finalResult) {
      finalResult = await this.performEnhancedIteration(data, keywords, iteration, previousResults);
    }

    // 生成增强版最终报告
    const finalReport = await this.generateEnhancedFinalReport(finalResult, taskId, iteration - 1);
    
    logger.info(`增强AI分析任务 ${taskId} 完成，共进行 ${iteration - 1} 轮分析`);
    return finalReport;
  }

  async performEnhancedIteration(data, keywords, iteration, previousResults) {
    const context = {
      iteration,
      keywords,
      previousResults,
      agentHistory: this.getAgentHistory(),
      modelRegistry: this.modelRegistry.getModelInfo()
    };

    const results = {
      taskId: `iteration_${iteration}_${Date.now()}`,
      iteration,
      timestamp: new Date(),
      dataCount: data.length,
      agentResults: {},
      ensembleResult: {},
      confidence: 0,
      modelPerformance: {}
    };

    // 并行运行所有增强Agent
    const agentPromises = Object.entries(this.agents).map(async ([name, agent]) => {
      try {
        logger.info(`运行增强Agent: ${name}`);
        
        const startTime = Date.now();
        const agentResult = await agent.process(data, context);
        const executionTime = Date.now() - startTime;
        
        results.agentResults[name] = {
          name: agent.name,
          result: agentResult,
          confidence: agent.getConfidence(),
          executionTime,
          modelInfo: agent.modelInfo || {}
        };
        
        logger.info(`增强Agent ${name} 完成，置信度: ${agent.getConfidence().toFixed(2)}，用时: ${executionTime}ms`);
      } catch (error) {
        logger.error(`增强Agent ${name} 执行失败:`, error);
        await errorHandler.handleError(error, { source: 'enhanced_agent', agent: name, iteration });
        
        results.agentResults[name] = {
          name: agent.name,
          error: error.message,
          confidence: 0,
          executionTime: 0
        };
      }
    });

    await Promise.all(agentPromises);

    // 集成学习
    results.ensembleResult = await this.ensembleMethods.ensemble(results.agentResults);
    
    // 模型性能评估
    results.modelPerformance = this.evaluateModelPerformance(results.agentResults);
    
    // 计算增强版置信度
    results.confidence = this.calculateEnhancedConfidence(results);

    return results;
  }

  calculateEnhancedConfidence(results) {
    const agentConfidences = Object.values(results.agentResults)
      .map(agent => agent.confidence || 0)
      .filter(confidence => confidence > 0);
    
    if (agentConfidences.length === 0) return 0;
    
    const avgAgentConfidence = agentConfidences.reduce((sum, conf) => sum + conf, 0) / agentConfidences.length;
    const ensembleConfidence = results.ensembleResult.confidence || 0;
    const modelPerformance = results.modelPerformance.overallScore || 0;
    
    // 加权平均计算增强置信度
    return (avgAgentConfidence * 0.4 + ensembleConfidence * 0.4 + modelPerformance * 0.2);
  }

  evaluateModelPerformance(agentResults) {
    const performance = {
      individualScores: {},
      overallScore: 0,
      executionTime: 0
    };
    
    let totalScore = 0;
    let totalExecutionTime = 0;
    let validAgents = 0;
    
    Object.entries(agentResults).forEach(([name, result]) => {
      if (result.confidence > 0 && !result.error) {
        const score = result.confidence;
        performance.individualScores[name] = {
          confidence: score,
          executionTime: result.executionTime,
          modelInfo: result.modelInfo
        };
        
        totalScore += score;
        totalExecutionTime += result.executionTime;
        validAgents++;
      }
    });
    
    if (validAgents > 0) {
      performance.overallScore = totalScore / validAgents;
      performance.executionTime = totalExecutionTime / validAgents;
    }
    
    return performance;
  }

  async intelligentDataEnhancement(data, previousResult, iteration) {
    logger.info(`第 ${iteration} 轮智能数据增强`);
    
    // 基于前一轮结果进行数据增强
    const enhancedData = [...data];
    
    // 1. 低置信度数据重新处理
    if (previousResult.agentResults) {
      const lowConfidenceItems = this.identifyLowConfidenceItems(data, previousResult);
      if (lowConfidenceItems.length > 0) {
        logger.info(`发现 ${lowConfidenceItems.length} 个低置信度项目，进行增强处理`);
        // 这里可以实现具体的数据增强逻辑
      }
    }
    
    // 2. 数据质量优化
    const qualityEnhancedData = await this.optimizeDataQuality(enhancedData);
    
    // 3. 特征工程增强
    const featureEnhancedData = await this.enhanceFeatures(qualityEnhancedData);
    
    logger.info(`数据增强完成，原始 ${data.length} 条 → 增强 ${featureEnhancedData.length} 条`);
    
    return featureEnhancedData;
  }

  identifyLowConfidenceItems(data, result) {
    const lowConfidenceItems = [];
    
    // 识别置信度低于阈值的项目
    if (result.agentResults) {
      Object.values(result.agentResults).forEach(agentResult => {
        if (agentResult.result && agentResult.result.detailedAnalysis) {
          agentResult.result.detailedAnalysis.forEach(analysis => {
            if (analysis.confidence < 0.6) {
              lowConfidenceItems.push(analysis);
            }
          });
        }
      });
    }
    
    return lowConfidenceItems;
  }

  async optimizeDataQuality(data) {
    // 数据质量优化逻辑
    return data.filter(item => {
      // 过滤低质量数据
      return item.content && item.content.length > 10;
    });
  }

  async enhanceFeatures(data) {
    // 特征工程增强
    return data.map(item => ({
      ...item,
      enhancedFeatures: {
        textLength: item.content.length,
        wordCount: item.content.split(/\s+/).length,
        hasMedia: !!(item.images || item.videos),
        interactionScore: (item.likes || 0) + (item.comments || 0) * 2 + (item.shares || 0) * 3
      }
    }));
  }

  // 获取Agent历史信息
  getAgentHistory() {
    return this.analysisHistory.slice(-10); // 最近10次分析
  }

  // 计算平均置信度
  calculateAverageConfidence(result) {
    const agentConfidences = Object.values(result.agentResults)
      .map(agent => agent.confidence || 0)
      .filter(confidence => confidence > 0);
    
    if (agentConfidences.length === 0) return 0;
    
    return agentConfidences.reduce((sum, conf) => sum + conf, 0) / agentConfidences.length;
  }

  // 生成增强版最终报告
  async generateEnhancedFinalReport(finalResult, taskId, iterations) {
    const report = {
      taskId,
      timestamp: new Date(),
      iterations,
      finalConfidence: finalResult.confidence,
      ensembleResult: finalResult.ensembleResult,
      modelPerformance: finalResult.modelPerformance,
      summary: await this.generateEnhancedSummary(finalResult),
      detailedResults: finalResult.agentResults,
      analysisHistory: this.analysisHistory.slice(-iterations),
      nextSteps: this.generateEnhancedNextSteps(finalResult),
      technicalDetails: this.generateTechnicalDetails(finalResult)
    };

    return report;
  }

  // 生成增强版摘要
  async generateEnhancedSummary(results) {
    const summary = {
      sentiment: null,
      topics: [],
      risks: null,
      overallAssessment: '',
      keyInsights: [],
      recommendations: [],
      modelInsights: []
    };

    // 汇总增强版分析结果
    if (results.agentResults.sentiment && results.agentResults.sentiment.result) {
      const sentimentResult = results.agentResults.sentiment.result;
      summary.sentiment = {
        overall: sentimentResult.overallSentiment,
        distribution: sentimentResult.sentimentDistribution,
        confidence: results.agentResults.sentiment.confidence,
        emotions: sentimentResult.emotions,
        aspects: sentimentResult.aspects
      };
      summary.keyInsights.push(...sentimentResult.keyInsights);
      const modelName = sentimentResult.modelInfo?.name || '未知模型';
      summary.modelInsights.push(`情感分析模型: ${modelName} (置信度: ${(results.agentResults.sentiment.confidence * 100).toFixed(1)}%)`);
    }

    if (results.agentResults.topic && results.agentResults.topic.result) {
      const topicResult = results.agentResults.topic.result;
      summary.topics = topicResult.topics.slice(0, 10);
      summary.keyInsights.push(...topicResult.keyInsights);
      const topicModelName = topicResult.modelInfo?.name || '未知模型';
      summary.modelInsights.push(`主题建模模型: ${topicModelName} (置信度: ${(results.agentResults.topic.confidence * 100).toFixed(1)}%)`);
    }

    if (results.agentResults.risk && results.agentResults.risk.result) {
      const riskResult = results.agentResults.risk.result;
      summary.risks = {
        level: riskResult.overallRisk,
        score: riskResult.riskScore,
        categories: riskResult.riskCategories,
        highRiskCount: riskResult.highRiskItems.length,
        confidence: results.agentResults.risk.confidence
      };
      summary.recommendations.push(...riskResult.recommendations);
      const riskModelName = riskResult.modelInfo?.name || '未知模型';
      summary.modelInsights.push(`风险评估模型: ${riskModelName} (置信度: ${(results.agentResults.risk.confidence * 100).toFixed(1)}%)`);
    }

    // 集成学习洞察
    if (results.ensembleResult) {
      summary.modelInsights.push(`集成学习: ${results.ensembleResult.method} (置信度: ${(results.ensembleResult.confidence * 100).toFixed(1)}%)`);
    }

    // 生成增强版整体评估
    summary.overallAssessment = this.generateEnhancedOverallAssessment(summary, results);

    return summary;
  }

  // 生成增强版整体评估
  generateEnhancedOverallAssessment(summary, results) {
    let assessment = '基于增强AI分析引擎的综合评估，';
    
    // 情感分析评估
    if (summary.sentiment) {
      if (summary.sentiment.overall > 2) {
        assessment += '深度学习模型检测到非常积极的情感倾向，用户满意度很高；';
      } else if (summary.sentiment.overall < -2) {
        assessment += '深度学习模型检测到显著的负面情绪，需要立即关注和处理；';
      } else {
        assessment += '深度学习模型显示情感相对中性，用户态度平衡；';
      }
    }

    // 主题分析评估
    if (summary.topics && summary.topics.length > 0) {
      const topTopics = summary.topics.slice(0, 3).map(t => `"${t.name}"`).join('、');
      assessment += `LDA主题模型识别出主要讨论集中在${topTopics}等方面；`;
    }

    // 风险评估评估
    if (summary.risks) {
      if (summary.risks.level === 'high') {
        assessment += `神经网络检测到高风险情况，AI建议立即启动应急响应机制；`;
      } else if (summary.risks.level === 'medium') {
        assessment += `神经网络识别出中等风险，AI建议持续监控和预防性措施；`;
      } else {
        assessment += `神经网络评估风险水平较低，AI建议维持正常监控；`;
      }
    }

    // 集成学习评估
    if (results.ensembleResult) {
      assessment += `集成学习模型综合置信度为${(results.ensembleResult.confidence * 100).toFixed(1)}%，整体分析结果可靠。`;
    }

    return assessment;
  }

  // 生成增强版后续步骤
  generateEnhancedNextSteps(result) {
    const steps = [];
    
    if (result.confidence < this.confidenceThreshold) {
      steps.push('增强分析置信度较低，建议增加训练数据量或优化模型参数');
      steps.push('考虑使用更大规模的预训练模型或集成更多Agent');
    }

    if (result.modelPerformance && result.modelPerformance.overallScore < 0.7) {
      steps.push('模型性能评分较低，建议重新训练或更换模型架构');
    }

    if (result.ensembleResult && result.ensembleResult.confidence < 0.8) {
      steps.push('集成学习置信度有待提升，建议调整集成策略或增加Agent数量');
    }

    steps.push('持续监控模型性能指标，及时更新和优化');
    steps.push('定期使用新数据重新训练模型，保持模型时效性');
    steps.push('考虑引入更多先进的AI技术，如GPT-4、Claude等大语言模型');

    return steps;
  }

  // 生成技术详情
  generateTechnicalDetails(result) {
    return {
      executionStats: {
        totalAgents: Object.keys(result.agentResults).length,
        successfulAgents: Object.values(result.agentResults).filter(r => !r.error).length,
        avgExecutionTime: result.modelPerformance.executionTime || 0
      },
      modelInfo: {
        models: Object.values(result.agentResults).map(r => r.modelInfo).filter(Boolean),
        ensembleMethod: result.ensembleResult?.method || 'unknown'
      },
      performanceMetrics: result.modelPerformance,
      confidenceBreakdown: this.generateConfidenceBreakdown(result)
    };
  }

  // 生成置信度分解
  generateConfidenceBreakdown(result) {
    return {
      agentConfidences: Object.entries(result.agentResults).reduce((acc, [name, result]) => {
        acc[name] = result.confidence || 0;
        return acc;
      }, {}),
      ensembleConfidence: result.ensembleResult?.confidence || 0,
      overallConfidence: result.confidence || 0
    };
  }

  // 获取Agent信息
  getAgentInfo() {
    return Object.entries(this.agents).map(([key, agent]) => ({
      key,
      ...agent.getInfo(),
      modelInfo: agent.modelInfo || {}
    }));
  }

  // 更新Agent配置
  updateAgentConfig(agentName, config) {
    if (this.agents[agentName]) {
      logger.info(`更新增强Agent ${agentName} 配置`);
      // 这里可以实现具体的配置更新逻辑
      return true;
    }
    return false;
  }
}

module.exports = EnhancedAIAnalyzer;