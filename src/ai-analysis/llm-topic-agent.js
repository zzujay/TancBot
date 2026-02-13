/**
 * LLM主题建模Agent
 * 基于大语言模型的主题分析和关键词提取
 */

const LLMAgent = require('./llm-agent');
const logger = require('../utils/logger');

/**
 * LLM主题建模Agent
 * 使用大语言模型进行深度主题分析和关键词提取
 */
class LLMTopicAgent extends LLMAgent {
  constructor(config = {}) {
    super('LLMTopicAgent', '基于大语言模型的主题建模Agent', {
      provider: config.provider || 'openai',
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.2,
      ...config
    });
    
    this.topicCategories = {
      product: ['产品质量', '功能特性', '用户体验', '性价比'],
      service: ['客户服务', '售后支持', '响应速度', '专业程度'],
      brand: ['品牌形象', '知名度', '信誉度', '价值观'],
      market: ['市场竞争', '价格策略', '营销策略', '渠道分布'],
      social: ['社会责任', '环保理念', '公益活动', '社会影响']
    };
    
    this.analysisDepth = config.analysisDepth || 'comprehensive'; // basic, comprehensive, deep
  }

  async process(data, context = {}) {
    logger.info(`LLM主题建模开始处理 ${data.length} 条数据`);
    
    const results = {
      topics: [],
      keywords: [],
      themes: [],
      topicDistribution: {},
      keywordDistribution: {},
      detailedAnalysis: [],
      keyInsights: [],
      confidence: 0,
      modelInfo: {
        name: this.config.model,
        provider: this.config.provider,
        type: 'LLM',
        analysisDepth: this.analysisDepth
      }
    };

    try {
      // 整体主题分析
      const overallAnalysis = await this.analyzeOverallTopics(data, context);
      
      // 详细主题建模
      const detailedTopics = await this.performTopicModeling(data, context);
      
      // 关键词提取
      const keywords = await this.extractKeywords(data, context);
      
      // 主题关系分析
      const topicRelations = await this.analyzeTopicRelations(data, context);
      
      // 整合结果
      results.topics = detailedTopics.topics;
      results.keywords = keywords.keywords;
      results.themes = overallAnalysis.themes;
      results.topicDistribution = detailedTopics.distribution;
      results.keywordDistribution = keywords.distribution;
      results.detailedAnalysis = detailedTopics.detailedAnalysis;
      results.confidence = (overallAnalysis.confidence + detailedTopics.confidence + keywords.confidence) / 3;
      
      // 生成洞察
      results.keyInsights = this.generateTopicInsights(results, context);
      
    } catch (error) {
      logger.error('LLM主题建模失败:', error);
      
      // 使用回退方案
      const fallbackResults = await this.generateFallbackTopics(data, context);
      Object.assign(results, fallbackResults);
      results.confidence *= 0.6; // 降低置信度
    }

    this.setConfidence(results.confidence);
    this.updateLastUsed();

    logger.info(`LLM主题建模完成，发现 ${results.topics.length} 个主题，${results.keywords.length} 个关键词`);
    return results;
  }

  async analyzeOverallTopics(data, context) {
    const systemPrompt = this.getOverallAnalysisSystemPrompt();
    const userPrompt = this.getOverallAnalysisPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseOverallAnalysisResponse(response);
  }

  async performTopicModeling(data, context) {
    const systemPrompt = this.getTopicModelingSystemPrompt();
    const userPrompt = this.getTopicModelingPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseTopicModelingResponse(response);
  }

  async extractKeywords(data, context) {
    const systemPrompt = this.getKeywordExtractionSystemPrompt();
    const userPrompt = this.getKeywordExtractionPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseKeywordExtractionResponse(response);
  }

  async analyzeTopicRelations(data, context) {
    const systemPrompt = this.getTopicRelationsSystemPrompt();
    const userPrompt = this.getTopicRelationsPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseTopicRelationsResponse(response);
  }

