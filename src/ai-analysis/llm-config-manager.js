/**
 * LLM配置管理器
 * 支持多源配置加载和优先级管理
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class LLMConfigManager {
  constructor() {
    this.config = null;
    this.initialized = false;
  }

  /**
   * 获取配置管理器单例
   */
  static getInstance() {
    if (!LLMConfigManager.instance) {
      LLMConfigManager.instance = new LLMConfigManager();
    }
    return LLMConfigManager.instance;
  }

  /**
   * 初始化配置管理器
   */
  async initialize() {
    if (this.initialized) {
      return this.config;
    }

    console.log('🔄 正在初始化LLM配置管理器...');

    // 1. 加载默认配置
    this.config = this.getDefaultConfig();

    // 2. 加载.env文件配置
    await this.loadConfigFile();

    // 3. 加载环境变量（最高优先级）
    this.loadEnvironmentVariables();

    // 4. 验证配置
    this.validateConfiguration();

    this.initialized = true;
    console.log('✅ LLM配置管理器初始化完成');
    
    return this.config;
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      // 基础配置
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'gpt-3.5-turbo',
      LLM_MAX_TOKENS: 2048,
      LLM_TEMPERATURE: 0.7,
      LLM_TIMEOUT: 30000,
      
      // OpenAI配置
      OPENAI_API_KEY: '',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_ORGANIZATION: '',
      
      // Claude配置
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
      ANTHROPIC_VERSION: '2023-06-01',
      
      // 本地模型配置
      LOCAL_LLM_URL: 'http://localhost:11434/api/generate',
      LOCAL_LLM_TIMEOUT: 30000,
      
      // 千问配置
      QWEN_API_KEY: '',
      QWEN_BASE_URL: 'https://dashscope.aliyuncs.com/api/v1',
      QWEN_API_VERSION: '2023-12-01',
      
      // Kimi配置
      KIMI_API_KEY: '',
      KIMI_BASE_URL: 'https://api.moonshot.cn/v1',
      
      // 文心一言配置
      WENXIN_API_KEY: '',
      WENXIN_SECRET_KEY: '',
      WENXIN_BASE_URL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
      
      // 星火配置
      SPARK_APP_ID: '',
      SPARK_API_KEY: '',
      SPARK_API_SECRET: '',
      SPARK_BASE_URL: 'wss://spark-api.xf-yun.com/v3.5/chat',
      
      // 智谱GLM配置
      ZHIPU_API_KEY: '',
      ZHIPU_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',
      
      // 分析配置
      ANALYSIS_MAX_WORKERS: 3,
      ANALYSIS_BATCH_SIZE: 10,
      ANALYSIS_RETRY_ATTEMPTS: 3,
      ANALYSIS_RETRY_DELAY: 1000,
      
      // 缓存配置
      CACHE_ENABLED: true,
      CACHE_TTL: 3600000, // 1小时
      
      // 日志配置
      LOG_LEVEL: 'info',
      LOG_LLM_REQUESTS: false,
      
      // 性能配置
      MAX_CONCURRENT_REQUESTS: 5,
      REQUEST_TIMEOUT: 30000,
      
      // 安全配置
      MAX_INPUT_LENGTH: 10000,
      RATE_LIMIT_PER_MINUTE: 60,
      
      // 监控配置
      ENABLE_METRICS: true,
      METRICS_PORT: 9090
    };
  }

  /**
   * 加载配置文件
   */
  async loadConfigFile() {
    const configFiles = ['.env.local', '.env'];
    
    for (const file of configFiles) {
      const filePath = path.join(process.cwd(), file);
      
      if (fs.existsSync(filePath)) {
        console.log(`📁 正在加载配置文件: ${file}`);
        
        try {
          const envConfig = dotenv.parse(fs.readFileSync(filePath));
          
          // 合并配置（后面的文件优先级更高）
          Object.assign(this.config, envConfig);
          
          console.log(`✅ 配置文件 ${file} 加载成功`);
        } catch (error) {
          console.warn(`⚠️  加载配置文件 ${file} 失败:`, error.message);
        }
      }
    }
  }

  /**
   * 加载环境变量（最高优先级）
   */
  loadEnvironmentVariables() {
    console.log('🔧 正在加载环境变量...');
    
    // 定义环境变量映射
    const envMappings = {
      // 基础配置
      LLM_PROVIDER: 'LLM_PROVIDER',
      LLM_MODEL: 'LLM_MODEL',
      LLM_MAX_TOKENS: 'LLM_MAX_TOKENS',
      LLM_TEMPERATURE: 'LLM_TEMPERATURE',
      LLM_TIMEOUT: 'LLM_TIMEOUT',
      
      // OpenAI配置
      OPENAI_API_KEY: 'OPENAI_API_KEY',
      OPENAI_BASE_URL: 'OPENAI_BASE_URL',
      OPENAI_ORGANIZATION: 'OPENAI_ORGANIZATION',
      
      // Claude配置
      ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
      ANTHROPIC_BASE_URL: 'ANTHROPIC_BASE_URL',
      ANTHROPIC_VERSION: 'ANTHROPIC_VERSION',
      
      // 本地模型配置
      LOCAL_LLM_URL: 'LOCAL_LLM_URL',
      LOCAL_LLM_TIMEOUT: 'LOCAL_LLM_TIMEOUT',
      
      // 千问配置
      QWEN_API_KEY: 'QWEN_API_KEY',
      QWEN_BASE_URL: 'QWEN_BASE_URL',
      QWEN_API_VERSION: 'QWEN_API_VERSION',
      
      // Kimi配置
      KIMI_API_KEY: 'KIMI_API_KEY',
      KIMI_BASE_URL: 'KIMI_BASE_URL',
      
      // 文心一言配置
      WENXIN_API_KEY: 'WENXIN_API_KEY',
      WENXIN_SECRET_KEY: 'WENXIN_SECRET_KEY',
      WENXIN_BASE_URL: 'WENXIN_BASE_URL',
      
      // 星火配置
      SPARK_APP_ID: 'SPARK_APP_ID',
      SPARK_API_KEY: 'SPARK_API_KEY',
      SPARK_API_SECRET: 'SPARK_API_SECRET',
      SPARK_BASE_URL: 'SPARK_BASE_URL',
      
      // 智谱GLM配置
      ZHIPU_API_KEY: 'ZHIPU_API_KEY',
      ZHIPU_BASE_URL: 'ZHIPU_BASE_URL',
      
      // 分析配置
      ANALYSIS_MAX_WORKERS: 'ANALYSIS_MAX_WORKERS',
      ANALYSIS_BATCH_SIZE: 'ANALYSIS_BATCH_SIZE',
      ANALYSIS_RETRY_ATTEMPTS: 'ANALYSIS_RETRY_ATTEMPTS',
      ANALYSIS_RETRY_DELAY: 'ANALYSIS_RETRY_DELAY',
      
      // 缓存配置
      CACHE_ENABLED: 'CACHE_ENABLED',
      CACHE_TTL: 'CACHE_TTL',
      
      // 日志配置
      LOG_LEVEL: 'LOG_LEVEL',
      LOG_LLM_REQUESTS: 'LOG_LLM_REQUESTS',
      
      // 性能配置
      MAX_CONCURRENT_REQUESTS: 'MAX_CONCURRENT_REQUESTS',
      REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
      
      // 安全配置
      MAX_INPUT_LENGTH: 'MAX_INPUT_LENGTH',
      RATE_LIMIT_PER_MINUTE: 'RATE_LIMIT_PER_MINUTE',
      
      // 监控配置
      ENABLE_METRICS: 'ENABLE_METRICS',
      METRICS_PORT: 'METRICS_PORT'
    };

    // 加载环境变量
    Object.keys(envMappings).forEach(configKey => {
      const envKey = envMappings[configKey];
      if (process.env[envKey] !== undefined) {
        // 类型转换
        let value = process.env[envKey];
        
        // 布尔值转换
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        // 数字转换
        else if (!isNaN(value) && value !== '') value = Number(value);
        
        this.config[configKey] = value;
        console.log(`✅ 环境变量 ${envKey} 已加载`);
      }
    });
  }

  /**
   * 验证配置
   */
  validateConfiguration() {
    console.log('🔍 正在验证配置...');
    
    const errors = [];
    const warnings = [];

    // 验证基础配置
    if (!this.config.LLM_PROVIDER) {
      errors.push('LLM_PROVIDER 未配置');
    }

    if (!this.config.LLM_MODEL) {
      errors.push('LLM_MODEL 未配置');
    }

    // 验证提供商特定配置
    switch (this.config.LLM_PROVIDER) {
      case 'openai':
        if (!this.config.OPENAI_API_KEY) {
          errors.push('OpenAI API密钥未配置 (OPENAI_API_KEY)');
        }
        break;
        
      case 'claude':
        if (!this.config.ANTHROPIC_API_KEY) {
          errors.push('Claude API密钥未配置 (ANTHROPIC_API_KEY)');
        }
        break;
        
      case 'local':
        if (!this.config.LOCAL_LLM_URL) {
          warnings.push('本地LLM URL未配置，将使用默认值');
        }
        break;
        
      case 'qwen':
        if (!this.config.QWEN_API_KEY) {
          errors.push('千问API密钥未配置 (QWEN_API_KEY)');
        }
        break;
        
      case 'kimi':
        if (!this.config.KIMI_API_KEY) {
          errors.push('Kimi API密钥未配置 (KIMI_API_KEY)');
        }
        break;
        
      case 'wenxin':
        if (!this.config.WENXIN_API_KEY || !this.config.WENXIN_SECRET_KEY) {
          errors.push('文心一言API密钥未配置 (WENXIN_API_KEY 或 WENXIN_SECRET_KEY)');
        }
        break;
        
      case 'zhipu':
        if (!this.config.ZHIPU_API_KEY) {
          errors.push('智谱GLM API密钥未配置 (ZHIPU_API_KEY)');
        }
        break;
        
      default:
        warnings.push(`未知的LLM提供商: ${this.config.LLM_PROVIDER}`);
    }

    // 验证数值配置
    if (this.config.LLM_MAX_TOKENS < 1 || this.config.LLM_MAX_TOKENS > 128000) {
      warnings.push(`LLM_MAX_TOKENS 值 ${this.config.LLM_MAX_TOKENS} 超出合理范围`);
    }

    if (this.config.LLM_TEMPERATURE < 0 || this.config.LLM_TEMPERATURE > 2) {
      warnings.push(`LLM_TEMPERATURE 值 ${this.config.LLM_TEMPERATURE} 超出合理范围 (0-2)`);
    }

    // 输出验证结果
    if (errors.length > 0) {
      console.error('❌ 配置验证失败:');
      errors.forEach(error => console.error(`   - ${error}`));
      throw new Error(`配置验证失败: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      console.warn('⚠️  配置警告:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    console.log('✅ 配置验证通过');
  }

  /**
   * 获取配置
   */
  getConfig() {
    if (!this.initialized) {
      throw new Error('配置管理器未初始化，请先调用 initialize() 方法');
    }
    
    return { ...this.config };
  }

  /**
   * 获取特定配置项
   */
  get(key) {
    if (!this.initialized) {
      throw new Error('配置管理器未初始化，请先调用 initialize() 方法');
    }
    
    return this.config[key];
  }

  /**
   * 更新配置（运行时）
   */
  set(key, value) {
    if (!this.initialized) {
      throw new Error('配置管理器未初始化，请先调用 initialize() 方法');
    }
    
    this.config[key] = value;
    console.log(`📝 配置已更新: ${key} = ${this.maskSensitiveValue(key, value)}`);
  }

  /**
   * 获取当前使用的LLM配置
   */
  getLLMConfig() {
    const config = this.getConfig();
    
    switch (config.LLM_PROVIDER) {
      case 'openai':
        return {
          provider: 'openai',
          model: config.LLM_MODEL,
          apiKey: config.OPENAI_API_KEY,
          baseURL: config.OPENAI_BASE_URL,
          organization: config.OPENAI_ORGANIZATION,
          maxTokens: config.LLM_MAX_TOKENS,
          temperature: config.LLM_TEMPERATURE,
          timeout: config.LLM_TIMEOUT
        };
        
      case 'claude':
        return {
          provider: 'claude',
          model: config.LLM_MODEL,
          apiKey: config.ANTHROPIC_API_KEY,
          baseURL: config.ANTHROPIC_BASE_URL,
          version: config.ANTHROPIC_VERSION,
          maxTokens: config.LLM_MAX_TOKENS,
          temperature: config.LLM_TEMPERATURE,
          timeout: config.LLM_TIMEOUT
        };
        
      case 'local':
        return {
          provider: 'local',
          model: config.LLM_MODEL,
          url: config.LOCAL_LLM_URL,
          timeout: config.LOCAL_LLM_TIMEOUT,
          maxTokens: config.LLM_MAX_TOKENS,
          temperature: config.LLM_TEMPERATURE
        };
        
      case 'qwen':
        return {
          provider: 'qwen',
          model: config.LLM_MODEL,
          apiKey: config.QWEN_API_KEY,
          baseURL: config.QWEN_BASE_URL,
          version: config.QWEN_API_VERSION,
          maxTokens: config.LLM_MAX_TOKENS,
          temperature: config.LLM_TEMPERATURE,
          timeout: config.LLM_TIMEOUT
        };
        
      case 'kimi':
        return {
          provider: 'kimi',
          model: config.LLM_MODEL,
          apiKey: config.KIMI_API_KEY,
          baseURL: config.KIMI_BASE_URL,
          maxTokens: config.LLM_MAX_TOKENS,
          temperature: config.LLM_TEMPERATURE,
          timeout: config.LLM_TIMEOUT
        };
        
      case 'wenxin':
        return {
          provider: 'wenxin',
          model: config.LLM_MODEL,
          apiKey: config.WENXIN_API_KEY,
          secretKey: config.WENXIN_SECRET_KEY,
          baseURL: config.WENXIN_BASE_URL,
          maxTokens: config.LLM_MAX_TOKENS,
          temperature: config.LLM_TEMPERATURE,
          timeout: config.LLM_TIMEOUT
        };
        
      case 'zhipu':
        return {
          provider: 'zhipu',
          model: config.LLM_MODEL,
          apiKey: config.ZHIPU_API_KEY,
          baseURL: config.ZHIPU_BASE_URL,
          maxTokens: config.LLM_MAX_TOKENS,
          temperature: config.LLM_TEMPERATURE,
          timeout: config.LLM_TIMEOUT
        };
        
      default:
        throw new Error(`不支持的LLM提供商: ${config.LLM_PROVIDER}`);
    }
  }

  /**
   * 敏感信息掩码
   */
  maskSensitiveValue(key, value) {
    const sensitiveKeys = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'];
    
    if (sensitiveKeys.some(sk => key.includes(sk))) {
      if (typeof value === 'string' && value.length > 8) {
        return value.substring(0, 4) + '****' + value.substring(value.length - 4);
      }
      return '****';
    }
    
    return value;
  }

  /**
   * 获取配置摘要（安全版本）
   */
  getConfigSummary() {
    if (!this.initialized) {
      throw new Error('配置管理器未初始化');
    }

    const safeConfig = {};
    Object.keys(this.config).forEach(key => {
      safeConfig[key] = this.maskSensitiveValue(key, this.config[key]);
    });

    return {
      provider: safeConfig.LLM_PROVIDER,
      model: safeConfig.LLM_MODEL,
      config: safeConfig,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置配置
   */
  reset() {
    this.config = null;
    this.initialized = false;
    console.log('🔄 配置管理器已重置');
  }
}

module.exports = LLMConfigManager;