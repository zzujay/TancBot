const BaseAgent = require('./base-agent');
const logger = require('../utils/logger');

class RiskAssessmentAgent extends BaseAgent {
  constructor() {
    super('RiskAssessmentAgent', '风险评估Agent，识别潜在的舆情风险');
    
    this.riskKeywords = {
      high: [
        '投诉', '举报', '曝光', '丑闻', '腐败', '贪污', '受贿', '违法', '违规',
        '造假', '欺骗', '诈骗', '暴力', '冲突', '伤亡', '事故', '灾难', '危机',
        '破产', '倒闭', '失业', '罢工', '示威', '抗议', '游行', '集会', '骚乱'
      ],
      medium: [
        '质疑', '批评', '反对', '不满', '抱怨', '担忧', '担心', '焦虑', '恐慌',
        '下降', '减少', '亏损', '裁员', '涨价', '降价', '竞争', '压力', '困难',
        '问题', '错误', '故障', '延迟', '取消', '拒绝', '失败', '挫折', '障碍'
      ],
      low: [
        '建议', '意见', '反馈', '讨论', '争议', '分歧', '不同', '差异', '变化',
        '调整', '修改', '改进', '优化', '更新', '升级', '转型', '改革', '创新'
      ]
    };

    this.sensitiveTopics = [
      '政治', '宗教', '民族', '领土', '主权', '外交', '军事', '安全', '稳定',
      '领导人', '政府', '政策', '法律', '制度', '选举', '民主', '自由', '人权'
    ];

    this.riskThresholds = {
      high: 0.7,
      medium: 0.4,
      low: 0.2
    };
  }

  async process(data, context = {}) {
    logger.info(`风险评估Agent开始处理 ${data.length} 条数据`);
    
    const results = {
      overallRisk: 'low',
      riskScore: 0,
      riskCategories: {
        political: 0,
        economic: 0,
        social: 0,
        security: 0,
        reputation: 0
      },
      riskDetails: [],
      highRiskItems: [],
      recommendations: [],
      timeline: []
    };

    // 1. 评估每條数据的风险
    for (const item of data) {
      const riskAnalysis = await this.assessItemRisk(item);
      results.riskDetails.push(riskAnalysis);
      
      if (riskAnalysis.riskLevel === 'high') {
        results.highRiskItems.push(riskAnalysis);
      }
    }

    // 2. 计算整体风险
    const overallAnalysis = this.calculateOverallRisk(results.riskDetails);
    results.overallRisk = overallAnalysis.overallRisk;
    results.riskScore = overallAnalysis.riskScore;
    results.riskCategories = overallAnalysis.riskCategories;

    // 3. 时间线分析
    results.timeline = this.analyzeRiskTimeline(results.riskDetails);

    // 4. 生成建议
    results.recommendations = this.generateRecommendations(results);

    // 5. 设置置信度
    this.setConfidence(this.calculateConfidence(results));
    this.updateLastUsed();

    logger.info(`风险评估完成，整体风险等级: ${results.overallRisk}, 风险评分: ${results.riskScore.toFixed(2)}`);
    return results;
  }

  async assessItemRisk(item) {
    const content = (item.content || '').toLowerCase();
    const riskScore = {
      high: 0,
      medium: 0,
      low: 0
    };

    // 关键词风险评估
    Object.keys(this.riskKeywords).forEach(level => {
      this.riskKeywords[level].forEach(keyword => {
        const count = (content.match(new RegExp(keyword, 'g')) || []).length;
        if (count > 0) {
          const weight = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
          riskScore[level] += count * weight;
        }
      });
    });

    // 敏感话题评估
    let sensitiveScore = 0;
    this.sensitiveTopics.forEach(topic => {
      if (content.includes(topic)) {
        sensitiveScore += 2;
      }
    });

    // 互动数据评估（高互动可能意味着高关注度）
    const interactions = (item.likes || 0) + (item.comments || 0) + (item.shares || 0);
    const interactionRisk = Math.min(interactions / 100, 2); // 归一化到0-2

    // 综合风险评分
    const totalScore = riskScore.high * 3 + riskScore.medium * 2 + riskScore.low * 1 + sensitiveScore + interactionRisk;
    const normalizedScore = Math.min(totalScore / 10, 1); // 归一化到0-1

    const riskLevel = this.getRiskLevel(normalizedScore);

    return {
      id: item.id,
      content: item.content,
      riskLevel: riskLevel,
      riskScore: normalizedScore,
      riskFactors: {
        keywords: riskScore,
        sensitiveTopics: sensitiveScore,
        interactions: interactionRisk
      },
      timestamp: item.publish_time || new Date().toISOString(),
      author: item.author,
      url: item.url
    };
  }

  getRiskLevel(score) {
    if (score >= this.riskThresholds.high) return 'high';
    if (score >= this.riskThresholds.medium) return 'medium';
    return 'low';
  }