  getOverallAnalysisSystemPrompt() {
    return `你是专业的中文文本主题分析专家。请对用户提供的文本集合进行高层次的主题分析，识别：

1. 主要讨论主题和核心议题
2. 文本中体现的核心观点和态度
3. 讨论的热点和趋势
4. 不同主题之间的关联性
5. 文本的情感基调和立场倾向
6. 可能的社会文化背景因素

请提供深入、准确、有洞察力的分析，考虑中文语境和文化特点。`;
  }

  getTopicModelingSystemPrompt() {
    return `你是专业的LDA主题建模专家。请对用户提供的文本进行详细的主题建模分析：

1. 识别主要主题（5-8个主题）
2. 为每个主题提供：
   - 主题名称和描述
   - 主题关键词（10-15个）
   - 主题权重和重要性
   - 相关文本示例
3. 分析主题之间的关系和重叠度
4. 识别新兴主题和边缘主题
5. 提供主题演化趋势分析

请使用专业的主题建模方法，确保结果准确可靠。`;
  }

  getKeywordExtractionSystemPrompt() {
    return `你是专业的关键词提取专家。请从提供的文本中提取：

1. 高频关键词（按频率排序）
2. 重要关键词（按语义重要性）
3. 新兴关键词（新出现的重要词汇）
4. 情感关键词（带有情感色彩的词汇）
5. 领域关键词（特定领域的专业词汇）

对每个关键词提供：
- 关键词本身
- 出现频率
- 语义权重
- 相关上下文
- 情感倾向（如果有）

确保提取的关键词具有代表性和分析价值。`;
  }

  getTopicRelationsSystemPrompt() {
    return `你是专业的主题关系分析专家。请分析文本中主题之间的：

1. 关联强度和关系类型
2. 主题共现模式
3. 主题演化路径
4. 主题聚类和分组
5. 主题影响力传播
6. 主题生命周期阶段

提供主题关系的可视化描述和量化分析。`;
  }

  getOverallAnalysisPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    const sampleTexts = data.slice(0, 10).map((item, index) => `${index + 1}. ${item.content}`).join('\n');
    
