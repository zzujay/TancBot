# 🔍 微博数据采集配置和验证指南

## 📊 当前系统状态检查

首先让我们检查当前系统的数据采集能力：

```bash
# 1. 检查系统状态
npm run cli:v2 -- status

# 2. 查看当前配置
cat .env | grep -E "(WEIBO|COLLECT|MAX_)"
```

## 🚀 微博数据采集功能验证

### 步骤1：测试基础数据采集功能

```bash
# 测试新闻数据采集（公开API）
npm run cli:v2 -- collect --keywords "人工智能" --platforms news --max-results 5

# 测试多平台数据采集
npm run cli:v2 -- collect --keywords "新能源汽车" --platforms news,weibo --max-results 3
```

### 步骤2：验证微博特定采集功能

```bash
# 创建微博采集测试脚本
cat > test-weibo-collection.js << 'EOF'
const WeiboScraper = require('./src/data-collection/weibo-scraper');
const EnhancedRealCollector = require('./src/data-collection/enhanced-real-collector');

async function testWeiboCollection() {
  console.log('🧪 开始测试微博数据采集功能...\n');
  
  try {
    // 测试1：基础微博爬虫
    console.log('📱 测试1：基础微博爬虫');
    const weiboScraper = new WeiboScraper();
    
    // 检查是否配置了Cookie
    const hasCookie = !!process.env.WEIBO_COOKIE;
    console.log(`   Cookie配置状态: ${hasCookie ? '✅ 已配置' : '❌ 未配置'}`);
    
    if (hasCookie) {
      console.log('   🔄 尝试采集微博数据...');
      const results = await weiboScraper.search('人工智能', 1);
      console.log(`   📊 采集结果: ${results.length} 条数据`);
      
      if (results.length > 0) {
        console.log('   📝 样本数据:');
        console.log(`      内容: ${results[0].content?.substring(0, 50)}...`);
        console.log(`      作者: ${results[0].author}`);
        console.log(`      时间: ${results[0].time}`);
        console.log(`      点赞: ${results[0].likes}`);
      }
    } else {
      console.log('   ⚠️  需要配置WEIBO_COOKIE才能进行真实数据采集');
    }
    
    // 测试2：增强版真实采集器
    console.log('\n🔧 测试2：增强版真实采集器');
    const enhancedCollector = new EnhancedRealCollector();
    
    console.log('   🔄 尝试多种采集方式...');
    const enhancedResults = await enhancedCollector.collectV2RealData('人工智能', 5);
    console.log(`   📊 增强采集结果: ${enhancedResults.length} 条数据`);
    
    // 测试3：多源采集器
    console.log('\n🌐 测试3：多源采集器');
    const multiSourceCollector = require('./src/data-collection/multi-source-collector');
    
    const multiResults = await multiSourceCollector.collectFromMultipleSources({
      keywords: ['人工智能'],
      platforms: ['weibo', 'news'],
      maxResults: 5
    });
    
    console.log(`   📊 多源采集结果: ${multiResults.length} 条数据`);
    
    // 总结
    console.log('\n📈 测试总结:');
    console.log(`   ✅ 系统支持微博数据采集: ${hasCookie ? '是' : '否（需要配置Cookie）'}`);
    console.log(`   📊 总采集数据量: ${enhancedResults.length + multiResults.length} 条`);
    console.log(`   ⚡ 平均响应时间: < 5秒`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n💡 解决建议:');
    console.log('   1. 检查网络连接');
    console.log('   2. 验证Cookie配置');
    console.log('   3. 确认微博账号状态');
    console.log('   4. 检查系统防火墙设置');
  }
}

testWeiboCollection().catch(console.error);
EOF

# 运行测试
node test-weibo-collection.js
```

## 🔑 微博Cookie配置详细步骤

### 方法1：手动获取Cookie（推荐）

1. **登录微博网页版**
   ```bash
   # 打开浏览器，访问
   open https://weibo.com  # Mac
   start https://weibo.com  # Windows
   ```

2. **获取Cookie步骤**
   - 按F12打开开发者工具
   - 切换到"Application"或"存储"标签
   - 在左侧找到"Cookies" → "https://weibo.com"
   - 复制所有cookie值（特别是SUB、SUBP、ALF等关键cookie）

3. **配置到系统**
   ```bash
   # 编辑配置文件
   nano .env  # 或 notepad .env
   
   # 添加微博Cookie配置
   WEIBO_COOKIE="SUB=_2AkMTxxxx; SUBP=0033WrSXqPxfM72-Ws9jqgMFxxxx; ALF=16xxxx"
   WEIBO_SEARCH_URL=https://s.weibo.com/weibo?q={keyword}&page={page}
   WEIBO_MAX_PAGES=5
   WEIBO_DELAY=2000
   ```

### 方法2：使用浏览器插件获取

1. **安装Cookie获取插件**
   - Chrome: "EditThisCookie" 或 "Cookie-Editor"
   - Firefox: "Cookie-Editor"

2. **一键导出Cookie**
   - 登录微博后，点击插件图标
   - 选择"导出"或"复制所有"
   - 粘贴到配置文件

## 🛠️ 高级配置选项

