/**
 * 传播路径分析智能体 (Propagation Agent)
 * 聚焦"传播规律"，分析舆情事件在微博的传播链路、关键节点和影响力
 */

const BaseAgentV2 = require('../base-agent-v2');
const logger = require('../../../utils/logger');

class PropagationAgent extends BaseAgentV2 {
  constructor() {
    super(
      '传播路径分析智能体',
      '聚焦传播规律，提取关键节点、梳理传播路径、分析传播速度和范围',
      'analyzer'
    );
    this.influenceThresholds = {
      high: 10000,    // 高影响力：转发/点赞过万
      medium: 1000,   // 中等影响力：过千
      low: 100        // 低影响力：过百
    };
  }

  async process(data, context = {}) {
    logger.info(`[V2] 传播路径分析智能体开始分析，数据量: ${data.length}`);
    this.updateLastUsed();

    try {
      // 1. 提取传播关键节点
      const keyNodes = this.extractKeyNodes(data);

      // 2. 梳理传播路径
      const propagationPaths = this.tracePropagationPaths(data, keyNodes);

      // 3. 分析传播速度和范围
      const propagationMetrics = this.analyzePropagationMetrics(data);

      // 4. 识别传播助推因素
      const boostingFactors = this.identifyBoostingFactors(data);

      // 5. 计算置信度
      const confidence = this.calculateConfidence(keyNodes, propagationMetrics);
      this.setConfidence(confidence);

      const result = {
        confidence,
        keyNodes,
        propagationPaths,
        propagationMetrics,
        boostingFactors,
        keyInsights: this.generateInsights(keyNodes, propagationMetrics, boostingFactors),
        recommendations: this.generateRecommendations(propagationMetrics, boostingFactors)
      };

      this.addToHistory(result);
      logger.info(`[V2] 传播路径分析智能体分析完成，置信度: ${confidence.toFixed(2)}`);

      return result;

    } catch (error) {
      logger.error('[V2] 传播路径分析智能体分析失败:', error);
      throw error;
    }
  }

  /**
   * 提取传播关键节点
   */
  extractKeyNodes(data) {
    const nodes = {
      originators: [],      // 首发账号
      spreaders: [],        // 传播节点
      opinionLeaders: [],   // 意见领袖
      mediaAccounts: []     // 媒体账号
    };

    // 按时间排序找出首发
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // 识别首发账号
    if (sortedData.length > 0) {
      const firstPost = sortedData[0];
      nodes.originators.push({
        userId: firstPost.userId || firstPost.author || 'unknown',
        content: (firstPost.content || '').substring(0, 100),
        timestamp: firstPost.createdAt,
        influence: this.calculateInfluence(firstPost)
      });
    }

    // 识别传播节点（按影响力排序）
    const userInfluence = new Map();
    
    data.forEach(item => {
      const userId = item.userId || item.author || 'unknown';
      const influence = this.calculateInfluence(item);
      
      if (!userInfluence.has(userId)) {
        userInfluence.set(userId, {
          userId,
          posts: [],
          totalInfluence: 0,
          followerCount: item.followerCount || 0
        });
      }
      
      const user = userInfluence.get(userId);
      user.posts.push(item);
      user.totalInfluence += influence;
    });

    // 分类节点
    const sortedUsers = Array.from(userInfluence.values())
      .sort((a, b) => b.totalInfluence - a.totalInfluence);

    sortedUsers.forEach(user => {
      const nodeInfo = {
        userId: user.userId,
        postCount: user.posts.length,
        totalInfluence: user.totalInfluence,
        followerCount: user.followerCount,
        influenceLevel: this.classifyInfluenceLevel(user.totalInfluence)
      };

      // 分类：意见领袖或媒体账号
      if (user.followerCount > 100000 || user.totalInfluence > this.influenceThresholds.high) {
        if (this.isMediaAccount(user.userId)) {
          nodes.mediaAccounts.push(nodeInfo);
        } else {
          nodes.opinionLeaders.push(nodeInfo);
        }
      } else if (user.totalInfluence > this.influenceThresholds.low) {
        nodes.spreaders.push(nodeInfo);
      }
    });

    return {
      summary: {
        totalNodes: userInfluence.size,
        originatorCount: nodes.originators.length,
        opinionLeaderCount: nodes.opinionLeaders.length,
        mediaCount: nodes.mediaAccounts.length,
        spreaderCount: nodes.spreaders.length
      },
      ...nodes
    };
  }

  /**
   * 计算影响力分数
   */
  calculateInfluence(item) {
    const reposts = item.reposts || item.repostCount || 0;
    const comments = item.comments || item.commentCount || 0;
    const likes = item.likes || item.likeCount || 0;
    
    // 加权计算：转发权重最高
    return reposts * 3 + comments * 2 + likes * 1;
  }

  /**
   * 分类影响力等级
   */
  classifyInfluenceLevel(influence) {
    if (influence >= this.influenceThresholds.high) return 'high';
    if (influence >= this.influenceThresholds.medium) return 'medium';
    if (influence >= this.influenceThresholds.low) return 'low';
    return 'minimal';
  }

