# 舆情研判系统V2版本文档

## 🚀 系统概述

舆情研判系统V2是基于V1版本的全面升级，采用微服务架构设计，提供更强的数据收集能力、更智能的AI分析引擎、更完善的实时监控系统和更友好的用户界面。

### 核心特性

- **🔄 微服务架构**: 模块化设计，支持独立部署和扩展
- **🌐 增强数据收集**: 支持多平台数据源，内置反爬虫机制
- **🤖 深度学习AI**: 集成BERT、LDA等先进模型
- **📊 实时监控**: WebSocket实时数据推送，异常检测和预警
- **🎨 现代化界面**: 响应式设计，支持移动端访问
- **🔧 智能运维**: 自动备份、性能监控、故障恢复
- **📈 技能进化**: 自动学习和优化分析能力

## 📋 目录结构

```
public-opinion-system/
├── src/
│   ├── data-collection/          # 数据收集模块
│   │   ├── advanced-collector.js   # 高级数据收集器
│   │   └── proxy-manager.js        # 代理池管理
│   ├── ai-analysis/                # AI分析模块
│   │   ├── enhanced-analyzer.js    # 增强分析器
│   │   ├── sentiment-agent.js      # 情感分析智能体
│   │   ├── topic-agent.js          # 主题分析智能体
│   │   └── risk-assessment-agent.js # 风险评估智能体
│   ├── monitoring/                 # 监控模块
│   │   ├── realtime-monitor.js     # 实时监控系统
│   │   └── performance-monitor.js  # 性能监控器
│   ├── skills/                     # 技能系统
│   │   ├── skill-manager.js        # 技能管理器
│   │   ├── skill-evolution.js      # 技能进化引擎
│   │   └── skills/                 # 具体技能实现
│   ├── web/                        # Web界面
│   │   ├── server.js               # Web服务器
│   │   ├── dashboard.html          # 监控面板
│   │   └── routes/                 # API路由
│   │       ├── data.js             # 数据管理API
│   │       ├── analysis.js         # 分析任务API
│   │       ├── realtime.js         # 实时监控API
│   │       └── system.js           # 系统管理API
│   ├── utils/                      # 工具模块
│   │   ├── config-manager.js       # 配置管理器
│   │   ├── error-handler.js        # 错误处理器
│   │   ├── logger.js               # 日志管理器
│   │   └── backup-manager.js       # 备份管理器
│   ├── index-v2.js                 # V2主程序
│   └── index.js                    # V1主程序（兼容）
├── data/                           # 数据存储
├── logs/                           # 日志文件
├── config/                         # 配置文件
├── backups/                        # 系统备份
└── docs/                           # 文档
```

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- 内存 >= 4GB（推荐8GB）
- 存储 >= 10GB 可用空间

### 安装依赖

```bash
cd public-opinion-system
npm install
```

### 启动系统

#### 基本启动
```bash
# 启动完整系统
node src/index-v2.js

# 指定端口
node src/index-v2.js --port 8080

# 调试模式
node src/index-v2.js --debug
```

#### 高级选项
```bash
# 仅启动Web界面
node src/index-v2.js --no-collector --no-analyzer

# 开发模式（启用详细日志）
node src/index-v2.js --dev

# 指定配置文件
node src/index-v2.js --config my-config.json
```

### 命令行工具

```bash
# 查看系统状态
node src/index-v2.js status

# 管理配置
node src/index-v2.js config --show    # 显示配置
node src/index-v2.js config --edit    # 编辑配置
node src/index-v2.js config --reset   # 重置配置

# 系统备份
node src/index-v2.js backup --data --config --logs

# 恢复备份
node src/index-v2.js restore backup_123456

# 停止系统
node src/index-v2.js stop
```

## 🔧 配置说明

### 系统配置 (config/system.json)

