const logger = require('../utils/logger');

/**
 * 数据清洗技能
 * 自动优化数据质量和清洗策略
 */
class DataCleaningSkill {
  constructor() {
    this.name = 'DataCleaningSkill';
    this.description = '智能数据清洗和预处理技能';
    this.version = '1.0.0';
    this.config = {
      minTextLength: 10,
      maxTextLength: 1000,
      removeDuplicates: true,
      languageFilter: 'zh',
      qualityThreshold: 0.7
    };
    this.cleaningRules = this.getDefaultRules();
  }

  getDefaultRules() {
    return [
      {
        name: 'remove_urls',
        type: 'regex',
        pattern: /http[s]?:\/\/[^\s]+/g,
        enabled: true,
        description: '移除URL链接'
      },
      {
        name: 'remove_mentions',
        type: 'regex',
        pattern: /[@＠]\w+/g,
        enabled: true,
        description: '移除@提及'
      },
      {
        name: 'remove_hashtags',
        type: 'regex',
        pattern: /[#＃]\w+/g,
        enabled: true,
        description: '移除#标签'
      },
      {
        name: 'normalize_whitespace',
        type: 'text',
        action: 'normalize',
        enabled: true,
        description: '规范化空白字符'
      },
      {
        name: 'remove_special_chars',
        type: 'regex',
        pattern: /[^\u4e00-\u9fa5\w\s，。！？、；：""''（）【】《》]/g,
        enabled: true,
        description: '移除非中文字符'
      }
    ];
  }

  async execute(context, data) {
    logger.info(`执行数据清洗技能，处理 ${data.length} 条数据`);
    
    const startTime = Date.now();
    let cleanedData = [...data];
    
    try {
      // 1. 基础清洗
      cleanedData = await this.basicCleaning(cleanedData);
      
      // 2. 质量评估
      const qualityMetrics = await this.assessDataQuality(cleanedData);
      
      // 3. 智能优化
      if (qualityMetrics.overallScore < this.config.qualityThreshold) {
        cleanedData = await this.intelligentOptimization(cleanedData, qualityMetrics);
      }
      
      // 4. 去重
      if (this.config.removeDuplicates) {
        cleanedData = await this.removeDuplicates(cleanedData);
      }
      
      // 5. 最终验证
      const finalMetrics = await this.assessDataQuality(cleanedData);
      
      const executionTime = Date.now() - startTime;
      
      logger.info(`数据清洗完成，用时 ${executionTime}ms，质量评分: ${finalMetrics.overallScore.toFixed(2)}`);
      
      return {
        success: true,
        cleanedData: cleanedData,
        originalCount: data.length,
        cleanedCount: cleanedData.length,
        removedCount: data.length - cleanedData.length,
        qualityMetrics: finalMetrics,
        executionTime: executionTime,
        rulesApplied: this.getAppliedRules()
      };
      
    } catch (error) {
      logger.error('数据清洗失败:', error);
      throw error;
    }
  }

  async basicCleaning(data) {
    return data.map(item => {
      let cleanedContent = item.content || '';
      
      // 应用清洗规则
      this.cleaningRules.forEach(rule => {
        if (rule.enabled) {
          cleanedContent = this.applyRule(cleanedContent, rule);
        }
      });
      
      // 长度过滤
      if (cleanedContent.length < this.config.minTextLength || 
          cleanedContent.length > this.config.maxTextLength) {
        return null; // 标记为无效
      }
      
      return {
        ...item,
        content: cleanedContent.trim(),
        cleaned: true,
        originalLength: item.content?.length || 0,
        cleanedLength: cleanedContent.length
      };
    }).filter(item => item !== null); // 移除无效数据
  }

  applyRule(text, rule) {
    switch (rule.type) {
      case 'regex':
        return text.replace(rule.pattern, '');
      case 'text':
        if (rule.action === 'normalize') {
          return text.replace(/\s+/g, ' ').trim();
        }
        return text;
      default:
        return text;
    }
  }

  async assessDataQuality(data) {
    const metrics = {
      totalItems: data.length,
      avgLength: 0,
      lengthVariance: 0,
      languageConsistency: 0,
      completeness: 0,
      uniqueness: 0
    };

    if (data.length === 0) {
      return { overallScore: 0, metrics };
    }

    // 计算平均长度
    const lengths = data.map(item => item.content?.length || 0);
    metrics.avgLength = lengths.reduce((sum, len) => sum + len, 0) / data.length;

    // 计算长度方差
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - metrics.avgLength, 2), 0) / data.length;
    metrics.lengthVariance = Math.sqrt(variance);

    // 语言一致性
    metrics.languageConsistency = this.assessLanguageConsistency(data);

    // 完整性
    metrics.completeness = this.assessCompleteness(data);

    // 唯一性
    metrics.uniqueness = this.assessUniqueness(data);

    // 综合评分
    const overallScore = this.calculateOverallScore(metrics);
    metrics.overallScore = overallScore;

