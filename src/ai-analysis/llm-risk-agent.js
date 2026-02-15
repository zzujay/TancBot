/**
 * LLM风险评估Agent
 * 基于大语言模型的智能风险评估
 */

const LLMAgent = require('./llm-agent');
const logger = require('../utils/logger');

/**
 * LLM风险评估Agent
 * 使用大语言模型进行深度风险评估和预警分析
 */
class LLMRiskAgent extends LLMAgent {
  constructor(config = {}) {
    super('LLMRiskAgent', '基于大语言模型的风险评估Agent', {
      provider: config.provider || 'openai',
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.2,
      ...config
    });
    
    this.riskCategories = {
      reputation: { name: '声誉风险', weight: 0.3, severityLevels: ['low', 'medium', 'high', 'critical'] },
      operational: { name: '运营风险', weight: 0.25, severityLevels: ['low', 'medium', 'high', 'critical'] },
      financial: { name: '财务风险', weight: 0.2, severityLevels: ['low', 'medium', 'high', 'critical'] },
      legal: { name: '法律风险', weight: 0.15, severityLevels: ['low', 'medium', 'high', 'critical'] },
      strategic: { name: '战略风险', weight: 0.1, severityLevels: ['low', 'medium', 'high', 'critical'] }
    };
    
    this.riskIndicators = [
      '负面舆情激增', '投诉量上升', '品牌声誉受损', '用户流失',
      '竞争对手攻击', '监管政策变化', '市场负面情绪', '社交媒体危机',
      '产品质量问题', '服务中断', '数据泄露', '财务异常'
    ];
  }

  async process(data, context = {}) {
    logger.info(`LLM风险评估开始处理 ${data.length} 条数据`);
    
    const results = {
      overallRisk: {
        level: 'low',
        score: 0,
        confidence: 0,
        urgency: 'moderate'
      },
      riskCategories: {},
      riskFactors: [],
      riskTrends: {
        direction: 'stable',
        velocity: 'slow',
        acceleration: 0
      },
      riskHotspots: [],
      earlyWarnings: [],
      recommendations: [],
      detailedAnalysis: [],
      keyInsights: [],
      confidence: 0,
      modelInfo: {
        name: this.config.model,
        provider: this.config.provider,
        type: 'LLM'
      }
    };

    try {
      // 整体风险评估
      const overallRisk = await this.assessOverallRisk(data, context);
      
      // 分类风险评估
      const categoryRisks = await this.assessRiskCategories(data, context);
      
      // 风险因素识别
      const riskFactors = await this.identifyRiskFactors(data, context);
      
      // 风险趋势分析
      const riskTrends = await this.analyzeRiskTrends(data, context);
      
      // 风险热点识别
      const riskHotspots = await this.identifyRiskHotspots(data, context);
      
      // 早期预警
      const earlyWarnings = await this.generateEarlyWarnings(data, context);
      
      // 建议措施
      const recommendations = await this.generateRecommendations(data, context);
      
      // 整合结果
      results.overallRisk = overallRisk;
      results.riskCategories = categoryRisks;
      results.riskFactors = riskFactors;
      results.riskTrends = riskTrends;
      results.riskHotspots = riskHotspots;
      results.earlyWarnings = earlyWarnings;
      results.recommendations = recommendations;
      results.confidence = this.calculateOverallConfidence(results);
      
      // 生成洞察
      results.keyInsights = this.generateRiskInsights(results, context);
      
    } catch (error) {
      logger.error('LLM风险评估失败:', error);
      results.confidence = 0.5;
      results.keyInsights = ['LLM风险评估过程中发生错误，返回默认结果'];
    }

    this.setConfidence(results.confidence);
    this.updateLastUsed();

    logger.info(`LLM风险评估完成，整体风险等级: ${results.overallRisk.level}, 评分: ${results.overallRisk.score.toFixed(2)}`);
    return results;
  }

  async assessOverallRisk(data, context) {
    const systemPrompt = this.getOverallRiskSystemPrompt();
    const userPrompt = this.getOverallRiskPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseOverallRiskResponse(response);
  }

  async assessRiskCategories(data, context) {
    const systemPrompt = this.getCategoryRiskSystemPrompt();
    const userPrompt = this.getCategoryRiskPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseCategoryRiskResponse(response);
  }

