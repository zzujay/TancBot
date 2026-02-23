# TancBot 舆情研判系统

一个基于Node.js的智能舆情分析系统，支持多Agent协作、大语言模型(LLM)驱动分析、多轮验证和自动进化功能。

## 🌟 功能特性

### 🎯 核心功能
- **数据采集**: 自动抓取微博相关数据（支持二维码登录）
- **V2多Agent协作引擎**: 基于大语言模型的智能分析系统
- **LLM驱动分析**: 集成千问(Qwen)等大模型，实现纯AI驱动的舆情分析
- **多轮验证**: 多轮分析验证，交叉校验提高结果准确性
- **自动进化**: 基于反馈自动优化分析策略
- **CLI界面**: 友好的命令行交互界面

### 🤖 V2多Agent系统

V2版本采用多Agent协作架构，各Agent专注于特定分析维度：

| Agent | 职责 | 技术特点 |
|-------|------|----------|
| **事实梳理智能体** | 提取客观事实、构建时间线 | 纯LLM驱动，自动识别实体和事件 |
| **情绪态度分析智能体** | 分析公众情绪倾向和演变 | 识别情绪拐点和传播阶段 |
| **传播路径分析智能体** | 分析传播特征和关键节点 | 追踪传播路径和意见领袖 |
| **风险影响研判智能体** | 评估舆情风险等级 | 多维度风险评估 |
| **事件经过整合智能体** | 整合所有分析结果 | 生成完整、连贯的事件经过 |

### ⚡ 支撑系统
- **研判调度智能体**: 协调各Agent工作，管理分析流程
- **交叉校验智能体**: 验证各Agent结果的一致性
- **迭代优化智能体**: 生成优化指导，提升分析质量

### 🔧 技术亮点
- **纯LLM驱动**: 核心分析Agent完全基于大语言模型，无需规则引擎
- **时间线智能排序**: 自动识别和修正时间逻辑，确保事件顺序正确
- **事件经过整合**: 解决"事实碎片化"问题，输出完整的事件叙事
- **并发控制**: LLM客户端支持并发限制和智能重试

## 🚀 快速开始

### 1. 安装依赖
```bash
cd TancBot
npm install
```

### 2. 配置环境
复制环境配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的参数：
```bash
# 千问LLM API配置（用于AI分析）
QWEN_API_KEY=your_qwen_api_key_here
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# LLM模型配置
LLM_PROVIDER=qwen
LLM_MODEL=qwen-turbo
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7
```

### 3. 启动系统
```bash
# 启动CLI
npm start

# 或使用tancbot命令
tancbot
```

### 4. 开始分析
在CLI中输入：
```bash
# 分析舆情事件
analyze 福建老太太摔倒，初中生帮扶事件

# 指定最大结果数
analyze 华为发布会 --max 20
```

## 📖 使用说明

### CLI命令

#### 分析命令
```bash
# 基础分析（自动采集数据并分析）
analyze 关键词事件描述

# 示例
analyze 福建一老太太摔倒，两初中生帮扶，被交警判次要责任
```

#### 系统管理
```bash
# 查看系统状态
status

# 查看帮助
help

# 退出系统
exit
```

### 分析结果说明

系统会输出以下分析维度：

1. **📖 事件经过**: 完整的事件叙事（背景→导火索→发展过程→当前状态）
2. **📋 客观事实**: 提取的实体、时间线、关键行为
3. **💬 情绪分析**: 整体情绪倾向、情绪分布、情绪拐点
4. **📡 传播分析**: 传播路径、关键节点、传播阶段
5. **⚠️ 风险研判**: 风险等级、发展趋势、应对建议
6. **💡 关键洞察**: 系统生成的深度洞察和建议

## 🏗️ 系统架构

