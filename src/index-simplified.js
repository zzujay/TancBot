/**
 * 简化版舆情研判系统
 * 仅支持微博平台，使用Cookie认证，无模拟数据
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logger = require('./utils/logger');
const DataCollectorSimplified = require('./data-collection/data-collector-simplified');
const EnhancedLLMAnalyzer = require('./ai-analysis/llm-enhanced-analyzer-improved');
const DatabaseManager = require('./utils/simple-database');

class PublicOpinionSystemSimplified {
  constructor() {
    this.db = new DatabaseManager();
    this.collector = new DataCollectorSimplified();
    this.analyzer = new EnhancedLLMAnalyzer();
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info('正在初始化简化版舆情研判系统...');
      
      // 初始化数据库
      await this.db.initialize();
      
      // 初始化数据采集器
      await this.collector.initialize();
      
      // 初始化分析器
      await this.analyzer.initialize();
      
      logger.info('简化版舆情研判系统初始化完成');
      
      // 显示系统状态
      const status = this.getStatus();
      logger.info('系统状态:', status);
      
    } catch (error) {
      logger.error('系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 开始数据采集和分析任务
   */
  async start(keywords, options = {}) {
    try {
      this.isRunning = true;
      logger.info(`开始舆情分析任务，关键词: ${keywords.join(', ')}`);
      
      // 1. 微博数据采集
      logger.info('开始微博数据采集...');
      const rawData = await this.collector.collectData(keywords, {
        maxResults: options.maxResults || 50
      });
      logger.info(`微博数据采集完成，共采集 ${rawData.length} 条数据`);
      
      if (rawData.length === 0) {
        logger.warn('未采集到微博数据，任务结束');
        return {
          success: false,
          message: '未采集到微博数据',
          data: []
        };
      }
      
      // 2. 保存原始数据
      logger.info('保存微博原始数据...');
      const savedData = [];
      for (const item of rawData) {
        const saved = await this.db.saveRawData(item);
        if (saved) {
          savedData.push(saved);
        }
      }
      logger.info(`保存了 ${savedData.length} 条微博原始数据`);
      
      // 3. 使用国产LLM进行舆情分析
      logger.info('开始微博舆情分析...');
      const analysisResults = [];
      
      // 批量分析微博数据
      const batchSize = options.batchSize || 10;
      const batches = this.createBatches(savedData, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        logger.info(`分析第${i + 1}/${batches.length}批微博数据...`);
        
        const batch = batches[i];
        const batchResults = await Promise.allSettled(
          batch.map(item => this.analyzeWeiboData(item))
        );
        
        // 处理分析结果
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value.success) {
            analysisResults.push(result.value);
          }
        }
        
        // 批次间延迟
        if (i < batches.length - 1) {
          await this.delay(1000);
        }
      }
      
      logger.info(`微博舆情分析完成，成功分析 ${analysisResults.length} 条数据`);
      
      // 4. 保存分析结果
      logger.info('保存微博分析结果...');
      const savedResults = [];
      for (const result of analysisResults) {
        const saved = await this.db.saveAnalysisResult(result);
        if (saved) {
          savedResults.push(saved);
        }
      }
      
      logger.info(`保存了 ${savedResults.length} 条微博分析结果`);
      
      // 5. 生成综合分析报告
      logger.info('生成微博舆情综合分析报告...');
      const report = this.generateWeiboReport(savedResults);
      
      this.isRunning = false;
      
      return {
        success: true,
        message: '微博舆情分析任务完成',
        data: {
          rawDataCount: rawData.length,
          analyzedCount: analysisResults.length,
          savedCount: savedResults.length,
          report: report,
          details: savedResults
        }
      };
      
    } catch (error) {
      logger.error('微博舆情分析任务失败:', error);
      this.isRunning = false;
      
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * 分析单条微博数据
   */
  async analyzeWeiboData(data) {
    try {
      // 构建分析内容
      const content = `${data.content}\n\n发布者：${data.author}\n发布时间：${data.time}\n互动数据：点赞${data.likes}，转发${data.reposts}，评论${data.comments}`;
      
      // 使用国产LLM进行综合分析
      const analysisResult = await this.analyzer.analyzeContent(content, {
        type: 'comprehensive'
      });
      
      if (analysisResult.success) {
        return {
          success: true,
          originalData: data,
          analysis: analysisResult.analysis,
          metadata: {
            ...analysisResult.metadata,
            platform: 'weibo',
            author: data.author,
            publishTime: data.publishTime,
            interaction: {
              likes: data.likes,
              reposts: data.reposts,
              comments: data.comments
            }
          }
        };
      } else {
        return {
          success: false,
          error: analysisResult.error,
          originalData: data
        };
      }
      
    } catch (error) {
      logger.error('分析微博数据失败:', error);
      return {
        success: false,
        error: error.message,
        originalData: data
      };
    }
  }

  /**
   * 生成微博舆情综合分析报告
   */
  generateWeiboReport(results) {
    try {
      const totalCount = results.length;
      
      if (totalCount === 0) {
        return {
          summary: '无数据可供分析',
          statistics: {}
        };
      }
      
      // 情感分析统计
      const sentimentStats = {
        positive: 0,
        negative: 0,
        neutral: 0
      };
      
      // 风险等级统计
      const riskStats = {
        low: 0,      // 1-3
        medium: 0,   // 4-6
        high: 0      // 7-10
      };
      
      // 影响力统计
      const influenceStats = {
        low: 0,      // 1-4
        medium: 0,   // 5-7
        high: 0      // 8-10
      };
      
      // 话题统计
      const topicStats = {};
      
      // 关键词统计
      const keywordStats = {};
      
      // 趋势统计
      const trendStats = {
        rising: 0,
        stable: 0,
        falling: 0
      };
      
      // 统计计算
      let totalConfidence = 0;
      let totalRiskLevel = 0;
      let totalInfluenceScore = 0;
      
      results.forEach(result => {
        const analysis = result.analysis;
        const metadata = result.metadata;
        
        // 情感统计
        if (analysis.sentiment) {
          const sentiment = analysis.sentiment.label;
          if (sentiment === '正面') sentimentStats.positive++;
          else if (sentiment === '负面') sentimentStats.negative++;
          else sentimentStats.neutral++;
          
          totalConfidence += analysis.sentiment.confidence || 0;
        }
        
        // 风险统计
        if (analysis.risk_level) {
          const risk = analysis.risk_level;
          totalRiskLevel += risk;
          
          if (risk <= 3) riskStats.low++;
          else if (risk <= 6) riskStats.medium++;
          else riskStats.high++;
        }
        
        // 影响力统计
        if (analysis.influence_score) {
          const influence = analysis.influence_score;
          totalInfluenceScore += influence;
          
          if (influence <= 4) influenceStats.low++;
          else if (influence <= 7) influenceStats.medium++;
          else influenceStats.high++;
        }
        
        // 话题统计
        if (analysis.topics && Array.isArray(analysis.topics)) {
          analysis.topics.forEach(topic => {
            topicStats[topic] = (topicStats[topic] || 0) + 1;
          });
        }
        
        // 关键词统计
        if (analysis.keywords && Array.isArray(analysis.keywords)) {
          analysis.keywords.forEach(keyword => {
            keywordStats[keyword] = (keywordStats[keyword] || 0) + 1;
          });
        }
        
        // 趋势统计
        if (analysis.trend_prediction) {
          const trend = analysis.trend_prediction;
          if (trend === 'rising') trendStats.rising++;
          else if (trend === 'stable') trendStats.stable++;
          else if (trend === 'falling') trendStats.falling++;
        }
      });
      
      // 计算平均值
      const avgConfidence = totalConfidence / totalCount;
      const avgRiskLevel = totalRiskLevel / totalCount;
      const avgInfluenceScore = totalInfluenceScore / totalCount;
      
      // 获取主要话题和关键词
      const topTopics = Object.entries(topicStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count, percentage: (count / totalCount * 100).toFixed(1) }));
      
      const topKeywords = Object.entries(keywordStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count, percentage: (count / totalCount * 100).toFixed(1) }));
      
      return {
        summary: `微博舆情分析完成，共分析${totalCount}条微博数据`,
        statistics: {
          totalCount,
          sentiment: {
            ...sentimentStats,
            percentages: {
              positive: (sentimentStats.positive / totalCount * 100).toFixed(1),
              negative: (sentimentStats.negative / totalCount * 100).toFixed(1),
              neutral: (sentimentStats.neutral / totalCount * 100).toFixed(1)
            },
            averageConfidence: avgConfidence.toFixed(3)
          },
          risk: {
            ...riskStats,
            percentages: {
              low: (riskStats.low / totalCount * 100).toFixed(1),
              medium: (riskStats.medium / totalCount * 100).toFixed(1),
              high: (riskStats.high / totalCount * 100).toFixed(1)
            },
            averageLevel: avgRiskLevel.toFixed(1)
          },
          influence: {
            ...influenceStats,
            percentages: {
              low: (influenceStats.low / totalCount * 100).toFixed(1),
              medium: (influenceStats.medium / totalCount * 100).toFixed(1),
              high: (influenceStats.high / totalCount * 100).toFixed(1)
            },
            averageScore: avgInfluenceScore.toFixed(1)
          },
          trends: {
            ...trendStats,
            percentages: {
              rising: (trendStats.rising / totalCount * 100).toFixed(1),
              stable: (trendStats.stable / totalCount * 100).toFixed(1),
              falling: (trendStats.falling / totalCount * 100).toFixed(1)
            }
          },
          topics: topTopics,
          keywords: topKeywords
        },
        recommendations: this.generateRecommendations(sentimentStats, riskStats, avgRiskLevel)
      };
      
    } catch (error) {
      logger.error('生成微博舆情报告失败:', error);
      return {
        summary: '报告生成失败',
        statistics: {},
        error: error.message
      };
    }
  }

  /**
   * 生成建议
   */
  generateRecommendations(sentimentStats, riskStats, avgRiskLevel) {
    const recommendations = [];
    
    // 情感分析建议
    if (sentimentStats.negative > sentimentStats.positive) {
      recommendations.push('⚠️ 负面情感较多，建议加强正面引导');
    }
    
    if (sentimentStats.positive > sentimentStats.negative * 2) {
      recommendations.push('✅ 正面情感占主导，可以加大宣传力度');
    }
    
    // 风险分析建议
    if (avgRiskLevel > 7) {
      recommendations.push('🚨 平均风险等级较高，需要重点关注和应对');
    } else if (avgRiskLevel > 5) {
      recommendations.push('⚠️ 存在中等风险，建议密切监控');
    } else {
      recommendations.push('✅ 整体风险较低，保持正常监控即可');
    }
    
    if (riskStats.high > riskStats.low) {
      recommendations.push('📈 高风险内容较多，建议建立专项应对机制');
    }
    
    return recommendations;
  }

  /**
   * 创建批次
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 延迟函数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      system: 'simplified_weibo_only',
      collector: this.collector.getStatus(),
      analyzer: this.analyzer.getStatus(),
      database: this.db.getStatistics(),
      isRunning: this.isRunning
    };
  }

  /**
   * 停止系统
   */
  async stop() {
    this.isRunning = false;
    logger.info('简化版舆情研判系统已停止');
  }
}

module.exports = PublicOpinionSystemSimplified;