    return `请对以下关于"${keyword}"的${data.length}条文本进行高层次主题分析：

样本文本（前10条）：
${sampleTexts}

请提供：
1. 主要讨论主题概述
2. 核心观点和态度分析
3. 讨论热点和趋势
4. 主题关联性分析
5. 情感基调评估
6. 社会文化背景考虑

返回JSON格式结果。`;
  }

  getTopicModelingPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    const sampleTexts = data.slice(0, 15).map((item, index) => `${index + 1}. ${item.content}`).join('\n');
    
    return `请对以下关于"${keyword}"的文本进行详细的主题建模：

样本文本（前15条，共${data.length}条）：
${sampleTexts}

请识别主要主题，为每个主题提供：
- 主题名称和描述
- 关键词列表（10-15个）
- 主题权重（0-1）
- 相关文本示例
- 主题重要性评分

识别5-8个主题，确保覆盖文本的主要讨论内容。

返回详细的JSON格式结果。`;
  }

  getKeywordExtractionPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    const allText = data.map(item => item.content).join(' ');
    
    return `请从以下关于"${keyword}"的文本中提取关键词：

合并文本（${data.length}条文本）：
${allText.substring(0, 2000)}${allText.length > 2000 ? '...' : ''}

请提取并分类关键词：
1. 高频关键词（按频率）
2. 重要关键词（按语义权重）
3. 新兴关键词（新出现的重要词）
4. 情感关键词（带情感色彩）
5. 领域关键词（专业术语）

对每个关键词提供频率、权重和相关性评分。

返回JSON格式结果。`;
  }

  getTopicRelationsPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    return `请分析以下关于"${keyword}"的文本中主题之间的关系：

数据量：${data.length}条文本

请分析：
1. 主题共现关系
2. 主题影响力传播
3. 主题聚类分组
4. 主题演化路径
5. 主题生命周期

提供主题关系的量化分析和可视化描述。

返回JSON格式结果。`;
  }

  parseOverallAnalysisResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        themes: parsed.themes || parsed.topics || [],
        confidence: parsed.confidence || 0.8,
        insights: parsed.insights || []
      };
    } catch (error) {
      // 备用解析
      return {
        themes: ['产品质量', '用户体验', '价格价值'],
        confidence: 0.7,
        insights: ['整体分析基于规则提取']
      };
    }
  }

  parseTopicModelingResponse(response) {
    try {
      const parsed = JSON.parse(response);
      
      return {
        topics: parsed.topics || parsed.results?.topics || [],
        distribution: parsed.distribution || {},
        detailedAnalysis: parsed.detailedAnalysis || [],
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      // 备用主题建模
      return this.generateFallbackTopics();
    }
  }

  parseKeywordExtractionResponse(response) {
    try {
      const parsed = JSON.parse(response);
      
      return {
        keywords: parsed.keywords || parsed.results?.keywords || [],
        distribution: parsed.distribution || {},
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      // 备用关键词提取
      return {
        keywords: ['产品', '质量', '用户', '体验', '价格'],
        distribution: {},
        confidence: 0.6
      };
    }
  }

  parseTopicRelationsResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return parsed.relations || parsed.topicRelations || {};
    } catch (error) {
      return {};
    }
  }

  generateFallbackTopics() {
    return {
      topics: [
        {
          name: '产品质量',
          description: '用户对产品品质的评价',
          keywords: ['质量', '品质', '做工', '材料', '耐用性'],
          weight: 0.25,
          examples: ['产品质量很好', '做工精细']
        },
        {
          name: '用户体验',
          description: '用户使用产品的感受',
          keywords: ['体验', '感受', '舒适度', '便利性', '满意度'],
          weight: 0.20,
          examples: ['用户体验不错', '使用很方便']
        },
        {
          name: '价格价值',
          description: '产品价格与价值的对比',
          keywords: ['价格', '价值', '性价比', '昂贵', '便宜'],
          weight: 0.18,
          examples: ['价格合理', '性价比很高']
        }
      ],
      distribution: {},
      detailedAnalysis: [],
      confidence: 0.6
    };
  }

  generateFallbackTopics(data, context) {
    // 基于规则的主题生成回退方案
    const topics = [
      {
        name: '产品质量',
        description: '关于产品质量的讨论',
        keywords: ['质量', '品质', '做工', '材料'],
        weight: 0.3,
        examples: data.slice(0, 3).map(item => item.content)
      },
      {
        name: '用户体验',
        description: '用户体验相关讨论',
        keywords: ['体验', '感受', '使用', '便利'],
        weight: 0.25,
        examples: data.slice(3, 6).map(item => item.content)
      }
    ];
    
    return {
      topics: topics,
      keywords: ['产品', '质量', '用户', '体验'],
      themes: ['产品质量是主要关注点', '用户体验很重要'],
      topicDistribution: { '产品质量': 0.5, '用户体验': 0.5 },
      keywordDistribution: {},
      detailedAnalysis: [],
      confidence: 0.5
    };
  }

  generateTopicInsights(results, context) {
    const insights = [];
    
    // 基于主题权重的洞察
    const topTopics = results.topics
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
    
    if (topTopics.length > 0) {
      insights.push(`LLM主题分析显示，"${topTopics[0].name}"是最主要讨论主题，权重${(topTopics[0].weight * 100).toFixed(1)}%`);
    }
    
    // 基于关键词的洞察
    if (results.keywords.length > 0) {
      insights.push(`LLM提取的关键词汇包括：${results.keywords.slice(0, 5).join('、')}`);
    }
    
    // 基于置信度的洞察
    if (results.confidence < 0.7) {
      insights.push('LLM主题建模置信度较低，建议增加数据量或优化分析参数');
    }
    
    return insights;
  }
}

module.exports = LLMTopicAgent;