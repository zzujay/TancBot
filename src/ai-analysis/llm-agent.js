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
    this.config = {
      provider: config.provider || 'openai', // openai, claude, local
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.7,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      apiKey: config.apiKey || process.env.LLM_API_KEY,
      baseURL: config.baseURL || null,
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
    if (!this.config.apiKey) {
      logger.warn(`${this.name} 未配置API密钥，将使用模拟模式`);
      this.isConfigured = false;
      return;
    }

    try {
      // 测试API连接
      await this.testAPIConnection();
      this.isConfigured = true;
      logger.info(`${this.name} LLM配置成功，使用 ${this.config.provider} - ${this.config.model}`);
    } catch (error) {
      logger.error(`${this.name} LLM配置失败:`, error.message);
      this.isConfigured = false;
      await errorHandler.handleError(error, { source: 'llm_configuration', agent: this.name });
    }
  }

  async testAPIConnection() {
    const testPrompt = "你好，这是一个测试消息。请回复'测试成功'。";
    
    try {
      const response = await this.callLLM(testPrompt);
      if (response && response.includes('测试成功')) {
        logger.info(`${this.name} API连接测试成功`);
      } else {
        throw new Error('API测试响应不符合预期');
      }
    } catch (error) {
      throw new Error(`API连接测试失败: ${error.message}`);
    }
  }

  async callLLM(prompt, systemPrompt = null) {
    if (!this.isConfigured) {
      logger.warn(`${this.name} 未配置LLM，使用模拟响应`);
      return this.generateSimulatedResponse(prompt, systemPrompt);
    }

    const startTime = Date.now();
    
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
        default:
          throw new Error(`不支持的LLM提供商: ${this.config.provider}`);
      }
      
      const responseTime = Date.now() - startTime;
      this.updateRequestStats(responseTime, true);
      
      logger.debug(`${this.name} LLM调用成功，耗时: ${responseTime}ms`);
      return response;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateRequestStats(responseTime, false);
      
      logger.error(`${this.name} LLM调用失败:`, error.message);
      await errorHandler.handleError(error, { 
        source: 'llm_call', 
        agent: this.name,
        prompt: prompt.substring(0, 100) 
      });
      
      // 失败时使用模拟响应
      return this.generateSimulatedResponse(prompt, systemPrompt);
    }
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

  generateSimulatedResponse(prompt, systemPrompt = null) {
    // 生成模拟响应，用于测试或未配置LLM的情况
    logger.debug(`${this.name} 生成模拟响应`);
    
    // 基于提示内容生成合理的模拟响应
    if (prompt.includes('情感') || prompt.includes('sentiment')) {
      return this.generateSimulatedSentimentResponse(prompt);
    } else if (prompt.includes('主题') || prompt.includes('topic')) {
      return this.generateSimulatedTopicResponse(prompt);
    } else if (prompt.includes('风险') || prompt.includes('risk')) {
      return this.generateSimulatedRiskResponse(prompt);
    } else {
      return this.generateGenericSimulatedResponse(prompt);
    }
  }

  generateSimulatedSentimentResponse(prompt) {
    const sentiments = ['positive', 'negative', 'neutral'];
    const emotions = {
      positive: ['开心', '满意', '兴奋', '感激'],
      negative: ['失望', '愤怒', '担忧', '沮丧'],
      neutral: ['平静', '客观', '理性', '中立']
    };
    
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const score = sentiment === 'positive' ? Math.random() * 0.5 + 0.5 : 
                  sentiment === 'negative' ? Math.random() * -0.5 - 0.5 : 
                  (Math.random() - 0.5) * 0.3;
    
    return JSON.stringify({
      sentiment: sentiment,
      score: score,
      confidence: Math.random() * 0.3 + 0.7,
      emotions: emotions[sentiment],
      aspects: ['产品质量', '服务态度', '价格合理性'],
      keywords: ['满意', '推荐', '体验']
    });
  }

  generateSimulatedTopicResponse(prompt) {
    const topics = [
      { name: '产品质量', weight: 0.25 },
      { name: '用户体验', weight: 0.20 },
      { name: '价格价值', weight: 0.18 },
      { name: '客户服务', weight: 0.15 },
      { name: '外观设计', weight: 0.12 }
    ];
    
    return JSON.stringify({
      topics: topics,
      keywords: ['产品', '质量', '用户', '体验', '价格', '服务'],
      themes: ['消费者关注产品质量', '用户体验是重要因素', '价格合理性影响购买决策'],
      confidence: Math.random() * 0.3 + 0.7
    });
  }

  generateSimulatedRiskResponse(prompt) {
    const risks = {
      level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      score: Math.random(),
      factors: ['市场波动', '竞争加剧', '政策变化', '技术风险'],
      recommendations: ['加强监控', '制定预案', '持续观察', '及时调整']
    };
    
    return JSON.stringify({
      ...risks,
      confidence: Math.random() * 0.3 + 0.7,
      urgency: Math.random() > 0.7 ? 'immediate' : 'moderate'
    });
  }

  generateGenericSimulatedResponse(prompt) {
    return "这是一个模拟的LLM响应。在实际部署中，这里会返回真实的LLM分析结果。";
  }

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