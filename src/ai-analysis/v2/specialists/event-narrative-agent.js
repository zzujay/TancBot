/**
 * 事件经过整合智能体 (Event Narrative Agent)
 * 基于大语言模型整合、优化事件经过，解决"事实碎片化"问题
 * 完全由LLM驱动，确保时间线正确、逻辑连贯
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');
const llmClient = require('../../../services/llm-client');

class EventNarrativeAgent extends BaseAgentV2 {
  constructor() {
    super(
      '事件经过整合智能体',
      '基于大语言模型整合、优化事件经过，确保输出完整、连贯、时间线正确的事件经过',
      'analyzer'
    );
    this.narrativeStructure = {
      background: [],      // 背景
      trigger: null,       // 导火索
      development: [],     // 发展过程（按时间排序）
      currentStatus: null  // 当前状态
    };
  }

  async process(data, context = {}) {
    logger.info('[V2] 事件经过整合智能体开始整合事件经过');
    this.updateLastUsed();

    try {
      // 1. 收集所有Agent的分析结果
      const factDraft = this.extractFactDraft(context);
      const emotionDetails = this.extractEmotionDetails(context);
      const propagationDetails = this.extractPropagationDetails(context);
      
      // 2. 使用LLM进行智能整合
      logger.info('[V2] 事件经过整合智能体调用LLM进行整合');
      const llmResult = await this.integrateWithLLM(
        data,
        factDraft,
        emotionDetails,
        propagationDetails
      );
      
      // 3. 从LLM结果构建结构化事件经过
      const structuredNarrative = this.buildNarrativeFromLLM(llmResult);
      
      // 4. 校验完整性
      const completeness = this.validateCompleteness(structuredNarrative);
      
      // 5. 计算置信度
      const confidence = this.calculateConfidence(completeness, llmResult);
      this.setConfidence(confidence);

      const result = {
        confidence,
        narrative: structuredNarrative,
        completeness,
        gaps: completeness.gaps,
        keyInsights: this.generateInsights(structuredNarrative, completeness),
        recommendations: this.generateRecommendations(completeness),
        llmAnalysis: {
          used: true,
          model: llmClient.getInfo().model,
          rawResult: llmResult
        }
      };

      this.addToHistory(result);
      logger.info(`[V2] 事件经过整合智能体整合完成，置信度: ${confidence.toFixed(2)}`);

      return result;

    } catch (error) {
      logger.error('[V2] 事件经过整合智能体整合失败:', error);
      throw error;
    }
  }

  /**
   * 提取事实梳理智能体的事件经过初稿
   */
  extractFactDraft(context) {
    const specialistResults = context.publicInfoPool?.specialistResults;
    if (!specialistResults) return null;

    const latestRound = Math.max(...Object.keys(specialistResults).map(Number));
    const factResult = specialistResults[latestRound]?.get('事实梳理智能体');

    if (!factResult?.success) {
      logger.warn('[V2] 未找到事实梳理智能体的结果');
      return null;
    }

    const factData = factResult.result;
    return {
      coreElements: factData.coreElements,
      timeline: factData.factList?.timeline || [],
      gaps: factData.gaps || [],
      entities: factData.factList?.entities || [],
      keyInformation: factData.factList?.keyInformation || {}
    };
  }

  /**
   * 提取情绪分析中的相关细节
   */
  extractEmotionDetails(context) {
    const specialistResults = context.publicInfoPool?.specialistResults;
    if (!specialistResults) return null;

    const latestRound = Math.max(...Object.keys(specialistResults).map(Number));
    const emotionResult = specialistResults[latestRound]?.get('情绪态度分析智能体');

    if (!emotionResult?.success) {
      logger.warn('[V2] 未找到情绪态度分析智能体的结果');
      return null;
    }

    const emotionData = emotionResult.result;
    return {
      overallSentiment: emotionData.overallSentiment,
      sentimentDistribution: emotionData.sentimentDistribution,
      turningPoints: emotionData.turningPoints || [],
      emotionEvolution: emotionData.emotionEvolution || {}
    };
  }

  /**
   * 提取传播分析中的相关细节
   */
  extractPropagationDetails(context) {
    const specialistResults = context.publicInfoPool?.specialistResults;
    if (!specialistResults) return null;

    const latestRound = Math.max(...Object.keys(specialistResults).map(Number));
    const propagationResult = specialistResults[latestRound]?.get('传播路径分析智能体');

    if (!propagationResult?.success) {
      logger.warn('[V2] 未找到传播路径分析智能体的结果');
      return null;
    }

    const propagationData = propagationResult.result;
    return {
      propagationPath: propagationData.propagationPath,
      stages: propagationData.propagationPaths?.stages || [],
      keyNodes: propagationData.keyNodes || {},
      boostingFactors: propagationData.boostingFactors || []
    };
  }

  /**
   * 使用LLM进行智能整合
   */
  async integrateWithLLM(data, factDraft, emotionDetails, propagationDetails) {
    // 准备原始数据
    const postsText = data.map((post, index) => 
      `${index + 1}. [${post.publishTime || '未知时间'}] ${post.author || '匿名'}: ${post.content}`
    ).join('\n');

    // 准备事实梳理结果
    const factText = factDraft ? JSON.stringify({
      timeline: factDraft.timeline,
      entities: factDraft.entities,
      keyInformation: factDraft.keyInformation
    }, null, 2) : '无事实梳理结果';

    // 准备情绪分析结果
    const emotionText = emotionDetails ? JSON.stringify({
      overallSentiment: emotionDetails.overallSentiment,
      turningPoints: emotionDetails.turningPoints,
      emotionEvolution: emotionDetails.emotionEvolution
    }, null, 2) : '无情绪分析结果';

    // 准备传播分析结果
    const propagationText = propagationDetails ? JSON.stringify({
      stages: propagationDetails.stages,
      keyNodes: propagationDetails.keyNodes,
      boostingFactors: propagationDetails.boostingFactors
    }, null, 2) : '无传播分析结果';

    const systemPrompt = `你是一个专业的事件经过整合专家。你的任务是：
1. 分析所有提供的数据（原始微博、事实梳理、情绪分析、传播分析）
2. 按时间顺序构建完整的事件经过
3. **严格确保时间线逻辑正确（所有事件必须按时间从早到晚排序，不能出现时间倒流）**
4. 整合情绪拐点和传播阶段信息
5. 识别信息缺口和不确定性

**时间线排序规则（强制执行）：**
- 首先识别每个事件的具体时间（年-月-日）
- 按时间先后顺序排列，最早的事件排在第1位
- 如果只有月份没有日期，假设为当月1日进行排序
- 如果时间是"未知"或"不详"，根据事件逻辑推断大致时间位置
- **绝对不能出现后面的时间早于前面的时间**

**示例（正确的时间线）：**
1. [2025-02-26] 事件A（最早）
2. [2025-03-01] 事件B（次之）
3. [2025-03-15] 事件C（最晚）

输出必须是有效的JSON格式，包含以下字段：
{
  "background": {
    "entities": ["涉及的实体"],
    "context": "背景描述",
    "location": "地点"
  },
  "trigger": {
    "time": "具体时间",
    "event": "触发事件",
    "description": "详细描述"
  },
  "development": [
    {
      "sequence": 1,
      "time": "时间节点（格式：YYYY-MM-DD或YYYY-MM）",
      "event": "事件内容",
      "emotionContext": "当时的情绪状态",
      "propagationStage": "传播阶段",
      "description": "完整描述"
    }
  ],
  "currentStatus": {
    "latestEvent": "最新进展",
    "currentEmotion": "当前情绪",
    "propagationStage": "当前传播阶段",
    "description": "当前状态描述"
  },
  "timelineValidation": {
    "isChronological": true,
    "issues": [],
    "sortedOrder": ["事件1时间", "事件2时间", "事件3时间"]
  },
  "gaps": [
    {
      "type": "time/entity/location/action",
      "severity": "high/medium/low",
      "description": "缺口描述"
    }
  ],
  "insights": ["关键洞察1", "关键洞察2"],
  "recommendations": ["建议1", "建议2"]
}

**重要提示：**
- development数组必须严格按时间从早到晚排序
- 在timelineValidation中明确标注排序是否正确
- 如果发现时间逻辑错误，必须在issues中说明并修正
- 所有时间尽量统一为YYYY-MM-DD格式`;

    const userPrompt = `请整合以下数据，构建完整的事件经过：

【原始微博数据】
${postsText}

【事实梳理结果】
${factText}

【情绪分析结果】
${emotionText}

【传播分析结果】
${propagationText}

请输出JSON格式的事件经过分析结果。`;

    const response = await llmClient.chat(userPrompt, {
      systemPrompt,
      maxTokens: 3000,
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
      
      return {
        rawAnalysis: response.content,
        parseError: parseError.message,
        background: {},
        trigger: null,
        development: [],
        currentStatus: null,
        gaps: [{
          type: 'parsing',
          severity: 'high',
          description: 'LLM响应解析失败'
        }]
      };
    }
  }

  /**
   * 从LLM结果构建结构化事件经过
   */
  buildNarrativeFromLLM(llmResult) {
    let development = llmResult.development || [];
    
    // 强制按时间排序
    development = this.sortDevelopmentByTime(development);
    
    // 验证时间线逻辑
    const timelineValidation = this.validateTimelineOrder(development);
    
    const narrative = {
      background: llmResult.background || {},
      trigger: llmResult.trigger || null,
      development: development,
      currentStatus: llmResult.currentStatus || null,
      timelineValidation: timelineValidation
    };

    // 生成文本描述
    narrative.backgroundText = this.buildBackgroundText(narrative.background);
    narrative.triggerText = this.buildTriggerText(narrative.trigger);
    narrative.developmentText = this.buildDevelopmentText(narrative.development);
    narrative.currentStatusText = this.buildCurrentStatusText(narrative.currentStatus);
    narrative.fullText = this.generateFullNarrativeText(narrative);

    return narrative;
  }

  /**
   * 按时间排序发展过程
   */
  sortDevelopmentByTime(development) {
    if (!development || development.length === 0) return [];

    // 解析时间并排序
    const parsed = development.map((item, index) => {
      const timeStr = item.time || '';
      const parsedTime = this.parseTimeString(timeStr);
      return {
        ...item,
        originalIndex: index,
        parsedTime: parsedTime,
        sortKey: parsedTime ? parsedTime.getTime() : Infinity
      };
    });

    // 按时间排序（未知时间放在最后）
    parsed.sort((a, b) => {
      if (a.sortKey === Infinity && b.sortKey === Infinity) {
        return a.originalIndex - b.originalIndex;
      }
      if (a.sortKey === Infinity) return 1;
      if (b.sortKey === Infinity) return -1;
      return a.sortKey - b.sortKey;
    });

    // 重新分配sequence
    return parsed.map((item, index) => ({
      ...item,
      sequence: index + 1
    }));
  }

  /**
   * 解析时间字符串
   */
  parseTimeString(timeStr) {
    if (!timeStr || timeStr === '未知时间' || timeStr === '不详' || timeStr === '未知') {
      return null;
    }

    // 尝试各种格式
    const patterns = [
      // 2025-03-15 或 2025年3月15日
      { regex: /(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})/, handler: m => new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3])) },
      // 2025-03 或 2025年3月
      { regex: /(\d{4})[年\-/](\d{1,2})月?/, handler: m => new Date(parseInt(m[1]), parseInt(m[2])-1, 1) },
      // 3月15日（假设当年）
      { regex: /(\d{1,2})月(\d{1,2})日?/, handler: m => new Date(new Date().getFullYear(), parseInt(m[1])-1, parseInt(m[2])) },
      // 2025
      { regex: /^(\d{4})$/, handler: m => new Date(parseInt(m[1]), 0, 1) }
    ];

    for (const pattern of patterns) {
      const match = timeStr.match(pattern.regex);
      if (match) {
        try {
          return pattern.handler(match);
        } catch (e) {
          return null;
        }
      }
    }

    // 尝试直接解析
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // 解析失败
    }

    return null;
  }

  /**
   * 验证时间线顺序
   */
  validateTimelineOrder(development) {
    const issues = [];
    let isChronological = true;
    const sortedOrder = [];

    for (let i = 0; i < development.length; i++) {
      const item = development[i];
      sortedOrder.push(item.time || '未知');

      if (i > 0) {
        const prevTime = development[i-1].parsedTime;
        const currTime = item.parsedTime;

        if (prevTime && currTime && currTime < prevTime) {
          issues.push(`时间逻辑错误：第${i+1}个事件(${item.time})早于第${i}个事件(${development[i-1].time})`);
          isChronological = false;
        }
      }
    }

    return {
      isChronological,
      issues,
      sortedOrder
    };
  }

  /**
   * 构建背景文本
   */
  buildBackgroundText(background) {
    if (!background) return '';
    
    const parts = [];
    if (background.entities && background.entities.length > 0) {
      parts.push(`事件涉及主体：${background.entities.join('、')}`);
    }
    if (background.context) {
      parts.push(background.context);
    }
    if (background.location) {
      parts.push(`地点：${background.location}`);
    }
    
    return parts.join('；');
  }

  /**
   * 构建导火索文本
   */
  buildTriggerText(trigger) {
    if (!trigger) return '';
    
    const parts = [];
    if (trigger.time) {
      parts.push(trigger.time);
    }
    if (trigger.event) {
      parts.push(trigger.event);
    }
    if (trigger.description) {
      parts.push(trigger.description);
    }
    
    return parts.join('，');
  }

  /**
   * 构建发展过程文本
   */
  buildDevelopmentText(development) {
    if (!development || development.length === 0) return '';
    
    return development.map((node, index) => {
      let line = `${index + 1}. `;
      
      if (node.time) {
        line += `[${node.time}] `;
      }
      
      if (node.event) {
        line += node.event;
      } else if (node.description) {
        line += node.description;
      }
      
      if (node.emotionContext) {
        line += `（情绪：${node.emotionContext}）`;
      }
      
      if (node.propagationStage) {
        line += `【传播：${node.propagationStage}】`;
      }
      
      return line;
    }).join('\n');
  }

  /**
   * 构建当前状态文本
   */
  buildCurrentStatusText(currentStatus) {
    if (!currentStatus) return '';
    
    if (currentStatus.description) {
      return currentStatus.description;
    }
    
    const parts = [];
    if (currentStatus.latestEvent) {
      parts.push(`最新进展：${currentStatus.latestEvent}`);
    }
    if (currentStatus.currentEmotion) {
      parts.push(`当前情绪：${currentStatus.currentEmotion}`);
    }
    if (currentStatus.propagationStage) {
      parts.push(`传播阶段：${currentStatus.propagationStage}`);
    }
    
    return parts.join('，');
  }

  /**
   * 生成完整的事件经过文本
   */
  generateFullNarrativeText(narrative) {
    let text = '【舆情事件详细经过】\n\n';

    if (narrative.backgroundText) {
      text += '一、事件背景\n';
      text += narrative.backgroundText + '\n\n';
    }

    if (narrative.triggerText) {
      text += '二、事件导火索\n';
      text += narrative.triggerText + '\n\n';
    }

    if (narrative.developmentText) {
      text += '三、事件发展过程\n';
      text += narrative.developmentText + '\n\n';
    }

    if (narrative.currentStatusText) {
      text += '四、当前状态\n';
      text += narrative.currentStatusText + '\n';
    }

    return text;
  }

  /**
   * 校验事件经过的完整性
   */
  validateCompleteness(narrative) {
    const gaps = [];
    let isComplete = true;

    // 检查背景
    if (!narrative.background || Object.keys(narrative.background).length === 0) {
      gaps.push({
        type: 'missing_background',
        severity: 'medium',
        description: '事件背景信息缺失'
      });
      isComplete = false;
    }

    // 检查导火索
    if (!narrative.trigger) {
      gaps.push({
        type: 'missing_trigger',
        severity: 'high',
        description: '事件导火索/起始点未明确'
      });
      isComplete = false;
    }

    // 检查发展过程
    if (!narrative.development || narrative.development.length === 0) {
      gaps.push({
        type: 'missing_development',
        severity: 'high',
        description: '事件发展过程缺失'
      });
      isComplete = false;
    } else if (narrative.development.length < 2) {
      gaps.push({
        type: 'insufficient_development',
        severity: 'medium',
        description: '事件发展过程细节不足'
      });
    }

    // 检查时间线逻辑
    if (narrative.timelineValidation && !narrative.timelineValidation.isChronological) {
      gaps.push({
        type: 'timeline_issue',
        severity: 'high',
        description: '时间线存在逻辑问题：' + (narrative.timelineValidation.issues?.join(', ') || '未知')
      });
    }

    // 检查当前状态
    if (!narrative.currentStatus) {
      gaps.push({
        type: 'missing_current_status',
        severity: 'medium',
        description: '当前状态未明确'
      });
      isComplete = false;
    }

    return {
      isComplete,
      gaps,
      completenessScore: this.calculateCompletenessScore(gaps)
    };
  }

  /**
   * 计算完整性分数
   */
  calculateCompletenessScore(gaps) {
    let score = 1.0;
    gaps.forEach(gap => {
      if (gap.severity === 'high') score -= 0.3;
      else if (gap.severity === 'medium') score -= 0.2;
      else score -= 0.1;
    });
    return Math.max(0, score);
  }

  /**
   * 计算置信度
   */
  calculateConfidence(completeness, llmResult) {
    let score = completeness.completenessScore;

    // LLM分析质量加分
    if (llmResult && !llmResult.parseError) {
      score += 0.2;
    }

    // 时间线正确性加分
    if (llmResult?.timelineValidation?.isChronological) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * 生成关键洞察
   */
  generateInsights(narrative, completeness) {
    const insights = [];

    if (narrative.development?.length > 0) {
      insights.push(`事件经过包含${narrative.development.length}个关键节点`);
    }

    // 检查情绪拐点
    const emotionTurnings = narrative.development?.filter(
      node => node.emotionContext && node.emotionContext.includes('拐点')
    );
    if (emotionTurnings?.length > 0) {
      insights.push(`识别到${emotionTurnings.length}个情绪拐点`);
    }

    if (!completeness.isComplete) {
      insights.push(`存在${completeness.gaps.length}处信息缺口`);
    }

    if (narrative.currentStatus?.currentEmotion) {
      insights.push(`当前公众情绪：${narrative.currentStatus.currentEmotion}`);
    }

    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(completeness) {
    const recommendations = [];

    completeness.gaps.forEach(gap => {
      if (gap.type === 'missing_trigger') {
        recommendations.push('补充事件导火索信息');
      } else if (gap.type === 'missing_development') {
        recommendations.push('补充事件发展过程的时间节点');
      } else if (gap.type === 'timeline_issue') {
        recommendations.push('核实并修正时间线逻辑');
      } else if (gap.type === 'missing_current_status') {
        recommendations.push('明确当前事件进展');
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('事件经过完整，建议持续跟踪');
    }

    return recommendations;
  }

  /**
   * 调整策略
   */
  async adjustStrategy(guidance) {
    logger.info('[V2] 事件经过整合智能体调整策略:', guidance);
    
    if (guidance.focusGaps) {
      this.focusGaps = guidance.focusGaps;
    }
  }
}

module.exports = EventNarrativeAgent;
