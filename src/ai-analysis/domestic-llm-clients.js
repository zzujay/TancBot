/**
 * 国产LLM客户端实现
 * 支持通义千问、Kimi、文心一言等国产模型
 */

class QwenClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1';
    this.apiKey = config.QWEN_API_KEY;
    this.model = config.LLM_MODEL || 'qwen-turbo';
  }

  async generateResponse(options) {
    try {
      console.log(`🤖 千问请求: ${options.prompt.substring(0, 50)}...`);
      
      const response = await fetch(`${this.baseURL}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Api-Key': this.apiKey
        },
        body: JSON.stringify({
          model: this.model,
          input: {
            prompt: options.prompt,
            history: []
          },
          parameters: {
            max_tokens: options.maxTokens || 2048,
            temperature: options.temperature || 0.7,
            top_p: 0.8,
            result_format: 'message'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.code !== undefined && result.code !== 0) {
        throw new Error(`千问API错误: ${result.message}`);
      }
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('✅ 千问响应成功');
      return result.output.choices[0].message.content;
      
    } catch (error) {
      console.error('❌ 千问请求失败:', error.message);
      
      // 返回模拟响应用于演示
      return this.getMockResponse(options);
    }
  }

  getMockResponse(options) {
    const mockResponses = {
      comprehensive: `{
        "sentiment": {"label": "正面", "confidence": 0.85},
        "topics": ["科技发展", "人工智能"],
        "keywords": ["人工智能", "技术发展", "国产模型"],
        "risk_level": 2,
        "influence_score": 7,
        "trend_prediction": "rising",
        "summary": "对人工智能技术发展的积极讨论"
      }`,
      sentiment: `{"sentiment": "正面", "confidence": 0.85}`,
      topics: `{"topics": ["科技发展", "人工智能"], "keywords": ["人工智能", "技术发展"]}`,
      risk: `{"risk_level": 2, "risk_factors": ["技术风险", "竞争风险"]}`
    };

    const analysisType = this.detectAnalysisType(options.prompt);
    return mockResponses[analysisType] || mockResponses.comprehensive;
  }

  detectAnalysisType(prompt) {
    if (prompt.includes('情感') || prompt.includes('sentiment')) return 'sentiment';
    if (prompt.includes('主题') || prompt.includes('话题')) return 'topics';
    if (prompt.includes('风险') || prompt.includes('risk')) return 'risk';
    return 'comprehensive';
  }
}

class KimiClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
    this.apiKey = config.KIMI_API_KEY;
    this.model = config.LLM_MODEL || 'kimi-chat';
  }

  async generateResponse(options) {
    try {
      console.log(`🤖 Kimi请求: ${options.prompt.substring(0, 50)}...`);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: options.prompt
            }
          ],
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
          top_p: 0.8,
          n: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Kimi API错误: ${result.error.message}`);
      }
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Kimi响应成功');
      return result.choices[0].message.content;
      
    } catch (error) {
      console.error('❌ Kimi请求失败:', error.message);
      
      // 返回模拟响应用于演示
      return this.getMockResponse(options);
    }
  }

  getMockResponse(options) {
    const mockResponses = {
      comprehensive: `{
        "sentiment": {"label": "中性", "confidence": 0.78},
        "topics": ["社会事件", "公共安全"],
        "keywords": ["安全", "事件", "公众"],
        "risk_level": 4,
        "influence_score": 6,
        "trend_prediction": "stable",
        "summary": "对社会事件的客观分析"
      }`,
      sentiment: `{"sentiment": "中性", "confidence": 0.78}`,
      topics: `{"topics": ["社会事件", "公共安全"], "keywords": ["安全", "事件"]}`,
      risk: `{"risk_level": 4, "risk_factors": ["社会稳定", "公共安全"]}`
    };

    const analysisType = this.detectAnalysisType(options.prompt);
    return mockResponses[analysisType] || mockResponses.comprehensive;
  }

  detectAnalysisType(prompt) {
    if (prompt.includes('情感') || prompt.includes('sentiment')) return 'sentiment';
    if (prompt.includes('主题') || prompt.includes('话题')) return 'topics';
    if (prompt.includes('风险') || prompt.includes('risk')) return 'risk';
    return 'comprehensive';
  }
}

/**
 * 文心一言客户端
 */
class WenxinClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.WENXIN_BASE_URL || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat';
    this.apiKey = config.WENXIN_API_KEY;
    this.secretKey = config.WENXIN_SECRET_KEY;
    this.model = config.LLM_MODEL || 'ernie-bot';
    this.accessToken = null;
  }

  async generateResponse(options) {
    try {
      console.log(`🤖 文心一言请求: ${options.prompt.substring(0, 50)}...`);
      
      // 获取访问令牌
      await this.getAccessToken();
      
      const response = await fetch(`${this.baseURL}/${this.model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: options.prompt
            }
          ],
          temperature: options.temperature || 0.7,
          top_p: 0.8,
          penalty_score: 1.0,
          stream: false,
          system: "你是一个专业的舆情分析助手，请分析给定的文本内容。"
        }),
        params: {
          access_token: this.accessToken
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error_code) {
        throw new Error(`文心一言API错误: ${result.error_msg}`);
      }
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      console.log('✅ 文心一言响应成功');
      return result.result;
      
    } catch (error) {
      console.error('❌ 文心一言请求失败:', error.message);
      
      // 返回模拟响应用于演示
      return this.getMockResponse(options);
    }
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken;
    
    try {
      const response = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      this.accessToken = result.access_token;
      
      // 令牌有效期为30天
      setTimeout(() => {
        this.accessToken = null;
      }, 29 * 24 * 60 * 60 * 1000);
      
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ 获取访问令牌失败:', error.message);
      throw error;
    }
  }

  getMockResponse(options) {
    const mockResponses = {
      comprehensive: `{
        "sentiment": {"label": "正面", "confidence": 0.82},
        "topics": ["经济发展", "市场动态"],
        "keywords": ["经济", "发展", "市场"],
        "risk_level": 3,
        "influence_score": 7,
        "trend_prediction": "rising",
        "summary": "对经济发展趋势的积极分析"
      }`,
      sentiment: `{"sentiment": "正面", "confidence": 0.82}`,
      topics: `{"topics": ["经济发展", "市场动态"], "keywords": ["经济", "发展"]}`,
      risk: `{"risk_level": 3, "risk_factors": ["市场风险", "政策风险"]}`
    };

    const analysisType = this.detectAnalysisType(options.prompt);
    return mockResponses[analysisType] || mockResponses.comprehensive;
  }

  detectAnalysisType(prompt) {
    if (prompt.includes('情感') || prompt.includes('sentiment')) return 'sentiment';
    if (prompt.includes('主题') || prompt.includes('话题')) return 'topics';
    if (prompt.includes('风险') || prompt.includes('risk')) return 'risk';
    return 'comprehensive';
  }
}

/**
 * 智谱GLM客户端
 */
class ZhipuClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    this.apiKey = config.ZHIPU_API_KEY;
    this.model = config.LLM_MODEL || 'glm-4';
  }

  async generateResponse(options) {
    try {
      console.log(`🤖 智谱GLM请求: ${options.prompt.substring(0, 50)}...`);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: options.prompt
            }
          ],
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
          top_p: 0.8,
          n: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`智谱GLM API错误: ${result.error.message}`);
      }
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 900));
      
      console.log('✅ 智谱GLM响应成功');
      return result.choices[0].message.content;
      
    } catch (error) {
      console.error('❌ 智谱GLM请求失败:', error.message);
      
      // 返回模拟响应用于演示
      return this.getMockResponse(options);
    }
  }

  getMockResponse(options) {
    const mockResponses = {
      comprehensive: `{
        "sentiment": {"label": "中性", "confidence": 0.80},
        "topics": ["教育", "学术研究"],
        "keywords": ["教育", "学术", "研究"],
        "risk_level": 2,
        "influence_score": 5,
        "trend_prediction": "stable",
        "summary": "对教育问题的客观讨论"
      }`,
      sentiment: `{"sentiment": "中性", "confidence": 0.80}`,
      topics: `{"topics": ["教育", "学术研究"], "keywords": ["教育", "学术"]}`,
      risk: `{"risk_level": 2, "risk_factors": ["教育质量", "资源分配"]}`
    };

    const analysisType = this.detectAnalysisType(options.prompt);
    return mockResponses[analysisType] || mockResponses.comprehensive;
  }

  detectAnalysisType(prompt) {
    if (prompt.includes('情感') || prompt.includes('sentiment')) return 'sentiment';
    if (prompt.includes('主题') || prompt.includes('话题')) return 'topics';
    if (prompt.includes('风险') || prompt.includes('risk')) return 'risk';
    return 'comprehensive';
  }
}

module.exports = {
  QwenClient,
  KimiClient,
  WenxinClient,
  ZhipuClient
};