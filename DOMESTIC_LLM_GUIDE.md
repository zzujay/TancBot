# 国产LLM模型配置指南

## 🔍 项目数据库现状

**好消息！** 这个项目目前使用的是**JSON文件数据库**，无需安装额外的数据库软件。数据存储在 `data/opinion.json` 文件中，开箱即用。

### 当前数据库特点：
- ✅ **零配置**：无需安装MySQL/PostgreSQL
- ✅ **轻量级**：适合开发和测试
- ✅ **易调试**：JSON格式直接可读
- ✅ **已集成**：系统自动创建和管理

### 数据库文件位置：
```
data/
├── opinion.json          # 主数据文件
├── backup/               # 备份文件
└── dictionary.txt        # 自定义词典
```

---

## 🤖 国产LLM模型集成指南

### 支持的国产模型

#### 1. **通义千问 (Qwen)**
- 提供商：阿里云
- 模型：qwen-turbo, qwen-plus, qwen-max
- 特点：中文理解好，性价比高

#### 2. **Kimi (月之暗面)**
- 提供商：月之暗面
- 模型：kimi-chat, kimi-long
- 特点：长文本处理强，对话流畅

#### 3. **文心一言**
- 提供商：百度
- 模型：ernie-bot, ernie-bot-turbo
- 特点：知识图谱丰富

#### 4. **星火认知**
- 提供商：科大讯飞
- 模型：spark-v3.0, spark-v2.0
- 特点：语音技术领先

#### 5. **智谱GLM**
- 提供商：智谱AI
- 模型：glm-4, glm-3-turbo
- 特点：学术能力强

---

## 🚀 快速配置国产LLM

### 步骤1：创建配置文件

```bash
cp .env.example .env
```

### 步骤2：配置千问模型

```env
# 基础配置
LLM_PROVIDER=qwen
LLM_MODEL=qwen-turbo

# 千问API配置
QWEN_API_KEY=sk-your-qwen-api-key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
QWEN_API_VERSION=2023-12-01
```

### 步骤3：配置Kimi模型

```env
# 基础配置
LLM_PROVIDER=kimi
LLM_MODEL=kimi-chat

# Kimi API配置
KIMI_API_KEY=your-kimi-api-key
KIMI_BASE_URL=https://api.moonshot.cn/v1
```

---

## 🔧 扩展配置管理器支持国产模型

### 更新配置管理器

在 `src/ai-analysis/llm-config-manager.js` 中添加国产模型支持：

```javascript
// 添加国产模型配置映射
const envMappings = {
  // ... 原有配置 ...
  
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
  SPARK_BASE_URL: 'SPARK_BASE_URL'
};
```

### 添加默认配置

```javascript
getDefaultConfig() {
  return {
    // ... 原有配置 ...
    
    // 千问默认配置
    QWEN_API_KEY: '',
    QWEN_BASE_URL: 'https://dashscope.aliyuncs.com/api/v1',
    QWEN_API_VERSION: '2023-12-01',
    
    // Kimi默认配置
    KIMI_API_KEY: '',
    KIMI_BASE_URL: 'https://api.moonshot.cn/v1',
    
    // 文心一言默认配置
    WENXIN_API_KEY: '',
    WENXIN_SECRET_KEY: '',
    WENXIN_BASE_URL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    
    // 星火默认配置
    SPARK_APP_ID: '',
    SPARK_API_KEY: '',
    SPARK_API_SECRET: '',
    SPARK_BASE_URL: 'wss://spark-api.xf-yun.com/v3.5/chat'
  };
}
```

---

## 📦 创建国产LLM客户端

### 千问客户端实现

创建 `src/ai-analysis/domestic-llm-clients.js`：

```javascript
/**
 * 通义千问客户端
 */
class QwenClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1';
    this.apiKey = config.QWEN_API_KEY;
  }

  async generateResponse(options) {
    const response = await fetch(`${this.baseURL}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Api-Key': this.apiKey
      },
      body: JSON.stringify({
        model: this.config.LLM_MODEL || 'qwen-turbo',
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

    const result = await response.json();
    
    if (result.code !== undefined && result.code !== 0) {
      throw new Error(`千问API错误: ${result.message}`);
    }
    
    return result.output.choices[0].message.content;
  }
}

/**
 * Kimi客户端
 */
class KimiClient {
  constructor(config) {
    this.config = config;
    this.baseURL = config.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
    this.apiKey = config.KIMI_API_KEY;
  }

