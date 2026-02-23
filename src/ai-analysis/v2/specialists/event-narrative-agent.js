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
      let llmResult = await this.integrateWithLLM(
        data,
        factDraft,
        emotionDetails,
        propagationDetails
      );
      
      // 3. 从LLM结果构建结构化事件经过
      let structuredNarrative = this.buildNarrativeFromLLM(llmResult);
      
      // 4. 检查时间矛盾，如果有则使用LLM重新分析
      if (structuredNarrative.timelineValidation?.hasTimeAnomaly) {
        logger.warn('[V2] 检测到时间矛盾，使用LLM重新分析因果关系');
        
        // 准备更详细的原始数据给LLM重新分析
        const enrichedData = this.prepareEnrichedData(data, structuredNarrative);
        
        // 使用LLM重新分析，明确指定按因果逻辑排序
        const correctedResult = await this.reanalyzeWithCausalLogic(
          enrichedData,
          factDraft,
          emotionDetails,
          propagationDetails,
          structuredNarrative.timelineValidation
        );
        
        // 使用修正后的结果
        if (correctedResult && correctedResult.development && correctedResult.development.length > 0) {
          llmResult = correctedResult;
          structuredNarrative = this.buildNarrativeFromLLM(llmResult);
          structuredNarrative.wasReanalyzed = true;
          structuredNarrative.reanalysisReason = '时间矛盾已修正';
        }
      }
      
      // 5. 校验完整性
      const completeness = this.validateCompleteness(structuredNarrative);
      
      // 6. 计算置信度
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

**时间线排序与因果逻辑规则（强制执行）：**
- **首要原则：按因果关系排序（起因→发展→结果）**
- 在因果关系明确的前提下，按时间先后顺序排列
- 如果只有月份没有日期，假设为当月1日进行排序
- 如果时间是"未知"或"不详"，根据事件逻辑推断大致时间位置
- **绝对不能出现后面的时间早于前面的时间**

**时间异常检测与处理：**
当发现时间逻辑矛盾时（如结果发生在起因之前），按以下优先级处理：
1. **检查是否为跨年事件**（如2024年3月→2025年2月）
2. **检查时间数据是否有误**（如2月应为3月）
3. **以因果逻辑为准**，纠正错误的时间标记
4. 在timelineValidation.issues中说明时间异常及修正方式

**示例1（正确的时间线）：**
1. [2025-02-26] 事件A（起因，最早）
2. [2025-03-01] 事件B（发展，次之）
3. [2025-03-15] 事件C（结果，最晚）

**示例2（跨年事件）：**
1. [2024-03-15] 事件A（起因，2024年3月）
2. [2025-02-20] 事件B（结果，2025年2月）
注意：虽然是2月，但年份晚于3月，所以排在后面