  calculateOverallRisk(riskDetails) {
    if (riskDetails.length === 0) {
      return {
        overallRisk: 'low',
        riskScore: 0,
        riskCategories: {
          political: 0,
          economic: 0,
          social: 0,
          security: 0,
          reputation: 0
        }
      };
    }

    const highRiskCount = riskDetails.filter(item => item.riskLevel === 'high').length;
    const mediumRiskCount = riskDetails.filter(item => item.riskLevel === 'medium').length;
    const totalCount = riskDetails.length;

    // 整体风险评分
    const riskScore = (highRiskCount * 0.7 + mediumRiskCount * 0.3) / totalCount;
    const overallRisk = this.getRiskLevel(riskScore);

    // 分类风险评分
    const riskCategories = {
      political: this.calculateCategoryRisk(riskDetails, 'political'),
      economic: this.calculateCategoryRisk(riskDetails, 'economic'),
      social: this.calculateCategoryRisk(riskDetails, 'social'),
      security: this.calculateCategoryRisk(riskDetails, 'security'),
      reputation: this.calculateCategoryRisk(riskDetails, 'reputation')
    };

    return {
      overallRisk,
      riskScore,
      riskCategories
    };
  }

  calculateCategoryRisk(riskDetails, category) {
    // 简化的分类风险计算
    let categoryScore = 0;
    let count = 0;

    riskDetails.forEach(detail => {
      const score = detail.riskScore;
      
      // 根据内容判断类别（简化版）
      const content = (detail.content || '').toLowerCase();
      let isCategory = false;

      switch (category) {
        case 'political':
          isCategory = /政治|政府|政策|法律|制度/.test(content);
          break;
        case 'economic':
          isCategory = /经济|金融|投资|股市|房地产|企业/.test(content);
          break;
        case 'social':
          isCategory = /社会|民生|教育|医疗|就业|环保/.test(content);
          break;
        case 'security':
          isCategory = /安全|事故|灾难|暴力|冲突/.test(content);
          break;
        case 'reputation':
          isCategory = /品牌|声誉|形象|口碑|评价/.test(content);
          break;
      }

      if (isCategory) {
        categoryScore += score;
        count++;
      }
    });

    return count > 0 ? categoryScore / count : 0;
  }

  analyzeRiskTimeline(riskDetails) {
    const timeline = [];
    
    // 按时间排序
    const sortedDetails = riskDetails
      .filter(detail => detail.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // 按小时分组
    const hourlyGroups = {};
    sortedDetails.forEach(detail => {
      const hour = new Date(detail.timestamp).getHours();
      const hourKey = `${hour}:00`;
      
      if (!hourlyGroups[hourKey]) {
        hourlyGroups[hourKey] = {
          time: hourKey,
          total: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      }
      
      hourlyGroups[hourKey].total++;
      hourlyGroups[hourKey][detail.riskLevel]++;
    });

    return Object.values(hourlyGroups);
  }

  generateRecommendations(results) {
    const recommendations = [];

    // 基于整体风险等级
    if (results.overallRisk === 'high') {
      recommendations.push('立即启动危机公关预案，成立应急响应小组');
      recommendations.push('密切监控舆情发展，每2小时更新一次风险评估');
      recommendations.push('准备官方声明和新闻稿，统一对外发声口径');
      recommendations.push('联系相关政府部门，主动汇报情况并寻求指导');
    } else if (results.overallRisk === 'medium') {
      recommendations.push('加强舆情监测，每日更新风险报告');
      recommendations.push('准备应对预案，必要时启动公关措施');
      recommendations.push('分析风险源头，制定针对性解决方案');
      recommendations.push('保持与媒体和公众的沟通，避免误解扩大');
    } else {
      recommendations.push('继续保持正常监测频率，关注潜在风险变化');
      recommendations.push('定期分析用户反馈，改进产品和服务质量');
      recommendations.push('维护良好的品牌形象，增强用户信任度');
      recommendations.push('建立长期的舆情监测机制，防患于未然');
    }

    // 基于风险分类
    if (results.riskCategories.political > 0.5) {
      recommendations.push('特别注意政治敏感性，避免涉及政治争议');
    }
    
    if (results.riskCategories.economic > 0.5) {
      recommendations.push('关注经济影响，评估对业务和财务的潜在冲击');
    }
    
    if (results.riskCategories.social > 0.5) {
      recommendations.push('重视社会影响，考虑对公众和社区的负面效应');
    }

    // 基于高风险项目数量
    if (results.highRiskItems.length > 5) {
      recommendations.push('高风险项目较多，建议立即采取集中处理措施');
    }

    return recommendations;
  }

  calculateConfidence(results) {
    const hasData = results.riskDetails.length > 0;
    const coverage = results.riskDetails.length / 100; // 假设100条数据为满覆盖
    const highRiskRatio = results.highRiskItems.length / Math.max(results.riskDetails.length, 1);
    
    // 数据量越大，高风险项目比例适中，置信度越高
    const dataConfidence = Math.min(coverage, 1);
    const riskConfidence = highRiskRatio > 0.1 && highRiskRatio < 0.5 ? 0.8 : 0.6;
    
    return hasData ? (dataConfidence + riskConfidence) / 2 : 0;
  }
}

module.exports = RiskAssessmentAgent;