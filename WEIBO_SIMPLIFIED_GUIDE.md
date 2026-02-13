# 🎯 微博舆情系统简化版 - 使用指南

## 📋 系统概览

✅ **专注微博平台**：仅支持微博数据采集和分析
✅ **Cookie认证**：使用真实微博Cookie进行数据采集
✅ **国产LLM分析**：集成通义千问等国产大模型
✅ **无模拟数据**：所有数据均来自真实采集

## 🚀 快速开始

### 第一步：配置微博Cookie
```bash
# 使用简化版Cookie配置工具
node weibo-simple-login-tool.js
```

### 第二步：验证系统状态
```bash
# 检查系统状态和Cookie配置
npm run weibo:status
```

### 第三步：开始数据采集和分析
```bash
# 采集微博数据
npm run weibo:collect 人工智能

# 分析微博舆情
npm run weibo:analyze 新能源汽车
```

## 🛠️ 核心功能

### 1. 微博数据采集
```bash
# 基础采集
npm run weibo:collect 春节

# 指定采集数量
npm run weibo:collect 疫情 --max-results 50

# 保存采集结果
npm run weibo:collect 人工智能 --save
```

### 2. 微博舆情分析
```bash
# 关键词分析
npm run weibo:analyze 房价

# 内容分析
npm run weibo:analyze --content "某品牌发布了新产品..."

# 指定分析类型
npm run weibo:analyze 教育政策 --type sentiment
```

### 3. Cookie管理
```bash
# 配置Cookie
node weibo-simple-login-tool.js

# 检查Cookie状态
npm run weibo:status
```

## 📊 功能详解

### 🔍 数据采集功能
- **平台专注**：仅支持微博平台
- **真实数据**：所有数据来自微博真实采集
- **互动数据**：包含点赞、转发、评论数
- **时间信息**：精确的发布时间
- **作者信息**：微博用户名和认证信息

### 🤖 舆情分析功能
- **情感分析**：正面/负面/中性情感判断
- **风险评级**：1-10级风险评估
- **影响力评估**：1-10级影响力评分
- **主题提取**：自动识别主要话题
- **关键词提取**：核心关键词识别
- **趋势预测**：上升/稳定/下降趋势

### 🍪 Cookie认证
- **真实登录**：使用您的微博账号Cookie
- **自动验证**：验证Cookie有效性
- **过期提醒**：Cookie过期时自动提示
- **安全存储**：本地安全存储Cookie信息

## 🎯 使用场景

### 📈 品牌监控
```bash
# 监控品牌舆情
npm run weibo:collect 某品牌名称
npm run weibo:analyze 某品牌名称
```

### 🏛️ 政策分析
```bash
# 分析政策反响
npm run weibo:collect 新政策名称
npm run weibo:analyze 新政策名称 --type comprehensive
```

### 🌐 热点追踪
```bash
# 追踪社会热点
npm run weibo:collect 热点事件
npm run weibo:analyze 热点事件 --max-results 100
```

### 💰 市场研究
```bash
# 研究市场趋势
npm run weibo:collect 新能源汽车
npm run weibo:analyze 新能源汽车 --type risk
```

## 📋 命令参考

### 微博数据采集命令
```bash
npm run weibo:collect [关键词] [选项]

选项：
  --max-results, -m <数量>   最大采集数量（默认：20）
  --save, -s                保存结果到文件
  --help, -h                显示帮助信息
```

### 微博舆情分析命令
```bash
npm run weibo:analyze [关键词/内容] [选项]

选项：
  --keywords, -k <关键词>    要分析的关键词
  --content, -c <内容>       直接分析指定的文本内容
  --max-results, -m <数量>   最大分析数量（默认：30）
  --type <类型>              分析类型：comprehensive（综合）、sentiment（情感）、topics（主题）、risk（风险）
  --help, -h                 显示帮助信息
```

### Cookie管理命令
```bash
node weibo-simple-login-tool.js    # 配置Cookie
npm run weibo:status               # 检查状态
```

## 💡 最佳实践

### 🔧 配置建议
1. **Cookie获取**：使用真实微博账号获取Cookie
2. **采集频率**：合理设置采集间隔，避免频繁请求
3. **数据量**：根据需求设置合适的采集数量
4. **关键词选择**：使用具体、明确的关键词

### 📊 分析建议
1. **多维度分析**：综合使用情感、风险、影响力等指标
2. **趋势跟踪**：定期采集同一关键词，观察变化趋势
3. **对比分析**：对比不同关键词的舆情表现
4. **异常监控**：关注高风险和高影响力内容

### 🛡️ 合规建议
1. **遵守法规**：遵守数据采集相关法律法规
2. **尊重隐私**：妥善处理用户隐私信息
3. **合理使用**：避免过度采集和滥用数据
4. **平台规则**：遵守微博平台使用条款

## ⚠️ 注意事项

### Cookie相关
- Cookie有效期约30天，需要定期更新
- 一个Cookie可以同时用于多个关键词采集
- Cookie失效时会自动提示重新获取

### 数据采集
- 建议单次采集数量不超过100条
- 采集间隔建议设置为2-3秒
- 遇到网络问题会自动重试

### 分析限制
- 分析结果基于国产LLM模型，仅供参考
- 复杂语境可能需要人工判断
- 建议结合实际情况综合判断

## 🎊 总结

简化版微博舆情系统专注于微博平台，通过真实的Cookie认证获取数据，使用国产LLM进行智能分析，为您提供专业、准确的舆情研判服务。

**核心优势：**
- 🎯 **专注微博**：深度优化微博平台采集
- 🔐 **真实数据**：Cookie认证，数据真实可靠
- 🤖 **国产AI**：通义千问等国产大模型分析
- ⚡ **简单易用**：命令行操作，快速上手
- 📊 **多维分析**：情感、风险、影响力全方位分析

**立即开始使用您的微博舆情分析之旅！** 🚀