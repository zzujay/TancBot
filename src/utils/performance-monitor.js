/**
 * 性能监控模块
 * 监控系统性能指标，提供实时性能数据
 */

const EventEmitter = require('events');
const logger = require('./logger');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.thresholds = {
      cpu: 80,        // CPU使用率阈值 (%)
      memory: 85,     // 内存使用率阈值 (%)
      responseTime: 2000,  // 响应时间阈值 (ms)
      errorRate: 5,   // 错误率阈值 (%)
      disk: 90        // 磁盘使用率阈值 (%)
    };
    this.isMonitoring = false;
    this.monitoringInterval = 5000; // 5秒监控间隔
    this.collectors = new Map();
  }

  // 启动监控
  start() {
    if (this.isMonitoring) {
      logger.warn('性能监控已在运行中');
      return;
    }

    logger.info('启动性能监控');
    this.isMonitoring = true;

    // 初始化各个收集器
    this.initializeCollectors();

    // 开始定期收集
    this.monitoringTimer = setInterval(() => {
      this.collectMetrics();
    }, this.monitoringInterval);

    this.emit('monitoring_started');
  }

  // 停止监控
  stop() {
    if (!this.isMonitoring) {
      logger.warn('性能监控未在运行');
      return;
    }

    logger.info('停止性能监控');
    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    this.emit('monitoring_stopped');
  }

  // 初始化收集器
  initializeCollectors() {
    this.collectors.set('system', new SystemMetricsCollector());
    this.collectors.set('memory', new MemoryMetricsCollector());
    this.collectors.set('cpu', new CpuMetricsCollector());
    this.collectors.set('disk', new DiskMetricsCollector());
    this.collectors.set('network', new NetworkMetricsCollector());
    this.collectors.set('application', new ApplicationMetricsCollector());
  }

  // 收集指标
  async collectMetrics() {
    const timestamp = Date.now();
    const batchMetrics = {};

    try {
      // 并行收集所有指标
      const promises = Array.from(this.collectors.entries()).map(async ([name, collector]) => {
        try {
          const metrics = await collector.collect();
          batchMetrics[name] = metrics;
          this.updateMetrics(name, metrics, timestamp);
        } catch (error) {
          logger.error(`收集器 ${name} 失败:`, error);
          batchMetrics[name] = { error: error.message };
        }
      });

      await Promise.all(promises);

      // 检查阈值
      this.checkThresholds(batchMetrics);

      // 发送批量指标
      this.emit('metrics_batch', batchMetrics);

    } catch (error) {
      logger.error('指标收集失败:', error);
      this.emit('collection_error', error);
    }
  }

  // 更新指标
  updateMetrics(category, metrics, timestamp) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }

    const categoryMetrics = this.metrics.get(category);
    const metricEntry = {
      timestamp,
      metrics,
      id: `${category}_${timestamp}`
    };

    categoryMetrics.push(metricEntry);

    // 保持最近1000条记录
    if (categoryMetrics.length > 1000) {
      categoryMetrics.shift();
    }

    // 发送单个指标更新事件
    this.emit('metrics_updated', category, metrics);
  }

  // 检查阈值
  checkThresholds(metrics) {
    Object.entries(metrics).forEach(([category, data]) => {
      if (data.error) return;

      Object.entries(data).forEach(([metric, value]) => {
        const thresholdKey = `${category}_${metric}`;
        const threshold = this.thresholds[thresholdKey] || this.thresholds[metric];

        if (threshold && typeof value === 'number' && value > threshold) {
          this.triggerAlert(category, metric, value, threshold);
        }
      });
    });
  }

  // 触发告警
  triggerAlert(category, metric, value, threshold) {
    const alertKey = `${category}_${metric}`;
    const now = Date.now();

    // 避免重复告警（5分钟内只告警一次）
    if (this.alerts.has(alertKey)) {
      const lastAlert = this.alerts.get(alertKey);
      if (now - lastAlert.timestamp < 300000) { // 5分钟
        return;
      }
    }

    const alert = {
      id: `alert_${now}`,
      category,
      metric,
      value,
      threshold,
      severity: this.calculateSeverity(value, threshold),
      timestamp: now,
      message: `${category}.${metric} 超过阈值: ${value} > ${threshold}`
    };

    this.alerts.set(alertKey, alert);

    logger.warn(`性能告警: ${alert.message}`);
    this.emit('alert_triggered', alert);
  }

  // 计算严重程度
  calculateSeverity(value, threshold) {
    const ratio = value / threshold;
    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1.2) return 'medium';
    return 'low';
  }

  // 获取当前指标
  getCurrentMetrics() {
    const current = {};
    this.metrics.forEach((entries, category) => {
      if (entries.length > 0) {
        current[category] = entries[entries.length - 1].metrics;
      }
    });
    return current;
  }

  // 获取指标历史
  getMetricsHistory(category, limit = 100) {
    const entries = this.metrics.get(category) || [];
    return entries.slice(-limit);
  }

  // 获取统计信息
  getStatistics(timeRange = 3600000) { // 默认1小时
    const now = Date.now();
    const startTime = now - timeRange;
    
    const stats = {};
    
    this.metrics.forEach((entries, category) => {
      const relevantEntries = entries.filter(entry => entry.timestamp >= startTime);
      
      if (relevantEntries.length > 0) {
        stats[category] = this.calculateStatistics(relevantEntries);
      }
    });

    return {
      timeRange,
      statistics: stats,
      generatedAt: now
    };
  }

  // 计算统计信息
  calculateStatistics(entries) {
    const values = {};
    
    // 收集所有指标值
    entries.forEach(entry => {
      Object.entries(entry.metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!values[key]) values[key] = [];
          values[key].push(value);
        }
      });
    });

    // 计算统计值
    const statistics = {};
    Object.entries(values).forEach(([key, numbers]) => {
      if (numbers.length > 0) {
        statistics[key] = {
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
          count: numbers.length,
          trend: this.calculateTrend(numbers)
        };
      }
    });

    return statistics;
  }

  // 计算趋势
  calculateTrend(numbers) {
    if (numbers.length < 2) return 'stable';
    
    const recent = numbers.slice(-10);
    const older = numbers.slice(0, 10);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  // 设置阈值
  setThreshold(metric, threshold) {
    this.thresholds[metric] = threshold;
    logger.info(`设置阈值: ${metric} = ${threshold}`);
  }

  // 获取阈值
  getThresholds() {
    return { ...this.thresholds };
  }

  // 健康检查
  getHealthStatus() {
    const current = this.getCurrentMetrics();
    const issues = [];
    
    // 检查是否有错误
    Object.entries(current).forEach(([category, data]) => {
      if (data.error) {
        issues.push({
          category,
          issue: 'metric_collection_failed',
          details: data.error
        });
      }
    });

    // 检查关键指标
    const criticalMetrics = ['cpu', 'memory', 'disk'];
    criticalMetrics.forEach(metric => {
      if (current[metric]) {
        const usage = current[metric].usage || 0;
        if (usage > 90) {
          issues.push({
            category: 'system',
            issue: 'critical_resource_usage',
            metric,
            usage,
            severity: 'critical'
          });
        }
      }
    });

    return {
      status: issues.length === 0 ? 'healthy' : 'unhealthy',
      issues: issues,
      timestamp: Date.now()
    };
  }
}