  /**
   * 判断是否为媒体账号
   */
  isMediaAccount(userId) {
    const mediaKeywords = ['报', '网', '新闻', '媒体', 'TV', '电视台', '广播', '杂志'];
    return mediaKeywords.some(keyword => userId.includes(keyword));
  }

  /**
   * 梳理传播路径
   */
  tracePropagationPaths(data, keyNodes) {
    const paths = [];
    
    // 简化版传播路径分析
    // 实际应通过转发关系构建树状结构
    
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // 识别主要传播阶段
    const stages = this.identifyPropagationStages(sortedData);
    
    // 构建简化传播路径
    if (keyNodes.originators.length > 0) {
      const originator = keyNodes.originators[0];
      
      paths.push({
        type: 'originator_to_leaders',
        description: '首发账号→意见领袖',
        nodes: [
          { type: 'originator', userId: originator.userId },
          ...keyNodes.opinionLeaders.slice(0, 3).map(leader => ({
            type: 'opinion_leader',
            userId: leader.userId
          }))
        ]
      });

      if (keyNodes.mediaAccounts.length > 0) {
        paths.push({
          type: 'originator_to_media',
          description: '首发账号→媒体账号',
          nodes: [
            { type: 'originator', userId: originator.userId },
            ...keyNodes.mediaAccounts.slice(0, 2).map(media => ({
              type: 'media',
              userId: media.userId
            }))
          ]
        });
      }
    }

    return {
      stages,
      mainPaths: paths,
      pathCount: paths.length
    };
  }

  /**
   * 识别传播阶段
   */
  identifyPropagationStages(sortedData) {
    const total = sortedData.length;
    const stages = [];
    
    if (total === 0) return stages;

    // 按时间分阶段
    const stageSize = Math.ceil(total / 4);
    
    const stageNames = ['萌芽期', '发酵期', '爆发期', '平稳期'];
    const stageLabels = ['early', 'developing', 'peak', 'declining'];
    
    for (let i = 0; i < 4 && i * stageSize < total; i++) {
      const startIdx = i * stageSize;
      const endIdx = Math.min((i + 1) * stageSize, total);
      const stageData = sortedData.slice(startIdx, endIdx);
      
      // 计算该阶段的传播指标
      const totalInfluence = stageData.reduce((sum, item) => sum + this.calculateInfluence(item), 0);
      const avgInfluence = stageData.length > 0 ? totalInfluence / stageData.length : 0;
      
      stages.push({
        name: stageNames[i],
        label: stageLabels[i],
        postCount: stageData.length,
        timeRange: {
          start: stageData[0]?.createdAt,
          end: stageData[stageData.length - 1]?.createdAt
        },
        totalInfluence,
        avgInfluence,
        intensity: this.classifyStageIntensity(avgInfluence)
      });
    }

    return stages;
  }

  /**
   * 分类阶段强度
   */
  classifyStageIntensity(avgInfluence) {
    if (avgInfluence > 1000) return 'high';
    if (avgInfluence > 500) return 'medium';
    return 'low';
  }

  /**
   * 分析传播速度和范围
   */
  analyzePropagationMetrics(data) {
    if (data.length === 0) {
      return {
        speed: 0,
        range: 0,
        coverage: 'minimal',
        interactionMetrics: {}
      };
    }

    const sortedData = [...data].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // 时间范围
    const startTime = new Date(sortedData[0].createdAt || 0);
    const endTime = new Date(sortedData[sortedData.length - 1].createdAt || 0);
    const duration = (endTime - startTime) / (1000 * 60 * 60); // 小时

    // 传播速度（每小时帖子数）
    const speed = duration > 0 ? data.length / duration : data.length;

    // 总互动数据
    const totalReposts = data.reduce((sum, item) => sum + (item.reposts || item.repostCount || 0), 0);
    const totalComments = data.reduce((sum, item) => sum + (item.comments || item.commentCount || 0), 0);
    const totalLikes = data.reduce((sum, item) => sum + (item.likes || item.likeCount || 0), 0);
    const totalInteractions = totalReposts + totalComments + totalLikes;

    // 覆盖范围评估
    const uniqueUsers = new Set(data.map(item => item.userId || item.author)).size;
    let coverage = 'minimal';
    if (uniqueUsers > 1000) coverage = 'wide';
    else if (uniqueUsers > 500) coverage = 'medium';
    else if (uniqueUsers > 100) coverage = 'limited';

    return {
      speed: speed.toFixed(2),
      duration: duration.toFixed(2),
      range: uniqueUsers,
      coverage,
      interactionMetrics: {
        totalReposts,
        totalComments,
        totalLikes,
        totalInteractions,
        avgInteractionsPerPost: data.length > 0 ? (totalInteractions / data.length).toFixed(2) : 0
      }
    };
  }

