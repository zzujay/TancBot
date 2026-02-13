# 🚀 国产LLM舆情监控系统 - 一步一步使用教程

## 📋 第一步：系统检查（1分钟）

### ✅ 检查当前配置
```bash
# 查看当前目录
cd G:\trae\public-opinion-system

# 检查配置文件
cat .env | head -10
```

**预期输出：**
```
LLM_PROVIDER=qwen
LLM_MODEL=qwen-turbo
QWEN_API_KEY=sk-bf2aa41a2bcc4fe8ad32755b836f5db0
```

### ✅ 验证系统状态
```bash
# 运行系统状态检查
npm run cli:v2 -- status
```

**预期输出：**
```
🎯 系统状态报告
==================
✅ 数据收集器: 正常
✅ AI分析器: 正常
✅ 数据库: 正常
✅ 实时监控器: 正常
✅ 技能管理器: 正常
```

---

## 🧪 第二步：基础功能测试（2分钟）

### ✅ 测试国产LLM连接
```bash
# 运行LLM连接测试
node test-domestic-llm.js
```

**重点关注：**
- ✅ 配置管理器初始化完成
- ✅ 分析器初始化完成
- ✅ 测试成功率: 5/5

### ✅ 快速功能演示
```bash
# 运行完整演示
node demo-domestic-llm.js
```

**预期看到：**
- 4个典型舆情案例分析
- 批量分析5条内容
- 性能统计报告

---

## 🎯 第三步：基础舆情分析（3分钟）

### 🔍 分析单条文本

#### 示例1：教育政策舆情
```bash
npm run cli:v2 -- analyze "教育部最新发布的双减政策在社会各界引起广泛讨论，家长群体普遍表示支持，认为有助于减轻学生负担，但也有部分家长担心孩子课余时间过多。"
```

#### 示例2：科技产品舆情
```bash
npm run cli:v2 -- analyze "国产新能源汽车销量创历史新高，技术创新获得国际认可，消费者普遍赞赏国产车的性价比和智能化水平，充电基础设施建设加快。"
```

#### 示例3：食品安全舆情
```bash
npm run cli:v2 -- analyze "某知名品牌被曝食品安全问题，引发消费者强烈关注，监管部门已介入调查，相关产品已下架，消费者纷纷表示担忧。"
```

### 📊 理解分析结果

**典型输出格式：**
```
💭 情感倾向: 正面 (置信度: 85.0%)
🏷️ 主要话题: 科技发展, 人工智能
🔑 关键词: 人工智能, 技术发展, 国产模型
⚠️ 风险等级: 2/10 (低风险)
🌟 影响力: 7/10 (高影响力)
📈 趋势预测: rising (上升趋势)
📝 摘要: 对人工智能技术发展的积极讨论
```

---

## 📦 第四步：批量分析实战（3分钟）

### 📝 创建批量分析文件
```bash
# 创建测试文件
echo "新能源汽车发展迅速，消费者接受度提高。" > batch1.txt
echo "在线教育质量提升，用户满意度增加。" >> batch1.txt
echo "环保政策实施效果良好，市民支持度高。" >> batch1.txt

# 或者一次性创建
cat > batch_test.txt << EOF
新能源汽车发展迅速，消费者接受度提高，充电基础设施建设加快。
在线教育质量提升，用户满意度增加，教学模式不断创新。
环保政策实施效果良好，市民支持度高，垃圾分类成为新时尚。
远程办公软件用户增长，工作效率提升，企业成本降低。
社区医疗服务改善，居民就医便利，健康管理意识增强。
EOF
```

### 🔄 批量分析演示
```bash
# 使用我们创建的演示脚本
node -e "
const analyzer = require('./src/ai-analysis/llm-enhanced-analyzer-improved');
const fs = require('fs');

async function batchDemo() {
  const analyzer = new analyzer();
  await analyzer.initialize();
  
  const contents = [
    '新能源汽车发展迅速，消费者接受度提高。',
    '在线教育质量提升，用户满意度增加。',
    '环保政策实施效果良好，市民支持度高。',
    '远程办公软件用户增长，工作效率提升。',
    '社区医疗服务改善，居民就医便利。'
  ];
  
  console.log('🔄 批量分析开始...');
  const results = await analyzer.batchAnalyze(contents);
  
  console.log('📊 批量分析结果:');
  results.forEach((result, index) => {
    if (result.success) {
      console.log(\`\${index + 1}. \${result.analysis.sentiment?.label || '中性'} (置信度: \${(result.analysis.sentiment?.confidence * 100 || 0).toFixed(1)}%)\`);
    }
  });
}

batchDemo().catch(console.error);
"
```

---

## 🎨 第五步：高级功能探索（3分钟）

### 🔧 自定义分析参数

#### 修改配置文件
```bash
# 备份原配置
cp .env .env.backup

# 修改分析参数
echo "# 自定义分析参数" >> .env
echo "LLM_MAX_TOKENS=4096" >> .env
echo "LLM_TEMPERATURE=0.5" >> .env
echo "ANALYSIS_BATCH_SIZE=10" >> .env
echo "MAX_CONCURRENT_REQUESTS=5" >> .env
```

#### 测试新参数
```bash
# 重新运行测试
node test-domestic-llm.js
```

