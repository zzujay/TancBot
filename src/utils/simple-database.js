const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

/**
 * 简单的JSON文件数据库
 * 用于存储和查询舆情数据
 */
class SimpleDatabase {
  constructor() {
    this.dataDir = path.dirname(process.env.DB_PATH || './data/opinion.json');
    this.dataFile = path.join(this.dataDir, 'opinion.json');
    this.backupDir = path.join(this.dataDir, 'backups');
    this.data = {
      raw_data: [],
      analysis_results: [],
      tasks: [],
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }
    };
  }

  async initialize() {
    try {
      logger.info('正在初始化数据库...');
      
      // 确保数据目录存在
      await fs.ensureDir(this.dataDir);
      await fs.ensureDir(this.backupDir);
      
      // 如果数据文件存在，加载数据
      if (await fs.pathExists(this.dataFile)) {
        const fileData = await fs.readJson(this.dataFile);
        this.data = { ...this.data, ...fileData };
        logger.info('数据库加载成功');
      } else {
        // 创建新的数据文件
        await this.saveData();
        logger.info('创建新的数据库文件');
      }
      
      logger.info('数据库初始化完成');
    } catch (error) {
      logger.error('数据库初始化失败:', error);
      throw error;
    }
  }

  async saveData() {
    try {
      this.data.metadata.last_updated = new Date().toISOString();
      await fs.writeJson(this.dataFile, this.data, { spaces: 2 });
    } catch (error) {
      logger.error('保存数据失败:', error);
      throw error;
    }
  }

  async saveRawData(data) {
    try {
      const newItems = data.map(item => ({
        ...item,
        id: this.generateId(),
        created_at: new Date().toISOString()
      }));
      
      this.data.raw_data.push(...newItems);
      await this.saveData();
      
      logger.info(`成功保存 ${newItems.length} 条原始数据`);
      return newItems.length;
    } catch (error) {
      logger.error('保存原始数据失败:', error);
      throw error;
    }
  }

  async saveAnalysisResult(result) {
    try {
      const analysisResult = {
        ...result,
        id: this.generateId(),
        created_at: new Date().toISOString()
      };
      
      this.data.analysis_results.push(analysisResult);
      await this.saveData();
      
      logger.info('分析结果保存成功');
    } catch (error) {
      logger.error('保存分析结果失败:', error);
      throw error;
    }
  }

  getTaskResults(taskId) {
    try {
      return this.data.analysis_results
        .filter(result => result.taskId === taskId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      logger.error('获取任务结果失败:', error);
      throw error;
    }
  }

  getRecentTasks(limit = 10) {
    try {
      return this.data.tasks
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    } catch (error) {
      logger.error('获取最近任务失败:', error);
      throw error;
    }
  }

  getStatistics() {
    try {
      const stats = {
        totalDataItems: this.data.raw_data.length,
        totalAnalysisResults: this.data.analysis_results.length,
        totalTasks: this.data.tasks.length,
        platformDistribution: this.getPlatformDistribution(),
        recentActivity: this.getRecentActivity(),
        dataQuality: this.getDataQuality()
      };

      return stats;
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      throw error;
    }
  }

  getPlatformDistribution() {
    const distribution = {};
    this.data.raw_data.forEach(item => {
      const platform = item.platform || 'unknown';
      distribution[platform] = (distribution[platform] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([platform, count]) => ({
      platform,
      count
    }));
  }

  getRecentActivity(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const activity = {};
    
    this.data.raw_data.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (new Date(date) >= cutoffDate) {
        activity[date] = (activity[date] || 0) + 1;
      }
    });
    
    return Object.entries(activity)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getDataQuality() {
    if (this.data.raw_data.length === 0) {
      return { score: 0, issues: [] };
    }

    let score = 0;
    const issues = [];

    // 完整性检查
    const completeItems = this.data.raw_data.filter(item => 
      item.content && item.content.trim().length > 0
    ).length;
    
    const completeness = completeItems / this.data.raw_data.length;
    score += completeness * 0.4;

    if (completeness < 0.8) {
      issues.push(`数据完整性较低 (${(completeness * 100).toFixed(1)}%)`);
    }

    // 重复性检查
    const uniqueContents = new Set(
      this.data.raw_data.map(item => item.content?.trim().toLowerCase())
    ).size;
    
    const uniqueness = uniqueContents / this.data.raw_data.length;
    score += uniqueness * 0.3;

    if (uniqueness < 0.9) {
      issues.push(`数据重复率较高 (${((1 - uniqueness) * 100).toFixed(1)}%)`);
    }

    // 时效性检查
    const recentItems = this.data.raw_data.filter(item => {
      const itemDate = new Date(item.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return itemDate >= thirtyDaysAgo;
    }).length;
    
    const freshness = recentItems / this.data.raw_data.length;
    score += freshness * 0.3;

    if (freshness < 0.5) {
      issues.push(`数据时效性较差 (${(freshness * 100).toFixed(1)}% 为近期数据)`);
    }

    return {
      score: Math.min(score, 1.0),
      issues: issues,
      completeness: completeness,
      uniqueness: uniqueness,
      freshness: freshness
    };
  }

  async backup(backupPath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.json`);
      
      await fs.writeJson(backupFile, this.data, { spaces: 2 });
      logger.info(`数据库备份完成: ${backupFile}`);
      
      return backupFile;
    } catch (error) {
      logger.error('数据库备份失败:', error);
      throw error;
    }
  }

  async cleanup(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const originalDataCount = this.data.raw_data.length;
      const originalAnalysisCount = this.data.analysis_results.length;
      
      // 清理旧数据
      this.data.raw_data = this.data.raw_data.filter(item => 
        new Date(item.created_at) >= cutoffDate
      );
      
      this.data.analysis_results = this.data.analysis_results.filter(result => 
        new Date(result.created_at) >= cutoffDate
      );
      
      this.data.tasks = this.data.tasks.filter(task => 
        new Date(task.created_at) >= cutoffDate
      );
      
      await this.saveData();
      
      const deletedData = originalDataCount - this.data.raw_data.length;
      const deletedAnalysis = originalAnalysisCount - this.data.analysis_results.length;
      
      logger.info(`清理完成: 删除 ${deletedData} 条原始数据, ${deletedAnalysis} 条分析结果`);
      
      return {
        deletedData,
        deletedAnalysis
      };
    } catch (error) {
      logger.error('清理旧数据失败:', error);
      throw error;
    }
  }

  // 搜索数据
  searchData(query) {
    try {
      const results = this.data.raw_data.filter(item => {
        const searchText = `${item.content} ${item.author} ${item.keyword}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });
      
      return results;
    } catch (error) {
      logger.error('搜索数据失败:', error);
      throw error;
    }
  }

  // 导出数据
  async exportData(format = 'json', filter = {}) {
    try {
      let dataToExport = {
        raw_data: this.data.raw_data,
        analysis_results: this.data.analysis_results,
        tasks: this.data.tasks,
        metadata: this.data.metadata,
        export_info: {
          timestamp: new Date().toISOString(),
          format: format,
          filter: filter
        }
      };
      
      // 应用过滤条件
      if (filter.keyword) {
        dataToExport.raw_data = dataToExport.raw_data.filter(item => 
          item.keyword === filter.keyword
        );
      }
      
      if (filter.platform) {
        dataToExport.raw_data = dataToExport.raw_data.filter(item => 
          item.platform === filter.platform
        );
      }
      
      if (filter.dateFrom) {
        dataToExport.raw_data = dataToExport.raw_data.filter(item => 
          new Date(item.created_at) >= new Date(filter.dateFrom)
        );
      }
      
      if (filter.dateTo) {
        dataToExport.raw_data = dataToExport.raw_data.filter(item => 
          new Date(item.created_at) <= new Date(filter.dateTo)
        );
      }
      
      return dataToExport;
    } catch (error) {
      logger.error('导出数据失败:', error);
      throw error;
    }
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 获取数据库信息
  getInfo() {
    return {
      file: this.dataFile,
      size: this.getFileSize(),
      records: {
        raw_data: this.data.raw_data.length,
        analysis_results: this.data.analysis_results.length,
        tasks: this.data.tasks.length
      },
      metadata: this.data.metadata
    };
  }

  getFileSize() {
    try {
      const stats = fs.statSync(this.dataFile);
      return {
        bytes: stats.size,
        formatted: this.formatBytes(stats.size)
      };
    } catch (error) {
      return { bytes: 0, formatted: '0 B' };
    }
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  close() {
    // JSON数据库不需要显式关闭
    logger.info('数据库连接已关闭');
  }
}

module.exports = SimpleDatabase;