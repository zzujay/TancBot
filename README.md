# TancBot 舆情研判系统 V1

基于AI的微博舆情分析与研判系统，支持多Agent智能分析。

## 功能特性

- 📱 **微博数据采集** - 支持二维码登录，自动采集微博数据
- 📊 **时间线整理** - 按时间顺序整理舆情数据
- 🤖 **LLM多Agent分析** - 情感分析、主题建模、风险评估
- 📝 **研判报告生成** - 自动生成结构化研判报告
- 💻 **交互式CLI** - 支持连续分析多个话题

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/tancbot.git
cd tancbot

# 安装依赖
npm install

# 安装全局命令
npm link
```

### 配置

创建 `.env` 文件并配置API密钥：

```env
# 通义千问API配置（推荐）
QWEN_API_KEY=your_qwen_api_key_here
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-turbo
```

#### 获取通义千问API密钥

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 注册/登录阿里云账号
3. 开通"模型服务灵积"
4. 创建API Key

### 使用

```bash
# 启动系统
tancbot
```

## 命令说明

| 命令 | 说明 |
|------|------|
| `<话题>` | 直接输入话题进行分析 |
| `analyze <话题>` | 分析指定话题的舆情 |
| `status` | 查看系统状态 |
| `help` | 显示帮助信息 |
| `exit` / `quit` | 退出程序 |

## 使用示例

```
🤖 欢迎使用 TancBot 舆情研判系统
输入 "help" 查看帮助，输入 "exit" 退出

🚀 TancBot 舆情研判系统 V1
==================================================
✔ 系统初始化完成！

tancbot> 年轻人不结婚
📱 检测到未登录，开始微博登录流程...
💡 请使用手机微博扫描上方二维码
✅ 微博登录成功！
收集到 10 条数据
AI分析完成

📋 舆情事件研判报告
============================================================
📝 分析话题: 年轻人不结婚
📅 分析时间: 2026/2/15 12:00:00

📊 分析结果
----------------------------------------
💬 情感分析:
   整体情感: 😟 -0.45
   置信度: 90.0%

⚠️ 风险评估:
   风险等级: 🟢 low
   风险评分: 0.30

💡 关键洞察:
   • LLM检测到较多负面情绪，建议关注用户不满的具体原因

tancbot> 爱泼斯坦名单披露
tancbot> exit
👋 感谢使用 TancBot，再见！
```

## 项目结构

```
tancbot/
├── src/
│   ├── ai-analysis/          # AI分析模块
│   │   ├── enhanced-analyzer.js
│   │   ├── llm-agent.js
│   │   ├── llm-risk-agent.js
│   │   ├── llm-sentiment-agent.js
│   │   └── llm-topic-agent.js
│   ├── cli/                  # 命令行界面
│   │   └── tancbot.js
│   ├── data-collection/      # 数据采集
│   │   ├── real-data-collector-v2.js
│   │   └── weibo-playwright-qr-searcher.js
│   ├── monitoring/           # 监控模块
│   ├── services/             # 服务模块
│   ├── skills/               # 技能模块
│   └── utils/                # 工具模块
├── data/                     # 数据存储
├── logs/                     # 日志文件
├── .env                      # 环境变量配置
├── .env.example              # 环境变量示例
├── package.json
└── README.md
```

## 技术栈

- **Node.js** - 运行环境
- **Playwright** - 浏览器自动化
- **通义千问 API** - LLM分析
- **Chalk** - 终端美化
- **Ora** - 进度指示器

## 常见问题

### Q: 二维码不显示或显示异常？
确保终端窗口足够大，尝试调整终端字体大小。

### Q: 登录超时？
二维码有效期90秒，如果超时请重新运行命令。

### Q: API调用失败？
检查`.env`文件中的API密钥是否正确，确认API余额是否充足。

### Q: 搜索结果为空？
尝试更换关键词或增加搜索结果数量。

## 版本历史

### V1.0.0 (2026-02-15)
- ✅ 微博数据采集（二维码登录）
- ✅ LLM多Agent分析（情感、主题、风险）
- ✅ 研判报告生成
- ✅ 交互式CLI命令
- ✅ 连续分析多个话题
- ✅ 后台浏览器运行

## 许可证

MIT License

## 作者

TancBot Team
