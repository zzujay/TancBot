/**
 * 增强版LLM分析器 - 使用新的配置管理器
 * 支持多LLM提供商和智能配置管理
 */

const LLMConfigManager = require('./llm-config-manager');
const { QwenClient, KimiClient, WenxinClient, ZhipuClient } = require('./domestic-llm-clients');

class EnhancedLLMAnalyzer {
  constructor() {
    this.configManager = LLMConfigManager.getInstance();
    this.llmClient = null;
  }

  /**
   * 初始化分析器
   */
  async initialize() {
    console.log('🔄 正在初始化增强版LLM分析器...');
    
    // 初始化配置管理器
    await this.configManager.initialize();
    
    // 初始化LLM客户端
    await this.initializeLLMClient();
    
    console.log('✅ 增强版LLM分析器初始化完成');
  }

  /**
   * 初始化LLM客户端
   */
  async initializeLLMClient() {
    const llmConfig = this.configManager.getLLMConfig();
    
    console.log(`🔧 正在初始化 ${llmConfig.provider} 客户端...`);
    
    switch (llmConfig.provider) {
      case 'openai':
        this.llmClient = new OpenAIClient(llmConfig);
        break;
        
      case 'claude':
        this.llmClient = new ClaudeClient(llmConfig);
        break;
        
      case 'local':
        this.llmClient = new LocalLLMClient(llmConfig);
        break;
        
      case 'qwen':
        this.llmClient = new QwenClient(llmConfig);
        break;
        
      case 'kimi':
        this.llmClient = new KimiClient(llmConfig);
        break;
        
      case 'wenxin':
        this.llmClient = new WenxinClient(llmConfig);
        break;
        
      case 'zhipu':
        this.llmClient = new ZhipuClient(llmConfig);
        break;
        
      default:
        throw new Error(`不支持的LLM提供商: ${llmConfig.provider}`);
    }
    
    // 测试连接
    await this.testConnection();
  }

