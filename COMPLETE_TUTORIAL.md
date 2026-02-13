# 🚀 舆情研判系统 - 完整配置与使用教程

## 📋 目录
1. [快速开始](#快速开始)
2. [系统配置](#系统配置)
3. [基础使用](#基础使用)
4. [高级功能](#高级功能)
5. [LLM配置](#llm配置)
6. [最佳实践](#最佳实践)
7. [故障排除](#故障排除)
8. [性能优化](#性能优化)

---

## 🚀 快速开始

### 第一步：系统检查

```bash
# 检查Node.js版本（推荐v16+）
node --version

# 检查npm版本（推荐v7+）
npm --version

# 检查系统状态
npm run cli:v2 -- status
```

### 第二步：基础配置

```bash
# 运行配置向导
node simple-configure.js

# 或手动创建配置文件
cp .env.example .env
```

### 第三步：基础测试

```bash
# 测试数据收集
npm run cli:v2 -- collect --keywords "测试" --platforms "news" --max-results 5

# 测试AI分析
npm run cli:v2 -- analyze --keywords "人工智能" --platforms "news" --max-results 10
```

### 第四步：完整演示

```bash
# 运行完整功能演示
node comprehensive-demo.js
```

---

## ⚙️ 系统配置

### 基础配置（.env文件）

```env
# 数据库配置
DB_PATH=./data/opinion.db
LOG_LEVEL=info
LOG_FILE=./logs/system.log

# 数据采集配置
COLLECTION_INTERVAL=30
MAX_KEYWORDS=10
MAX_CONCURRENT_TASKS=5

# 分析配置
CACHE_TTL=3600
ANALYSIS_CONFIDENCE_THRESHOLD=0.75
MAX_ANALYSIS_ITERATIONS=5
```

### 高级配置

```env
# LLM配置（可选）
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.openai.com/v1
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=2000

# 性能优化
ENABLE_BATCH_PROCESSING=true
BATCH_SIZE=5
MAX_RETRIES=3
ENABLE_SKILLS=true
```

---

## 📊 基础使用

### 1. 数据收集

#### 基础数据收集
```bash
# 简单数据收集
npm run cli:v2 -- collect --keywords "热点事件" --platforms "news" --max-results 20

# 多平台数据收集
npm run cli:v2 -- collect --keywords "人工智能" --platforms "news,weibo,zhihu" --max-results 30
```

#### 带时间线的数据收集
```bash
# 显示时间线
npm run cli:v2 -- collect --keywords "科技发展" --platforms "social" --max-results 15 --timeline

# 指定时间范围
npm run cli:v2 -- collect --keywords "疫情" --platforms "news" --max-results 25 --time-range 7d
```

### 2. AI分析

#### 基础AI分析
```bash
# 简单分析
npm run cli:v2 -- analyze --keywords "人工智能" --platforms "news" --max-results 10

# 多关键词分析
npm run cli:v2 -- analyze --keywords "疫情,疫苗,防控" --platforms "news,social" --max-results 20
```

#### 增强AI分析
```bash
# 显示数据预览
npm run cli:v2 -- analyze --keywords "春节,放假" --platforms "social" --max-results 15 --show-timeline

# 详细分析
npm run cli:v2 -- analyze --keywords "科技发展" --platforms "news,weibo,zhihu" --max-results 30
```

### 3. 时间线分析

```bash
# 详细时间线
npm run cli:v2 -- timeline --keywords "热点话题" --platforms "news,social" --max-results 20

# 多关键词时间线
npm run cli:v2 -- timeline --keywords "人工智能,就业,教育" --platforms "news,weibo" --max-results 25
```

---

## 🎯 高级功能

### 1. 交互式界面

```bash
# 启动交互模式
npm run cli:v2

# 快速菜单选项
1. 📊 执行舆情分析
2. 📡 启动实时监控  
3. 📥 收集数据
4. 📋 查看系统状态
5. ⚙️  管理配置
6. 🏃 性能测试
7. 🚪 退出
```

### 2. 性能测试

```bash
# 运行所有性能测试
npm run cli:v2 -- benchmark --test all --iterations 5

# 测试特定模块
npm run cli:v2 -- benchmark --test data-collection --iterations 3
npm run cli:v2 -- benchmark --test ai-analysis --iterations 3
```

### 3. 系统监控

```bash
# 查看系统状态
npm run cli:v2 -- status

# 查看详细统计
npm run cli:v2 -- stats --detailed
```

---

## 🧠 LLM配置

### OpenAI配置

1. **获取API密钥**
   - 访问 [OpenAI官网](https://platform.openai.com/)
   - 注册账户并登录
   - 进入API Keys页面创建新密钥

2. **配置环境变量**
```bash
export OPENAI_API_KEY="your-api-key-here"
export LLM_PROVIDER="openai"
export LLM_MODEL="gpt-3.5-turbo"
```

3. **测试LLM功能**
```bash
# 运行LLM增强分析
npm run cli:v2 -- analyze --keywords "人工智能" --platforms "social" --max-results 20 --llm-enhanced
```

### Claude配置

1. **获取API密钥**
   - 访问 [Claude官网](https://console.anthropic.com/)
   - 注册账户并获取API密钥

2. **配置环境变量**
```bash
export CLAUDE_API_KEY="your-api-key-here"
export LLM_PROVIDER="claude"
export LLM_MODEL="claude-3-sonnet-20240229"
```

### 本地LLM配置

1. **安装Ollama**
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows (使用WSL)
wsl curl -fsSL https://ollama.com/install.sh | sh
```

2. **下载模型**
```bash
ollama pull llama2:7b
ollama pull mistral:7b
```

3. **配置环境变量**
```bash
export LOCAL_LLM_URL="http://localhost:11434"
export LOCAL_LLM_MODEL="llama2:7b"
export LLM_PROVIDER="local"
```

---

## 💡 最佳实践

### 1. 关键词选择

#### ✅ 推荐做法
- 使用具体、明确的关键词
- 组合相关关键词提高覆盖度
- 考虑同义词和近义词
- 根据业务场景定制关键词

#### ❌ 避免做法
- 过于宽泛的关键词（如"好"、"坏"）
- 单字关键词
- 特殊字符和表情符号
- 过长的关键词短语

**示例：**
```bash
# ✅ 好的关键词组合
npm run cli:v2 -- analyze --keywords "新能源汽车,电动车,特斯拉,比亚迪" --platforms "news,social" --max-results 30

# ❌ 避免的做法
npm run cli:v2 -- analyze --keywords "好,坏,行,不行" --platforms "news" --max-results 10
```

### 2. 平台选择策略

| 平台 | 适用场景 | 数据特点 |
|------|----------|----------|
| **微博** | 热点事件、公众话题 | 实时性强、传播快 |
| **知乎** | 深度讨论、专业话题 | 内容质量高、理性讨论 |
| **新闻** | 权威信息、官方观点 | 可信度高、覆盖面广 |
| **组合** | 全面分析 | 多维度、互补性强 |

### 3. 参数优化

#### 数据量优化
```bash
# 小规模测试（10-20条）
npm run cli:v2 -- collect --keywords "测试" --platforms "news" --max-results 15

# 中等规模分析（20-50条）
npm run cli:v2 -- analyze --keywords "人工智能" --platforms "news,social" --max-results 30

# 大规模分析（50-100条）
npm run cli:v2 -- timeline --keywords "疫情,防控,疫苗" --platforms "news,weibo,zhihu" --max-results 80
```

#### 时间范围优化
```bash
# 24小时内数据
npm run cli:v2 -- collect --keywords "突发事件" --platforms "news" --max-results 20 --time-range 24h

# 7天内数据（默认）
npm run cli:v2 -- collect --keywords "热点话题" --platforms "social" --max-results 25 --time-range 7d

# 30天内数据
npm run cli:v2 -- collect --keywords "长期趋势" --platforms "news" --max-results 50 --time-range 30d
```

---

## 🔧 故障排除

### 常见问题1：数据收集失败

**症状**：无法获取数据或数据量很少

**解决方案**：
```bash
# 1. 检查网络连接
ping www.baidu.com

# 2. 检查系统状态
npm run cli:v2 -- status

# 3. 使用模拟数据测试
npm run cli:v2 -- collect --keywords "测试" --platforms "news" --max-results 3

# 4. 检查日志
npm run cli:v2 -- status --show-logs
```

### 常见问题2：LLM分析失败

**症状**：LLM分析功能无法使用

**解决方案**：
```bash
# 1. 检查API密钥
env | grep LLM

# 2. 测试API连接
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models

# 3. 切换到模拟模式
export USE_SIMULATED_LLM=true

# 4. 检查API限制和配额
npm run cli:v2 -- status --check-api-limits
```

### 常见问题3：性能问题

**症状**：响应时间过长或内存使用过高

**解决方案**：
```bash
# 1. 减少并发任务
export MAX_CONCURRENT_TASKS=2

# 2. 减少批处理大小
export BATCH_SIZE=3

# 3. 清理缓存
rm -rf data/cache/*

# 4. 重启系统
npm run cli:v2 -- restart
```

### 常见问题4：结果不准确

**症状**：分析结果置信度低或不合理

**解决方案**：
```bash
# 1. 增加数据量
npm run cli:v2 -- analyze --keywords "测试" --platforms "news,social" --max-results 50

# 2. 调整置信度阈值
export ANALYSIS_CONFIDENCE_THRESHOLD=0.8

# 3. 使用多轮验证
export MAX_ANALYSIS_ITERATIONS=10

# 4. 检查关键词质量
npm run cli:v2 -- validate-keywords --keywords "your keywords"
```

---

## ⚡ 性能优化

### 1. 内存优化

```bash
# 限制内存使用
export NODE_OPTIONS="--max-old-space-size=2048"

# 优化垃圾回收
export NODE_OPTIONS="--expose-gc --optimize-for-size"

# 减少缓存大小
export CACHE_MAX_SIZE=100
export CACHE_TTL=1800
```

### 2. 并发优化

```bash
# 调整并发数
export MAX_CONCURRENT_TASKS=3
export MAX_CONCURRENT_REQUESTS=10

# 优化批处理
export BATCH_SIZE=5
export BATCH_INTERVAL=1000
```

### 3. 缓存优化

```bash
# 启用智能缓存
export ENABLE_SMART_CACHE=true
export CACHE_STRATEGY=LRU

# 配置缓存清理
export CACHE_CLEANUP_INTERVAL=3600
export CACHE_MAX_AGE=7200
```

### 4. 网络优化

```bash
# 配置重试策略
export MAX_RETRIES=3
export RETRY_DELAY=1000
export RETRY_BACKOFF=2

# 配置超时
export REQUEST_TIMEOUT=30000
export CONNECT_TIMEOUT=10000
```

---

## 📈 监控和维护

### 1. 系统监控

```bash
# 定期状态检查
npm run cli:v2 -- status --detailed

# 性能监控
npm run cli:v2 -- monitor --interval 60

# 资源使用监控
npm run cli:v2 -- monitor --resource-usage
```

### 2. 日志管理

```bash
# 查看系统日志
tail -f logs/system.log

# 清理过期日志
find logs -name "*.log" -mtime +7 -delete

# 日志轮转
npm run cli:v2 -- log --rotate --keep-days 30
```

### 3. 数据备份

```bash
# 备份数据库
cp data/opinion.db data/opinion.db.backup.$(date +%Y%m%d)

# 备份配置文件
cp .env .env.backup.$(date +%Y%m%d)

# 完整系统备份
tar -czf backup/opinion-system-$(date +%Y%m%d).tar.gz data/ logs/ .env
```

---

## 🎯 实际应用案例

### 案例1：品牌舆情监控

```bash
# 监控品牌声誉
npm run cli:v2 -- timeline --keywords "品牌名称,产品质量,客户服务" --platforms "news,weibo,zhihu" --max-results 50 --time-range 7d

# 分析竞品对比
npm run cli:v2 -- analyze --keywords "品牌A,品牌B,品牌C" --platforms "news,social" --max-results 30 --llm-enhanced
```

### 案例2：市场趋势分析

```bash
# 分析行业发展趋势
npm run cli:v2 -- analyze --keywords "新能源汽车,电动车,智能汽车" --platforms "news,zhihu" --max-results 40 --time-range 30d

# 监控政策影响
npm run cli:v2 -- timeline --keywords "政策,法规,监管" --platforms "news" --max-results 25 --show-timeline
```

### 案例3：危机预警管理

```bash
# 实时监控危机信号
npm run cli:v2 -- monitor --keywords "危机,事故,负面" --platforms "news,weibo" --threshold high --interval 30

# 紧急事件分析
npm run cli:v2 -- analyze --keywords "突发事件,紧急,事故" --platforms "news,social" --max-results 100 --urgency high
```

---

## 🏆 总结

本教程涵盖了舆情研判系统的完整配置和使用流程：

### ✅ 系统特色
- **多平台数据收集**：微博、知乎、新闻等主流平台
- **LLM增强AI分析**：情感、主题、风险三维一体分析
- **智能时间线展示**：直观的时间轴数据可视化
- **多轮验证机制**：渐进式置信度提升和共识构建
- **企业级稳定性**：模块化架构和完善的错误处理

### 🚀 快速上手
1. **系统检查**：`node simple-configure.js`
2. **基础测试**：`npm run cli:v2 -- status`
3. **数据收集**：`npm run cli:v2 -- collect --keywords "测试" --platforms "news"`
4. **AI分析**：`npm run cli:v2 -- analyze --keywords "人工智能" --platforms "social"`
5. **完整演示**：`node comprehensive-demo.js`

### 💡 最佳建议
- 从基础功能开始，逐步探索高级特性
- 配置真实LLM API以获得最佳分析效果
- 定期监控系统性能和资源使用情况
- 根据实际业务需求定制关键词和参数
- 建立完善的监控和维护机制

祝您使用愉快！如有问题，请参考故障排除章节或查看系统日志。 🎉