```
TancBot/
├── src/
│   ├── ai-analysis/           # AI分析引擎
│   │   ├── v2/               # V2多Agent协作架构
│   │   │   ├── specialists/  # 专业分析Agent
│   │   │   │   ├── fact-agent.js          # 事实梳理智能体
│   │   │   │   ├── emotion-agent.js       # 情绪态度分析智能体
│   │   │   │   ├── propagation-agent.js   # 传播路径分析智能体
│   │   │   │   ├── risk-agent.js          # 风险影响研判智能体
│   │   │   │   └── event-narrative-agent.js # 事件经过整合智能体
│   │   │   ├── validators/   # 校验Agent
│   │   │   │   └── cross-validator.js     # 交叉校验智能体
│   │   │   ├── optimizers/   # 优化Agent
│   │   │   │   └── iteration-optimizer.js # 迭代优化智能体
│   │   │   ├── coordinator-agent.js       # 研判调度智能体
│   │   │   ├── v2-analysis-engine.js      # V2分析引擎
│   │   │   └── base-agent-v2.js           # Agent基类
│   │   └── analyzer.js       # V1分析引擎（兼容）
│   ├── data-collection/       # 数据采集模块
│   │   ├── real-data-collector-v2.js  # 微博数据采集器
│   │   └── weibo-scraper.js   # 微博爬虫
│   ├── services/              # 服务模块
│   │   ├── llm-client.js      # LLM客户端（千问API）
│   │   ├── skill-manager.js   # 技能管理器
│   │   └── realtime-monitor.js # 实时监控
│   ├── cli/                   # CLI界面
│   │   ├── tancbot.js         # CLI主程序
│   │   └── index.js           # 入口
│   └── utils/                 # 工具模块
│       ├── logger.js          # 日志工具
│       ├── config-manager.js  # 配置管理
│       └── error-handler.js   # 错误处理
├── data/                      # 数据文件
├── logs/                      # 日志文件
└── skills/                    # 技能存储
```

## 🔧 配置说明

### 环境变量

#### LLM配置（必需）
```bash
# 千问API配置
QWEN_API_KEY=your_api_key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型参数
LLM_PROVIDER=qwen
LLM_MODEL=qwen-turbo
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7
LLM_TIMEOUT=30000
MAX_CONCURRENT_REQUESTS=3
```

#### 数据采集配置
```bash
# 采集参数
COLLECTION_INTERVAL=30
MAX_KEYWORDS=10
MAX_CONCURRENT_REQUESTS=5
ANALYSIS_BATCH_SIZE=5
```

#### 系统配置
```bash
# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/system.log

# 数据库配置（当前使用JSON文件）
DB_PATH=./data

# 系统参数
MAX_CONCURRENT_TASKS=5
CACHE_TTL=3600
```

## 🛠️ 开发指南

### 添加新的Agent

1. 继承 `BaseAgentV2` 类
2. 实现 `process` 方法
3. 在 `V2AnalysisEngine` 中注册新Agent

```javascript
const BaseAgentV2 = require('./base-agent-v2');

class MyAgent extends BaseAgentV2 {
  constructor() {
    super('我的智能体', '描述', 'analyzer');
  }

  async process(data, context) {
    // 实现分析逻辑
    return {
      confidence: 0.9,
      result: {...}
    };
  }
}
```

### 自定义LLM提示词

修改对应Agent的 `systemPrompt`：

```javascript
const systemPrompt = `你是专业的分析师...

分析要求：
1. ...
2. ...

输出JSON格式：
{
  "field1": "...",
  "field2": "..."
}`;
```

## 📊 性能优化

### LLM调用优化
- **并发控制**: 最多3个并发请求，防止API限流
- **智能重试**: 指数退避策略，最多3次重试
- **批量处理**: 支持批量数据分析

### 数据采集优化
- 使用Playwright模拟真实浏览器行为
- 支持二维码登录，避免Cookie过期
- 自动去重和增量采集

## 🔒 安全考虑

- ✅ `.env` 文件已添加到 `.gitignore`，防止敏感信息泄露
- ✅ Cookie文件自动加密存储
- ⚠️ 请妥善保管API密钥，不要提交到代码仓库
- ⚠️ 定期更新敏感信息

## 📝 更新日志

### v2.0.0 (2025-02-23)
- ✨ **V2多Agent协作系统**: 全新架构，支持5个专业分析Agent
- 🤖 **LLM驱动分析**: 集成千问大模型，纯AI驱动分析
- 📖 **事件经过整合**: 解决事实碎片化问题，输出完整叙事
- ⏱️ **智能时间排序**: 自动识别和修正时间线逻辑
- 🔄 **多轮迭代优化**: 交叉校验和迭代指导，提升分析质量
- 🛡️ **安全增强**: 添加.gitignore保护敏感配置

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🎯 基础数据采集功能
- 🤖 V1单Agent分析引擎
- ⚡ 自动进化Skill系统
- 📊 CLI交互界面

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进系统。

### 开发环境搭建
```bash
git clone <repository>
cd TancBot
npm install
npm start
```

### 提交规范
- 使用语义化版本号
- 编写清晰的提交信息
- 添加适当的测试用例
- 更新相关文档

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📮 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件
- 加入讨论组

---

**TancBot** - 让舆情分析更智能、更高效！ 🚀
