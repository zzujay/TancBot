/**
 * 微博数据收集演示模式
 * 用于展示系统功能，使用模拟数据
 */

const logger = require('./src/utils/logger');

// 模拟微博数据
const mockWeiboData = [
  {
    id: 'weibo_demo_001',
    platform: 'weibo',
    author: '科技达人小王',
    content: '人工智能技术的发展真是日新月异！最新的AI模型在图像识别和自然语言处理方面都取得了重大突破，未来可期！#人工智能# #科技发展#',
    publishTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    time: '2小时前',
    likes: 245,
    reposts: 89,
    comments: 156,
    from: '微博',
    url: 'https://weibo.com/demo/001',
    keyword: '人工智能',
    collectedAt: new Date().toISOString()
  },
  {
    id: 'weibo_demo_002',
    platform: 'weibo',
    author: 'AI研究者',
    content: '刚刚体验了新发布的AI助手，感觉非常智能！它能够理解复杂的语境，回答问题的准确度也很高。人工智能正在改变我们的生活方式。',
    publishTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    time: '4小时前',
    likes: 189,
    reposts: 67,
    comments: 98,
    from: '微博',
    url: 'https://weibo.com/demo/002',
    keyword: '人工智能',
    collectedAt: new Date().toISOString()
  },
  {
    id: 'weibo_demo_003',
    platform: 'weibo',
    author: '未来科技观察',
    content: '深度学习算法的优化让AI在医疗诊断、自动驾驶等领域取得重大进展。虽然还存在挑战，但人工智能的前景依然令人期待。',
    publishTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    time: '6小时前',
    likes: 312,
    reposts: 134,
    comments: 203,
    from: '微博',
    url: 'https://weibo.com/demo/003',
    keyword: '人工智能',
    collectedAt: new Date().toISOString()
  }
];

// 模拟新闻数据
const mockNewsData = [
  {
    id: 'news_demo_001',
    platform: 'news',
    author: '科技日报',
    content: '国产AI大模型技术取得新突破。据悉，最新研发的AI大模型在多项基准测试中表现优异，标志着我国在人工智能领域的技术实力不断增强。该模型采用了创新的架构设计，在语义理解和逻辑推理方面都有显著提升。',
    publishTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    time: '1小时前',
    likes: 0,
    reposts: 0,
    comments: 0,
    from: '科技日报',
    url: 'https://tech.news/demo/001',
    keyword: '人工智能',
    collectedAt: new Date().toISOString(),
    isBackup: true
  },
  {
    id: 'news_demo_002',
    platform: 'news',
    author: '人民网',
    content: '人工智能赋能传统产业转型升级。近年来，AI技术在制造业、农业、服务业等传统领域的应用日益广泛，有效提升了生产效率和产品质量，为经济高质量发展注入新动能。',
    publishTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    time: '3小时前',
    likes: 0,
    reposts: 0,
    comments: 0,
    from: '人民网',
    url: 'https://news.people.com.cn/demo/002',
    keyword: '人工智能',
    collectedAt: new Date().toISOString(),
    isBackup: true
  }
];

class DemoDataCollector {
  constructor(options = {}) {
    this.maxResults = options.maxResults || 20;
    this.demoMode = true;
    logger.info('演示模式已启用：使用模拟数据展示系统功能');
  }

  /**
   * 搜索演示数据
   */
  async search(keyword, maxResults = this.maxResults) {
    logger.info(`演示模式：搜索关键词 "${keyword}"，最大结果 ${maxResults}`);
    
    // 根据关键词选择合适的模拟数据
    let dataPool = [];
    
    if (keyword.includes('人工智能') || keyword.includes('AI') || keyword.includes('智能')) {
      dataPool = [...mockWeiboData, ...mockNewsData];
    } else if (keyword.includes('科技') || keyword.includes('技术')) {
      dataPool = mockWeiboData;
    } else if (keyword.includes('新闻') || keyword.includes('热点')) {
      dataPool = mockNewsData;
    } else {
      // 通用数据
      dataPool = mockWeiboData.slice(0, 2);
    }

    // 随机化数据
    const shuffled = this.shuffleArray(dataPool);
    const results = shuffled.slice(0, Math.min(maxResults, shuffled.length));
    
    // 更新关键词和时间戳
    results.forEach(item => {
      item.keyword = keyword;
      item.collectedAt = new Date().toISOString();
      item.publishTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString();
    });

    logger.info(`演示模式：找到 ${results.length} 条结果`);
    return results;
  }

  /**
   * 获取演示数据（直接返回模拟数据）
   */
  async getDemoData(keyword, count = 5) {
    const results = await this.search(keyword, count);
    return results;
  }

  /**
   * 随机打乱数组
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 测试连接（演示模式总是成功）
   */
  async testConnection() {
    logger.info('演示模式：连接测试通过');
    return true;
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      platform: 'demo',
      demoMode: true,
      maxResults: this.maxResults,
      isHealthy: true,
      dataSource: '模拟数据'
    };
  }
}

module.exports = DemoDataCollector;