    return {
      overallScore,
      metrics,
      qualityLevel: this.getQualityLevel(overallScore)
    };
  }

  assessLanguageConsistency(data) {
    let chineseChars = 0;
    let totalChars = 0;

    data.forEach(item => {
      const content = item.content || '';
      for (let char of content) {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          chineseChars++;
        }
        totalChars++;
      }
    });

    return totalChars > 0 ? chineseChars / totalChars : 0;
  }

  assessCompleteness(data) {
    const requiredFields = ['content', 'author', 'publish_time'];
    let completeItems = 0;

    data.forEach(item => {
      const isComplete = requiredFields.every(field => item[field] && item[field].toString().trim() !== '');
      if (isComplete) completeItems++;
    });

    return data.length > 0 ? completeItems / data.length : 0;
  }

  assessUniqueness(data) {
    const contentSet = new Set();
    data.forEach(item => {
      if (item.content) {
        contentSet.add(this.getContentHash(item.content));
      }
    });

    return data.length > 0 ? contentSet.size / data.length : 0;
  }

  getContentHash(content) {
    // 简单的内容哈希
    return content.replace(/\s+/g, '').toLowerCase().slice(0, 100);
  }

  calculateOverallScore(metrics) {
    const weights = {
      languageConsistency: 0.3,
      completeness: 0.3,
      uniqueness: 0.2,
      avgLength: 0.2
    };

    let score = 0;
    
    // 语言一致性评分
    score += Math.min(metrics.languageConsistency, 0.9) * weights.languageConsistency;
    
    // 完整性评分
    score += metrics.completeness * weights.completeness;
    
    // 唯一性评分
    score += metrics.uniqueness * weights.uniqueness;
    
    // 长度评分（适中长度最好）
    const optimalLength = 100;
    const lengthScore = metrics.avgLength <= optimalLength ? 
      metrics.avgLength / optimalLength : 
      Math.max(0, 1 - (metrics.avgLength - optimalLength) / optimalLength);
    score += lengthScore * weights.avgLength;

    return Math.min(score, 1.0);
  }

  getQualityLevel(score) {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  async intelligentOptimization(data, qualityMetrics) {
    logger.info('执行智能数据优化');
    
    let optimizedData = [...data];
    
    // 根据质量问题进行针对性优化
    if (qualityMetrics.metrics.languageConsistency < 0.5) {
      optimizedData = await this.optimizeLanguageConsistency(optimizedData);
    }
    
    if (qualityMetrics.metrics.completeness < 0.7) {
      optimizedData = await this.optimizeCompleteness(optimizedData);
    }
    
    if (qualityMetrics.metrics.uniqueness < 0.8) {
      optimizedData = await this.optimizeUniqueness(optimizedData);
    }

    return optimizedData;
  }

  async optimizeLanguageConsistency(data) {
    // 移除非中文内容比例过高的数据
    return data.filter(item => {
      const content = item.content || '';
      const chineseRatio = this.assessLanguageConsistency([item]);
      return chineseRatio >= 0.3; // 至少30%的中文字符
    });
  }

  async optimizeCompleteness(data) {
    // 尝试补充缺失字段
    return data.map(item => {
      const optimized = { ...item };
      
      if (!optimized.author || optimized.author.trim() === '') {
        optimized.author = '匿名用户';
      }
      
      if (!optimized.publish_time) {
        optimized.publish_time = new Date().toISOString();
      }
      
      return optimized;
    });
  }

  async optimizeUniqueness(data) {
    // 移除高度相似的内容
    const uniqueData = [];
    const seenHashes = new Set();
    
    for (const item of data) {
      const hash = this.getContentHash(item.content);
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        uniqueData.push(item);
      }
    }
    
    return uniqueData;
  }

  async removeDuplicates(data) {
    const uniqueData = [];
    const seenContent = new Set();
    
    data.forEach(item => {
      const contentHash = this.getContentHash(item.content);
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        uniqueData.push(item);
      }
    });
    
    return uniqueData;
  }

  getAppliedRules() {
    return this.cleaningRules.filter(rule => rule.enabled).map(rule => ({
      name: rule.name,
      description: rule.description
    }));
  }

  // 技能进化接口
  async evolve(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 根据配置调整清洗规则
    if (newConfig.qualityThreshold) {
      this.adjustRulesForQuality(newConfig.qualityThreshold);
    }
    
    this.version = this.incrementVersion(this.version);
    logger.info(`数据清洗技能进化到版本 ${this.version}`);
  }

  adjustRulesForQuality(threshold) {
    // 根据质量阈值调整规则严格程度
    if (threshold > 0.8) {
      // 高质量要求，启用更严格的规则
      this.config.minTextLength = Math.max(this.config.minTextLength, 20);
    } else if (threshold < 0.5) {
      // 较低质量要求，放宽规则
      this.config.minTextLength = Math.max(this.config.minTextLength, 5);
    }
  }

  incrementVersion(version) {
    const parts = version.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  // 自适应学习
  async adaptFromFeedback(feedback) {
    logger.info('根据反馈调整清洗策略');
    
    if (feedback.qualityIssues) {
      feedback.qualityIssues.forEach(issue => {
        switch (issue.type) {
          case 'language_inconsistency':
            this.adjustLanguageRules(issue.severity);
            break;
          case 'duplicate_content':
            this.config.removeDuplicates = true;
            break;
          case 'incomplete_data':
            this.adjustCompletenessRules(issue.severity);
            break;
        }
      });
    }
    
    if (feedback.performanceIssues) {
      this.optimizePerformance(feedback.performanceIssues);
    }
  }

  adjustLanguageRules(severity) {
    // 根据严重程度调整语言一致性规则
    if (severity === 'high') {
      this.cleaningRules.find(rule => rule.name === 'remove_special_chars').pattern = 
        /[^\u4e00-\u9fa5\s，。！？、；：""''（）【】《》]/g;
    }
  }

  adjustCompletenessRules(severity) {
    // 调整完整性要求
    if (severity === 'high') {
      this.config.minTextLength = Math.max(this.config.minTextLength, 15);
    }
  }

  optimizePerformance(issues) {
    // 性能优化
    if (issues.includes('slow_processing')) {
      // 简化某些复杂的正则表达式
      this.cleaningRules.forEach(rule => {
        if (rule.type === 'regex' && rule.name.includes('special')) {
          rule.pattern = /[^\w\s]/g; // 简化版
        }
      });
    }
  }
}

module.exports = DataCleaningSkill;