### 📈 性能监控
```bash
# 查看系统统计
npm run cli:v2 -- stats

# 查看详细日志
tail -f logs/system.log
```

---

## 🛠️ 第六步：实际应用场景（5分钟）

### 🏢 场景1：品牌舆情监控
```bash
# 分析品牌相关舆情
npm run cli:v2 -- analyze "某品牌最新发布的智能手机获得用户好评，拍照效果出色，但价格偏高引发争议。"
```

### 🏛️ 场景2：政策影响评估
```bash
# 分析政策舆情
npm run cli:v2 -- analyze "新的税收政策出台后，中小企业主反应不一，部分企业表示负担加重，但也有企业认为有利于公平竞争。"
```

### 🌐 场景3：社会热点分析
```bash
# 分析社会事件
npm run cli:v2 -- analyze "某地发生交通事故，造成交通拥堵，市民在社交媒体上讨论交通安全问题，呼吁加强交通管理。"
```

### 💰 场景4：市场趋势预测
```bash
# 分析市场趋势
npm run cli:v2 -- analyze "房地产市场调控政策持续，购房者观望情绪浓厚，开发商推出优惠活动，市场预期价格将稳中有降。"
```

---

## 📊 第七步：结果应用（2分钟）

### 🎯 结果解读技巧

#### 情感分析
- **正面 > 70%**: 积极舆情，可考虑推广
- **中性 30-70%**: 观望态度，需要引导
- **负面 > 30%**: 需要重点关注和应对

#### 风险评估
- **1-3分**: 低风险，正常监控
- **4-6分**: 中等风险，需要关注
- **7-10分**: 高风险，需要立即应对

#### 影响力评估
- **1-4分**: 局部影响，小范围处理
- **5-7分**: 区域影响，需要协调应对
- **8-10分**: 广泛影响，需要高度重视

### 📋 生成报告
```bash
# 创建简单报告
echo "# 舆情分析报告" > report.md
echo "分析时间: $(date)" >> report.md
echo "分析工具: 国产LLM舆情监控系统" >> report.md
echo "" >> report.md
echo "## 主要发现" >> report.md

# 运行分析并追加结果
npm run cli:v2 -- analyze "输入您的分析内容" >> report.md
```

---

## 🚀 第八步：持续优化（2分钟）

### 🔧 调优建议

#### 1. 参数优化
```bash
# 根据内容长度调整
echo "LLM_MAX_TOKENS=2048" >> .env      # 短文本
echo "LLM_MAX_TOKENS=4096" >> .env      # 长文本

# 根据精度要求调整
echo "LLM_TEMPERATURE=0.3" >> .env     # 高精度
echo "LLM_TEMPERATURE=0.8" >> .env     # 高创造性
```

#### 2. 批量优化
```bash
# 小批量快速测试
echo "ANALYSIS_BATCH_SIZE=3" >> .env

# 大批量生产环境
echo "ANALYSIS_BATCH_SIZE=20" >> .env
```

#### 3. 并发优化
```bash
# 保守设置
echo "MAX_CONCURRENT_REQUESTS=2" >> .env

# 激进设置
echo "MAX_CONCURRENT_REQUESTS=5" >> .env
```

### 📈 最佳实践

1. **内容预处理**: 清洗数据，去除无关信息
2. **分批处理**: 大量数据分批分析，避免超时
3. **结果验证**: 人工抽查验证分析结果
4. **趋势跟踪**: 定期分析，观察变化趋势
5. **多模型对比**: 必要时使用不同模型交叉验证

---

## 🎊 总结：您的学习成果

### ✅ 已掌握技能
1. **系统检查**: 验证配置和状态
2. **基础分析**: 单条文本舆情分析
3. **批量处理**: 多条文本同时分析
4. **参数调优**: 自定义分析参数
5. **场景应用**: 不同领域舆情分析
6. **结果解读**: 理解和应用分析结果
7. **性能优化**: 系统调优和最佳实践

### 🎯 下一步建议

#### 立即行动
1. **实际测试**: 用您关心的内容测试系统
2. **批量实验**: 收集10-20条相关内容批量分析
3. **参数调整**: 根据结果调整分析参数

#### 深入学习
1. **API申请**: 申请正式API密钥获得更好性能
2. **模型对比**: 尝试不同国产LLM模型
3. **集成开发**: 将分析结果集成到您的业务系统

#### 业务应用
1. **定期监控**: 建立定期舆情监控机制
2. **预警系统**: 基于风险等级建立预警
3. **趋势分析**: 长期跟踪观察变化趋势

---

## 📞 技术支持

### 🔧 故障排除
```bash
# 系统问题检查
node -e "console.log(require('./src/ai-analysis/llm-config-manager.js').getInstance().getConfigSummary())"

# 重置配置
cp .env.qwen .env

# 查看详细日志
tail -50 logs/system.log
```

### 📚 相关文档
- [国产LLM配置指南](DOMESTIC_LLM_GUIDE.md)
- [快速开始指南](QUICK_START_GUIDE.md)
- [API申请指南](QWEN_API_SETUP_GUIDE.md)

**🎉 恭喜！您现在已经完全掌握了国产LLM舆情监控系统的使用！**

**开始您的舆情分析之旅吧！** 🚀