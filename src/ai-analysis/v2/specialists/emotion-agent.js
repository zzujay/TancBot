/**
 * 情绪/态度分析智能体 (Emotion Agent)
 * 聚焦"主观倾向"，分析微博内容中不同主体的情绪、态度和立场
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class EmotionAgent extends BaseAgentV2 {
  constructor() {
    super(
      '情绪态度分析智能体',
      '聚焦主观倾向，分析情绪类型、立场倾向、情绪演变',
      'analyzer'
    );
    this.emotionKeywords = {
      angry: ['愤怒', '生气', '恼火', '气愤', '暴怒', '火大', '怒', '恨', '讨厌'],
      anxious: ['焦虑', '担心', '害怕', '恐惧', '紧张', '不安', '慌', '愁'],
      sympathetic: ['同情', '心疼', '难过', '悲伤', '感动', '支持', '理解'],
      positive: ['开心', '高兴', '满意', '赞', '好', '棒', '优秀', '支持'],
      negative: ['失望', '不满', '质疑', '反对', '批评', '吐槽', '抱怨'],
      neutral: ['关注', '观望', '了解', '知道', '看到']
    };
    this.stanceKeywords = {
      support: ['支持', '赞同', '同意', '认可', '站在', '力挺'],
      oppose: ['反对', '抵制', '抗议', '谴责', '批评', '质疑'],
      question: ['疑问', '质疑', '不解', '困惑', '为什么', '怎么回事'],
      neutral: ['中立', '客观', '理性', '观望']
    };
  }

  async process(data, context = {}) {
    logger.info(`[V2] 情绪态度分析智能体开始分析，数据量: ${data.length}`);
    this.updateLastUsed();

    try {
      // 1. 识别情绪类型和强度
      const emotionAnalysis = this.analyzeEmotions(data);

      // 2. 分析立场倾向
      const stanceAnalysis = this.analyzeStance(data);

      // 3. 追踪情绪演变
      const emotionEvolution = this.trackEmotionEvolution(data, emotionAnalysis);

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
   * 分析情绪类型和强度
   */
  analyzeEmotions(data) {
    const emotions = {
      angry: { count: 0, intensity: 0, examples: [] },
      anxious: { count: 0, intensity: 0, examples: [] },
      sympathetic: { count: 0, intensity: 0, examples: [] },
      positive: { count: 0, intensity: 0, examples: [] },
      negative: { count: 0, intensity: 0, examples: [] },
      neutral: { count: 0, intensity: 0, examples: [] }
    };

    data.forEach((item, index) => {
      const content = item.content || item.text || '';
      
      // 分析每种情绪
      for (const [emotionType, keywords] of Object.entries(this.emotionKeywords)) {
        let matched = false;
        let intensity = 0;
        
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            matched = true;
            // 计算强度（根据关键词出现次数和修饰词）
            const matches = content.match(new RegExp(keyword, 'g'));
            intensity += matches ? matches.length : 1;
            
            // 检查强度修饰词
            if (content.includes('非常') || content.includes('特别') || content.includes('很')) {
              intensity += 1;
            }
            if (content.includes('极度') || content.includes('超级') || content.includes('太')) {
              intensity += 2;
            }
          }
        });

        if (matched) {
          emotions[emotionType].count++;
          emotions[emotionType].intensity += intensity;
          
          // 保存示例（限制数量）
          if (emotions[emotionType].examples.length < 3) {
            emotions[emotionType].examples.push({
              index,
              content: content.substring(0, 100),
              intensity
            });
          }
        }
      }
    });

    // 计算整体情绪分布
    const total = data.length;
    const distribution = {};
    
    for (const [type, data] of Object.entries(emotions)) {
      distribution[type] = {
        count: data.count,
        percentage: total > 0 ? (data.count / total * 100).toFixed(1) : 0,
        avgIntensity: data.count > 0 ? (data.intensity / data.count).toFixed(2) : 0
      };
    }

    // 确定主导情绪
    let dominantEmotion = 'neutral';
    let maxCount = 0;
    
    for (const [type, data] of Object.entries(emotions)) {
      if (data.count > maxCount) {
        maxCount = data.count;
        dominantEmotion = type;
      }
    }

    return {
      totalAnalyzed: total,
      dominantEmotion,
      distribution,
      details: emotions
    };
  }

  /**
   * 分析立场倾向
   */
  analyzeStance(data) {
    const stances = {
      support: { count: 0, users: new Set(), examples: [] },
      oppose: { count: 0, users: new Set(), examples: [] },
      question: { count: 0, users: new Set(), examples: [] },
      neutral: { count: 0, users: new Set(), examples: [] }
    };

    data.forEach((item, index) => {
      const content = item.content || item.text || '';
      const userId = item.userId || item.author || `user_${index}`;
      
      // 分析每种立场
      for (const [stanceType, keywords] of Object.entries(this.stanceKeywords)) {
        let matched = false;
        
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            matched = true;
          }
        });

        if (matched) {
          stances[stanceType].count++;
          stances[stanceType].users.add(userId);
          
          // 保存示例
          if (stances[stanceType].examples.length < 3) {
            stances[stanceType].examples.push({
              index,
              userId,
              content: content.substring(0, 100)
            });
          }
        }
      }
    });

    // 转换Set为Array
    for (const stance of Object.values(stances)) {
      stance.users = Array.from(stance.users);
    }

    // 计算立场分布
    const total = data.length;
    const distribution = {};
    
    for (const [type, data] of Object.entries(stances)) {
      distribution[type] = {
        count: data.count,
        percentage: total > 0 ? (data.count / total * 100).toFixed(1) : 0,
        uniqueUsers: data.users.length
      };
    }

    // 确定主导立场
    let dominantStance = 'neutral';
    let maxCount = 0;
    
    for (const [type, data] of Object.entries(stances)) {
      if (data.count > maxCount) {
        maxCount = data.count;
        dominantStance = type;
      }
    }

    return {
      totalAnalyzed: total,
      dominantStance,
      distribution,
      details: stances
    };
  }

  /**
   * 追踪情绪演变
   */
  trackEmotionEvolution(data, emotionAnalysis) {
    // 按时间排序数据
    const sortedData = [...data].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.time || 0);
      const timeB = new Date(b.createdAt || b.time || 0);
      return timeA - timeB;
    });

    // 分阶段分析（初期、发酵期、高峰期、平息期）
    const stages = {
      early: { range: [0, 0.25], emotions: {}, label: '初期' },
      developing: { range: [0.25, 0.5], emotions: {}, label: '发酵期' },
      peak: { range: [0.5, 0.75], emotions: {}, label: '高峰期' },
      declining: { range: [0.75, 1], emotions: {}, label: '平息期' }
    };

    const total = sortedData.length;
    
    for (const [stageName, stage] of Object.entries(stages)) {
      const startIdx = Math.floor(total * stage.range[0]);
      const endIdx = Math.floor(total * stage.range[1]);
      const stageData = sortedData.slice(startIdx, endIdx);
      
      // 分析该阶段的主导情绪
      const stageEmotions = {};
      
      stageData.forEach(item => {
        const content = item.content || item.text || '';
        
        for (const [emotionType, keywords] of Object.entries(this.emotionKeywords)) {
          keywords.forEach(keyword => {
            if (content.includes(keyword)) {
              stageEmotions[emotionType] = (stageEmotions[emotionType] || 0) + 1;
            }
          });
        }
      });

      // 找出主导情绪
      let dominant = 'neutral';
      let maxCount = 0;
      
      for (const [type, count] of Object.entries(stageEmotions)) {
        if (count > maxCount) {
          maxCount = count;
          dominant = type;
        }
      }

      stages[stageName].emotions = stageEmotions;
      stages[stageName].dominantEmotion = dominant;
      stages[stageName].dataCount = stageData.length;
    }

    return stages;
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
      
      // 检测情绪类型变化
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
    // 从负面情绪转向正面情绪是重要拐点
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
    let score = 0.7; // 基础分
    
    // 根据分析数量加分
    const totalAnalyzed = emotionAnalysis.totalAnalyzed;
    if (totalAnalyzed > 10) score += 0.1;
    if (totalAnalyzed > 50) score += 0.1;
    
    // 根据情绪分布清晰度加分
    const emotionDistribution = emotionAnalysis.distribution;
    const hasClearDominant = Object.values(emotionDistribution)
      .some(e => parseFloat(e.percentage) > 30);
    if (hasClearDominant) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * 生成关键洞察
   */
  generateInsights(emotionAnalysis, stanceAnalysis, turningPoints) {
    const insights = [];

    // 情绪洞察
    const dominantEmotion = emotionAnalysis.dominantEmotion;
    const emotionPercent = emotionAnalysis.distribution[dominantEmotion]?.percentage || 0;
    insights.push(`主导情绪为${this.translateEmotion(dominantEmotion)}，占比${emotionPercent}%`);

    // 立场洞察
    const dominantStance = stanceAnalysis.dominantStance;
    const stancePercent = stanceAnalysis.distribution[dominantStance]?.percentage || 0;
    insights.push(`主要立场倾向为${this.translateStance(dominantStance)}，占比${stancePercent}%`);

    // 拐点洞察
    if (turningPoints.length > 0) {
      insights.push(`检测到${turningPoints.length}个关键情绪拐点`);
      turningPoints.forEach((point, i) => {
        if (point.significance === 'high') {
          insights.push(`重要拐点${i + 1}: ${point.from}→${point.to}，情绪从${this.translateEmotion(point.emotionChange.split(' → ')[0])}转为${this.translateEmotion(point.emotionChange.split(' → ')[1])}`);
        }
      });
    }

    // 演变洞察
    const evolution = Object.entries(emotionAnalysis.details)
      .filter(([_, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count);
    
    if (evolution.length >= 2) {
      insights.push(`次要情绪包括${this.translateEmotion(evolution[1][0])}(${emotionAnalysis.distribution[evolution[1][0]].percentage}%)`);
    }

    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(emotionAnalysis) {
    const recommendations = [];
    const dominantEmotion = emotionAnalysis.dominantEmotion;

    if (dominantEmotion === 'angry' || dominantEmotion === 'negative') {
      recommendations.push('负面情绪占主导，建议及时回应关切，平息公众情绪');
      recommendations.push('关注愤怒情绪源头，针对性解决问题');
    } else if (dominantEmotion === 'anxious') {
      recommendations.push('公众存在焦虑情绪，建议加强信息透明度，消除不确定性');
    } else if (dominantEmotion === 'sympathetic') {
      recommendations.push('公众情绪偏向同情支持，可顺势引导正面舆论');
    }

    // 检查情绪强度
    const avgIntensity = parseFloat(emotionAnalysis.distribution[dominantEmotion]?.avgIntensity || 0);
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
      // 聚焦特定情绪类型
      this.focusEmotions = guidance.focusEmotions;
    }
    
    if (guidance.deepAnalysis) {
      // 深度分析模式
      this.deepAnalysis = true;
    }
  }
}

module.exports = EmotionAgent;
