# 舆情研判系统V1 CLI版本

一个基于Node.js的智能舆情分析系统，支持多Agent协作、多轮验证和自动进化功能。

## 功能特性

### 🎯 核心功能
- **数据采集**: 自动抓取微博相关数据
- **AI分析引擎**: 多Agent智能分析（情感分析、主题提取、风险评估）
- **多轮验证**: 多轮分析验证，提高结果准确性
- **自动进化**: 基于反馈自动优化分析策略
- **CLI界面**: 友好的命令行交互界面

### 🤖 Agent系统
- **情感分析Agent**: 分析文本情感倾向
- **主题提取Agent**: 识别热门话题和关键词
- **风险评估Agent**: 评估潜在舆情风险

### ⚡ Skill系统
- **数据清洗技能**: 智能数据预处理
- **自动进化**: 基于性能反馈自动优化
- **自适应学习**: 根据分析结果调整策略

## 快速开始

### 1. 安装依赖
```bash
cd public-opinion-system
npm install
```

### 2. 配置环境
复制环境配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的参数：
```bash
# 微博Cookie（用于数据采集）
WEIBO_COOKIE=your_weibo_cookie_here

# OpenAI API Key（用于AI分析）
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 初始化系统
```bash
npm run cli init
```

### 4. 开始分析
```bash
# 交互模式
npm run cli analyze -- --interactive

# 命令行模式
npm run cli analyze -- -k "华为,小米,苹果" -p "weibo" -m 50 -t "24h"
```

## 使用说明

### CLI命令

#### 分析命令
```bash
# 基础分析
pos analyze -k "关键词1,关键词2"

# 高级选项
pos analyze -k "华为" -p "weibo" -m 100 -t "24h" --interactive
```

参数说明：
- `-k, --keywords`: 关键词列表，逗号分隔
- `-p, --platforms`: 平台列表（默认：weibo）
- `-m, --max-results`: 最大结果数（默认：100）
- `-t, --time-range`: 时间范围（1h, 6h, 24h, 7d）
- `-i, --interactive`: 交互模式

#### 系统管理
```bash
# 查看系统状态
pos status

# 查看配置
pos config --show

# 查看历史记录
pos history --limit 10
```

### 系统架构

```
public-opinion-system/
├── src/
│   ├── data-collection/     # 数据采集模块
│   │   ├── collector.js     # 数据采集主模块
│   │   └── weibo-scraper.js # 微博数据抓取器
│   ├── ai-analysis/         # AI分析引擎
│   │   ├── analyzer.js      # 分析主模块
│   │   ├── base-agent.js    # Agent基类
│   │   ├── sentiment-agent.js # 情感分析Agent
│   │   ├── topic-agent.js   # 主题提取Agent
│   │   ├── risk-assessment-agent.js # 风险评估Agent
│   │   └── validation-engine.js # 验证引擎
│   ├── services/            # 服务模块
│   │   ├── skill-manager.js # 技能管理器
│   │   └── skill-integration.js # 技能集成
│   ├── skills/              # 技能模块
│   │   └── data-cleaning-skill.js # 数据清洗技能
│   ├── utils/               # 工具模块
│   │   ├── logger.js        # 日志工具
│   │   └── database.js      # 数据库工具
│   └── cli/                 # CLI界面
│       └── index.js         # CLI主程序
├── config/                  # 配置文件
├── logs/                    # 日志文件
├── data/                    # 数据文件
└── skills/                  # 技能存储
```

## 高级功能

### 多轮分析验证
系统会自动进行多轮分析，每轮都会验证结果的准确性，并根据验证结果进行优化。

### 自动进化
基于分析性能和用户反馈，系统会自动优化：
- 数据清洗策略
- Agent分析参数
- 验证规则

### Skill系统
Skill系统提供可插拔的功能模块：
- **自动注册**: 新技能自动注册到系统
- **性能监控**: 实时监控技能执行效果
- **自动进化**: 基于性能数据自动优化技能

## 配置说明

### 环境变量
```bash
# 数据库配置
DB_PATH=./data/opinion.db

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/system.log

# 数据采集配置
WEIBO_COOKIE=your_weibo_cookie_here
COLLECTION_INTERVAL=30
MAX_KEYWORDS=10

# AI分析配置
OPENAI_API_KEY=your_openai_api_key_here
ANALYSIS_MODEL=gpt-3.5-turbo
MAX_ANALYSIS_TOKENS=2000

# 系统配置
MAX_CONCURRENT_TASKS=5
CACHE_TTL=3600
```

### 微博Cookie获取
1. 登录微博网页版
2. 打开浏览器开发者工具
3. 在Network标签中找到任意请求
4. 复制请求头中的Cookie值

## 开发指南

### 添加新的Agent
1. 继承 `BaseAgent` 类
2. 实现 `process` 方法
3. 在 `AIAnalyzer` 中注册新Agent

### 添加新的Skill
1. 创建技能类，实现 `execute` 方法
2. 在 `SkillIntegration` 中注册技能
3. 在适当的地方调用技能

### 自定义验证规则
1. 在 `ValidationEngine` 中添加验证方法
2. 在验证规则中注册新方法

## 故障排除

### 常见问题

1. **数据采集失败**
   - 检查微博Cookie是否有效
   - 检查网络连接
   - 查看日志文件获取详细信息

2. **分析结果不准确**
   - 增加数据量
   - 调整分析参数
   - 检查Agent配置

3. **技能进化失败**
   - 检查技能配置
   - 查看性能数据
   - 手动调整进化参数

### 日志查看
```bash
# 查看系统日志
tail -f logs/system.log

# 查看特定日期的日志
cat logs/system.log | grep "2024-01-01"
```

## 性能优化

### 数据采集优化
- 使用代理池避免被封
- 设置合理的采集间隔
- 实现数据缓存机制

### 分析性能优化
- 使用并行处理
- 实现结果缓存
- 优化Agent算法

## 安全考虑

- 妥善保管API密钥和Cookie
- 定期更新敏感信息
- 限制访问权限
- 加密存储敏感数据

## 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🎯 基础数据采集功能
- 🤖 多Agent AI分析引擎
- ⚡ 自动进化Skill系统
- 📊 友好的CLI界面

## 贡献指南

欢迎提交Issue和Pull Request来改进系统。

### 开发环境搭建
```bash
git clone <repository>
cd public-opinion-system
npm install
npm run dev
```

### 提交规范
- 使用语义化版本号
- 编写清晰的提交信息
- 添加适当的测试用例
- 更新相关文档

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件
- 加入讨论组

---

**舆情研判系统V1** - 让舆情分析更智能、更高效！ 🚀