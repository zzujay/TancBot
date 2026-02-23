/**
 * LLM客户端模块
 * 支持千问(Qwen)等大语言模型API调用
 */

const axios = require('axios');
const logger = require('../utils/logger');

class LLMClient {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'qwen';
    this.model = process.env.LLM_MODEL || 'qwen-turbo';
    this.apiKey = process.env.QWEN_API_KEY;
    this.baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS) || 2048;
    this.temperature = parseFloat(process.env.LLM_TEMPERATURE) || 0.7;
    this.timeout = parseInt(process.env.LLM_TIMEOUT) || 30000;
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 3;
    
    this.requestQueue = [];
    this.activeRequests = 0;
  }

  /**
   * 初始化LLM客户端
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('LLM API Key未配置，请检查.env文件中的QWEN_API_KEY');
    }
    
    logger.info(`[LLM] 初始化LLM客户端: ${this.provider}/${this.model}`);
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: this.timeout
    });

    // 测试连接
    try {
      await this.testConnection();
      logger.info('[LLM] LLM客户端初始化成功');
    } catch (error) {
      logger.error('[LLM] LLM连接测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试LLM连接
   */
  async testConnection() {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          { role: 'user', content: '你好' }
        ],
        max_tokens: 10
      });
      
      if (response.data && response.data.choices) {
        logger.info('[LLM] 连接测试成功');
        return true;
      }
    } catch (error) {
      logger.error('[LLM] 连接测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送聊天请求
   * @param {string} prompt - 提示词
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} LLM响应
   */
  async chat(prompt, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 等待并发控制
        await this.waitForSlot();
        
        const response = await this.sendRequest(prompt, options);
        this.releaseSlot();
        
        return response;
      } catch (error) {
        lastError = error;
        this.releaseSlot();
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避
          logger.warn(`[LLM] 请求失败，${delay}ms后重试 (${attempt}/${maxRetries})`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`LLM请求失败，已重试${maxRetries}次: ${lastError.message}`);
  }

  /**
   * 发送实际请求
   */
  async sendRequest(prompt, options) {
    const messages = [
      { role: 'system', content: options.systemPrompt || '你是一个专业的舆情分析助手，擅长分析社交媒体数据和公众情绪。' },
      { role: 'user', content: prompt }
    ];

    const requestBody = {
      model: options.model || this.model,
      messages,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature,
      stream: false
    };

    logger.debug('[LLM] 发送请求:', { prompt: prompt.substring(0, 100) + '...' });

    const response = await this.client.post('/chat/completions', requestBody);

    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      throw new Error('LLM返回无效响应');
    }

    const result = {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      finishReason: response.data.choices[0].finish_reason
    };

    logger.debug('[LLM] 收到响应:', { content: result.content.substring(0, 100) + '...' });

    return result;
  }

  /**
   * 批量处理多个提示词
   * @param {Array<string>} prompts - 提示词数组
   * @param {Object} options - 可选参数
   * @returns {Promise<Array<Object>>} 响应数组
   */
  async batchChat(prompts, options = {}) {
    const batchSize = options.batchSize || parseInt(process.env.ANALYSIS_BATCH_SIZE) || 5;
    const results = [];

    logger.info(`[LLM] 批量处理 ${prompts.length} 个请求，批次大小: ${batchSize}`);

    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchPromises = batch.map((prompt, index) => 
        this.chat(prompt, options).catch(error => ({
          error: true,
          message: error.message,
          index: i + index
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      logger.info(`[LLM] 完成批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(prompts.length / batchSize)}`);
    }

    return results;
  }

  /**
   * 分析微博内容
   * @param {Array<Object>} posts - 微博帖子数组
   * @param {string} analysisType - 分析类型
   * @returns {Promise<Object>} 分析结果
   */
  async analyzePosts(posts, analysisType = 'comprehensive') {
    const prompt = this.buildAnalysisPrompt(posts, analysisType);
    
    const systemPrompt = `你是一个专业的舆情分析专家。请对提供的微博数据进行深入分析，输出结构化的JSON格式结果。
分析要求：
1. 提取关键事实和时间线
2. 分析公众情绪倾向和演变
3. 识别传播路径和关键节点
4. 评估舆情风险等级
5. 提供数据支持的洞察和建议

输出必须是有效的JSON格式。`;

    const response = await this.chat(prompt, {
      systemPrompt,
      maxTokens: 2048,
      temperature: 0.3 // 分析任务使用较低温度，输出更稳定
    });

    // 解析JSON响应
    try {
      const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      // 尝试直接解析
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('[LLM] JSON解析失败:', error.message);
      logger.debug('[LLM] 原始响应:', response.content);
      
      // 返回原始文本作为后备
      return {
        rawAnalysis: response.content,
        parseError: error.message
      };
    }
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(posts, analysisType) {
    const postsText = posts.map((post, index) => 
      `${index + 1}. [${post.publishTime || '未知时间'}] ${post.author || '匿名'}: ${post.content}`
    ).join('\n');

    const prompts = {
      comprehensive: `请对以下微博数据进行全面的舆情分析：

${postsText}

请输出JSON格式的分析结果，包含以下字段：
{
  "facts": {
    "summary": "事件核心事实摘要",
    "timeline": [{"time": "时间", "event": "事件描述"}],
    "keyEntities": ["关键实体"]
  },
  "sentiment": {
    "overall": "整体情绪倾向",
    "distribution": {"positive": 数量, "negative": 数量, "neutral": 数量},
    "evolution": "情绪演变分析"
  },
  "propagation": {
    "pattern": "传播模式",
    "keyNodes": ["关键传播节点"],
    "trend": "传播趋势"
  },
  "risk": {
    "level": "风险等级(low/medium/high)",
    "score": 0-100,
    "factors": ["风险因素"]
  },
  "insights": ["关键洞察1", "关键洞察2"],
  "recommendations": ["建议1", "建议2"]
}`,

      facts: `请从以下微博中提取客观事实：

${postsText}

输出JSON格式：
{
  "coreFacts": ["事实1", "事实2"],
  "timeline": [{"time": "时间", "event": "事件", "source": "信息来源"}],
  "entities": [{"name": "实体名", "type": "类型", "role": "角色"}],
  "uncertainties": ["不确定的信息"]
}`,

      sentiment: `请分析以下微博的情绪倾向：

${postsText}

输出JSON格式：
{
  "overallSentiment": "整体情绪",
  "sentimentDistribution": {"positive": 数量, "negative": 数量, "neutral": 数量},
  "emotionDetails": {"angry": 数量, "anxious": 数量, "sympathetic": 数量},
  "turningPoints": [{"time": "时间", "change": "情绪变化"}]
}`
    };

    return prompts[analysisType] || prompts.comprehensive;
  }

  /**
   * 等待可用的请求槽
   */
  async waitForSlot() {
    while (this.activeRequests >= this.maxConcurrent) {
      await this.sleep(100);
    }
    this.activeRequests++;
  }

  /**
   * 释放请求槽
   */
  releaseSlot() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取客户端信息
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.model,
      baseURL: this.baseURL,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// 导出单例
module.exports = new LLMClient();
