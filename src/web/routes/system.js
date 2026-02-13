const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// 系统状态监控
router.get('/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      cwd: process.cwd()
    };

    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统配置管理
router.get('/config', async (req, res) => {
  try {
    const configPath = path.join(process.cwd(), 'config', 'system.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    res.json({ success: true, data: config });
  } catch (error) {
    // 如果配置文件不存在，返回默认配置
    const defaultConfig = {
      system: {
        name: '舆情研判系统V2',
        version: '2.0.0',
        environment: 'development',
        debug: true
      },
      dataCollection: {
        maxResults: 1000,
        requestDelay: 1000,
        retryAttempts: 3,
        proxyEnabled: false
      },
      aiAnalysis: {
        sentimentThreshold: 0.3,
        riskThreshold: 0.7,
        confidenceLevel: 0.8,
        modelType: 'advanced'
      },
      monitoring: {
        enabled: true,
        checkInterval: 60000,
        alertThreshold: 0.8,
        autoRestart: true
      }
    };
    
    res.json({ success: true, data: defaultConfig });
  }
});

// 更新系统配置
router.post('/config', async (req, res) => {
  try {
    const configPath = path.join(process.cwd(), 'config', 'system.json');
    const configData = JSON.stringify(req.body, null, 2);
    
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, configData, 'utf8');
    
    res.json({ success: true, message: '配置更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统日志管理
router.get('/logs', async (req, res) => {
  try {
    const { level = 'info', limit = 100, startDate, endDate } = req.query;
    const logsPath = path.join(process.cwd(), 'logs');
    
    await fs.mkdir(logsPath, { recursive: true });
    
    const logFiles = await fs.readdir(logsPath);
    const logs = [];
    
    for (const file of logFiles) {
      if (file.endsWith('.log')) {
        const filePath = path.join(logsPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            
            // 过滤日志级别
            if (level !== 'all' && logEntry.level !== level) {
              continue;
            }
            
            // 过滤日期范围
            if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) {
              continue;
            }
            if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) {
              continue;
            }
            
            logs.push(logEntry);
          } catch (e) {
            // 解析失败，跳过该行
            continue;
          }
        }
      }
    }
    
    // 按时间排序并限制数量
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedLogs = logs.slice(0, parseInt(limit));
    
    res.json({ success: true, data: limitedLogs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统健康检查
router.get('/health', async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        memory: checkMemoryHealth(),
        disk: await checkDiskHealth(),
        network: checkNetworkHealth(),
        database: await checkDatabaseHealth()
      }
    };
    
    // 如果任何检查失败，状态设为unhealthy
    const failedChecks = Object.values(health.checks).filter(check => !check.healthy);
    if (failedChecks.length > 0) {
      health.status = 'unhealthy';
    }
    
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统重启
router.post('/restart', async (req, res) => {
  try {
    const { delay = 5 } = req.body; // 默认5秒后重启
    
    res.json({ 
      success: true, 
      message: `系统将在${delay}秒后重启`,
      data: { restartTime: new Date(Date.now() + delay * 1000).toISOString() }
    });
    
    // 延迟重启
    setTimeout(() => {
      console.log('正在重启系统...');
      process.exit(0); // 退出进程，由进程管理器重启
    }, delay * 1000);
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统备份
router.post('/backup', async (req, res) => {
  try {
    const { includeData = true, includeConfig = true, includeLogs = false } = req.body;
    const backupId = `backup_${Date.now()}`;
    const backupPath = path.join(process.cwd(), 'backups', backupId);
    
    await fs.mkdir(backupPath, { recursive: true });
    
    const backupInfo = {
      id: backupId,
      timestamp: new Date().toISOString(),
      components: []
    };
    
    // 备份数据
    if (includeData) {
      const dataPath = path.join(process.cwd(), 'data');
      const backupDataPath = path.join(backupPath, 'data');
      await copyDirectory(dataPath, backupDataPath);
      backupInfo.components.push('data');
    }
    
    // 备份配置
    if (includeConfig) {
      const configPath = path.join(process.cwd(), 'config');
      const backupConfigPath = path.join(backupPath, 'config');
      await copyDirectory(configPath, backupConfigPath);
      backupInfo.components.push('config');
    }
    
    // 备份日志
    if (includeLogs) {
      const logsPath = path.join(process.cwd(), 'logs');
      const backupLogsPath = path.join(backupPath, 'logs');
      await copyDirectory(logsPath, backupLogsPath);
      backupInfo.components.push('logs');
    }
    
    // 保存备份信息
    const backupInfoPath = path.join(backupPath, 'backup-info.json');
    await fs.writeFile(backupInfoPath, JSON.stringify(backupInfo, null, 2));
    
    res.json({ 
      success: true, 
      message: '备份创建成功',
      data: backupInfo
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取备份列表
router.get('/backups', async (req, res) => {
  try {
    const backupsPath = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupsPath, { recursive: true });
    
    const backupDirs = await fs.readdir(backupsPath);
    const backups = [];
    
    for (const dir of backupDirs) {
      const backupInfoPath = path.join(backupsPath, dir, 'backup-info.json');
      try {
        const backupInfoData = await fs.readFile(backupInfoPath, 'utf8');
        const backupInfo = JSON.parse(backupInfoData);
        backups.push(backupInfo);
      } catch (e) {
        // 跳过无效的备份目录
        continue;
      }
    }
    
    // 按时间排序
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ success: true, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      dataCollection: {
        totalRecords: await getTotalRecords(),
        todayRecords: await getTodayRecords(),
        activeSources: await getActiveSources()
      },
      aiAnalysis: {
        totalAnalyses: await getTotalAnalyses(),
        averageConfidence: await getAverageConfidence(),
        successRate: await getAnalysisSuccessRate()
      },
      systemUsage: {
        apiCalls: await getApiCallCount(),
        activeUsers: await getActiveUsers(),
        uptime: process.uptime()
      }
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 辅助函数
function checkMemoryHealth() {
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.rss;
  const usedMem = memUsage.heapUsed;
  const memPercent = (usedMem / totalMem) * 100;
  
  return {
    healthy: memPercent < 90,
    percent: memPercent,
    details: memUsage
  };
}

async function checkDiskHealth() {
  try {
    const stats = await fs.stat(process.cwd());
    return {
      healthy: true,
      details: stats
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

function checkNetworkHealth() {
  // 简单的网络检查，实际项目中可以更复杂
  return {
    healthy: true,
    timestamp: new Date().toISOString()
  };
}

async function checkDatabaseHealth() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'opinions.json');
    await fs.access(dataPath);
    return {
      healthy: true,
      path: dataPath
    };
  } catch (error) {
    return {
      healthy: false,
      error: '数据库文件不可访问'
    };
  }
}

async function copyDirectory(src, dest) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    // 如果源目录不存在，忽略错误
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

// 模拟统计函数
async function getTotalRecords() {
  return Math.floor(Math.random() * 10000) + 5000;
}

async function getTodayRecords() {
  return Math.floor(Math.random() * 1000) + 200;
}

async function getActiveSources() {
  return ['微博', '知乎', '百度贴吧', '今日头条'];
}

async function getTotalAnalyses() {
  return Math.floor(Math.random() * 5000) + 2000;
}

async function getAverageConfidence() {
  return (Math.random() * 0.3 + 0.7).toFixed(3);
}

async function getAnalysisSuccessRate() {
  return (Math.random() * 0.1 + 0.85).toFixed(3);
}

async function getApiCallCount() {
  return Math.floor(Math.random() * 1000) + 500;
}

async function getActiveUsers() {
  return Math.floor(Math.random() * 50) + 10;
}

module.exports = router;