/**
 * 增强的错误处理模块
 * 提供统一的错误处理、错误分类和恢复机制
 */

const logger = require('./logger');
const EventEmitter = require('events');

class ErrorHandler extends EventEmitter {
  constructor() {
    super();
    this.errorTypes = new Map();
    this.errorHistory = [];
    this.maxHistorySize = 1000;
    this.recoveryStrategies = new Map();
    this.initializeErrorTypes();
    this.initializeRecoveryStrategies();
    
    // 监听未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.handleUnhandledRejection(reason, promise);
    });
    
    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      this.handleUncaughtException(error);
    });
  }

  // 初始化错误类型
  initializeErrorTypes() {
    this.errorTypes.set('NETWORK_ERROR', {
      code: 'NETWORK_ERROR',
      message: '网络连接错误',
      severity: 'high',
      recoverable: true,
      retryable: true,
      maxRetries: 3
    });

    this.errorTypes.set('RATE_LIMIT_ERROR', {
      code: 'RATE_LIMIT_ERROR',
      message: '请求频率限制',
      severity: 'medium',
      recoverable: true,
      retryable: true,
      backoffStrategy: 'exponential'
    });

    this.errorTypes.set('AUTHENTICATION_ERROR', {
      code: 'AUTHENTICATION_ERROR',
      message: '认证失败',
      severity: 'high',
      recoverable: false,
      retryable: false,
      requiresManualIntervention: true
    });

    this.errorTypes.set('DATA_VALIDATION_ERROR', {
      code: 'DATA_VALIDATION_ERROR',
      message: '数据验证失败',
      severity: 'low',
      recoverable: true,
      retryable: false,
      fallbackStrategy: 'use_default'
    });

    this.errorTypes.set('DATABASE_ERROR', {
      code: 'DATABASE_ERROR',
      message: '数据库错误',
      severity: 'critical',
      recoverable: true,
      retryable: true,
      maxRetries: 5,
      fallbackStrategy: 'cache_fallback'
    });

    this.errorTypes.set('AI_ANALYSIS_ERROR', {
      code: 'AI_ANALYSIS_ERROR',
      message: 'AI分析错误',
      severity: 'medium',
      recoverable: true,
      retryable: true,
      maxRetries: 2,
      fallbackStrategy: 'rule_based'
    });

    this.errorTypes.set('SYSTEM_RESOURCE_ERROR', {
      code: 'SYSTEM_RESOURCE_ERROR',
      message: '系统资源不足',
      severity: 'critical',
      recoverable: true,
      retryable: false,
      requiresManualIntervention: true
    });

    this.errorTypes.set('EXTERNAL_SERVICE_ERROR', {
      code: 'EXTERNAL_SERVICE_ERROR',
      message: '外部服务错误',
      severity: 'high',
      recoverable: true,
      retryable: true,
      maxRetries: 3,
      backoffStrategy: 'linear'
    });
  }

  // 初始化恢复策略
  initializeRecoveryStrategies() {
    this.recoveryStrategies.set('exponential_backoff', async (error, context) => {
      const retryCount = context.retryCount || 0;
      const delay = Math.pow(2, retryCount) * 1000; // 2^retryCount 秒
      logger.info(`指数退避策略: 等待 ${delay}ms 后重试`);
      await this.sleep(delay);
      return { shouldRetry: true, delay };
    });

    this.recoveryStrategies.set('linear_backoff', async (error, context) => {
      const retryCount = context.retryCount || 0;
      const delay = (retryCount + 1) * 1000; // 线性增长
      logger.info(`线性退避策略: 等待 ${delay}ms 后重试`);
      await this.sleep(delay);
      return { shouldRetry: true, delay };
    });

    this.recoveryStrategies.set('circuit_breaker', async (error, context) => {
      const errorType = this.classifyError(error);
      const errorInfo = this.errorTypes.get(errorType);
      
      if (context.failureCount >= 5) {
        logger.warn('熔断器开启，暂停服务调用');
        return { shouldRetry: false, reason: 'circuit_breaker_open' };
      }
      
      return { shouldRetry: true };
    });

    this.recoveryStrategies.set('fallback', async (error, context) => {
      logger.info('使用降级策略');
      const fallbackData = await this.getFallbackData(context);
      return { 
        shouldRetry: false, 
        fallback: true, 
        data: fallbackData 
      };
    });
  }

  // 错误处理主方法
  async handleError(error, context = {}) {
    const errorInfo = this.classifyAndEnrichError(error, context);
    
    // 记录错误
    this.logError(errorInfo);
    
    // 添加到历史记录
    this.addToHistory(errorInfo);
    
    // 尝试恢复
    const recoveryResult = await this.attemptRecovery(errorInfo, context);
    
    // 发送告警（如果需要）
    if (errorInfo.severity === 'critical' || errorInfo.severity === 'high') {
      this.sendAlert(errorInfo);
    }
    
    // 触发事件
    this.emit('error_handled', errorInfo, recoveryResult);
    
    return recoveryResult;
  }

  // 错误分类和丰富
  classifyAndEnrichError(error, context) {
    let errorType = 'UNKNOWN_ERROR';
    let enrichedError = {
      originalError: error,
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date(),
      context: context,
      severity: 'medium',
      code: 'UNKNOWN_ERROR'
    };

    // 根据错误特征分类
    if (this.isNetworkError(error)) {
      errorType = 'NETWORK_ERROR';
    } else if (this.isRateLimitError(error)) {
      errorType = 'RATE_LIMIT_ERROR';
    } else if (this.isAuthenticationError(error)) {
      errorType = 'AUTHENTICATION_ERROR';
    } else if (this.isDatabaseError(error)) {
      errorType = 'DATABASE_ERROR';
    } else if (this.isAIAnalysisError(error)) {
      errorType = 'AI_ANALYSIS_ERROR';
    } else if (this.isSystemResourceError(error)) {
      errorType = 'SYSTEM_RESOURCE_ERROR';
    }

    const errorTypeInfo = this.errorTypes.get(errorType);
    if (errorTypeInfo) {
      enrichedError = {
        ...enrichedError,
        ...errorTypeInfo,
        type: errorType
      };
    }

    return enrichedError;
  }

  // 错误分类辅助方法
  isNetworkError(error) {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ENOTFOUND' ||
           error.message.includes('network') ||
           error.message.includes('connection');
  }

  isRateLimitError(error) {
    return error.statusCode === 429 ||
           error.message.includes('rate limit') ||
           error.message.includes('too many requests');
  }

  isAuthenticationError(error) {
    return error.statusCode === 401 ||
           error.statusCode === 403 ||
           error.message.includes('authentication') ||
           error.message.includes('unauthorized');
  }

  isDatabaseError(error) {
    return error.message.includes('database') ||
           error.message.includes('sql') ||
           error.message.includes('connection lost');
  }

  isAIAnalysisError(error) {
    return error.message.includes('AI') ||
           error.message.includes('analysis') ||
           error.message.includes('model');
  }

  isSystemResourceError(error) {
    return error.code === 'ENOMEM' ||
           error.message.includes('memory') ||
           error.message.includes('disk space') ||
           error.message.includes('resource');
  }

  // 记录错误
  logError(errorInfo) {
    const logData = {
      error: {
        type: errorInfo.type,
        code: errorInfo.code,
        message: errorInfo.message,
        severity: errorInfo.severity
      },
      context: errorInfo.context,
      timestamp: errorInfo.timestamp
    };

    switch (errorInfo.severity) {
      case 'critical':
        logger.error('严重错误:', logData);
        break;
      case 'high':
        logger.error('高级错误:', logData);
        break;
      case 'medium':
        logger.warn('中级错误:', logData);
        break;
      case 'low':
        logger.info('低级错误:', logData);
        break;
      default:
        logger.error('未知级别错误:', logData);
    }
  }

  // 添加到历史记录
  addToHistory(errorInfo) {
    this.errorHistory.push(errorInfo);
    
    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
    
    // 触发事件
    this.emit('error_added_to_history', errorInfo);
  }

  // 尝试恢复
  async attemptRecovery(errorInfo, context) {
    const errorType = errorInfo.type;
    const errorTypeInfo = this.errorTypes.get(errorType);
    
    if (!errorTypeInfo || !errorTypeInfo.recoverable) {
      logger.info(`错误类型 ${errorType} 不可恢复`);
      return { success: false, reason: 'not_recoverable' };
    }

    const retryCount = context.retryCount || 0;
    const maxRetries = errorTypeInfo.maxRetries || 3;
    
    if (retryCount >= maxRetries) {
      logger.info(`已达到最大重试次数: ${maxRetries}`);
      return { success: false, reason: 'max_retries_exceeded' };
    }

    // 获取恢复策略
    const strategy = this.getRecoveryStrategy(errorTypeInfo);
    
    try {
      const result = await strategy(errorInfo, {
        ...context,
        retryCount: retryCount + 1,
        failureCount: context.failureCount || 0
      });
      
      return {
        success: result.shouldRetry,
        strategy: strategy.name,
        ...result
      };
    } catch (recoveryError) {
      logger.error('恢复策略执行失败:', recoveryError);
      return { success: false, reason: 'recovery_failed', error: recoveryError };
    }
  }

  // 获取恢复策略
  getRecoveryStrategy(errorTypeInfo) {
    const backoffStrategy = errorTypeInfo.backoffStrategy;
    
    if (backoffStrategy === 'exponential') {
      return this.recoveryStrategies.get('exponential_backoff');
    } else if (backoffStrategy === 'linear') {
      return this.recoveryStrategies.get('linear_backoff');
    } else if (errorTypeInfo.fallbackStrategy) {
      return this.recoveryStrategies.get('fallback');
    } else {
      return async () => ({ shouldRetry: true });
    }
  }

  // 获取降级数据
  async getFallbackData(context) {
    // 这里可以实现具体的降级逻辑
    // 例如返回缓存数据、默认值等
    return {
      fallback: true,
      data: 'fallback_data',
      timestamp: new Date()
    };
  }

  // 发送告警
  sendAlert(errorInfo) {
    const alert = {
      id: `alert_${Date.now()}`,
      errorId: errorInfo.id,
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.message,
      timestamp: errorInfo.timestamp,
      context: errorInfo.context
    };

    this.emit('alert_sent', alert);
    
    // 这里可以集成具体的告警系统
    // 如：邮件、短信、钉钉、企业微信等
    logger.warn('发送告警:', alert);
  }

  // 处理未处理的Promise拒绝
  handleUnhandledRejection(reason, promise) {
    const error = new Error(`Unhandled Promise Rejection: ${reason}`);
    error.stack = `Unhandled Promise Rejection: ${reason}\n${promise}`;
    
    this.handleError(error, { source: 'unhandled_rejection' });
  }

  // 处理未捕获的异常
  handleUncaughtException(error) {
    logger.error('未捕获的异常:', error);
    
    // 记录错误后优雅退出
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }

  // 获取错误统计
  getErrorStatistics(timeRange = 3600000) { // 默认1小时
    const cutoffTime = new Date(Date.now() - timeRange);
    
    const recentErrors = this.errorHistory.filter(error => 
      error.timestamp >= cutoffTime
    );

    const statistics = {
      total: recentErrors.length,
      bySeverity: {},
      byType: {},
      byTime: {},
      trends: {}
    };

    // 按严重程度统计
    recentErrors.forEach(error => {
      statistics.bySeverity[error.severity] = 
        (statistics.bySeverity[error.severity] || 0) + 1;
      
      statistics.byType[error.type] = 
        (statistics.byType[error.type] || 0) + 1;
    });

    // 按时间统计（按小时分组）
    recentErrors.forEach(error => {
      const hour = error.timestamp.getHours();
      const key = `${hour}:00`;
      statistics.byTime[key] = (statistics.byTime[key] || 0) + 1;
    });

    // 计算趋势
    statistics.trends = this.calculateErrorTrends(recentErrors);

    return {
      timeRange,
      statistics,
      generatedAt: new Date()
    };
  }

  // 计算错误趋势
  calculateErrorTrends(errors) {
    if (errors.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const halfPoint = Math.floor(errors.length / 2);
    const firstHalf = errors.slice(0, halfPoint);
    const secondHalf = errors.slice(halfPoint);

    const firstHalfCount = firstHalf.length;
    const secondHalfCount = secondHalf.length;

    if (secondHalfCount > firstHalfCount * 1.2) {
      return { direction: 'increasing', change: (secondHalfCount - firstHalfCount) / firstHalfCount };
    } else if (secondHalfCount < firstHalfCount * 0.8) {
      return { direction: 'decreasing', change: (firstHalfCount - secondHalfCount) / firstHalfCount };
    } else {
      return { direction: 'stable', change: 0 };
    }
  }

  // 工具方法：睡眠
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取错误历史
  getErrorHistory(limit = 100) {
    return this.errorHistory.slice(-limit);
  }

  // 清除错误历史
  clearErrorHistory() {
    this.errorHistory = [];
    this.emit('history_cleared');
  }

  // 设置阈值
  setThreshold(metric, threshold) {
    this.thresholds[metric] = threshold;
    logger.info(`设置错误阈值: ${metric} = ${threshold}`);
  }
}

module.exports = new ErrorHandler();