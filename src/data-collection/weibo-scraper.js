const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class WeiboScraper {
  constructor() {
    this.baseUrl = 'https://weibo.cn';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cookie': process.env.WEIBO_COOKIE || ''
    };
    this.timeout = 10000;
    this.maxRetries = 3;
  }

  async search(keyword, page = 1) {
    try {
      const searchUrl = `${this.baseUrl}/search/mblog?keyword=${encodeURIComponent(keyword)}&page=${page}`;
      
      const response = await axios.get(searchUrl, {
        headers: this.headers,
        timeout: this.timeout
      });

      return this.parseSearchResults(response.data, keyword);
    } catch (error) {
      logger.error(`搜索关键词 "${keyword}" 失败:`, error.message);
      return [];
    }
  }

  parseSearchResults(html, keyword) {
    const $ = cheerio.load(html);
    const results = [];

    $('.c').each((index, element) => {
      const $element = $(element);
      
      // 跳过非微博内容
      if ($element.attr('id') && $element.attr('id').startsWith('M_')) {
        try {
          const content = $element.find('.ctt').text().trim();
          const author = $element.find('.nk').text().trim();
          const timeText = $element.find('.ct').text().trim();
          
          // 提取互动数据
          const likeText = $element.find('[action-type="like"]').text();
          const likes = this.extractNumber(likeText);
          
          const commentText = $element.find('[action-type="comment"]').text();
          const comments = this.extractNumber(commentText);
          
          const shareText = $element.find('[action-type="forward"]').text();
          const shares = this.extractNumber(shareText);

          if (content && author) {
            results.push({
              platform: 'weibo',
              keyword: keyword,
              content: content,
              author: author,
              publish_time: this.parseTime(timeText),
              url: `${this.baseUrl}/${$element.attr('id')}`,
              likes: likes,
              comments: comments,
              shares: shares
            });
          }
        } catch (error) {
          logger.error('解析微博内容失败:', error);
        }
      }
    });

    return results;
  }

  extractNumber(text) {
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  parseTime(timeText) {
    if (!timeText) return null;
    
    // 处理相对时间格式
    if (timeText.includes('分钟前')) {
      const minutes = parseInt(timeText.match(/(\d+)分钟前/)[1]);
      return new Date(Date.now() - minutes * 60000).toISOString();
    } else if (timeText.includes('小时前')) {
      const hours = parseInt(timeText.match(/(\d+)小时前/)[1]);
      return new Date(Date.now() - hours * 3600000).toISOString();
    } else if (timeText.includes('今天')) {
      const timeMatch = timeText.match(/今天 (\d{2}:\d{2})/);
      if (timeMatch) {
        const today = new Date();
        const [hours, minutes] = timeMatch[1].split(':');
        today.setHours(parseInt(hours), parseInt(minutes));
        return today.toISOString();
      }
    } else if (timeText.includes('月')) {
      // 处理 "MM月DD日 HH:mm" 格式
      const match = timeText.match(/(\d{1,2})月(\d{1,2})日 (\d{2}):(\d{2})/);
      if (match) {
        const year = new Date().getFullYear();
        const month = parseInt(match[1]) - 1;
        const day = parseInt(match[2]);
        const hour = parseInt(match[3]);
        const minute = parseInt(match[4]);
        return new Date(year, month, day, hour, minute).toISOString();
      }
    }
    
    return new Date().toISOString();
  }

  async getUserProfile(userId) {
    try {
      const profileUrl = `${this.baseUrl}/u/${userId}`;
      const response = await axios.get(profileUrl, {
        headers: this.headers,
        timeout: this.timeout
      });

      return this.parseUserProfile(response.data);
    } catch (error) {
      logger.error(`获取用户 ${userId} 资料失败:`, error.message);
      return null;
    }
  }

  parseUserProfile(html) {
    const $ = cheerio.load(html);
    
    return {
      username: $('.ut').text().trim(),
      followers: this.extractNumber($('.tc').eq(1).text()),
      following: this.extractNumber($('.tc').eq(0).text()),
      posts: this.extractNumber($('.tc').eq(2).text())
    };
  }
}

module.exports = WeiboScraper;