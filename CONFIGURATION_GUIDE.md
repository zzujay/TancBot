# 🚀 舆情研判系统配置与测试指南

## 📋 目录
1. [系统配置](#系统配置)
2. [环境准备](#环境准备)
3. [基础配置](#基础配置)
4. [高级配置](#高级配置)
5. [功能测试](#功能测试)
6. [性能测试](#性能测试)
7. [故障排除](#故障排除)
8. [最佳实践](#最佳实践)

---

## 🛠️ 系统配置

### 第一步：环境检查

在开始配置之前，请确保您的系统满足以下要求：

```bash
# 检查Node.js版本
node --version
# 推荐版本: v16.0.0 或更高

# 检查npm版本
npm --version
# 推荐版本: v7.0.0 或更高

# 检查系统内存
# 推荐: 至少4GB RAM
```

### 第二步：基础环境配置

#### 1. 创建配置文件

```bash
# 复制环境配置模板
cp .env.example .env

# 编辑配置文件
notepad .env  # Windows
# 或
nano .env     # Linux/Mac
```

#### 2. 基础配置参数

编辑 `.env` 文件，设置以下基础参数：

```env
# 数据库配置
DB_PATH=./data/opinion.db

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/system.log

# 数据采集配置
COLLECTION_INTERVAL=30
MAX_KEYWORDS=10

# 系统配置
MAX_CONCURRENT_TASKS=5
CACHE_TTL=3600
```

### 第三步：LLM API配置（可选但推荐）

#### 1. OpenAI API配置

```env
# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here
ANALYSIS_MODEL=gpt-3.5-turbo
MAX_ANALYSIS_TOKENS=2000
```

获取OpenAI API密钥：
1. 访问 [OpenAI官网](https://platform.openai.com/)
2. 注册账户并登录
3. 进入API Keys页面
4. 创建新的API密钥

#### 2. 其他LLM提供商配置

##### Claude API配置
```env
# Claude API配置
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-sonnet-20240229
```

##### 本地LLM配置
```env
# 本地LLM配置（使用Ollama）
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama2:7b
```

### 第四步：社交媒体平台配置

#### 1. 微博Cookie配置

```env
# 微博Cookie（可选，用于获取更真实的数据）
WEIBO_COOKIE=your_weibo_cookie_here
```

获取微博Cookie方法：
1. 登录微博网页版
2. 打开浏览器开发者工具 (F12)
3. 切换到Application/Storage标签
4. 找到Cookies，复制所有cookie值

#### 2. 代理配置（可选）

```env
# 代理配置（如果需要）
PROXY_HOST=
PROXY_PORT=
PROXY_USERNAME=
PROXY_PASSWORD=
```

---

## 🔧 环境准备

### 第一步：安装依赖

```bash
# 安装项目依赖
npm install

# 安装开发依赖（如果需要开发）
npm install --save-dev
```

### 第二步：初始化数据库

```bash
# 运行数据库初始化脚本
npm run db:init

# 或手动创建数据目录
mkdir data
mkdir logs
```

### 第三步：验证基础环境

```bash
# 检查系统状态
npm run cli:v2 -- status

# 应该看到系统状态报告
```

---

## 🧪 功能测试

### 测试1：基础数据收集

```bash
# 测试基础数据收集
npm run cli:v2 -- collect --keywords "测试" --platforms "news" --max-results 5

# 测试时间线显示
npm run cli:v2 -- collect --keywords "人工智能" --platforms "social" --max-results 8 --timeline
```

### 测试2：AI分析功能

```bash
# 基础AI分析
npm run cli:v2 -- analyze --keywords "春节,放假" --platforms "news" --max-results 10

# 带时间线预览的分析
npm run cli:v2 -- analyze --keywords "疫情,防控" --platforms "social" --max-results 15 --show-timeline
```

### 测试3：LLM增强分析（需要API密钥）

```bash
# 配置LLM API后测试
export LLM_API_KEY="your-api-key"
export LLM_PROVIDER="openai"

# 运行LLM增强分析
npm run cli:v2 -- analyze --keywords "人工智能,就业" --platforms "social" --max-results 20 --llm-enhanced
```

### 测试4：时间线分析

```bash
# 详细时间线分析
npm run cli:v2 -- timeline --keywords "科技发展,创新" --platforms "news,weibo" --max-results 12

# 指定时间范围
npm run cli:v2 -- timeline --keywords "热点事件" --platforms "social" --max-results 20 --time-range 7d
```

---

## ⚡ 性能测试

### 第一步：基准测试

```bash
# 运行性能基准测试
npm run cli:v2 -- benchmark --test all --iterations 5

# 测试特定模块
npm run cli:v2 -- benchmark --test data-collection --iterations 3
npm run cli:v2 -- benchmark --test ai-analysis --iterations 3
```

### 第二步：压力测试

```bash
# 大量数据测试
npm run cli:v2 -- analyze --keywords "测试" --platforms "news,social" --max-results 100

# 并发测试（同时运行多个实例）
# 在多个终端中运行
npm run cli:v2 -- collect --keywords "并发测试1" --platforms "news" --max-results 50 &
npm run cli:v2 -- collect --keywords "并发测试2" --platforms "social" --max-results 50 &
```

### 第三步：内存和性能监控

```bash
# 监控内存使用
node --inspect src/cli/index-v2-simple.js analyze --keywords "监控测试" --platforms "news" --max-results 30

# 使用性能分析工具
node --prof src/cli/index-v2-simple.js status
```

---

## 🔍 功能验证检查清单

### ✅ 基础功能验证

- [ ] 系统状态检查正常
- [ ] 数据收集功能正常
- [ ] AI分析功能正常
- [ ] 时间线显示正常
- [ ] CLI界面响应正常

### ✅ 高级功能验证

- [ ] LLM增强分析（需要API密钥）
- [ ] 多轮验证机制
- [ ] Skills集成效果
- [ ] 多平台数据获取
- [ ] 实时数据更新

### ✅ 性能指标验证

- [ ] 响应时间 < 5秒
- [ ] 内存使用 < 500MB
- [ ] 并发处理能力正常
- [ ] 错误处理机制完善
- [ ] 系统稳定性良好

---

## 🚨 故障排除

### 常见问题1：数据收集失败

**症状**: 无法获取数据或数据量很少

**解决方案**:
```bash
# 检查网络连接
ping www.baidu.com

# 检查日志
npm run cli:v2 -- status

# 使用模拟数据测试
npm run cli:v2 -- collect --keywords "测试" --platforms "news" --max-results 3
```

### 常见问题2：LLM分析失败

**症状**: LLM分析功能无法使用

**解决方案**:
```bash
# 检查API密钥
env | grep LLM

# 测试API连接
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models

# 切换到模拟模式
export USE_SIMULATED_LLM=true
```

### 常见问题3：内存使用过高

**症状**: 系统内存使用超过1GB

**解决方案**:
```bash
# 减少并发任务数量
export MAX_CONCURRENT_TASKS=2

# 减少批处理大小
export BATCH_SIZE=3

# 清理缓存
rm -rf data/cache/*
```

### 常见问题4：分析结果不准确

**症状**: 分析置信度低或结果不合理

**解决方案**:
```bash
# 增加数据量
npm run cli:v2 -- analyze --keywords "测试" --platforms "news,social" --max-results 50

# 调整分析参数
export ANALYSIS_CONFIDENCE_THRESHOLD=0.8
export MAX_ANALYSIS_ITERATIONS=10
```

---

## 💡 最佳实践

### 1. 配置优化建议

```env
# 生产环境推荐配置
LOG_LEVEL=warn              # 减少日志输出
MAX_CONCURRENT_TASKS=3      # 适中的并发数
CACHE_TTL=7200              # 延长缓存时间
ANALYSIS_CONFIDENCE_THRESHOLD=0.75  # 合适的置信度阈值
```

### 2. 使用建议

- **数据收集**: 建议每次收集20-50条数据，避免API限制
- **关键词选择**: 使用具体、明确的关键词，避免过于宽泛
- **平台选择**: 根据分析目标选择合适的平台组合
- **时间范围**: 根据舆情时效性选择合适的时间窗口

### 3. 监控和维护

```bash
# 定期检查系统状态
npm run cli:v2 -- status

# 清理过期日志
find logs -name "*.log" -mtime +7 -delete

# 备份重要数据
cp data/opinion.db data/opinion.db.backup
```

### 4. 安全建议

- 不要在代码中硬编码API密钥
- 定期更换API密钥
- 使用HTTPS协议进行API调用
- 限制API密钥的权限范围

---

## 📞 技术支持

如果遇到无法解决的问题，请提供以下信息：

1. **系统环境**: Node.js版本、操作系统
2. **错误日志**: 完整的错误堆栈
3. **配置文件**: 脱敏后的.env文件
4. **复现步骤**: 详细的操作步骤
5. **预期结果**: 您期望的行为

---

**🎉 恭喜！** 完成以上配置和测试后，您的舆情研判系统就可以正式投入使用了！

系统特色功能：
- ✅ 多平台数据收集
- ✅ LLM增强AI分析
- ✅ 多Agent协作机制
- ✅ 智能时间线展示
- ✅ 企业级稳定性

祝您使用愉快！ 🚀