  /**
   * 识别传播助推因素
   */
  identifyBoostingFactors(data) {
    const factors = [];

    // 分析话题标签
    const hashtagPattern = /#([^#]+)#/g;
    const hashtags = new Map();
    
    data.forEach(item => {
      const content = item.content || '';
      let match;
      while ((match = hashtagPattern.exec(content)) !== null) {
        const tag = match[1];
        hashtags.set(tag, (hashtags.get(tag) || 0) + 1);
      }
    });

    // 找出热门话题标签
    const topHashtags = Array.from(hashtags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topHashtags.length > 0) {
      factors.push({
        type: 'hashtag',
        description: '热门话题标签助推',
        details: topHashtags.map(([tag, count]) => ({ tag, count }))
      });
    }

    // 分析关键评论
    const highEngagementPosts = data
      .filter(item => this.calculateInfluence(item) > this.influenceThresholds.medium)
      .slice(0, 5);

    if (highEngagementPosts.length > 0) {
      factors.push({
        type: 'high_engagement_content',
        description: '高互动内容助推',
        details: highEngagementPosts.map(post => ({
          content: (post.content || '').substring(0, 100),
          influence: this.calculateInfluence(post)
        }))
      });
    }

    // 分析时间节点
    const timeClusters = this.analyzeTimeClusters(data);
    if (timeClusters.length > 0) {
      factors.push({
        type: 'time_cluster',
        description: '时间集中爆发',
        details: timeClusters
      });
    }

    return factors;
  }

  /**
   * 分析时间聚集
   */
  analyzeTimeClusters(data) {
    const clusters = [];
    const hourCounts = new Map();

    data.forEach(item => {
      const hour = new Date(item.createdAt || 0).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // 找出发帖高峰时段
    const sortedHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    sortedHours.forEach(([hour, count]) => {
      if (count > data.length * 0.1) { // 超过10%的帖子
        clusters.push({
          hour,
          count,
          percentage: ((count / data.length) * 100).toFixed(1)
        });
      }
    });

    return clusters;
  }

  /**
   * 计算置信度
   */
  calculateConfidence(keyNodes, propagationMetrics) {
    let score = 0.6; // 基础分

    // 根据节点丰富度加分
    if (keyNodes.summary.totalNodes > 10) score += 0.1;
    if (keyNodes.opinionLeaders.length > 0) score += 0.1;
    if (keyNodes.mediaAccounts.length > 0) score += 0.1;

    // 根据传播数据完整性加分
    if (propagationMetrics.interactionMetrics.totalInteractions > 0) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * 生成关键洞察
   */
  generateInsights(keyNodes, propagationMetrics, boostingFactors) {
    const insights = [];

    // 传播规模洞察
    insights.push(`传播涉及${keyNodes.summary.totalNodes}个账号，覆盖范围${propagationMetrics.coverage === 'wide' ? '广泛' : '有限'}`);

    // 关键节点洞察
    if (keyNodes.opinionLeaders.length > 0) {
      insights.push(`识别到${keyNodes.opinionLeaders.length}个意见领袖参与传播`);
    }
    if (keyNodes.mediaAccounts.length > 0) {
      insights.push(`${keyNodes.mediaAccounts.length}个媒体账号介入，传播进入公共视野`);
    }

    // 传播速度洞察
    insights.push(`传播速度为${propagationMetrics.speed}帖/小时，总互动量${propagationMetrics.interactionMetrics.totalInteractions}`);

    // 助推因素洞察
    boostingFactors.forEach(factor => {
      if (factor.type === 'hashtag' && factor.details.length > 0) {
        insights.push(`话题标签#${factor.details[0].tag}#助推传播，出现${factor.details[0].count}次`);
      }
    });

    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(propagationMetrics, boostingFactors) {
    const recommendations = [];

    // 基于传播速度的建议
    if (parseFloat(propagationMetrics.speed) > 10) {
      recommendations.push('传播速度较快，建议密切关注舆情走向，及时回应');
    }

    // 基于覆盖范围的建议
    if (propagationMetrics.coverage === 'wide') {
      recommendations.push('传播范围广泛，需准备全面的舆情应对方案');
    }

    // 基于助推因素的建议
    const hashtagFactor = boostingFactors.find(f => f.type === 'hashtag');
    if (hashtagFactor) {
      recommendations.push(`关注话题标签传播动态，可考虑引导话题走向`);
    }

    // 基于互动数据的建议
    const interactions = propagationMetrics.interactionMetrics;
    if (interactions.totalReposts > interactions.totalComments * 2) {
      recommendations.push('转发量远高于评论量，存在情绪化传播风险');
    }

    return recommendations;
  }

  /**
   * 调整分析策略
   */
  async adjustStrategy(guidance) {
    logger.info('[V2] 传播路径分析智能体调整策略:', guidance);
    
    if (guidance.focusNodes) {
      this.focusNodes = guidance.focusNodes;
    }
    
    if (guidance.deepPathAnalysis) {
      this.deepPathAnalysis = true;
    }
  }
}

module.exports = PropagationAgent;
