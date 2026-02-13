# LLM配置系统详解

## 为什么需要两种配置方式？

### 1. 环境变量（export命令）- 运行时配置
```bash
export LLM_PROVIDER="openai"
export LLM_MODEL="gpt-3.5-turbo"
export OPENAI_API_KEY="your-api-key"
```

**优点：**
- ✅ **安全性高**：API密钥不会保存在文件中
- ✅ **灵活性强**：可以快速切换配置而不修改文件
- ✅ **容器友好**：在Docker/Kubernetes环境中易于管理
- ✅ **CI/CD集成**：在自动化部署中易于配置

**适用场景：**
- 生产环境部署
- 多环境切换（开发/测试/生产）
- 临时测试不同模型
- 团队协作时保护敏感信息

### 2. 配置文件（.env文件）- 持久化配置
```env
# .env文件
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=your-api-key
```

**优点：**
- ✅ **持久化**：配置保存在文件中，重启后仍然有效
- ✅ **版本控制**：可以跟踪配置变更历史
- ✅ **文档化**：配置文件本身就是文档
- ✅ **开发友好**：开发环境一键配置

**适用场景：**
- 本地开发环境
- 默认配置模板
- 团队共享的基础配置
- 快速启动演示

## 配置优先级系统

我们实现了智能的配置加载机制：

```javascript
// 配置优先级（从高到低）
1. 环境变量（process.env）
2. .env.local文件（本地覆盖）
3. .env文件（基础配置）
4. 默认配置（fallback）
```

**实际工作流程：**
```javascript
// 配置加载逻辑
const config = {
  // 1. 首先检查环境变量
  provider: process.env.LLM_PROVIDER || 
           // 2. 然后检查.env文件
           envConfig.LLM_PROVIDER || 
           // 3. 最后使用默认值
           'openai'
};
```

## 实际使用建议

### 🔧 开发环境配置
```bash
# 方法1：使用.env文件（推荐）
cp .env.example .env
# 编辑.env文件，填入你的API密钥

# 方法2：临时环境变量
export LLM_PROVIDER="openai"
export OPENAI_API_KEY="your-key"
npm run dev
```

### 🚀 生产环境配置
```bash
# 方法1：系统环境变量（推荐）
echo "export LLM_PROVIDER='openai'" >> ~/.bashrc
echo "export OPENAI_API_KEY='your-key'" >> ~/.bashrc
source ~/.bashrc

# 方法2：进程级环境变量
LLM_PROVIDER=openai OPENAI_API_KEY=your-key npm start
```

### 🐳 Docker容器配置
```dockerfile
# Dockerfile
ENV LLM_PROVIDER=openai
ENV LLM_MODEL=gpt-3.5-turbo
# API密钥通过运行时传入
docker run -e OPENAI_API_KEY=your-key your-app
```

## 多LLM提供商配置示例

### OpenAI配置
```env
# .env文件
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=sk-your-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1
```

### Claude配置
```env
# .env文件
LLM_PROVIDER=claude
LLM_MODEL=claude-3-sonnet-20240229
ANTHROPIC_API_KEY=sk-ant-your-claude-key
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

### 本地模型配置
```env
# .env文件
LLM_PROVIDER=local
LLM_MODEL=llama2
LOCAL_LLM_URL=http://localhost:11434/api/generate
LOCAL_LLM_TIMEOUT=30000
```

## 安全配置最佳实践

### 1. 保护API密钥
```bash
# ❌ 不要这样做
echo "OPENAI_API_KEY=sk-secret123" > .env
git add .env

# ✅ 正确的做法
echo ".env" >> .gitignore
echo "OPENAI_API_KEY=sk-secret123" > .env.local
```

### 2. 使用配置管理器
```javascript
// 我们的新配置管理器自动处理安全性
const config = new LLMConfigManager();
config.maskSensitiveData(); // 自动隐藏API密钥
```

### 3. 环境隔离
```bash
# 开发环境
.env.development
# 测试环境
.env.test
# 生产环境
.env.production
```

## 故障排除

### 常见问题1：配置不生效
```bash
# 检查环境变量
echo $LLM_PROVIDER

# 检查配置文件
cat .env | grep LLM_PROVIDER

# 验证配置加载
node -e "console.log(require('./src/ai-analysis/llm-config-manager.js').getInstance().getConfig())"
```

### 常见问题2：API密钥错误
```bash
# 测试API连接
node scripts/test-llm-connection.js

# 检查密钥格式
echo $OPENAI_API_KEY | grep "sk-"
```

### 常见问题3：模型不支持
```bash
# 查看支持的模型
node scripts/list-supported-models.js

# 检查模型名称拼写
echo $LLM_MODEL
```

## 配置验证

我们的系统包含自动配置验证：

```javascript
// 配置验证示例
const validator = new ConfigValidator();
const result = validator.validate({
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  apiKey: 'sk-xxx'
});

if (!result.valid) {
  console.error('配置错误:', result.errors);
}
```

## 总结

**使用建议：**
1. **开发环境**：使用`.env`文件，方便快捷
2. **生产环境**：使用环境变量，安全灵活
3. **敏感信息**：始终使用环境变量，不要提交到代码库
4. **团队协作**：使用`.env.example`作为模板，每个成员创建自己的`.env.local`

**配置优先级：**
环境变量 > .env.local > .env > 默认值

这样设计既保证了开发便利性，又确保了生产安全性！