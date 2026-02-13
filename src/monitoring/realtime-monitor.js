/**
 * 实时监控系统
 * 提供实时数据监控、告警和可视化功能
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');
const configManager = require('../utils/config-manager');

class RealTimeMonitor extends EventEmitter {
  constructor() {
    super();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.dataStreams = new Map();
    this.alerts = new Map();
    this.thresholds = {
      sentiment: {
        positive: { min: 0.3, max: 0.8 },
        negative: { min: 0.1, max: 0.5 },
        neutral: { min: 0.2, max: 0.6 }
      },
      risk: {
        high: 0.7,
        medium: 0.4,
        low: 0.2
      },
      volume: {
        min: 10,
        max: 1000,
        spike: 3.0 // 3倍正常量视为异常
      },
      velocity: {
        max: 100, // 每小时最大增长量
        spike: 5.0 // 5倍正常增长视为异常
      }
    };
    this.metrics = {
      totalProcessed: 0,
      alertsGenerated: 0,
      falsePositives: 0,
      truePositives: 0,
      startTime: null
    };
    this.baseline = null;
    this.anomalyDetector = new AnomalyDetector();
    this.trendAnalyzer = new TrendAnalyzer();
    this.predictionEngine = new PredictionEngine();
  }

  // 启动监控
  start(keywords = [], platforms = []) {
    if (this.isMonitoring) {
      logger.warn('实时监控已在运行中');
      return;
    }

    logger.info('启动实时监控系统');
    this.isMonitoring = true;
    this.metrics.startTime = new Date();
    
    // 建立基线
    this.establishBaseline(keywords, platforms);
    
    // 启动数据流
    this.startDataStreams(keywords, platforms);
    
    // 启动监控循环
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle();
    }, 5000); // 每5秒检查一次

    this.emit('monitoring_started', {
      keywords,
      platforms,
      startTime: this.metrics.startTime
    });
  }

  // 停止监控
  stop() {
    if (!this.isMonitoring) {
      logger.warn('实时监控未在运行');
      return;
    }

    logger.info('停止实时监控系统');
    this.isMonitoring = false;
    
    // 停止数据流
    this.stopDataStreams();
    
    // 停止监控循环
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // 生成监控报告
    this.generateMonitoringReport();

    this.emit('monitoring_stopped', {
      endTime: new Date(),
      metrics: this.metrics
    });
  }

  // 建立基线
  async collectHistoricalData(keywords, platforms, hours = 24) {
    logger.info(`收集历史数据，时间范围: ${hours}小时`);
    
    // 模拟历史数据收集
    const mockData = [];
    const now = new Date();
    
    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const dataPoint = {
        timestamp: time,
        sentiment: Math.random() * 2 - 1, // -1 到 1
        volume: Math.floor(Math.random() * 1000) + 100,
        risk: Math.random(),
        keywords: keywords,
        platforms: platforms
      };
      
      mockData.push(dataPoint);
    }
    
    return mockData.reverse(); // 按时间升序排列
  }

  async establishBaseline(keywords, platforms) {
    logger.info('建立监控基线');
    
    try {
      // 收集历史数据作为基线
      const historicalData = await this.collectHistoricalData(keywords, platforms, 24); // 24小时数据
      
      this.baseline = {
        sentiment: this.calculateBaselineSentiment(historicalData),
        volume: this.calculateBaselineVolume(historicalData),
        risk: this.calculateBaselineRisk(historicalData),
        timePattern: this.analyzeTimePattern(historicalData),
        establishedAt: new Date()
      };
      
      logger.info('基线建立完成', this.baseline);
      
    } catch (error) {
      logger.error('建立基线失败:', error);
      await errorHandler.handleError(error, { source: 'baseline_establishment' });
      
      // 使用默认基线
      this.baseline = this.getDefaultBaseline();
    }
  }

  // 计算基线情感
  calculateBaselineSentiment(historicalData) {
    if (historicalData.length === 0) return { avg: 0, min: -1, max: 1 };
    
    const sentiments = historicalData.map(d => d.sentiment);
    const avg = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    const min = Math.min(...sentiments);
    const max = Math.max(...sentiments);
    
    return { avg, min, max };
  }

  // 计算基线数据量
  calculateBaselineVolume(historicalData) {
    if (historicalData.length === 0) return { avg: 0, min: 0, max: 0 };
    
    const volumes = historicalData.map(d => d.volume);
    const avg = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const min = Math.min(...volumes);
    const max = Math.max(...volumes);
    
    return { avg, min, max };
  }

  // 计算基线风险
  calculateBaselineRisk(historicalData) {
    if (historicalData.length === 0) return { avg: 0, min: 0, max: 0 };
    
    const risks = historicalData.map(d => d.risk);
    const avg = risks.reduce((sum, r) => sum + r, 0) / risks.length;
    const min = Math.min(...risks);
    const max = Math.max(...risks);
    
    return { avg, min, max };
  }

  // 分析时间模式
  analyzeTimePattern(historicalData) {
    if (historicalData.length === 0) return { peakHour: 12, lowHour: 0 };
    
    const hourlyData = {};
    historicalData.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    
    const hours = Object.keys(hourlyData).map(h => parseInt(h));
    const peakHour = hours.reduce((max, h) => hourlyData[h] > hourlyData[max] ? h : max, hours[0]);
    const lowHour = hours.reduce((min, h) => hourlyData[h] < hourlyData[min] ? h : min, hours[0]);
    
    return { peakHour, lowHour };
  }

  // 获取默认基线
  getDefaultBaseline() {
    return {
      sentiment: { avg: 0, min: -1, max: 1 },
      volume: { avg: 500, min: 100, max: 1000 },
      risk: { avg: 0.3, min: 0, max: 0.8 },
      timePattern: { peakHour: 14, lowHour: 3 },
      establishedAt: new Date()
    };
  }

  // 启动数据流
  startDataStreams(keywords, platforms) {
    logger.info('启动数据流');
    
    keywords.forEach(keyword => {
      platforms.forEach(platform => {
        const streamId = `${keyword}_${platform}`;
        const dataStream = new DataStream(keyword, platform);
        
        dataStream.on('data', (data) => {
          this.processStreamData(streamId, data);
        });
        
        dataStream.on('error', (error) => {
          logger.error(`数据流 ${streamId} 错误:`, error);
          errorHandler.handleError(error, { source: 'data_stream', streamId });
        });
        
        this.dataStreams.set(streamId, dataStream);
        dataStream.start();
      });
    });
  }

  // 停止数据流
  stopDataStreams() {
    logger.info('停止数据流');
    
    this.dataStreams.forEach((stream, streamId) => {
      stream.stop();
      logger.info(`数据流 ${streamId} 已停止`);
    });
    
    this.dataStreams.clear();
  }

  // 处理流数据
  processStreamData(streamId, data) {
    this.metrics.totalProcessed++;
    
    // 实时分析
    const analysis = this.performRealTimeAnalysis(data);
    
    // 异常检测
    const anomalies = this.anomalyDetector.detect(analysis, this.baseline);
    
    // 趋势分析
    const trends = this.trendAnalyzer.analyze(analysis);
    
    // 预测分析
    const predictions = this.predictionEngine.predict(analysis, trends);
    
    // 检查告警条件
    const shouldAlert = this.shouldGenerateAlert(analysis, anomalies, trends);
    
    if (shouldAlert) {
      this.generateAlert(streamId, analysis, anomalies, trends, predictions);
    }
    
    // 发送实时数据
    this.emit('realtime_data', {
      streamId,
      data,
      analysis,
      anomalies,
      trends,
      predictions,
      hasAlert: shouldAlert,
      timestamp: new Date()
    });
  }

  // 实时分析
  performRealTimeAnalysis(data) {
    return {
      sentiment: this.analyzeSentiment(data.content),
      risk: this.assessRisk(data.content),
      volume: 1,
      velocity: this.calculateVelocity(data),
      quality: this.assessQuality(data),
      timestamp: new Date()
    };
  }

  // 情感分析
  analyzeSentiment(content) {
    // 简化的实时情感分析
    const positiveWords = ['好', '棒', '优秀', '喜欢', '支持', '赞', '爱', '开心', '满意'];
    const negativeWords = ['差', '糟糕', '讨厌', '反对', '批评', '愤怒', '失望', '难过'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (content.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (content.includes(word)) negativeScore++;
    });
    
    const total = positiveScore + negativeScore;
    if (total === 0) return { positive: 0.33, negative: 0.33, neutral: 0.34, confidence: 0.5 };
    
    return {
      positive: positiveScore / total,
      negative: negativeScore / total,
      neutral: 0,
      confidence: Math.min(total / 5, 1.0) // 基于关键词数量
    };
  }

  // 风险评估
  assessRisk(content) {
    const riskKeywords = {
      high: ['投诉', '举报', '曝光', '丑闻', '违法', '造假', '欺骗'],
      medium: ['质疑', '批评', '反对', '不满', '担忧', '担心'],
      low: ['建议', '意见', '反馈', '讨论', '争议']
    };
    
    let riskScore = 0;
    
    Object.entries(riskKeywords).forEach(([level, keywords]) => {
      const weight = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          riskScore += weight;
        }
      });
    });
    
    return Math.min(riskScore / 10, 1.0);
  }

  // 计算速度
  calculateVelocity(data) {
    // 基于时间戳计算数据到达速度
    const now = new Date();
    const dataTime = new Date(data.timestamp || now);
    const timeDiff = (now - dataTime) / 1000; // 秒
    
    return Math.max(0, 1 / (timeDiff + 1)); // 避免除零
  }

  // 质量评估
  assessQuality(data) {
    let quality = 0.5; // 基础质量
    
    // 内容长度
    if (data.content && data.content.length > 10) quality += 0.2;
    if (data.content && data.content.length > 50) quality += 0.1;
    
    // 完整性
    if (data.author) quality += 0.1;
    if (data.platform) quality += 0.1;
    
    return Math.min(quality, 1.0);
  }

  // 监控循环
  performMonitoringCycle() {
    if (!this.isMonitoring) return;
    
    try {
      // 检查系统健康状态
      this.checkSystemHealth();
      
      // 更新基线（自适应）
      this.updateBaseline();
      
      // 清理过期告警
      this.cleanupExpiredAlerts();
      
      // 性能监控
      this.monitorPerformance();
      
      this.emit('monitoring_cycle_completed', {
        timestamp: new Date(),
        activeStreams: this.dataStreams.size,
        activeAlerts: this.alerts.size,
        metrics: this.metrics
      });
      
    } catch (error) {
      logger.error('监控循环错误:', error);
      errorHandler.handleError(error, { source: 'monitoring_cycle' });
    }
  }

  // 检查系统健康
  checkSystemHealth() {
    const health = {
      dataStreams: this.dataStreams.size,
      alerts: this.alerts.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    // 检查内存使用
    const memoryUsage = health.memoryUsage.heapUsed / health.memoryUsage.heapTotal;
    if (memoryUsage > 0.9) {
      this.generateSystemAlert('high_memory_usage', { usage: memoryUsage });
    }
    
    // 检查数据流数量
    if (health.dataStreams > 100) {
      this.generateSystemAlert('too_many_streams', { count: health.dataStreams });
    }
    
    // 检查告警数量
    if (health.alerts > 50) {
      this.generateSystemAlert('too_many_alerts', { count: health.alerts });
    }
    
    this.emit('system_health_check', health);
  }

  // 更新基线（自适应学习）
  updateBaseline() {
    if (!this.baseline) return;
    
    const now = new Date();
    const baselineAge = (now - this.baseline.establishedAt) / (1000 * 60 * 60); // 小时
    
    // 每24小时更新一次基线
    if (baselineAge > 24) {
      logger.info('更新监控基线');
      // 这里可以实现更复杂的基线更新逻辑
    }
  }

  // 是否应该生成告警
  shouldGenerateAlert(analysis, anomalies, trends) {
    // 基于多个因素决定是否生成告警
    const alertConditions = [
      this.checkSentimentAlert(analysis.sentiment),
      this.checkRiskAlert(analysis.risk),
      this.checkVolumeAlert(analysis),
      this.checkAnomalyAlert(anomalies),
      this.checkTrendAlert(trends)
    ];
    
    return alertConditions.some(condition => condition.shouldAlert);
  }

  // 检查情感告警
  checkSentimentAlert(sentiment) {
    if (!sentiment) return { shouldAlert: false };
    
    const thresholds = this.thresholds.sentiment;
    
    if (sentiment.negative > thresholds.negative.max) {
      return {
        shouldAlert: true,
        type: 'high_negative_sentiment',
        severity: 'high',
        value: sentiment.negative,
        threshold: thresholds.negative.max
      };
    }
    
    return { shouldAlert: false };
  }

  // 检查风险告警
  checkRiskAlert(risk) {
    if (risk > this.thresholds.risk.high) {
      return {
        shouldAlert: true,
        type: 'high_risk_content',
        severity: 'critical',
        value: risk,
        threshold: this.thresholds.risk.high
      };
    }
    
    return { shouldAlert: false };
  }

  // 检查数量告警
  checkVolumeAlert(analysis) {
    if (!this.baseline) return { shouldAlert: false };
    
    const baselineVolume = this.baseline.volume.avg;
    const currentVolume = analysis.volume;
    
    if (currentVolume > baselineVolume * this.thresholds.volume.spike) {
      return {
        shouldAlert: true,
        type: 'volume_spike',
        severity: 'medium',
        value: currentVolume,
        threshold: baselineVolume * this.thresholds.volume.spike
      };
    }
    
    return { shouldAlert: false };
  }

  // 检查异常告警
  checkAnomalyAlert(anomalies) {
    if (anomalies && anomalies.length > 0) {
      return {
        shouldAlert: true,
        type: 'data_anomaly',
        severity: 'medium',
        anomalies: anomalies
      };
    }
    
    return { shouldAlert: false };
  }

  // 检查趋势告警
  checkTrendAlert(trends) {
    if (!trends || trends.length === 0) return { shouldAlert: false };
    
    const recentTrend = trends[trends.length - 1];
    
    if (recentTrend.direction === 'rapid_decline' && Math.abs(recentTrend.magnitude) > 0.5) {
      return {
        shouldAlert: true,
        type: 'rapid_decline_trend',
        severity: 'high',
        trend: recentTrend
      };
    }
    
    return { shouldAlert: false };
  }

  // 生成告警
  generateAlert(streamId, analysis, anomalies, trends, predictions) {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert = {
      id: alertId,
      streamId,
      type: 'realtime_alert',
      severity: this.determineAlertSeverity(analysis, anomalies, trends),
      title: this.generateAlertTitle(analysis, anomalies, trends),
      description: this.generateAlertDescription(analysis, anomalies, trends, predictions),
      data: {
        analysis,
        anomalies,
        trends,
        predictions
      },
      timestamp: new Date(),
      acknowledged: false,
      actions: this.generateAlertActions(analysis, anomalies, trends),
      metadata: {
        confidence: this.calculateAlertConfidence(analysis, anomalies, trends),
        falsePositiveProbability: this.estimateFalsePositiveProbability(analysis, anomalies, trends)
      }
    };
    
    this.alerts.set(alertId, alert);
    this.metrics.alertsGenerated++;
    
    logger.warn(`生成实时告警: ${alert.title}`, alert);
    
    this.emit('alert_generated', alert);
    
    // 发送通知
    this.sendAlertNotification(alert);
  }

  // 生成系统告警
  generateSystemAlert(type, data) {
    const alertId = `system_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert = {
      id: alertId,
      type: 'system_alert',
      severity: this.getSystemAlertSeverity(type),
      title: this.getSystemAlertTitle(type),
      description: this.getSystemAlertDescription(type, data),
      data,
      timestamp: new Date(),
      acknowledged: false,
      metadata: {
        system: true,
        autoRecoverable: this.isSystemAlertAutoRecoverable(type)
      }
    };
    
    this.alerts.set(alertId, alert);
    
    logger.warn(`生成系统告警: ${alert.title}`, alert);
    
    this.emit('system_alert_generated', alert);
  }

  // 确定告警严重程度
  determineAlertSeverity(analysis, anomalies, trends) {
    let maxSeverity = 'low';
    
    // 检查各个因素的严重程度
    if (analysis.risk > this.thresholds.risk.high) maxSeverity = 'critical';
    else if (analysis.risk > this.thresholds.risk.medium) maxSeverity = 'high';
    
    if (analysis.sentiment.negative > this.thresholds.sentiment.negative.max) {
      maxSeverity = Math.max(maxSeverity, 'high') === 'high' ? 'high' : maxSeverity;
    }
    
    return maxSeverity;
  }

  // 生成告警标题
  generateAlertTitle(analysis, anomalies, trends) {
    if (analysis.risk > this.thresholds.risk.high) {
      return '检测到高风险内容';
    }
    
    if (analysis.sentiment.negative > this.thresholds.sentiment.negative.max) {
      return '负面情感激增';
    }
    
    if (anomalies && anomalies.length > 0) {
      return '检测到数据异常';
    }
    
    return '舆情监控告警';
  }

  // 生成告警描述
  generateAlertDescription(analysis, anomalies, trends, predictions) {
    let description = '';
    
    if (analysis.risk > this.thresholds.risk.high) {
      description += `风险评分达到 ${(analysis.risk * 100).toFixed(1)}%，超过高风险阈值。`;
    }
    
    if (analysis.sentiment.negative > this.thresholds.sentiment.negative.max) {
      description += `负面情感占比 ${(analysis.sentiment.negative * 100).toFixed(1)}%，需要关注。`;
    }
    
    if (predictions && predictions.riskTrend === 'increasing') {
      description += '预测显示风险呈上升趋势。';
    }
    
    return description;
  }

  // 生成告警动作
  generateAlertActions(analysis, anomalies, trends) {
    const actions = [];
    
    if (analysis.risk > this.thresholds.risk.high) {
      actions.push({
        id: 'escalate',
        label: '升级处理',
        type: 'escalation',
        description: '将告警升级到高级管理层'
      });
    }
    
    actions.push({
      id: 'acknowledge',
      label: '确认告警',
      type: 'acknowledgment',
      description: '标记告警为已确认'
    });
    
    actions.push({
      id: 'dismiss',
      label: '忽略告警',
      type: 'dismissal',
      description: '标记告警为误报'
    });
    
    return actions;
  }

  // 计算告警置信度
  calculateAlertConfidence(analysis, anomalies, trends) {
    let confidence = 0.5; // 基础置信度
    
    // 基于多个因素计算置信度
    confidence += analysis.sentiment.confidence * 0.2;
    confidence += (1 - Math.abs(analysis.sentiment.negative - 0.5)) * 0.2; // 极端值的置信度更高
    confidence += Math.min(analysis.quality, 0.3);
    
    if (anomalies && anomalies.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.95);
  }

  // 发送告警通知
  sendAlertNotification(alert) {
    // 这里可以实现具体的通知机制
    // 如：邮件、短信、钉钉、企业微信、Slack等
    
    logger.info(`发送告警通知: ${alert.title}`);
    
    this.emit('alert_notification_sent', {
      alertId: alert.id,
      notificationType: 'internal',
      timestamp: new Date()
    });
  }

  // 获取告警
  getAlerts(options = {}) {
    const { acknowledged = null, severity = null, limit = 100 } = options;
    
    let alerts = Array.from(this.alerts.values());
    
    if (acknowledged !== null) {
      alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
    }
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts.slice(0, limit);
  }

  // 确认告警
  acknowledgeAlert(alertId, userId = 'system') {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      
      logger.info(`告警已确认: ${alertId} by ${userId}`);
      
      this.emit('alert_acknowledged', {
        alertId,
        userId,
        timestamp: new Date()
      });
      
      return true;
    }
    
    return false;
  }

  // 获取监控统计
  getMonitoringStats(timeRange = 3600000) { // 默认1小时
    const now = new Date();
    const startTime = new Date(now - timeRange);
    
    const recentAlerts = this.getAlerts({ limit: 1000 }).filter(alert => 
      alert.timestamp >= startTime
    );
    
    const stats = {
      timeRange,
      startTime,
      endTime: now,
      totalAlerts: recentAlerts.length,
      alertsBySeverity: this.groupAlertsBySeverity(recentAlerts),
      alertsByType: this.groupAlertsByType(recentAlerts),
      responseTime: this.calculateAverageResponseTime(recentAlerts),
      falsePositiveRate: this.calculateFalsePositiveRate(recentAlerts),
      activeStreams: this.dataStreams.size,
      totalProcessed: this.metrics.totalProcessed,
      uptime: this.metrics.startTime ? (now - this.metrics.startTime) : 0
    };
    
    return stats;
  }

  // 工具方法
  groupAlertsBySeverity(alerts) {
    const groups = {};
    alerts.forEach(alert => {
      groups[alert.severity] = (groups[alert.severity] || 0) + 1;
    });
    return groups;
  }

  groupAlertsByType(alerts) {
    const groups = {};
    alerts.forEach(alert => {
      groups[alert.type] = (groups[alert.type] || 0) + 1;
    });
    return groups;
  }

  calculateAverageResponseTime(alerts) {
    // 这里应该计算从告警生成到确认的平均时间
    return 0; // 简化实现
  }

  calculateFalsePositiveRate(alerts) {
    // 这里应该基于用户反馈计算误报率
    return 0; // 简化实现
  }

  // 获取默认基线
  getDefaultBaseline() {
    return {
      sentiment: {
        positive: 0.4,
        negative: 0.3,
        neutral: 0.3
      },
      volume: {
        avg: 100,
        min: 10,
        max: 500
      },
      risk: {
        avg: 0.2,
        min: 0,
        max: 0.5
      },
      timePattern: {
        peakHours: [9, 12, 18, 21],
        lowHours: [2, 3, 4, 5]
      },
      establishedAt: new Date()
    };
  }

  // 清理过期告警
  cleanupExpiredAlerts() {
    const now = new Date();
    const expirationTime = 24 * 60 * 60 * 1000; // 24小时
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (now - alert.timestamp > expirationTime) {
        this.alerts.delete(alertId);
        logger.debug(`清理过期告警: ${alertId}`);
      }
    }
  }

  // 性能监控
  monitorPerformance() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = require('os').loadavg()[0];
    
    this.emit('performance_metrics', {
      memory: memoryUsage,
      cpu: cpuUsage,
      activeAlerts: this.alerts.size,
      activeStreams: this.dataStreams.size,
      timestamp: new Date()
    });
  }

  // 系统告警相关方法
  getSystemAlertSeverity(type) {
    const severities = {
      high_memory_usage: 'critical',
      too_many_streams: 'high',
      too_many_alerts: 'medium'
    };
    return severities[type] || 'low';
  }

  getSystemAlertTitle(type) {
    const titles = {
      high_memory_usage: '内存使用率过高',
      too_many_streams: '数据流数量过多',
      too_many_alerts: '告警数量过多'
    };
    return titles[type] || '系统告警';
  }

  getSystemAlertDescription(type, data) {
    const descriptions = {
      high_memory_usage: `内存使用率达到 ${(data.usage * 100).toFixed(1)}%，可能影响系统性能`,
      too_many_streams: `当前活跃数据流数量达到 ${data.count} 个，建议检查配置`,
      too_many_alerts: `当前活跃告警数量达到 ${data.count} 个，可能存在误报`
    };
    return descriptions[type] || '系统检测到异常情况';
  }

  isSystemAlertAutoRecoverable(type) {
    return ['high_memory_usage', 'too_many_streams'].includes(type);
  }
}

/**
 * 异常检测器
 */