  /**
   * 测试LLM连接
   */
  async testConnection() {
    try {
      console.log('🔍 正在测试LLM连接...');
      
      const testResponse = await this.llmClient.generateResponse({
        prompt: 'Hello, this is a connection test. Please respond with "OK" only.',
        maxTokens: 10
      });
      
      if (testResponse && testResponse.trim().toLowerCase().includes('ok')) {
        console.log('✅ LLM连接测试通过');
      } else {
        console.warn('⚠️  LLM连接测试响应异常:', testResponse);
      }
    } catch (error) {
      console.error('❌ LLM连接测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 分析文本内容
   */
  async analyzeContent(content, options = {}) {
    if (!this.llmClient) {
      throw new Error('分析器未初始化');
    }

    const startTime = Date.now();
    
    try {
      console.log(`📝 开始分析内容 (${content.length} 字符)...`);
      
      // 检查内容长度限制
      const maxLength = this.configManager.get('MAX_INPUT_LENGTH');
      if (content.length > maxLength) {
        console.warn(`⚠️  内容长度超过限制，将截断至 ${maxLength} 字符`);
        content = content.substring(0, maxLength);
      }

      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(content, options);
      
      // 调用LLM进行分析
      const response = await this.llmClient.generateResponse({
        prompt: prompt,
        maxTokens: this.configManager.get('LLM_MAX_TOKENS'),
        temperature: this.configManager.get('LLM_TEMPERATURE')
      });

      // 解析响应
      const analysis = this.parseAnalysisResponse(response);
      
      const endTime = Date.now();
      console.log(`✅ 分析完成，耗时 ${endTime - startTime}ms`);
      
      return {
        success: true,
        analysis: analysis,
        metadata: {
          provider: this.configManager.get('LLM_PROVIDER'),
          model: this.configManager.get('LLM_MODEL'),
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ 分析失败:', error.message);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          provider: this.configManager.get('LLM_PROVIDER'),
          model: this.configManager.get('LLM_MODEL'),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(content, options) {
    const analysisType = options.type || 'comprehensive';
    
    const prompts = {
      comprehensive: `
请对以下内容进行全面分析，包括：
1. 情感分析（正面/负面/中性，置信度）
2. 主题分类（主要话题和次要话题）
3. 关键词提取（最重要的5个关键词）
4. 风险等级评估（1-10，10为最高风险）
5. 影响力预测（1-10，10为最高影响力）
6. 传播趋势分析

请以JSON格式返回结果，结构如下：
{
  "sentiment": {"label": "正面/负面/中性", "confidence": 0.95},
  "topics": ["主要话题", "次要话题"],
  "keywords": ["关键词1", "关键词2", ...],
  "risk_level": 5,
  "influence_score": 7,
  "trend_prediction": "stable/rising/falling",
  "summary": "简要总结"
}

内容：
${content}
      `,
      
      sentiment: `
请分析以下内容的情感倾向：

内容：
${content}

请返回JSON格式：
{"sentiment": "正面/负面/中性", "confidence": 0.95}
      `,
      
      topics: `
请提取以下内容的主要话题和关键词：

内容：
${content}

请返回JSON格式：
{"topics": ["话题1", "话题2"], "keywords": ["关键词1", "关键词2"]}
      `,
      
      risk: `
请评估以下内容的潜在风险等级（1-10）：

内容：
${content}

考虑因素：政治敏感性、社会影响、传播潜力、争议程度

请返回JSON格式：
{"risk_level": 5, "risk_factors": ["因素1", "因素2"]}
      `
    };

    return prompts[analysisType] || prompts.comprehensive;
  }

  /**
   * 解析LLM响应
   */
  parseAnalysisResponse(response) {
    try {
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果不是JSON，创建结构化响应
      return {
        raw_response: response,
        sentiment: { label: '未知', confidence: 0.5 },
        topics: [],
        keywords: [],
        risk_level: 5,
        influence_score: 5,
        summary: response.substring(0, 200)
      };
      
    } catch (error) {
      console.warn('⚠️  解析LLM响应失败，使用默认结构');
      return {
        error: '解析失败',
        raw_response: response,
        sentiment: { label: '未知', confidence: 0.5 },
        topics: [],
        keywords: [],
        risk_level: 5,
        influence_score: 5,
        summary: '解析失败，使用原始响应'
      };
    }
  }

  /**
   * 批量分析
   */
  async batchAnalyze(contents, options = {}) {
    const batchSize = this.configManager.get('ANALYSIS_BATCH_SIZE');
    const maxWorkers = this.configManager.get('ANALYSIS_MAX_WORKERS');
    
    console.log(`📊 开始批量分析 ${contents.length} 条内容...`);
    
    const results = [];
    const batches = this.createBatches(contents, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`🔄 处理批次 ${i + 1}/${batches.length}...`);
      
      const batchResults = await Promise.allSettled(
        batches[i].map(content => this.analyzeContent(content, options))
      );
      
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      ));
    }
    
    console.log(`✅ 批量分析完成，成功 ${results.filter(r => r.success).length}/${results.length}`);
    
    return results;
  }

  /**
   * 创建批次
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 获取分析器状态
   */
  getStatus() {
    return {
      initialized: this.llmClient !== null,
      provider: this.configManager.get('LLM_PROVIDER'),
      model: this.configManager.get('LLM_MODEL'),
      config: this.configManager.getConfigSummary()
    };
  }
}

/**
 * OpenAI客户端
 */
class OpenAIClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }

  async generateResponse(options) {
    // 这里应该调用实际的OpenAI API
    // 为了演示，返回模拟响应
    console.log(`🤖 OpenAI请求: ${options.prompt.substring(0, 50)}...`);
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `{
      "sentiment": {"label": "中性", "confidence": 0.8},
      "topics": ["社会事件", "公共安全"],
      "keywords": ["安全", "事件", "公众"],
      "risk_level": 3,
      "influence_score": 6,
      "trend_prediction": "stable",
      "summary": "这是一个关于社会事件的讨论"
    }`;
  }
}

/**
 * Claude客户端
 */
class ClaudeClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
  }

  async generateResponse(options) {
    console.log(`🤖 Claude请求: ${options.prompt.substring(0, 50)}...`);
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return `{
      "sentiment": {"label": "正面", "confidence": 0.75},
      "topics": ["科技发展", "创新"],
      "keywords": ["技术", "创新", "发展"],
      "risk_level": 1,
      "influence_score": 8,
      "trend_prediction": "rising",
      "summary": "关于科技发展的积极讨论"
    }`;
  }
}

/**
 * 本地LLM客户端
 */
class LocalLLMClient {
  constructor(config) {
    this.config = config;
    this.url = config.url || 'http://localhost:11434/api/generate';
  }

  async generateResponse(options) {
    console.log(`🤖 本地LLM请求: ${options.prompt.substring(0, 50)}...`);
    
    // 模拟本地模型延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return `{
      "sentiment": {"label": "负面", "confidence": 0.9},
      "topics": ["环境问题", "污染"],
      "keywords": ["环境", "污染", "保护"],
      "risk_level": 7,
      "influence_score": 9,
      "trend_prediction": "rising",
      "summary": "对环境问题的担忧和讨论"
    }`;
  }
}

module.exports = EnhancedLLMAnalyzer;