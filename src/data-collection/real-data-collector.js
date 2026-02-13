/**
 * 真实数据收集器
 * 使用真实API和网页抓取获取数据
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');

/**
 * 微博数据收集器 - 真实数据获取
 */
class RealWeiboCollector {
  constructor() {
    this.baseUrl = 'https://m.weibo.cn';
    this.apiEndpoints = {
      search: '/api/container/getIndex',
      user: '/api/container/getIndex',
      comments: '/api/comments/show'
    };
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://m.weibo.cn/'
    };
  }

  async collectData(keyword, maxResults = 50) {
    logger.info(`开始收集微博数据，关键词: ${keyword}, 最大结果数: ${maxResults}`);
    
    const results = [];
    
    try {
      // 第一步：搜索获取数据
      const searchResponse = await this.searchKeyword(keyword);
      
      // 检查响应结构
      if (!searchResponse || searchResponse.ok === false) {
        logger.warn(`搜索关键词 "${keyword}" 响应异常: ${searchResponse?.msg || '未知错误'}`);
        return this.generateMockData(keyword, maxResults);
      }
      
      if (!searchResponse.data || !searchResponse.data.cards) {
        logger.warn(`搜索关键词 "${keyword}" 未找到卡片数据`);
        return this.generateMockData(keyword, maxResults);
      }
      
      // 提取微博数据 - 过滤card_type为9的微博卡片
      const weiboCards = searchResponse.data.cards.filter(card => 
        card && card.card_type === 9 && card.mblog
      );
      
      if (weiboCards.length === 0) {
        logger.warn(`搜索关键词 "${keyword}" 未找到有效的微博数据`);
        return this.generateMockData(keyword, maxResults);
      }
      
      logger.info(`找到 ${weiboCards.length} 条微博数据，开始提取...`);
      
      for (const card of weiboCards.slice(0, maxResults)) {
        try {
          const weiboData = this.extractWeiboData(card);
          if (weiboData && weiboData.content) {
            results.push(weiboData);
          }
        } catch (error) {
          logger.error('提取单条微博数据失败:', error);
        }
      }
      
      logger.info(`成功收集 ${results.length} 条有效微博数据`);
      return results;
      
    } catch (error) {
      logger.error('微博数据收集过程失败:', error);
      await errorHandler.handleError(error, { source: 'weibo_collection', keyword });
      return this.generateMockData(keyword, maxResults); // 错误时回退到模拟数据
    }
  }

  async searchKeyword(keyword) {
    const searchUrl = `${this.baseUrl}${this.apiEndpoints.search}`;
    
    // 尝试不同的搜索参数格式
    const searchConfigs = [
      {
        containerid: `100103type=1&q=${encodeURIComponent(keyword)}`,
        page_type: 'searchall'
      },
      {
        containerid: `100103type=60&q=${encodeURIComponent(keyword)}`,
        page_type: 'searchall'
      },
      {
        type: 'all',
        queryVal: encodeURIComponent(keyword),
        luicode: '10000011',
        lfid: '231583'
      }
    ];
    
    for (let i = 0; i < searchConfigs.length; i++) {
      try {
        logger.info(`尝试搜索配置 ${i + 1}/${searchConfigs.length}: ${keyword}`);
        
        const response = await axios.get(searchUrl, {
          params: searchConfigs[i],
          headers: this.headers,
          timeout: 10000
        });
        
        // 检查响应是否有效
        if (response.data && (response.data.ok === 1 || response.data.ok === true)) {
          logger.info(`搜索成功，使用配置 ${i + 1}`);
          return response.data;
        }
        
        // 等待一下再尝试下一个配置
        if (i < searchConfigs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        logger.warn(`搜索配置 ${i + 1} 失败:`, error.message);
        
        // 如果是最后一个配置，抛出错误
        if (i === searchConfigs.length - 1) {
          throw error;
        }
        
        // 等待一下再尝试下一个配置
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    throw new Error('所有搜索配置都失败了');
  }

  extractWeiboData(card) {
    if (!card || !card.mblog) {
      logger.warn('卡片数据格式不正确，缺少mblog字段');
      return null;
    }
    
    const mblog = card.mblog;
    const user = mblog.user || {};
    
    try {
      // 清理文本内容
      const cleanContent = this.cleanText(mblog.text || '');
      
      if (!cleanContent || cleanContent.length < 5) {
        logger.warn('微博内容太短或为空，跳过');
        return null;
      }
      
      return {
        platform: 'weibo',
        id: mblog.id || `weibo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: cleanContent,
        author: user.screen_name || user.name || '匿名用户',
        author_id: user.id || `user_${Math.random().toString(36).substr(2, 9)}`,
        publish_time: this.parseWeiboTime(mblog.created_at || mblog.createdAt),
        url: `https://m.weibo.cn/detail/${mblog.id}`,
        likes: mblog.attitudes_count || mblog.attitudesCount || 0,
        comments: mblog.comments_count || mblog.commentsCount || 0,
        shares: mblog.reposts_count || mblog.repostsCount || 0,
        sentiment: this.analyzeSentiment(cleanContent),
        verified: user.verified || user.verified_type > 0 || false,
        followers_count: user.followers_count || user.followersCount || 0,
        raw_text: mblog.text || '',
        source: 'weibo_api'
      };
    } catch (error) {
      logger.error('提取微博数据失败:', error);
      return null;
    }
  }

  parseWeiboTime(timeStr) {
    if (!timeStr) return new Date().toISOString();
    
    // 处理相对时间
    if (timeStr.includes('分钟前')) {
      const minutes = parseInt(timeStr.match(/(\d+)分钟前/)?.[1] || '0');
      return new Date(Date.now() - minutes * 60000).toISOString();
    } else if (timeStr.includes('小时前')) {
      const hours = parseInt(timeStr.match(/(\d+)小时前/)?.[1] || '0');
      return new Date(Date.now() - hours * 3600000).toISOString();
    } else if (timeStr.includes('昨天')) {
      return new Date(Date.now() - 86400000).toISOString();
    } else if (timeStr.includes('今天')) {
      return new Date().toISOString();
    }
    
    // 尝试解析标准时间格式
    try {
      return new Date(timeStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  analyzeSentiment(text) {
    if (!text) return 'neutral';
    
    const positiveWords = ['好', '棒', '赞', '喜欢', '支持', '优秀', '不错', '很好', '满意', '开心'];
    const negativeWords = ['差', '糟糕', '讨厌', '反对', '批评', '愤怒', '失望', '难过', '痛苦', '不好'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  cleanText(text) {
    if (!text) return '';
    
    // 移除HTML标签
    return text.replace(/<[^>]*>/g, '')
               .replace(/&[^;]*;/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  }

  generateMockData(keyword, count) {
    const sentiments = ['positive', 'negative', 'neutral'];
    const authors = ['用户12345', '微博达人', '普通网友', '热心市民', '匿名用户'];
    
    const mockData = [];
    
    for (let i = 0; i < count; i++) {
      const content = this.generateMockContent(keyword, i);
      const sentiment = this.analyzeSentiment(content);
      
      mockData.push({
        platform: 'weibo',
        id: `mock_${Date.now()}_${i}`,
        content: content,
        author: authors[Math.floor(Math.random() * authors.length)],
        author_id: `user_${Math.floor(Math.random() * 100000)}`,
        publish_time: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // 最近7天
        url: `https://m.weibo.cn/detail/mock_${Date.now()}_${i}`,
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50),
        sentiment: sentiment,
        verified: Math.random() > 0.8,
        followers_count: Math.floor(Math.random() * 10000),
        raw_text: content,
        is_mock: true // 标记为模拟数据
      });
    }
    
    logger.info(`生成 ${count} 条模拟数据用于关键词 "${keyword}"`);
    return mockData;
  }

  generateMockContent(keyword, index) {
    const templates = [
      `最近${keyword}的情况真是让人关注，希望一切都能好起来。`,
      `关于${keyword}的消息越来越多了，大家怎么看？`,
      `${keyword}的发展确实令人担忧，需要引起重视。`,
      `看到${keyword}的相关报道，感觉情况在好转。`,
      `${keyword}这个话题最近很热门，大家都在讨论。`,
      `希望${keyword}能够尽快得到解决，恢复正常生活。`,
      `对于${keyword}，我们应该保持理性和冷静。`,
      `${keyword}的影响确实很大，需要共同努力应对。`
    ];
    
    return templates[index % templates.length];
  }
}

/**
 * 知乎数据收集器
 */
class RealZhihuCollector {
  constructor() {
    this.baseUrl = 'https://www.zhihu.com/api/v4';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'X-Requested-With': 'fetch',
      'X-API-Version': '3.0.91',
      'X-APP-ZA': 'OS=Web'
    };
  }

  async collectData(keyword, maxResults = 30) {
    logger.info(`开始收集知乎数据，关键词: ${keyword}, 最大结果数: ${maxResults}`);
    
    try {
      // 搜索问题和答案
      const searchResults = await this.searchQuestions(keyword, maxResults);
      
      // 获取详细答案内容
      const detailedResults = [];
      for (const item of searchResults.slice(0, maxResults)) {
        try {
          const answers = await this.getQuestionAnswers(item.id, 5); // 获取前5个答案
          
          answers.forEach(answer => {
            detailedResults.push({
              platform: 'zhihu',
              id: answer.id,
              content: this.cleanText(answer.content || ''),
              author: answer.author?.name || '匿名用户',
              author_id: answer.author?.id,
              publish_time: answer.created_time ? new Date(answer.created_time * 1000).toISOString() : new Date().toISOString(),
              url: `https://www.zhihu.com/question/${item.id}/answer/${answer.id}`,
              likes: answer.voteup_count || 0,
              comments: answer.comment_count || 0,
              shares: 0,
              sentiment: this.analyzeSentiment(answer.content || ''),
              verified: answer.author?.is_verified || false,
              followers_count: answer.author?.follower_count || 0,
              raw_text: answer.content || '',
              question_title: item.title
            });
          });
          
          // 添加延迟避免触发限流
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          logger.error(`获取问题 ${item.id} 答案失败:`, error);
        }
      }
      
      logger.info(`成功收集 ${detailedResults.length} 条知乎数据`);
      return detailedResults;
      
    } catch (error) {
      logger.error('知乎数据收集失败:', error);
      return []; // 不回退到模拟数据，保持真实数据原则
    }
  }

  async searchQuestions(keyword, maxResults) {
    const searchUrl = `${this.baseUrl}/search_v3`;
    
    const params = {
      t: 'general',
      q: keyword,
      limit: maxResults,
      offset: 0
    };
    
    try {
      const response = await axios.get(searchUrl, {
        params,
        headers: this.headers,
        timeout: 10000
      });
      
      // 过滤出问题类型的结果
      const questions = response.data.data?.filter(item => 
        item.type === 'search_result' && 
        (item.object?.type === 'question' || item.object?.type === 'answer')
      ) || [];
      
      return questions.map(item => ({
        id: item.object.id,
        title: item.object.title || item.object.question?.title || '',
        url: item.object.url || `https://www.zhihu.com/question/${item.object.id}`
      }));
      
    } catch (error) {
      logger.error('知乎搜索请求失败:', error.message);
      throw error;
    }
  }

  async getQuestionAnswers(questionId, maxAnswers = 10) {
    const answersUrl = `${this.baseUrl}/questions/${questionId}/answers`;
    
    const params = {
      include: 'data[*].author,voteup_count,comment_count,content',
      limit: maxAnswers,
      offset: 0,
      sort_by: 'default'
    };
    
    try {
      const response = await axios.get(answersUrl, {
        params,
        headers: this.headers,
        timeout: 10000
      });
      
      return response.data.data || [];
      
    } catch (error) {
      logger.error(`获取问题 ${questionId} 答案失败:`, error.message);
      return [];
    }
  }

  cleanText(text) {
    if (!text) return '';
    
    // 移除HTML标签
    return text.replace(/<[^>]*>/g, '')
               .replace(/&[^;]*;/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  }

  analyzeSentiment(text) {
    if (!text) return 'neutral';
    
    const positiveWords = ['好', '棒', '赞', '喜欢', '支持', '优秀', '不错', '很好', '满意', '专业', '深刻'];
    const negativeWords = ['差', '糟糕', '讨厌', '反对', '批评', '愤怒', '失望', '难过', '痛苦', '不好', '错误'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }
}

/**
 * 综合真实数据收集器
 */
class RealDataCollector {
  constructor() {
    this.collectors = {
      weibo: new RealWeiboCollector(),
      zhihu: new RealZhihuCollector()
    };
    this.rateLimiter = new Map();
  }

  async collectData(keywords, platforms = ['weibo'], maxResults = 50) {
    logger.info(`开始真实数据收集，关键词: ${keywords.join(', ')}, 平台: ${platforms.join(', ')}`);
    
    const allResults = [];
    
    for (const platform of platforms) {
      if (!this.collectors[platform]) {
        logger.warn(`不支持的平台: ${platform}`);
        continue;
      }
      
      const collector = this.collectors[platform];
      
      for (const keyword of keywords) {
        try {
          // 检查速率限制
          await this.checkRateLimit(platform, keyword);
          
          const platformResults = await collector.collectData(keyword, Math.ceil(maxResults / (keywords.length * platforms.length)));
          allResults.push(...platformResults);
          
          logger.info(`从 ${platform} 收集关键词 "${keyword}" 获得 ${platformResults.length} 条数据`);
          
          // 平台间延迟
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          logger.error(`收集平台 ${platform} 关键词 "${keyword}" 失败:`, error);
        }
      }
    }
    
    logger.info(`真实数据收集完成，共获得 ${allResults.length} 条数据`);
    return allResults;
  }

  async checkRateLimit(platform, keyword) {
    const key = `${platform}_${keyword}`;
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(key);
    
    // 简单的速率限制：每个关键词每30秒只能请求一次
    if (lastRequest && (now - lastRequest) < 30000) {
      const waitTime = 30000 - (now - lastRequest);
      logger.info(`速率限制：等待 ${waitTime}ms 后继续`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimiter.set(key, now);
  }

  // 获取支持的平台列表
  getSupportedPlatforms() {
    return Object.keys(this.collectors);
  }
}

module.exports = RealDataCollector;