  async generateResponse(options) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.LLM_MODEL || 'kimi-chat',
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

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Kimi API错误: ${result.error.message}`);
    }
    
    return result.choices[0].message.content;
  }
}

module.exports = {
  QwenClient,
  KimiClient
};
```

---

## 🔌 集成到增强分析器

### 更新分析器支持国产模型

修改 `src/ai-analysis/llm-enhanced-analyzer-improved.js`：

```javascript
// 导入国产LLM客户端
const { QwenClient, KimiClient } = require('./domestic-llm-clients');

class EnhancedLLMAnalyzer {
  // ... 原有代码 ...

  async initializeLLMClient() {
    const llmConfig = this.configManager.getLLMConfig();
    
    console.log(`🔧 正在初始化 ${llmConfig.provider} 客户端...`);
    
    switch (llmConfig.provider) {
      // ... 原有case ...
      
      case 'qwen':
        this.llmClient = new QwenClient(llmConfig);
        break;
        
      case 'kimi':
        this.llmClient = new KimiClient(llmConfig);
        break;
        
      default:
        throw new Error(`不支持的LLM提供商: ${llmConfig.provider}`);
    }
    
    // 测试连接
    await this.testConnection();
  }
}
```

---

## 📋 完整配置示例

### 千问配置示例

```env
# 基础配置
LLM_PROVIDER=qwen
LLM_MODEL=qwen-turbo
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7
LLM_TIMEOUT=30000

# 千问API配置
QWEN_API_KEY=sk-1234567890abcdef
QWEN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
QWEN_API_VERSION=2023-12-01

# 分析配置
ANALYSIS_MAX_WORKERS=3
ANALYSIS_BATCH_SIZE=10
MAX_INPUT_LENGTH=10000
```

### Kimi配置示例

```env
# 基础配置
LLM_PROVIDER=kimi
LLM_MODEL=kimi-chat
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7
LLM_TIMEOUT=30000

# Kimi API配置
KIMI_API_KEY=your-kimi-api-key-here
KIMI_BASE_URL=https://api.moonshot.cn/v1

# 分析配置
ANALYSIS_MAX_WORKERS=3
ANALYSIS_BATCH_SIZE=10
MAX_INPUT_LENGTH=10000
```

---

## 🧪 测试国产LLM

### 创建测试脚本

创建 `test-domestic-llm.js`：

```javascript
const EnhancedLLMAnalyzer = require('./src/ai-analysis/llm-enhanced-analyzer-improved');

async function testDomesticLLM() {
  console.log('🚀 开始测试国产LLM...');
  
  const analyzer = new EnhancedLLMAnalyzer();
  
  try {
    // 初始化
    await analyzer.initialize();
    
    // 测试文本
    const testContent = `
    今天北京的天气真好，阳光明媚，适合出门散步。
    最近人工智能技术发展很快，国产大模型也取得了很大进步。
    `;
    
    // 进行分析
    const result = await analyzer.analyzeContent(testContent, {
      type: 'comprehensive'
    });
    
    console.log('📊 分析结果:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testDomesticLLM();
```

### 运行测试

```bash
# 设置环境变量
export LLM_PROVIDER=qwen
export QWEN_API_KEY=your-api-key

# 运行测试
node test-domestic-llm.js
```

---

## 💡 使用建议

### 选择建议

1. **千问 (Qwen)** - 推荐⭐⭐⭐⭐⭐
   - 中文理解最佳
   - API稳定性好
   - 价格适中
   - 适合企业应用

2. **Kimi** - 推荐⭐⭐⭐⭐
   - 长文本处理强
   - 对话体验好
   - 适合内容分析

3. **文心一言** - 推荐⭐⭐⭐
   - 百度生态集成好
   - 知识图谱丰富

### 配置优先级

1. **开发环境**：使用`.env`文件
2. **生产环境**：使用环境变量
3. **敏感信息**：API密钥用环境变量

### 性能优化

```env
# 根据模型调整参数
LLM_MAX_TOKENS=2048      # 千问支持更长文本
ANALYSIS_BATCH_SIZE=5    # 国产模型建议小批量
MAX_CONCURRENT_REQUESTS=3 # 避免触发限流
```

---

## 🔧 故障排除

### 常见问题

1. **API密钥无效**
   ```bash
   # 检查密钥格式
   echo $QWEN_API_KEY | grep "sk-"
   ```

2. **网络连接超时**
   ```env
   # 增加超时时间
   LLM_TIMEOUT=60000
   ```

3. **模型不支持**
   ```bash
   # 查看支持的模型
   curl -H "Authorization: Bearer $QWEN_API_KEY" \
        https://dashscope.aliyuncs.com/api/v1/models
   ```

---

现在您可以根据需要选择国产LLM模型，享受更好的中文舆情分析体验！🎉