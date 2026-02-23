/**
 * 事实梳理智能体 (Fact Agent)
 * 基于大语言模型的客观事实提取和分析
 * 完全由LLM驱动，无需基于规则的分析
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');
const llmClient = require('../../../services/llm-client');

class FactAgent extends BaseAgentV2 {
  constructor() {
    super(
      '事实梳理智能体',
      '基于大语言模型提取客观事实，构建时间线，识别事实缺口',
      'analyzer'
    );
    this.focusAreas = ['entity', 'time', 'location', 'action', 'information'];
    this.currentStrategy = 'llm-driven';
  }

  async process(data, context = {}) {
    logger.info(`[V2] 事实梳理智能体开始分析，数据量: ${data.length}`);
    this.updateLastUsed();

    try {
      // 根据策略调整分析重点
      if (context.iterationGuidance?.focus) {
        this.adjustStrategy(context.iterationGuidance);
      }

      // 使用LLM进行完整的事实分析
      logger.info('[V2] 事实梳理智能体调用LLM进行分析');
      const llmResult = await this.analyzeWithLLM(data, context);

      // 基于LLM结果构建输出
      const coreElements = this.buildCoreElementsFromLLM(llmResult);
      const timelineValidation = this.validateTimelineWithLLM(llmResult);
      const gaps = this.identifyGapsWithLLM(llmResult);
      const factList = this.buildFactListFromLLM(llmResult, coreElements, timelineValidation, gaps);

      // 计算置信度（基于LLM输出质量）
      const confidence = this.calculateConfidenceFromLLM(llmResult);
      this.setConfidence(confidence);

      const result = {
        confidence,
        coreElements,
        timelineValidation,
        gaps,
        factList,
        keyInsights: this.generateInsightsFromLLM(llmResult),
        recommendations: this.generateRecommendationsFromLLM(llmResult),
        llmAnalysis: {
          used: true,
          model: llmClient.getInfo().model,
          rawResult: llmResult
        }
      };

      this.addToHistory(result);
      logger.info(`[V2] 事实梳理智能体分析完成，置信度: ${confidence.toFixed(2)}`);

      return result;

    } catch (error) {
      logger.error('[V2] 事实梳理智能体分析失败:', error);
      throw error;
    }
  }

  /**
   * 使用LLM进行事实分析
   */
  async analyzeWithLLM(data, context) {
    const postsText = data.map((post, index) => 
      `${index + 1}. [${post.publishTime || '未知时间'}] ${post.author || '匿名'}: ${post.content}`
    ).join('\n');

    const systemPrompt = `你是一个专业的事实梳理专家。你的任务是从社交媒体数据中提取客观事实，构建事件时间线，识别信息缺口。

分析要求：
1. 提取所有关键实体（人物、机构、地点等）
2. 构建完整的事件时间线
3. 识别客观事实和主观观点的区别
4. 标注信息缺口和不确定性
5. 评估信息的可信度和完整性

输出必须是有效的JSON格式，包含以下字段：
{
  "coreFacts": ["核心事实1", "核心事实2"],
  "timeline": [
    {
      "time": "时间描述",
      "event": "事件描述",
      "entities": ["涉及的实体"],
      "source": "信息来源",
      "credibility": "high/medium/low"
    }
  ],
  "entities": [
    {
      "name": "实体名称",
      "type": "person/organization/location/other",
      "role": "在事件中的角色",
      "mentions": 提及次数
    }
  ],
  "locations": ["地点1", "地点2"],
  "keyInformation": {
    "amounts": ["金额、数量等量化信息"],
    "statements": ["关键声明/回应"],
    "actions": ["关键行为"]
  },
  "uncertainties": ["不确定的信息或存在矛盾的地方"],
  "gaps": [
    {
      "type": "entity/time/location/action/information",
      "severity": "high/medium/low",
      "description": "缺口描述"
    }
  ],
  "insights": ["关键洞察1", "关键洞察2"],
  "recommendations": ["建议1", "建议2"],
  "overallAssessment": {
    "completeness": 0-1,
    "credibility": "high/medium/low",
    "confidence": 0-1
  }
}`;

    const userPrompt = `请对以下微博数据进行事实梳理分析：

${postsText}

请输出JSON格式的分析结果。`;

    const response = await llmClient.chat(userPrompt, {
      systemPrompt,
      maxTokens: 2500,
      temperature: 0.3
    });

    // 解析JSON响应
    try {
      const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(response.content);
    } catch (parseError) {
      logger.error('[V2] LLM响应JSON解析失败:', parseError.message);
      logger.debug('[V2] 原始响应:', response.content);
      
      // 返回原始文本作为后备
      return {
        rawAnalysis: response.content,
        parseError: parseError.message,
        coreFacts: [],
        timeline: [],
        entities: [],
        gaps: [{
          type: 'parsing',
          severity: 'high',
          description: 'LLM响应解析失败'
        }]
      };
    }
  }

  /**
   * 从LLM结果构建核心要素
   */
  buildCoreElementsFromLLM(llmResult) {
    return {
      entities: (llmResult.entities || []).map(e => e.name || e),
      times: (llmResult.timeline || []).map((t, i) => ({
        time: t.time,
        index: i,
        context: t.event
      })),
      locations: llmResult.locations || [],
      actions: (llmResult.keyInformation?.actions || []).map((a, i) => ({
        action: a,
        index: i,
        context: a
      })),
      information: llmResult.keyInformation || {},
      coreFacts: llmResult.coreFacts || []
    };
  }

  /**
   * 基于LLM结果验证时间线
   */
  validateTimelineWithLLM(llmResult) {
    const timeline = llmResult.timeline || [];
    
    return {
      isValid: timeline.length > 0,
      issues: timeline.length === 0 ? ['时间线数据不足'] : [],
      chronological: true,
      entryCount: timeline.length,
      hasGaps: timeline.length < 3
    };
  }

  /**
   * 基于LLM结果识别缺口
   */
  identifyGapsWithLLM(llmResult) {
    const gaps = llmResult.gaps || [];
    
    // 如果没有明确的缺口，根据数据完整性推断
    if (gaps.length === 0) {
      if (!llmResult.timeline || llmResult.timeline.length < 2) {
        gaps.push({
          type: 'timeline',
          severity: 'high',
          description: '时间线信息不完整'
        });
      }
      
      if (!llmResult.entities || llmResult.entities.length === 0) {
        gaps.push({
          type: 'entity',
          severity: 'high',
          description: '未识别到关键实体'
        });
      }
    }
    
    return gaps;
  }

  /**
   * 从LLM结果构建事实清单
   */
  buildFactListFromLLM(llmResult, coreElements, timelineValidation, gaps) {
    return {
      title: '舆情事件客观事实清单（LLM分析）',
      generatedAt: new Date().toISOString(),
      summary: {
        entityCount: coreElements.entities.length,
        timePointCount: coreElements.times.length,
        locationCount: coreElements.locations.length,
        actionCount: coreElements.actions.length,
        gapCount: gaps.length,
        timelineValid: timelineValidation.isValid,
        completeness: llmResult.overallAssessment?.completeness || 0.5
      },
      entities: llmResult.entities || [],
      timeline: llmResult.timeline || [],
      locations: coreElements.locations,
      keyInformation: coreElements.information,
      uncertainties: llmResult.uncertainties || [],
      identifiedGaps: gaps,
      confidence: this.confidence,
      llmEnhanced: true,
      llmModel: llmClient.getInfo().model
    };
  }

  /**
   * 基于LLM结果计算置信度
   */
  calculateConfidenceFromLLM(llmResult) {
    let score = 0.5; // 基础分

    // 基于LLM的置信度评估
    if (llmResult.overallAssessment?.confidence) {
      score = llmResult.overallAssessment.confidence;
    } else {
      // 根据数据丰富度计算
      if (llmResult.coreFacts && llmResult.coreFacts.length > 0) {
        score += 0.1 * Math.min(llmResult.coreFacts.length / 5, 0.3);
      }
      
      if (llmResult.timeline && llmResult.timeline.length > 0) {
        score += 0.1 * Math.min(llmResult.timeline.length / 10, 0.2);
      }
      
      if (llmResult.entities && llmResult.entities.length > 0) {
        score += 0.1 * Math.min(llmResult.entities.length / 5, 0.2);
      }
      
      // 缺口扣分
      const gaps = llmResult.gaps || [];
      gaps.forEach(gap => {
        if (gap.severity === 'high') score -= 0.15;
        else if (gap.severity === 'medium') score -= 0.08;
        else score -= 0.03;
      });
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 从LLM结果生成关键洞察
   */
  generateInsightsFromLLM(llmResult) {
    const insights = llmResult.insights || [];
    
    // 添加基于数据的洞察
    if (llmResult.entities && llmResult.entities.length > 0) {
      const entityNames = llmResult.entities.slice(0, 3).map(e => e.name || e);
      insights.push(`事件涉及${llmResult.entities.length}个主要实体: ${entityNames.join(', ')}${llmResult.entities.length > 3 ? '等' : ''}`);
    }

    if (llmResult.timeline && llmResult.timeline.length > 0) {
      insights.push(`时间线覆盖${llmResult.timeline.length}个关键节点`);
    }

    if (llmResult.uncertainties && llmResult.uncertainties.length > 0) {
      insights.push(`存在${llmResult.uncertainties.length}处信息不确定性`);
    }

    return [...new Set(insights)]; // 去重
  }

  /**
   * 从LLM结果生成建议
   */
  generateRecommendationsFromLLM(llmResult) {
    const recommendations = llmResult.recommendations || [];
    
    // 基于缺口添加建议
    const gaps = llmResult.gaps || [];
    gaps.forEach(gap => {
      if (gap.type === 'entity' && !recommendations.some(r => r.includes('主体'))) {
        recommendations.push('补充事件主体信息，明确涉事人/机构');
      } else if (gap.type === 'time' && !recommendations.some(r => r.includes('时间'))) {
        recommendations.push('明确事件发生的具体时间');
      } else if (gap.type === 'location' && !recommendations.some(r => r.includes('地点'))) {
        recommendations.push('补充事件发生的地点信息');
      }
    });

    return [...new Set(recommendations)]; // 去重
  }

  /**
   * 调整分析策略（响应迭代指导）
   */
  async adjustStrategy(guidance) {
    logger.info('[V2] 事实梳理智能体调整策略:', guidance);
    
    if (guidance.focus) {
      this.currentStrategy = 'focused';
      this.focusAreas = guidance.focus;
    }

    if (guidance.depth) {
      this.analysisDepth = guidance.depth;
    }
  }
}

module.exports = FactAgent;
