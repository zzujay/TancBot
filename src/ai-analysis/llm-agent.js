/**
 * LLM Agent基类
 * 基于大语言模型的智能Agent
 */

const BaseAgent = require('./base-agent');
const axios = require('axios');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');

/**
 * LLM Agent基类
 * 提供与各种LLM服务交互的基础功能
 */
class LLMAgent extends BaseAgent {
  constructor(name, description, config = {}) {
    super(name, description);
    
    // 确保dotenv已加载
    require('dotenv').config();
    
    // 调试环境变量
    logger.debug(`${name} 环境变量检查:`, {
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      LLM_MODEL: process.env.LLM_MODEL,
      QWEN_API_KEY: process.env.QWEN_API_KEY ? '已设置' : '未设置',
      LLM_API_KEY: process.env.LLM_API_KEY ? '已设置' : '未设置',
      QWEN_BASE_URL: process.env.QWEN_BASE_URL
    });
    
    this.config = {
      provider: config.provider || process.env.LLM_PROVIDER || 'openai',
      model: config.model || process.env.LLM_MODEL || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || parseInt(process.env.LLM_MAX_TOKENS) || 2000,
      temperature: config.temperature || parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
      timeout: config.timeout || parseInt(process.env.LLM_TIMEOUT) || 30000,
      retryAttempts: config.retryAttempts || parseInt(process.env.LLM_RETRY_ATTEMPTS) || 3,
      apiKey: config.apiKey || process.env.QWEN_API_KEY || process.env.LLM_API_KEY || null,
      baseURL: config.baseURL || process.env.QWEN_BASE_URL || process.env.LLM_BASE_URL || null,
      ...config
    };
    
    this.isConfigured = false;
    this.requestStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
  }

  async initialize() {
    await super.initialize();
    await this.configureLLM();
  }

  async configureLLM() {
    // 检查各种可能的API密钥配置，优先检查环境变量
    let apiKey = null;
    
    // 检查Qwen API密钥（用户配置的）
    if (process.env.QWEN_API_KEY) {
      apiKey = process.env.QWEN_API_KEY;
      this.config.provider = 'qwen';
      logger.info(`${this.name} 检测到Qwen API密钥`);
    }
    // 检查通用LLM API密钥
    else if (process.env.LLM_API_KEY) {
      apiKey = process.env.LLM_API_KEY;
      logger.info(`${this.name} 检测到通用LLM API密钥`);
    }
    // 检查配置中的API密钥
    else if (this.config.apiKey) {
      apiKey = this.config.apiKey;
      logger.info(`${this.name} 使用配置中的API密钥`);
    }
    
    if (!apiKey) {
      logger.error(`${this.name} 未配置API密钥，无法使用LLM功能`);
      logger.error(`请在.env文件中设置 QWEN_API_KEY 或 LLM_API_KEY`);
      this.isConfigured = false;
      throw new Error(`${this.name} 未配置API密钥。请在.env文件中设置 QWEN_API_KEY 或 LLM_API_KEY`);
    }
    
    // 更新配置中的API密钥
    this.config.apiKey = apiKey;
    
    // 根据提供商自动配置模型和基础URL - 优先从.env读取
    if (this.config.provider === 'qwen') {
      // 从.env文件读取baseURL，如果没有则使用默认值
      this.config.baseURL = process.env.QWEN_BASE_URL || this.config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      // 从.env文件读取模型，如果没有则使用默认值
      this.config.model = process.env.QWEN_MODEL || process.env.LLM_MODEL || this.config.model || 'qwen-turbo';
      logger.info(`${this.name} 配置为Qwen提供商，模型: ${this.config.model}, BaseURL: ${this.config.baseURL}`);
    } else {
      // 其他提供商也从.env读取配置
      this.config.baseURL = process.env.LLM_BASE_URL || this.config.baseURL;
      this.config.model = process.env.LLM_MODEL || this.config.model;
    }
    
    logger.info(`${this.name} 配置信息: provider=${this.config.provider}, model=${this.config.model}, hasApiKey=${!!this.config.apiKey}`);

    try {
      // 测试API连接
      await this.testAPIConnection();
      this.isConfigured = true;
      logger.info(`${this.name} LLM配置成功，使用 ${this.config.provider} - ${this.config.model}`);
    } catch (error) {
      logger.error(`${this.name} LLM API连接测试失败:`, error.message);
      logger.error(`错误详情: ${error.stack}`);
      this.isConfigured = true; // 仍然标记为已配置，因为API密钥存在，只是连接测试失败
      logger.warn(`${this.name} 将继续使用已配置的API密钥，但API连接可能不稳定`);
      // 不再抛出错误，让系统在运行时处理API调用失败
    }
  }

  async testAPIConnection() {
    const testPrompt = "你好";
    
    try {
      logger.info(`${this.name} 开始API连接测试，提供商: ${this.config.provider}`);
      
      // 临时设置isConfigured为true以便能够调用API
      const originalConfigured = this.isConfigured;
      this.isConfigured = true;
      
      const response = await this.callLLM(testPrompt);
      
      // 恢复原始状态
      this.isConfigured = originalConfigured;
      
      if (response && response.length > 0) {
        logger.info(`${this.name} API连接测试成功，响应长度: ${response.length}`);
      } else {
        throw new Error('API测试响应为空');
      }
    } catch (error) {
      logger.error(`${this.name} API连接测试失败:`, error.message);
      throw new Error(`API连接测试失败: ${error.message}`);
    }
  }