  async identifyRiskFactors(data, context) {
    const systemPrompt = this.getRiskFactorsSystemPrompt();
    const userPrompt = this.getRiskFactorsPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseRiskFactorsResponse(response);
  }

  async analyzeRiskTrends(data, context) {
    const systemPrompt = this.getRiskTrendsSystemPrompt();
    const userPrompt = this.getRiskTrendsPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseRiskTrendsResponse(response);
  }

  async identifyRiskHotspots(data, context) {
    const systemPrompt = this.getRiskHotspotsSystemPrompt();
    const userPrompt = this.getRiskHotspotsPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseRiskHotspotsResponse(response);
  }

  async generateEarlyWarnings(data, context) {
    const systemPrompt = this.getEarlyWarningsSystemPrompt();
    const userPrompt = this.getEarlyWarningsPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseEarlyWarningsResponse(response);
  }

  async generateRecommendations(data, context) {
    const systemPrompt = this.getRecommendationsSystemPrompt();
    const userPrompt = this.getRecommendationsPrompt(data, context);
    
    const response = await this.callLLM(userPrompt, systemPrompt);
    return this.parseRecommendationsResponse(response);
  }

  getOverallRiskSystemPrompt() {
    return `你是专业的舆情风险评估专家，擅长识别和分析各种潜在风险。请对提供的文本进行全面的风险评估，考虑：

1. 声誉风险：品牌声誉、公众形象、信任度影响
2. 运营风险：业务运营、服务质量、供应链影响
3. 财务风险：收入损失、成本增加、市场价值影响
4. 法律风险：合规问题、法律责任、监管风险
5. 战略风险：长期发展、竞争优势、市场地位

请提供：
- 整体风险等级（low/medium/high/critical）
- 风险评分（0-1）
- 置信度（0-1）
- 紧急程度（low/moderate/high/urgent）
- 详细的风险描述和分析
- 主要风险驱动因素

确保分析准确、全面、有前瞻性。`;
  }

  getCategoryRiskSystemPrompt() {
    return `你是专业的分类风险评估专家。请对提供的文本进行详细的风险分类评估：

风险类别：
1. 声誉风险（权重30%）
2. 运营风险（权重25%）
3. 财务风险（权重20%）
4. 法律风险（权重15%）
5. 战略风险（权重10%）

对每个类别提供：
- 风险等级（low/medium/high/critical）
- 风险评分（0-1）
- 置信度（0-1）
- 具体风险表现
- 影响程度评估
- 相关文本证据

考虑中文语境和文化背景，确保评估的专业性和准确性。`;
  }

  getRiskFactorsSystemPrompt() {
    return `你是专业的风险因素识别专家。请从提供的文本中识别和分析具体的风险因素：

风险因素类型：
1. 内部因素：产品、服务、管理、文化
2. 外部因素：市场、竞争、政策、社会
3. 直接因素：投诉、负面评价、质量问题
4. 间接因素：情绪变化、趋势转变、竞争动态

请识别：
- 主要风险因素
- 风险来源和根因
- 风险传播路径
- 影响范围和程度
- 可预见性和可控性
- 时间敏感性和发展趋势

提供详细的风险因素清单和分析。`;
  }

  getRiskTrendsSystemPrompt() {
    return `你是专业的风险趋势分析专家。请分析文本中体现的风险发展趋势：

趋势分析维度：
1. 时间趋势：短期、中期、长期变化
2. 强度趋势：风险强度变化趋势
3. 范围趋势：影响范围扩散或收缩
4. 速度趋势：风险发展速度
5. 方向趋势：向好或向坏发展

请提供：
- 趋势方向（improving/stable/worsening/volatile）
- 发展速度（slow/moderate/fast/accelerating）
- 变化加速度
- 关键转折点
- 预测性指标
- 时间窗口评估

基于趋势分析提供前瞻性判断。`;
  }

  getRiskHotspotsSystemPrompt() {
    return `你是专业的风险热点识别专家。请从文本中识别风险集中区域和热点：

热点识别标准：
1. 频率集中：特定话题频繁出现
2. 情感强烈：负面情绪高度集中
3. 影响广泛：涉及多个利益相关方
4. 时间敏感：近期快速升温
5. 传播迅速：社交媒体快速传播

请识别：
- 地理热点（如果有位置信息）
- 话题热点（具体议题）
- 时间热点（特定时段）
- 群体热点（特定人群）
- 平台热点（特定平台）
- 传播路径和影响力

提供热点的详细分析和优先级排序。`;
  }