```json
{
  "system": {
    "name": "舆情研判系统V2",
    "version": "2.0.0",
    "environment": "production",
    "debug": false,
    "autoRestart": true
  },
  "dataCollection": {
    "maxResults": 1000,
    "requestDelay": 1000,
    "retryAttempts": 3,
    "proxyEnabled": true,
    "proxyPool": [
      "http://proxy1:8080",
      "http://proxy2:8080"
    ],
    "platforms": {
      "weibo": {
        "enabled": true,
        "rateLimit": 100,
        "timeout": 30000
      },
      "zhihu": {
        "enabled": true,
        "rateLimit": 50,
        "timeout": 25000
      }
    }
  },
  "aiAnalysis": {
    "modelType": "advanced",
    "confidenceThreshold": 0.8,
    "sentimentThreshold": 0.3,
    "riskThreshold": 0.7,
    "multiRoundValidation": true,
    "validationRounds": 3,
    "agents": {
      "sentiment": {
        "enabled": true,
        "model": "bert-base-chinese"
      },
      "topic": {
        "enabled": true,
        "model": "lda"
      },
      "risk": {
        "enabled": true,
        "model": "neural-network"
      }
    }
  },
  "monitoring": {
    "enabled": true,
    "checkInterval": 60000,
    "alertThreshold": 0.8,
    "autoRestart": true,
    "webSocket": {
      "enabled": true,
      "port": 3001
    }
  },
  "webInterface": {
    "enabled": true,
    "port": 3000,
    "host": "localhost",
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },
  "skills": {
    "autoEvolution": true,
    "evolutionInterval": 3600000,
    "maxSkills": 100,
    "learningRate": 0.01
  },
  "logging": {
    "level": "info",
    "file": "logs/system.log",
    "maxSize": "100m",
    "maxFiles": 10,
    "compress": true
  },
  "backup": {
    "enabled": true,
    "interval": 86400000,
    "retention": 30,
    "compress": true
  }
}
```

## 📊 API接口文档

### 数据管理 API

#### 获取数据列表
```http
GET /api/data?keyword=疫情&platform=weibo&sentiment=negative&limit=50&offset=0
```

#### 创建数据记录
```http
POST /api/data
Content-Type: application/json

{
  "content": "这是一条测试舆情数据",
  "platform": "weibo",
  "author": "用户123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 批量删除数据
```http
DELETE /api/data/batch
Content-Type: application/json

{
  "ids": ["id1", "id2", "id3"]
}
```

### 分析任务 API

#### 启动分析任务
```http
POST /api/analysis/start
Content-Type: application/json

{
  "keywords": ["疫情", "疫苗"],
  "platforms": ["weibo", "zhihu"],
  "maxResults": 100,
  "analysisType": "comprehensive"
}
```

#### 获取任务状态
```http
GET /api/analysis/status/:taskId
```

#### 获取分析结果
```http
GET /api/analysis/results/:taskId
```

### 实时监控 API

#### 获取实时数据
```http
GET /api/realtime/data?keywords=疫情&platforms=weibo&timeRange=1h
```

#### 获取监控指标
```http
GET /api/realtime/metrics
```

#### 获取预警信息
```http
GET /api/realtime/alerts
```

### 系统管理 API

#### 获取系统状态
```http
GET /api/system/status
```

#### 获取系统配置
```http
GET /api/system/config
```

#### 更新系统配置
```http
POST /api/system/config
Content-Type: application/json

{
  "system": {
    "debug": true
  }
}
```

#### 获取系统日志
```http
GET /api/system/logs?level=error&limit=100&startDate=2024-01-01
```

#### 系统健康检查
```http
GET /api/system/health
```

#### 创建系统备份
```http
POST /api/system/backup
Content-Type: application/json

{
  "includeData": true,
  "includeConfig": true,
  "includeLogs": false
}
```

#### 系统重启
```http
POST /api/system/restart
Content-Type: application/json

{
  "delay": 5
}
```

## 🎨 Web界面使用

### 监控面板

访问 `http://localhost:3000` 打开监控面板，包含：

- **📊 实时数据可视化**: 情感分析、话题分布、趋势图表
- **📈 关键指标**: 舆情指数、风险等级、活跃度统计
- **🚨 预警信息**: 异常检测、风险提醒、系统告警
- **🔍 数据查询**: 多条件筛选、导出功能、历史记录

### 实时通信

系统使用WebSocket提供实时数据推送：

```javascript
// 连接WebSocket
const socket = io('http://localhost:3000');

// 订阅实时数据
socket.emit('subscribe-realtime', {
  keywords: ['疫情', '疫苗'],
  platforms: ['weibo', 'zhihu']
});

// 接收实时更新
socket.on('realtime-update', (data) => {
  console.log('实时数据更新:', data);
});

// 接收预警信息
socket.on('realtime-alert', (alert) => {
  console.log('预警信息:', alert);
});
```

## 🤖 AI分析引擎

### 多智能体架构

系统采用多智能体协同工作模式：

#### 情感分析智能体 (SentimentAgent)
- **模型**: BERT-base-chinese
- **功能**: 文本情感倾向分析
- **输出**: 正面/负面/中性概率分布
- **准确率**: >90%

#### 话题分析智能体 (TopicAgent)
- **模型**: LDA主题模型
- **功能**: 话题发现和聚类
- **输出**: 话题分布和关键词
- **主题数**: 动态调整