**示例3（时间错误纠正）：**
原始数据：
- [2025-02-21] 撤诉（结果）
- [2025-03-15] 摔倒（起因）
纠正后：
1. [2025-03-15] 摔倒（起因）← 识别为时间标记错误，实际应为起因
2. [2025-02-21] 开庭（发展）← 推断为2月21日开庭
3. [2025-02-26] 撤诉（结果）← 推断为2月26日撤诉

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
    narrative.developmentText = this.buildDevelopmentText(narrative.development, timelineValidation);
    narrative.currentStatusText = this.buildCurrentStatusText(narrative.currentStatus);
    narrative.fullText = this.generateFullNarrativeText(narrative);

    return narrative;
  }

  /**
   * 按时间和因果逻辑排序发展过程
   */
  sortDevelopmentByTime(development) {
    if (!development || development.length === 0) return [];

    // 解析时间
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

    // 检测时间矛盾（起因事件的时间晚于结果事件）
    const timeContradictions = this.detectTimeContradictions(parsed);
    
    // 如果有时间矛盾，尝试智能纠正
    if (timeContradictions.length > 0) {
      logger.warn('[V2] 检测到时间矛盾:', timeContradictions);
      // 标记时间异常，但不改变排序（保持时间顺序，但添加异常标记）
      parsed.forEach(item => {
        item.hasTimeAnomaly = true;
        item.timeContradictions = timeContradictions;
      });
    }

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
   * 检测时间矛盾
   * 识别因果关系与时间顺序不符的情况
   */
  detectTimeContradictions(development) {
    const contradictions = [];
    
    // 定义起因关键词
    const causeKeywords = ['摔倒', '发生事故', '起因', '开始', '首次', '最初'];
    // 定义结果关键词
    const resultKeywords = ['撤诉', '结束', '结果', '最终', '最后', '完成'];
    
    for (let i = 0; i < development.length; i++) {
      const item = development[i];
      const eventText = (item.event || item.description || '').toLowerCase();
      
      // 检查是否包含起因关键词
      const isCause = causeKeywords.some(kw => eventText.includes(kw));
      // 检查是否包含结果关键词
      const isResult = resultKeywords.some(kw => eventText.includes(kw));
      
      if (isCause && item.parsedTime) {
        // 检查是否有结果事件的时间早于这个起因事件
        for (let j = 0; j < development.length; j++) {
          if (i === j) continue;
          
          const otherItem = development[j];
          const otherEventText = (otherItem.event || otherItem.description || '').toLowerCase();
          const otherIsResult = resultKeywords.some(kw => otherEventText.includes(kw));
          
          if (otherIsResult && otherItem.parsedTime) {
            if (otherItem.parsedTime < item.parsedTime) {
              // 结果事件的时间早于起因事件，这是矛盾的
              contradictions.push({
                causeEvent: { time: item.time, description: item.event || item.description },
                resultEvent: { time: otherItem.time, description: otherItem.event || otherItem.description },
                description: `起因事件(${item.time})晚于结果事件(${otherItem.time})`
              });
            }
          }
        }
      }
    }
    
    return contradictions;
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
    let hasTimeAnomaly = false;
    let anomalyDescription = '';

    for (let i = 0; i < development.length; i++) {
      const item = development[i];
      sortedOrder.push(item.time || '未知');

      if (i > 0) {
        const prevItem = development[i-1];
        const prevTime = prevItem.parsedTime;
        const currTime = item.parsedTime;

        if (prevTime && currTime && currTime < prevTime) {
          // 检测是否为跨年事件
          const prevYear = prevTime.getFullYear();
          const currYear = currTime.getFullYear();
          
          if (currYear > prevYear) {
            // 跨年事件，这是正常的
            issues.push(`跨年事件：第${i+1}个事件(${item.time}, ${currYear}年)晚于第${i}个事件(${prevItem.time}, ${prevYear}年)`);
          } else {
            // 同年份时间倒流，可能是时间数据错误
            hasTimeAnomaly = true;
            anomalyDescription = `时间异常：第${i+1}个事件(${item.time})在因果关系上应该是起因，但时间标记早于第${i}个事件(${prevItem.time})`;
            issues.push(anomalyDescription);
            isChronological = false;
          }
        }
      }
    }

    return {
      isChronological,
      hasTimeAnomaly,
      anomalyDescription,
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
      let context = background.context.trim();
      context = context.replace(/[。，,；;！!？?]$/, '');
      parts.push(context);
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
      // 去除末尾的标点符号，避免重复
      let event = trigger.event.trim();
      event = event.replace(/[。，,；;！!？?]$/, '');
      parts.push(event);
    }
    if (trigger.description) {
      // 去除末尾的标点符号，避免重复
      let desc = trigger.description.trim();
      desc = desc.replace(/[。，,；;！!？?]$/, '');
      parts.push(desc);
    }
    
    return parts.join('，');
  }

  /**
   * 构建发展过程文本
   */
  buildDevelopmentText(development, timelineValidation = null) {
    if (!development || development.length === 0) return '';
    
    let text = '';
    
    // 如果有时间异常，添加提示
    if (timelineValidation && timelineValidation.hasTimeAnomaly) {
      text += `【注：${timelineValidation.anomalyDescription}，已按因果逻辑重新排序】\n\n`;
    }
    
    // 检查是否有时间矛盾
    const hasContradictions = development.some(item => item.timeContradictions && item.timeContradictions.length > 0);
    if (hasContradictions) {
      text += `【⚠️ 警告：检测到时间逻辑矛盾】\n`;
      text += `事件时间顺序与因果关系不符，可能存在以下情况：\n`;
      text += `1. 数据中混杂了多个不同的事件\n`;
      text += `2. 部分事件的时间标记有误\n`;
      text += `3. 存在跨年事件（如2024年3月→2025年2月）\n\n`;
      
      // 显示具体的矛盾
      const allContradictions = [];
      development.forEach(item => {
        if (item.timeContradictions) {
          allContradictions.push(...item.timeContradictions);
        }
      });
      
      if (allContradictions.length > 0) {
        text += `具体矛盾：\n`;
        allContradictions.forEach((c, i) => {
          text += `${i + 1}. ${c.description}\n`;
        });
        text += '\n';
      }
    }
    
    text += development.map((node, index) => {
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
    
    return text;
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
      let event = currentStatus.latestEvent.trim();
      event = event.replace(/[。，,；;！!？?]$/, '');
      parts.push(`最新进展：${event}`);
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
   * 准备增强数据用于重新分析
   * 当检测到时间矛盾时，准备更详细的原始数据
   */
  prepareEnrichedData(rawData, narrative) {
    // 提取所有时间信息
    const timeInfo = rawData.map((item, index) => ({
      index,
      content: (item.content || item.text || '').substring(0, 200),
      author: item.author || item.userId || '匿名',
      publishTime: item.publish_time || item.publishTime || item.createdAt || '未知',
      shares: item.shares || 0,
      comments: item.comments || 0,
      likes: item.likes || 0
    }));

    // 提取当前检测到的时间矛盾
    const contradictions = narrative.timelineValidation?.issues || [];

    return {
      rawPosts: timeInfo,
      contradictions: contradictions,
      currentDevelopment: narrative.development?.map(d => ({
        time: d.time,
        event: d.event,
        description: d.description
      })) || []
    };
  }

  /**
   * 使用LLM重新分析，按因果逻辑排序
   * 当检测到时间矛盾时，通过LLM智能识别因果关系并重新排序
   */
  async reanalyzeWithCausalLogic(enrichedData, factDraft, emotionDetails, propagationDetails, timelineValidation) {
    logger.info('[V2] 使用LLM按因果逻辑重新分析事件经过');

    const prompt = `你是一个专业的事件因果分析专家。当前数据中存在时间逻辑矛盾，需要你基于事件内容智能识别因果关系，并按因果逻辑重新排序。

**核心任务：**
1. 分析所有事件内容，识别真正的因果关系（起因→发展→结果）
2. 忽略原始时间标记中的错误，以因果逻辑为准
3. 为每个事件推断合理的时间顺序
4. 输出按因果逻辑排序的事件发展过程

**输入数据：**
原始微博数据：
${JSON.stringify(enrichedData.rawPosts, null, 2)}

当前检测到的时间矛盾：
${JSON.stringify(enrichedData.contradictions, null, 2)}

当前的事件排序（存在问题的）：
${JSON.stringify(enrichedData.currentDevelopment, null, 2)}

**分析要求：**
1. 识别哪个事件是"起因"（如：摔倒、事故、首次曝光等）
2. 识别后续发展事件（如：帮扶、判责、索赔、开庭等）
3. 识别最终结果（如：撤诉、和解、判决等）
4. 按因果逻辑为每个事件分配合理的时间顺序
5. 如果时间标记明显错误，修正时间标记

**输出格式（JSON）：**
{
  "development": [
    {
      "sequence": 1,
      "time": "修正后的时间（格式：YYYY-MM-DD）",
      "originalTime": "原始时间标记",
      "event": "事件内容",
      "description": "详细描述",
      "causalRole": "起因/发展/结果",
      "reasoning": "为什么这样排序的理由"
    }
  ],
  "timeCorrections": [
    {
      "original": "原始时间",
      "corrected": "修正后的时间",
      "reason": "修正理由"
    }
  ],
  "causalChain": "因果链描述（如：摔倒→帮扶→判责→索赔→撤诉）"
}

**重要提示：**
- 优先考虑因果关系，而非原始时间标记
- 如果原始时间明显错误（如结果在起因之前），必须修正
- 为每个事件提供修正理由
- 确保排序后的逻辑通顺：起因→发展→结果`;

    try {
      const response = await llmClient.chat(prompt, {
        temperature: 0.3,
        maxTokens: 3000
      });

      const result = this.parseLLMResponse(response.content);
      
      // 验证返回结果
      if (result.development && result.development.length > 0) {
        logger.info(`[V2] LLM重新分析完成，生成${result.development.length}个事件节点`);
        return result;
      } else {
        logger.warn('[V2] LLM重新分析返回空结果，使用原始结果');
        return null;
      }
    } catch (error) {
      logger.error('[V2] LLM因果逻辑重新分析失败:', error);
      return null;
    }
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