  async callLLM(prompt, systemPrompt = null) {
    if (!this.isConfigured) {
      logger.error(`${this.name} LLM未配置，无法调用API`);
      throw new Error(`${this.name} LLM未配置。请在.env文件中设置 QWEN_API_KEY 或 LLM_API_KEY`);
    }

    const startTime = Date.now();
    let lastError = null;
    
    // 重试机制
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.requestStats.totalRequests++;
        
        let response;
        
        switch (this.config.provider) {
          case 'openai':
            response = await this.callOpenAI(prompt, systemPrompt);
            break;
          case 'claude':
            response = await this.callClaude(prompt, systemPrompt);
            break;
          case 'local':
            response = await this.callLocalLLM(prompt, systemPrompt);
            break;
          case 'qwen':
            response = await this.callQwen(prompt, systemPrompt);
            break;
          default:
            throw new Error(`不支持的LLM提供商: ${this.config.provider}`);
        }
        
        const responseTime = Date.now() - startTime;
        this.updateRequestStats(responseTime, true);
        
        logger.debug(`${this.name} LLM调用成功，耗时: ${responseTime}ms，尝试次数: ${attempt}`);
        return response;
        
      } catch (error) {
        lastError = error;
        const responseTime = Date.now() - startTime;
        this.updateRequestStats(responseTime, false);
        
        logger.warn(`${this.name} LLM调用失败 (尝试 ${attempt}/${this.config.retryAttempts}):`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最大5秒
          logger.info(`${this.name} ${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败
    logger.error(`${this.name} LLM调用最终失败，重试次数: ${this.config.retryAttempts}`);
    await errorHandler.handleError(lastError, { 
      source: 'llm_call', 
      agent: this.name,
      prompt: prompt.substring(0, 100) 
    });
    
    throw new Error(`${this.name} LLM调用失败: ${lastError.message}`);
  }

  async callOpenAI(prompt, systemPrompt = null) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
      this.config.baseURL || 'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    } else {
      throw new Error('OpenAI API响应格式错误');
    }
  }

  async callClaude(prompt, systemPrompt = null) {
    const response = await axios.post(
      this.config.baseURL || 'https://api.anthropic.com/v1/messages',
      {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature,
        ...(systemPrompt && { system: systemPrompt })
      },
      {
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: this.config.timeout
      }
    );

    if (response.data && response.data.content && response.data.content[0]) {
      return response.data.content[0].text.trim();
    } else {
      throw new Error('Claude API响应格式错误');
    }
  }

  async callLocalLLM(prompt, systemPrompt = null) {
    // 本地LLM调用，支持Ollama、LM Studio等
    const response = await axios.post(
      this.config.baseURL || 'http://localhost:11434/api/generate',
      {
        model: this.config.model,
        prompt: systemPrompt ? `${systemPrompt}\n\n用户: ${prompt}\n助手:` : prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      }
    );

    if (response.data && response.data.response) {
      return response.data.response.trim();
    } else {
      throw new Error('本地LLM API响应格式错误');
    }
  }

  async callQwen(prompt, systemPrompt = null) {
    // 千问API调用 - 使用OpenAI兼容模式
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    logger.debug(`${this.name} 调用Qwen API (OpenAI兼容模式)，模型: ${this.config.model}, 消息数: ${messages.length}`);

    try {
      // 使用OpenAI兼容模式的API格式
      const response = await axios.post(
        `${this.config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'}/chat/completions`,
        {
          model: this.config.model || 'qwen-turbo',
          messages: messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      logger.debug(`${this.name} Qwen API响应状态: ${response.status}`);

      // OpenAI兼容模式的响应格式
      if (response.data && response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message.content.trim();
        logger.debug(`${this.name} Qwen API返回内容长度: ${content.length}`);
        return content;
      } else {
        logger.error(`${this.name} Qwen API响应格式错误:`, JSON.stringify(response.data, null, 2));
        throw new Error(`千问API响应格式错误: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
    } catch (error) {
      if (error.response) {
        logger.error(`${this.name} Qwen API HTTP错误:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`千问API HTTP错误 ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        logger.error(`${this.name} Qwen API请求错误:`, error.message);
        throw new Error(`千问API请求失败: ${error.message}`);
      } else {
        logger.error(`${this.name} Qwen API其他错误:`, error.message);
        throw new Error(`千问API错误: ${error.message}`);
      }
    }
  }

  // 模拟响应功能已移除 - 系统要求使用真实LLM API

  updateRequestStats(responseTime, success) {
    if (success) {
      this.requestStats.successfulRequests++;
      const totalTime = this.requestStats.averageResponseTime * (this.requestStats.totalRequests - 1) + responseTime;
      this.requestStats.averageResponseTime = totalTime / this.requestStats.totalRequests;
    } else {
      this.requestStats.failedRequests++;
    }
  }

  getRequestStats() {
    return {
      ...this.requestStats,
      successRate: this.requestStats.totalRequests > 0 ? 
        this.requestStats.successfulRequests / this.requestStats.totalRequests : 0
    };
  }

  getInfo() {
    return {
      ...super.getInfo(),
      config: {
        provider: this.config.provider,
        model: this.config.model,
        isConfigured: this.isConfigured
      },
      requestStats: this.getRequestStats()
    };
  }
}

module.exports = LLMAgent;