#### 风险评估智能体 (RiskAssessmentAgent)
- **模型**: 神经网络
- **功能**: 舆情风险等级评估
- **输出**: 风险等级和置信度
- **等级**: 低/中/高/极高

### 多轮验证机制

```javascript
// 第一轮：初步分析
const round1 = await analyzer.analyze(content);

// 第二轮：交叉验证
const round2 = await validator.validate(round1);

// 第三轮：专家审核
const round3 = await expert.review(round2);

// 最终结果
const finalResult = consensus.aggregate([round1, round2, round3]);
```

### 技能自动进化

系统自动收集反馈并优化分析能力：

```javascript
// 技能进化流程
const evolution = {
  collectFeedback: true,      // 收集用户反馈
  analyzePerformance: true, // 分析性能指标
  adjustParameters: true,   // 调整模型参数
  updateModels: true,       // 更新模型权重
  validateImprovement: true // 验证改进效果
};
```

## 📈 性能优化

### 数据收集优化

- **代理池轮换**: 自动切换IP避免被封
- **请求频率控制**: 智能调节请求间隔
- **缓存机制**: 减少重复数据获取
- **增量更新**: 只获取更新的数据

### AI分析优化

- **模型量化**: 减少模型大小和内存占用
- **批处理**: 批量处理提高吞吐量
- **异步处理**: 非阻塞分析流程
- **结果缓存**: 避免重复分析相同内容

### 系统监控

- **内存监控**: 实时内存使用统计
- **性能指标**: CPU、磁盘、网络监控
- **异常检测**: 自动发现和报告异常
- **自动恢复**: 故障自动重启和恢复

## 🔒 安全特性

### 数据安全

- **数据加密**: 敏感数据加密存储
- **访问控制**: 基于角色的权限管理
- **审计日志**: 完整的操作记录
- **数据脱敏**: 个人信息自动脱敏

### 系统安全

- **输入验证**: 严格的输入检查和过滤
- **SQL注入防护**: 参数化查询
- **XSS防护**: 输出编码和过滤
- **CSRF防护**: 令牌验证机制

## 🐛 故障排除

### 常见问题

#### 1. 启动失败
```bash
# 检查Node.js版本
node --version

# 检查依赖安装
npm install

# 检查端口占用
netstat -an | grep 3000
```

#### 2. 数据收集失败
```bash
# 检查网络连接
ping www.weibo.com

# 检查代理配置
cat config/system.json | grep proxy

# 查看错误日志
tail -f logs/system.log
```

#### 3. AI分析错误
```bash
# 检查模型文件
ls -la data/models/

# 检查内存使用
free -h

# 重启分析服务
node src/index-v2.js --no-collector --no-monitor
```

### 日志分析

系统提供详细的日志记录：

```bash
# 查看系统日志
tail -f logs/system.log

# 查看错误日志
grep ERROR logs/system.log

# 查看特定模块日志
grep "数据收集器" logs/system.log
```

## 📚 开发指南

### 添加新的数据源

```javascript
// 创建新的收集器
class NewPlatformCollector extends BaseCollector {
  async collect(keywords, options) {
    // 实现数据收集逻辑
    const data = await this.fetchData(keywords);
    return this.parseData(data);
  }
}

// 注册收集器
const collector = new AdvancedDataCollector();
collector.registerCollector('newPlatform', new NewPlatformCollector());
```

### 添加新的AI模型

```javascript
// 创建新的智能体
class NewAnalysisAgent extends BaseAgent {
  async analyze(content) {
    // 实现分析逻辑
    const result = await this.model.predict(content);
    return this.formatResult(result);
  }
}

// 注册智能体
const analyzer = new EnhancedAIAnalyzer();
analyzer.registerAgent('newAgent', new NewAnalysisAgent());
```

### 添加新的API接口

```javascript
// 创建新的路由
const newRoutes = require('./routes/new-feature');
app.use('/api/new-feature', newRoutes);
```

## 🔗 相关链接

- [V1版本文档](./README.md)
- [API详细文档](./API.md)
- [部署指南](./DEPLOYMENT.md)
- [开发文档](./DEVELOPMENT.md)
- [更新日志](./CHANGELOG.md)

## 📞 技术支持

如遇到问题，请通过以下方式获取帮助：

1. 查看系统日志：`logs/system.log`
2. 检查配置文件：`config/system.json`
3. 访问API文档：`http://localhost:3000/api/docs`
4. 查看帮助信息：`node src/index-v2.js --help`

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件

---

**⚡ 系统版本**: V2.0.0  
**📅 更新日期**: 2024年1月  
**👨‍💻 开发团队**: 舆情研判系统开发组