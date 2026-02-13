/**
 * 配置管理模块
 * 统一管理所有配置项，支持环境变量、配置文件等多种配置源
 */

const path = require('path');
const fs = require('fs-extra');

class ConfigManager {
  constructor() {
    this.config = {};
    this.configFilePath = path.join(process.cwd(), 'config', 'system.json');
    this.loadConfig();
  }

  loadConfig() {
    // 加载环境变量
    this.loadEnvironmentVariables();
    
    // 加载配置文件
    this.loadConfigFile();
    
    // 设置默认值
    this.setDefaultValues();
  }

  loadEnvironmentVariables() {
    const envVars = {
      // 数据库配置
      DB_PATH: process.env.DB_PATH || './data/opinion.db',
      DB_TYPE: process.env.DB_TYPE || 'json', // json, sqlite, postgresql
      
      // 日志配置
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      LOG_FILE: process.env.LOG_FILE || './logs/system.log',
      LOG_FORMAT: process.env.LOG_FORMAT || 'json',
      
      // 数据采集配置
      WEIBO_COOKIE: process.env.WEIBO_COOKIE || '',
      COLLECTION_INTERVAL: parseInt(process.env.COLLECTION_INTERVAL) || 30,
      MAX_KEYWORDS: parseInt(process.env.MAX_KEYWORDS) || 10,
      MAX_RESULTS: parseInt(process.env.MAX_RESULTS) || 100,
      
      // AI分析配置
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      ANALYSIS_MODEL: process.env.ANALYSIS_MODEL || 'gpt-3.5-turbo',
      MAX_ANALYSIS_TOKENS: parseInt(process.env.MAX_ANALYSIS_TOKENS) || 2000,
      CONFIDENCE_THRESHOLD: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7,
      MAX_ITERATIONS: parseInt(process.env.MAX_ITERATIONS) || 3,
      
      // 系统配置
      MAX_CONCURRENT_TASKS: parseInt(process.env.MAX_CONCURRENT_TASKS) || 5,
      CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600,
      
      // 代理配置
      PROXY_HOST: process.env.PROXY_HOST || '',
      PROXY_PORT: parseInt(process.env.PROXY_PORT) || 0,
      PROXY_USERNAME: process.env.PROXY_USERNAME || '',
      PROXY_PASSWORD: process.env.PROXY_PASSWORD || '',
      
      // 安全配置
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
      JWT_SECRET: process.env.JWT_SECRET || '',
      API_RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT) || 1000,
      
      // 性能配置
      ENABLE_CLUSTERING: process.env.ENABLE_CLUSTERING === 'true',
      WORKER_PROCESSES: parseInt(process.env.WORKER_PROCESSES) || 4,
      MEMORY_LIMIT: process.env.MEMORY_LIMIT || '512MB',
      
      // 监控配置
      ENABLE_MONITORING: process.env.ENABLE_MONITORING === 'true',
      METRICS_PORT: parseInt(process.env.METRICS_PORT) || 9090,
      HEALTH_CHECK_PORT: parseInt(process.env.HEALTH_CHECK_PORT) || 8080
    };