class AnomalyDetector {
  detect(analysis, baseline) {
    const anomalies = [];
    
    if (!baseline) return anomalies;
    
    // 检测情感异常
    if (analysis.sentiment) {
      if (analysis.sentiment.negative > baseline.sentiment.negative * 2) {
        anomalies.push({
          type: 'sentiment_anomaly',
          severity: 'medium',
          value: analysis.sentiment.negative,
          baseline: baseline.sentiment.negative,
          description: '负面情感异常升高'
        });
      }
    }
    
    // 检测风险异常
    if (analysis.risk > baseline.risk.avg * 3) {
      anomalies.push({
        type: 'risk_anomaly',
        severity: 'high',
        value: analysis.risk,
        baseline: baseline.risk.avg,
        description: '风险评分异常升高'
      });
    }
    
    return anomalies;
  }
}

/**
 * 趋势分析器
 */
class TrendAnalyzer {
  analyze(analysis) {
    // 简化的趋势分析
    return {
      direction: analysis.sentiment.negative > 0.5 ? 'declining' : 'stable',
      magnitude: Math.abs(analysis.sentiment.negative - 0.3),
      confidence: analysis.sentiment.confidence || 0.5
    };
  }
}

/**
 * 预测引擎
 */
class PredictionEngine {
  predict(analysis, trends) {
    // 简化的预测
    return {
      riskTrend: trends.direction === 'declining' ? 'increasing' : 'stable',
      sentimentTrend: analysis.sentiment.negative > 0.4 ? 'worsening' : 'improving',
      confidence: 0.6,
      timeframe: 'next_hour'
    };
  }
}

/**
 * 数据流
 */
class DataStream extends EventEmitter {
  constructor(keyword, platform) {
    super();
    this.keyword = keyword;
    this.platform = platform;
    this.isActive = false;
    this.interval = null;
  }

  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // 模拟数据流
    this.interval = setInterval(() => {
      const mockData = this.generateMockData();
      this.emit('data', mockData);
    }, 2000); // 每2秒生成一条数据
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  generateMockData() {
    return {
      id: `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      keyword: this.keyword,
      platform: this.platform,
      content: `这是一个关于${this.keyword}的模拟评论内容`,
      author: `用户${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 50),
      shares: Math.floor(Math.random() * 20)
    };
  }
}

module.exports = RealTimeMonitor;