  getEarlyWarningsSystemPrompt() {
    return `你是专业的早期预警专家。请基于文本分析生成风险早期预警信号：

预警指标：
1. 情绪指标：负面情绪比例、强度变化
2. 话题指标：敏感话题出现频率
3. 传播指标：传播速度、范围变化
4. 影响指标：影响人群、范围扩大
5. 时间指标：突发事件、异常波动

请生成：
- 一级预警（绿色）：轻微风险信号
- 二级预警（黄色）：中等风险信号
- 三级预警（橙色）：较高风险信号
- 四级预警（红色）：严重风险信号

每个预警包括：
- 预警级别和颜色
- 具体信号描述
- 置信度评估
- 建议响应措施
- 时间敏感性

确保预警的准确性和可操作性。`;
  }

  getRecommendationsSystemPrompt() {
    return `你是专业的风险应对策略专家。请基于风险评估结果提供具体的应对建议：

建议类型：
1. 预防措施：风险预防和控制
2. 应对策略：风险发生时的应对
3. 缓解措施：降低风险影响
4. 恢复计划：风险后的恢复
5. 监控方案：持续监控和预警

请提供：
- 短期措施（立即执行）
- 中期措施（1-3个月内）
- 长期措施（3个月以上）
- 优先级排序
- 资源需求评估
- 预期效果
- 实施难度

确保建议具体、可操作、有针对性。`;
  }

  getOverallRiskPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    const sampleTexts = data.slice(0, 10).map((item, index) => `${index + 1}. ${item.content}`).join('\n');
    