// 系统指标收集器
class SystemMetricsCollector {
  async collect() {
    const os = require('os');
    const process = require('process');
    
    return {
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      pid: process.pid,
      ppid: process.ppid
    };
  }
}

// 内存指标收集器
class MemoryMetricsCollector {
  async collect() {
    const os = require('os');
    const process = require('process');
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usage: (usedMem / totalMem) * 100,
      process: process.memoryUsage()
    };
  }
}

// CPU指标收集器
class CpuMetricsCollector {
  async collect() {
    const os = require('os');
    const cpus = os.cpus();
    
    const cpuInfo = cpus.map((cpu, index) => ({
      model: cpu.model,
      speed: cpu.speed,
      times: cpu.times
    }));
    
    return {
      count: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed,
      usage: await this.calculateCpuUsage()
    };
  }

  async calculateCpuUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.getCpuInfo();
      
      setTimeout(() => {
        const endMeasure = this.getCpuInfo();
        
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const usage = 100 - Math.floor(100 * idleDifference / totalDifference);
        
        resolve(usage);
      }, 100);
    });
  }

  getCpuInfo() {
    const os = require('os');
    const cpus = os.cpus();
    
    let idle = 0;
    let total = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    });
    
    return { idle, total };
  }
}

// 磁盘指标收集器
class DiskMetricsCollector {
  async collect() {
    try {
      const checkDiskSpace = require('check-disk-space').default;
      const path = require('path');
      
      const diskPath = path.parse(process.cwd()).root;
      const diskSpace = await checkDiskSpace(diskPath);
      
      return {
        path: diskPath,
        total: diskSpace.size,
        free: diskSpace.free,
        used: diskSpace.size - diskSpace.free,
        usage: ((diskSpace.size - diskSpace.free) / diskSpace.size) * 100
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// 网络指标收集器
class NetworkMetricsCollector {
  async collect() {
    // 这里应该实现更复杂的网络指标收集
    // 目前返回基础信息
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    const interfaces = {};
    Object.entries(networkInterfaces).forEach(([name, addresses]) => {
      interfaces[name] = addresses.map(addr => ({
        address: addr.address,
        family: addr.family,
        internal: addr.internal
      }));
    });
    
    return {
      interfaces,
      hostname: os.hostname()
    };
  }
}

// 应用指标收集器
class ApplicationMetricsCollector {
  constructor() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
  }

  async collect() {
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    const errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0;
    
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      avgResponseTime,
      errorRate,
      uptime: process.uptime()
    };
  }

  // 记录请求
  recordRequest(responseTime, isError = false) {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (isError) {
      this.errorCount++;
    }
    
    // 保持最近1000个响应时间
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  // 重置统计
  reset() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
  }
}

module.exports = PerformanceMonitor;