    this.config = { ...this.config, ...envVars };
  }

  loadConfigFile() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const fileConfig = fs.readJsonSync(this.configFilePath);
        this.config = { ...this.config, ...fileConfig };
      }
    } catch (error) {
      console.warn('配置文件加载失败，使用默认配置:', error.message);
    }
  }

  setDefaultValues() {
    const defaults = {
      // 数据库默认配置
      database: {
        type: this.config.DB_TYPE,
        path: this.config.DB_PATH,
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'opinion_system',
          username: 'postgres',
          password: '',
          ssl: false,
          pool: {
            min: 2,
            max: 10
          }
        }
      },
      
      // 日志默认配置
      logging: {
        level: this.config.LOG_LEVEL,
        file: this.config.LOG_FILE,
        format: this.config.LOG_FORMAT,
        console: true,
        rotation: {
          enabled: true,
          maxSize: '10MB',
          maxFiles: 5
        }
      },
      
      // 数据采集默认配置
      collection: {
        weibo: {
          cookie: this.config.WEIBO_COOKIE,
          enabled: !!this.config.WEIBO_COOKIE
        },
        platforms: ['weibo'], // 可扩展支持多个平台
        interval: this.config.COLLECTION_INTERVAL,
        maxKeywords: this.config.MAX_KEYWORDS,
        maxResults: this.config.MAX_RESULTS,
        rateLimit: {
          requests: 100,
          window: '1h'
        },
        retry: {
          attempts: 3,
          delay: 1000
        }
      },
      
      // AI分析默认配置
      ai: {
        openai: {
          apiKey: this.config.OPENAI_API_KEY,
          model: this.config.ANALYSIS_MODEL,
          maxTokens: this.config.MAX_ANALYSIS_TOKENS
        },
        confidenceThreshold: this.config.CONFIDENCE_THRESHOLD,
        maxIterations: this.config.MAX_ITERATIONS,
        agents: {
          sentiment: {
            enabled: true,
            model: 'sentiment-bert',
            confidence: 0.8
          },
          topic: {
            enabled: true,
            model: 'topic-lda',
            minTopics: 3,
            maxTopics: 20
          },
          risk: {
            enabled: true,
            model: 'risk-nn',
            sensitivity: 'medium'
          }
        }
      },
      
      // 系统默认配置
      system: {
        maxConcurrentTasks: this.config.MAX_CONCURRENT_TASKS,
        cacheTTL: this.config.CACHE_TTL,
        clustering: this.config.ENABLE_CLUSTERING,
        workers: this.config.WORKER_PROCESSES,
        memoryLimit: this.config.MEMORY_LIMIT
      },
      
      // 代理默认配置
      proxy: {
        enabled: !!this.config.PROXY_HOST,
        host: this.config.PROXY_HOST,
        port: this.config.PROXY_PORT,
        auth: {
          username: this.config.PROXY_USERNAME,
          password: this.config.PROXY_PASSWORD
        }
      },
      
      // 安全默认配置
      security: {
        encryption: {
          enabled: !!this.config.ENCRYPTION_KEY,
          key: this.config.ENCRYPTION_KEY,
          algorithm: 'aes-256-gcm'
        },
        jwt: {
          secret: this.config.JWT_SECRET,
          expiresIn: '24h'
        },
        rateLimit: this.config.API_RATE_LIMIT,
        cors: {
          enabled: true,
          origins: ['*'],
          methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
      },
      
      // 监控默认配置
      monitoring: {
        enabled: this.config.ENABLE_MONITORING,
        metricsPort: this.config.METRICS_PORT,
        healthCheckPort: this.config.HEALTH_CHECK_PORT,
        endpoints: {
          metrics: '/metrics',
          health: '/health',
          ready: '/ready'
        }
      }
    };

    this.config = { ...defaults, ...this.config };
  }

  // 获取配置
  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  // 设置配置
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    target[lastKey] = value;
  }

  // 验证配置
  validate() {
    const errors = [];
    
    // 验证必要配置
    if (!this.get('collection.weibo.cookie') && this.get('collection.weibo.enabled')) {
      errors.push('微博Cookie未配置，数据采集功能将受限');
    }
    
    if (!this.get('ai.openai.apiKey')) {
      errors.push('OpenAI API密钥未配置，AI分析功能将受限');
    }
    
    // 验证数值范围
    if (this.get('ai.confidenceThreshold') < 0 || this.get('ai.confidenceThreshold') > 1) {
      errors.push('置信度阈值必须在0-1之间');
    }
    
    if (this.get('system.maxConcurrentTasks') < 1 || this.get('system.maxConcurrentTasks') > 100) {
      errors.push('并发任务数必须在1-100之间');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // 保存配置到文件
  async saveToFile(filePath = null) {
    const targetPath = filePath || this.configFilePath;
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeJson(targetPath, this.config, { spaces: 2 });
  }

  // 获取配置摘要
  getSummary() {
    return {
      database: this.get('database.type'),
      platforms: this.get('collection.platforms'),
      ai_enabled: this.get('ai.openai.apiKey') ? true : false,
      clustering: this.get('system.clustering'),
      monitoring: this.get('monitoring.enabled'),
      proxy_enabled: this.get('proxy.enabled'),
      security_enabled: this.get('security.encryption.enabled')
    };
  }

  // 环境配置检查
  checkEnvironment() {
    const requirements = {
      node: '>=16.0.0',
      npm: '>=7.0.0',
      memory: '2GB',
      disk: '10GB'
    };
    
    const results = {
      node: this.checkNodeVersion(),
      npm: this.checkNpmVersion(),
      memory: this.checkMemory(),
      disk: this.checkDiskSpace()
    };
    
    return {
      passed: Object.values(results).every(check => check.passed),
      checks: results,
      requirements: requirements
    };
  }

  checkNodeVersion() {
    const current = process.version;
    const required = '16.0.0';
    const passed = this.compareVersions(current, required) >= 0;
    
    return {
      passed,
      current,
      required,
      message: passed ? 'Node.js版本符合要求' : 'Node.js版本过低，请升级'
    };
  }

  checkNpmVersion() {
    try {
      const npmVersion = require('child_process').execSync('npm --version').toString().trim();
      const required = '7.0.0';
      const passed = this.compareVersions(npmVersion, required) >= 0;
      
      return {
        passed,
        current: npmVersion,
        required,
        message: passed ? 'npm版本符合要求' : 'npm版本过低，请升级'
      };
    } catch (error) {
      return {
        passed: false,
        current: 'unknown',
        required: '7.0.0',
        message: '无法检测npm版本'
      };
    }
  }

  checkMemory() {
    const totalMemory = require('os').totalmem();
    const requiredMemory = 2 * 1024 * 1024 * 1024; // 2GB
    const passed = totalMemory >= requiredMemory;
    
    return {
      passed,
      current: `${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)}GB`,
      required: '2GB',
      message: passed ? '内存符合要求' : '内存不足，建议至少2GB'
    };
  }

  checkDiskSpace() {
    try {
      const stats = require('fs').statSync(process.cwd());
      // 这里应该使用更准确的磁盘空间检测
      return {
        passed: true,
        current: 'unknown',
        required: '10GB',
        message: '磁盘空间检查需要更详细的实现'
      };
    } catch (error) {
      return {
        passed: false,
        current: 'unknown',
        required: '10GB',
        message: '磁盘空间检测失败'
      };
    }
  }

  compareVersions(version1, version2) {
    const v1 = version1.replace(/^v/, '').split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const a = v1[i] || 0;
      const b = v2[i] || 0;
      
      if (a > b) return 1;
      if (a < b) return -1;
    }
    
    return 0;
  }
}

module.exports = new ConfigManager();