    return `请对以下关于"${keyword}"的${data.length}条文本进行整体风险评估：

样本文本（前10条）：
${sampleTexts}

请提供：
1. 整体风险等级和评分
2. 置信度评估
3. 紧急程度判断
4. 详细风险分析
5. 主要风险驱动因素

返回JSON格式结果。`;
  }

  getCategoryRiskPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    const sampleTexts = data.slice(0, 8).map((item, index) => `${index + 1}. ${item.content}`).join('\n');
    
    return `请对以下关于"${keyword}"的文本进行详细的风险分类评估：

样本文本（前8条）：
${sampleTexts}

请对每个风险类别（声誉、运营、财务、法律、战略）进行详细评估，包括等级、评分、置信度和具体表现。

返回详细的JSON格式结果。`;
  }

  getRiskFactorsPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    return `请从以下关于"${keyword}"的${data.length}条文本中识别具体的风险因素：

请识别：
1. 主要风险因素清单
2. 风险来源和根因分析
3. 风险传播路径
4. 影响范围和程度
5. 可预见性和可控性
6. 时间敏感性和发展趋势

返回详细的JSON格式结果。`;
  }

  getRiskTrendsPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    return `请分析以下关于"${keyword}"的${data.length}条文本中体现的风险发展趋势：

请分析：
1. 时间趋势变化
2. 风险强度趋势
3. 影响范围趋势
4. 发展速度评估
5. 方向趋势判断
6. 关键转折点识别

提供趋势分析的量化指标和前瞻性判断。

返回JSON格式结果。`;
  }

  getRiskHotspotsPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    return `请从以下关于"${keyword}"的${data.length}条文本中识别风险热点：

请识别：
1. 地理热点（如适用）
2. 话题热点和集中区域
3. 时间热点和特定时段
4. 群体热点和目标人群
5. 平台热点和传播渠道
6. 传播路径和影响力分析

提供热点的详细分析和优先级排序。

返回JSON格式结果。`;
  }

  getEarlyWarningsPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    return `请基于以下关于"${keyword}"的${data.length}条文本生成风险早期预警信号：

请生成：
1. 一级预警（绿色）信号
2. 二级预警（黄色）信号
3. 三级预警（橙色）信号
4. 四级预警（红色）信号

每个预警包括级别、信号描述、置信度、建议措施和时间敏感性。

返回JSON格式结果。`;
  }

  getRecommendationsPrompt(data, context) {
    const keyword = context.keywords ? context.keywords.join(', ') : '相关话题';
    
    return `请基于对以下关于"${keyword}"的${data.length}条文本的风险评估，提供具体的应对建议：

请提供：
1. 短期预防措施（立即执行）
2. 中期应对策略（1-3个月）
3. 长期规划建议（3个月以上）
4. 优先级排序和资源需求
5. 预期效果和实施难度评估

确保建议具体、可操作、有针对性。

返回JSON格式结果。`;
  }

  // 响应解析方法
  parseOverallRiskResponse(response) {
    try {
      // 尝试直接解析JSON
      try {
        const parsed = JSON.parse(response);
        return {
          level: parsed.level || 'low',
          score: parseFloat(parsed.score) || 0,
          confidence: parseFloat(parsed.confidence) || 0.8,
          urgency: parsed.urgency || 'moderate',
          description: parsed.description || parsed.analysis || '基于LLM的风险评估'
        };
      } catch (jsonError) {
        // JSON解析失败，尝试从文本中提取信息
        const text = response.toLowerCase();
        
        // 提取风险等级
        let level = 'low';
        if (text.includes('critical') || text.includes('严重') || text.includes('极高')) {
          level = 'critical';
        } else if (text.includes('high') || text.includes('高') || text.includes('严重')) {
          level = 'high';
        } else if (text.includes('medium') || text.includes('中等') || text.includes('中')) {
          level = 'medium';
        }
        
        // 提取评分（查找数字）
        const scoreMatch = response.match(/(?:评分|分数|score)[:\s]*([0-9.]+)/i);
        const score = scoreMatch ? Math.min(1, parseFloat(scoreMatch[1])) : 0.3;
        
        // 提取置信度
        const confidenceMatch = response.match(/(?:置信度|confidence)[:\s]*([0-9.]+)/i);
        const confidence = confidenceMatch ? Math.min(1, parseFloat(confidenceMatch[1])) : 0.7;
        
        return {
          level: level,
          score: score,
          confidence: confidence,
          urgency: level === 'critical' || level === 'high' ? 'high' : 'moderate',
          description: response.substring(0, 500)
        };
      }
    } catch (error) {
      logger.warn('整体风险响应解析失败，返回默认结果');
      return {
        level: 'low',
        score: 0,
        confidence: 0.5,
        urgency: 'moderate',
        description: '风险评估响应解析失败'
      };
    }
  }

  parseCategoryRiskResponse(response) {
    try {
      // 尝试直接解析JSON
      try {
        const parsed = JSON.parse(response);
        return parsed.categories || parsed.riskCategories || {};
      } catch (jsonError) {
        // 从文本中提取分类风险
        const categories = {};
        const text = response.toLowerCase();
        
        // 声誉风险
        if (text.includes('声誉') || text.includes('reputation')) {
          categories.reputation = {
            level: text.includes('高') ? 'high' : (text.includes('低') ? 'low' : 'medium'),
            score: 0.3,
            description: '声誉风险分析'
          };
        }
        
        // 运营风险
        if (text.includes('运营') || text.includes('operation')) {
          categories.operation = {
            level: text.includes('高') ? 'high' : (text.includes('低') ? 'low' : 'medium'),
            score: 0.3,
            description: '运营风险分析'
          };
        }
        
        return categories;
      }
    } catch (error) {
      logger.warn('分类风险响应解析失败，返回空结果');
      return {};
    }
  }

  parseRiskFactorsResponse(response) {
    try {
      // 尝试直接解析JSON
      try {
        const parsed = JSON.parse(response);
        return parsed.factors || parsed.riskFactors || [];
      } catch (jsonError) {
        // 从文本中提取风险因素
        const factors = [];
        const lines = response.split(/[。\n]/);
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.length > 5 && trimmed.length < 100) {
            factors.push({
              name: trimmed.substring(0, 50),
              description: trimmed,
              severity: 'medium'
            });
          }
        });
        
        return factors.slice(0, 5);
      }
    } catch (error) {
      logger.warn('风险因素响应解析失败，返回空结果');
      return [];
    }
  }

  parseRiskTrendsResponse(response) {
    try {
      // 尝试直接解析JSON
      try {
        const parsed = JSON.parse(response);
        return {
          direction: parsed.direction || 'stable',
          velocity: parsed.velocity || 'slow',
          acceleration: parseFloat(parsed.acceleration) || 0,
          ...parsed
        };
      } catch (jsonError) {
        // 从文本中提取趋势信息
        const text = response.toLowerCase();
        let direction = 'stable';
        let velocity = 'slow';
        
        if (text.includes('恶化') || text.includes('worsening') || text.includes('上升')) {
          direction = 'worsening';
        } else if (text.includes('改善') || text.includes('improving') || text.includes('下降')) {
          direction = 'improving';
        }
        
        if (text.includes('快') || text.includes('fast') || text.includes('加速')) {
          velocity = 'fast';
        } else if (text.includes('中等') || text.includes('moderate')) {
          velocity = 'moderate';
        }
        
        return {
          direction: direction,
          velocity: velocity,
          acceleration: 0,
          description: response.substring(0, 300)
        };
      }
    } catch (error) {
      logger.warn('风险趋势响应解析失败，返回默认结果');
      return { direction: 'stable', velocity: 'slow', acceleration: 0 };
    }
  }

  parseRiskHotspotsResponse(response) {
    try {
      // 尝试直接解析JSON
      try {
        const parsed = JSON.parse(response);
        return parsed.hotspots || parsed.riskHotspots || [];
      } catch (jsonError) {
        // 从文本中提取热点
        const hotspots = [];
        const lines = response.split(/[。\n]/);
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.length > 5 && trimmed.length < 100) {
            hotspots.push({
              topic: trimmed.substring(0, 30),
              intensity: 0.5,
              description: trimmed
            });
          }
        });
        
        return hotspots.slice(0, 3);
      }
    } catch (error) {
      logger.warn('风险热点响应解析失败，返回空结果');
      return [];
    }
  }

  parseEarlyWarningsResponse(response) {
    try {
      // 尝试直接解析JSON
      try {
        const parsed = JSON.parse(response);
        return parsed.warnings || parsed.earlyWarnings || [];
      } catch (jsonError) {
        // 从文本中提取预警
        const warnings = [];
        const lines = response.split(/[。\n]/);
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.length > 5 && trimmed.length < 100) {
            warnings.push({
              type: 'general',
              message: trimmed,
              severity: 'medium'
            });
          }
        });
        
        return warnings.slice(0, 3);
      }
    } catch (error) {
      logger.warn('早期预警响应解析失败，返回空结果');
      return [];
    }
  }

  parseRecommendationsResponse(response) {
    try {
      // 尝试直接解析JSON
      try {
        const parsed = JSON.parse(response);
        return parsed.recommendations || [];
      } catch (jsonError) {
        // 从文本中提取建议
        const recommendations = [];
        const lines = response.split(/[。\n]/);
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.length > 5 && trimmed.length < 100) {
            recommendations.push(trimmed);
          }
        });
        
        return recommendations.slice(0, 5);
      }
    } catch (error) {
      logger.warn('建议响应解析失败，返回空结果');
      return [];
    }
  }

  calculateOverallConfidence(results) {
    const confidences = [
      results.overallRisk.confidence,
      ...Object.values(results.riskCategories).map(cat => cat.confidence || 0.5),
      0.5 // 基础置信度
    ];
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  generateRiskInsights(results, context) {
    const insights = [];
    
    // 基于整体风险的洞察
    if (results.overallRisk.level === 'high' || results.overallRisk.level === 'critical') {
      insights.push(`LLM识别出${results.overallRisk.level}级别风险，需要立即关注和应对`);
    }
    
    // 基于风险类别的洞察
    const highRiskCategories = Object.entries(results.riskCategories)
      .filter(([, risk]) => risk.level === 'high' || risk.level === 'critical')
      .map(([category]) => category);
    
    if (highRiskCategories.length > 0) {
      insights.push(`LLM检测到${highRiskCategories.join('、')}类别存在高风险`);
    }
    
    // 基于风险趋势的洞察
    if (results.riskTrends.direction === 'worsening') {
      insights.push('LLM分析显示风险趋势正在恶化，需要加强监控和预防措施');
    }
    
    // 基于早期预警的洞察
    if (results.earlyWarnings.length > 0) {
      const highLevelWarnings = results.earlyWarnings.filter(w => w.level === 'high' || w.level === 'critical');
      if (highLevelWarnings.length > 0) {
        insights.push(`LLM生成了${highLevelWarnings.length}个高级别预警信号`);
      }
    }
    
    return insights;
  }
}

module.exports = LLMRiskAgent;