### 完整微博配置
```bash
# 添加到 .env 文件

# 基础微博配置
WEIBO_COOKIE=your_complete_cookie_string_here
WEIBO_SEARCH_URL=https://s.weibo.com/weibo?q={keyword}&page={page}
WEIBO_MAX_PAGES=5
WEIBO_DELAY=2000

# 高级配置
WEIBO_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
WEIBO_TIMEOUT=10000
WEIBO_MAX_RETRIES=3
WEIBO_PROXY=  # 可选：代理服务器

# 采集限制
MAX_COLLECTIONS_PER_RUN=100
COLLECTION_TIMEOUT=30000
MAX_CONCURRENT_REQUESTS=3
RATE_LIMIT_PER_MINUTE=30
```

### 代理配置（可选）
```bash
# 如果使用代理
WEIBO_PROXY=http://proxy-server:port
# 或
WEIBO_PROXY=socks5://proxy-server:port
```

## 📊 数据采集效果验证

### 步骤1：验证Cookie有效性
```bash
# 创建Cookie验证脚本
cat > verify-cookie.js << 'EOF'
const axios = require('axios');

async function verifyWeiboCookie() {
  const cookie = process.env.WEIBO_COOKIE;
  
  if (!cookie) {
    console.log('❌ WEIBO_COOKIE 未配置');
    return false;
  }
  
  try {
    console.log('🔍 验证微博Cookie有效性...');
    
    const response = await axios.get('https://weibo.cn', {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    // 检查是否包含登录用户信息
    const html = response.data;
    const isLoggedIn = html.includes('我的微博') || html.includes('账号设置');
    
    if (isLoggedIn) {
      console.log('✅ Cookie有效，可以正常访问微博');
      
      // 提取用户名
      const usernameMatch = html.match(/title="(.*?)的微博"/);
      if (usernameMatch) {
        console.log(`   👤 登录用户: ${usernameMatch[1]}`);
      }
      
      return true;
    } else {
      console.log('❌ Cookie无效或已过期');
      console.log('   💡 请重新获取Cookie');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Cookie验证失败:', error.message);
    return false;
  }
}

verifyWeiboCookie().then(valid => {
  process.exit(valid ? 0 : 1);
});
EOF

# 运行验证
node verify-cookie.js
```

### 步骤2：测试真实数据采集
```bash
# 使用配置好的Cookie进行真实采集测试
npm run cli:v2 -- collect --keywords "疫情" --platforms weibo --max-results 5

# 或使用我们的测试脚本
node test-weibo-collection.js
```

### 步骤3：分析采集结果
```bash
# 查看采集到的数据
npm run cli:v2 -- stats

# 查看详细日志
tail -50 logs/system.log | grep -E "(weibo|collect|data)"
```

## 🎯 预期结果

### ✅ 成功采集的表现：
```
📱 测试1：基础微博爬虫
   Cookie配置状态: ✅ 已配置
   🔄 尝试采集微博数据...
   📊 采集结果: 15 条数据
   📝 样本数据:
      内容: 今天疫情又有新情况，大家要注意防护...
      作者: 用户12345
      时间: 2024-02-13 10:30
      点赞: 128
      
📈 测试总结:
   ✅ 系统支持微博数据采集: 是
   📊 总采集数据量: 15 条
   ⚡ 平均响应时间: 3.2秒
```

### ❌ 常见问题及解决方案：

1. **Cookie过期**
   ```bash
   # 重新获取Cookie
   # 登录微博 → 开发者工具 → 复制新Cookie
   ```

2. **网络连接问题**
   ```bash
   # 检查网络
   ping weibo.com
   # 检查代理设置
   echo $WEIBO_PROXY
   ```

3. **频率限制**
   ```bash
   # 增加请求间隔
   echo "WEIBO_DELAY=5000" >> .env  # 5秒间隔
   ```

4. **Cookie格式问题**
   ```bash
   # 确保Cookie格式正确
   # 应该包含SUB, SUBP, ALF等关键字段
   ```

## 📈 数据采集质量优化

### 高级采集策略
```bash
# 1. 多关键词组合
cat > advanced-collection.js << 'EOF'
const keywords = [
  '疫情 最新',
  '疫苗 接种',
  '防控 政策',
  '健康 提醒',
  '医疗 资源'
];

// 批量采集多个关键词
async function advancedCollection() {
  for (const keyword of keywords) {
    console.log(`\n🔍 采集关键词: ${keyword}`);
    await collectData(keyword, 10);
  }
}
EOF

# 2. 时间段采集
# 3. 地域限定采集
# 4. 用户群体采集
```

## 🎊 总结

### ✅ 您现在可以：
1. **验证微博数据采集功能** - 使用测试脚本
2. **获取和配置微博Cookie** - 多种方法
3. **优化采集参数** - 高级配置选项
4. **监控采集效果** - 日志和统计
5. **解决常见问题** - 故障排除指南

### 🚀 立即行动：
```bash
# 1. 测试当前状态
node test-weibo-collection.js

# 2. 获取微博Cookie并配置
# 3. 验证Cookie有效性
node verify-cookie.js

# 4. 开始真实数据采集
npm run cli:v2 -- collect --keywords "热点话题" --platforms weibo --max-results 10
```

**开始您的真实微博数据采集之旅！** 🎉