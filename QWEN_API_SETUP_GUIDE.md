# 🚀 千问API密钥申请和使用指南

## ✅ 当前状态
您的系统已经正确配置：
- 提供商：通义千问 (qwen)
- 模型：qwen-turbo
- 状态：配置成功，等待有效API密钥

## 🔑 申请千问API密钥步骤

### 步骤1：注册阿里云账号
1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 注册/登录您的阿里云账号
3. 完成实名认证

### 步骤2：开通DashScope服务
1. 访问 [DashScope控制台](https://dashscope.console.aliyun.com/)
2. 点击"立即开通"
3. 同意服务协议

### 步骤3：获取API密钥
1. 进入 [API-KEY管理页面](https://dashscope.console.aliyun.com/apiKey)
2. 点击"创建新的API-KEY"
3. 复制生成的API密钥（格式：sk-xxxxxxxx）

### 步骤4：配置到您的系统
```bash
# 编辑配置文件
nano .env

# 修改这一行
QWEN_API_KEY=sk-您的真实-api-key
```

## 💰 费用说明

### 免费额度
- 新用户注册即送 **100万tokens** 免费额度
- 有效期：30天

### 计费标准（qwen-turbo）
- 输入：0.012元/千tokens
- 输出：0.012元/千tokens
- 举例：分析100条微博（每条100字）约需0.5元

### 充值方式
1. 阿里云控制台 → 费用中心 → 充值
2. 支持支付宝、微信、银行卡
3. 建议充值50元起，可分析约10万条内容

## 🧪 测试您的API密钥

### 快速测试
```bash
# 运行测试脚本
node test-domestic-llm.js

# 应该看到：
# ✅ 千问响应成功
# 而不是：
# ❌ 千问请求失败: HTTP错误: 401 Unauthorized
```

### 手动测试
```bash
# 使用curl测试
curl -X POST "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation" \
  -H "Authorization: Bearer sk-您的api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-turbo",
    "input": {"prompt": "你好"},
    "parameters": {"max_tokens": 100}
  }'
```

## 🔧 其他国产模型选择

如果您想尝试其他国产模型：

### Kimi（月之暗面）
```env
LLM_PROVIDER=kimi
LLM_MODEL=kimi-chat
KIMI_API_KEY=您的kimi-api-key
```
申请地址：[Moonshot AI](https://platform.moonshot.cn/)

### 文心一言（百度）
```env
LLM_PROVIDER=wenxin
LLM_MODEL=ernie-bot
WENXIN_API_KEY=您的api-key
WENXIN_SECRET_KEY=您的secret-key
```
申请地址：[百度智能云](https://cloud.baidu.com/)

### 智谱GLM
```env
LLM_PROVIDER=zhipu
LLM_MODEL=glm-4
ZHIPU_API_KEY=您的api-key
```
申请地址：[智谱AI](https://open.bigmodel.cn/)

## ⚠️ 注意事项

1. **密钥安全**：不要将API密钥提交到代码仓库
2. **费用监控**：定期查看用量，避免意外高额账单
3. **速率限制**：各模型都有请求频率限制，请合理控制
4. **内容合规**：确保分析内容符合中国法律法规

## 📞 技术支持

### 千问技术支持
- 文档中心：[DashScope文档](https://help.aliyun.com/document_detail/2712576.html)
- 技术支持：阿里云控制台 → 工单系统
- 社区支持：[阿里云开发者社区](https://developer.aliyun.com/)

### 项目支持
- 查看日志：`logs/` 目录下的日志文件
- 测试功能：`node test-domestic-llm.js`
- 配置检查：`node -e "console.log(require('./src/ai-analysis/llm-config-manager.js').getInstance().getConfigSummary())"`

## 🎉 下一步

1. **立即申请**：点击上方链接申请您的API密钥
2. **配置系统**：将密钥填入 `.env` 文件
3. **运行测试**：执行 `node test-domestic-llm.js` 验证
4. **开始使用**：享受国产LLM带来的中文舆情分析优势！

**预计时间**：注册到获得API密钥约需5-10分钟
**预计费用**：轻度使用每月约10-50元

祝您使用愉快！🚀