const BaseAgent = require('./base-agent');
const natural = require('natural');
const logger = require('../utils/logger');

class TopicAgent extends BaseAgent {
  constructor() {
    super('TopicAgent', '主题提取Agent，识别热门话题和关键词');
    this.tfidf = new natural.TfIdf();
    this.stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '们', '与', '或', '但', '而', '因为', '所以', '如果', '虽然', '然而', '但是', '不过', '只是', '还是', '还要', '就是', '不是', '不能', '不会', '不要', '可以', '可能', '能够', '应该', '必须', '需要', '想要', '希望', '认为', '觉得', '知道', '了解', '明白', '记得', '忘记', '想起', '想到', '看到', '听到', '说到', '问到', '答到', '写到', '读到'
    ]);
  }

  async process(data, context = {}) {
    logger.info(`主题提取Agent开始处理 ${data.length} 条数据`);
    
    const results = {
      hotTopics: [],
      keywords: [],
      topicClusters: [],
      trends: [],
      keyInsights: []
    };

    // 1. 文本预处理
    const processedTexts = this.preprocessTexts(data);
    
    // 2. 关键词提取
    results.keywords = await this.extractKeywords(processedTexts);
    
    // 3. 主题聚类
    results.topicClusters = await this.clusterTopics(processedTexts);
    
    // 4. 热门话题识别
    results.hotTopics = await this.identifyHotTopics(data, results.keywords);
    
    // 5. 趋势分析
    results.trends = await this.analyzeTrends(data, results.keywords);
    
    // 6. 生成洞察
    results.keyInsights = this.generateTopicInsights(results);

    // 设置置信度
    this.setConfidence(this.calculateConfidence(results));
    this.updateLastUsed();

    logger.info(`主题提取完成，发现 ${results.hotTopics.length} 个热门话题，${results.keywords.length} 个关键词`);
    return results;
  }

  preprocessTexts(data) {
    return data.map(item => ({
      id: item.id,
      text: this.cleanText(item.content),
      time: item.publish_time,
      interactions: (item.likes || 0) + (item.comments || 0) + (item.shares || 0)
    }));
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/[@#]\w+/g, '') // 移除@和#标签
      .replace(/http[s]?:\/\/[^\s]+/g, '') // 移除URL
      .replace(/[^\u4e00-\u9fa5\w\s]/g, ' ') // 只保留中文、字母、数字和空格
      .replace(/\s+/g, ' ')
      .trim();
  }

  async extractKeywords(texts) {
    const tfidf = new natural.TfIdf();
    
    texts.forEach(text => {
      if (text.text && text.text.length > 2) {
        const words = this.segmentWords(text.text);
        const filteredWords = words.filter(word => 
          word.length > 1 && 
          !this.stopWords.has(word) &&
          !/^\d+$/.test(word) // 排除纯数字
        );
        tfidf.addDocument(filteredWords.join(' '));
      }
    });

    const keywords = [];
    const keywordMap = new Map();

    texts.forEach((text, index) => {
      const terms = [];
      const termsList = tfidf.listTerms(index);
      
      termsList.forEach(item => {
        if (item.tfidf > 0.1 && item.term.length > 1) {
          // 安全地获取词频
          const docTerms = tfidf.documents[index]?.terms;
          const frequency = docTerms ? (docTerms[item.term] || 0) : 0;
          
          terms.push({
            term: item.term,
            tfidf: item.tfidf,
            frequency: frequency
          });
        }
      });

      // 合并到全局关键词
      terms.forEach(term => {
        if (keywordMap.has(term.term)) {
          const existing = keywordMap.get(term.term);
          existing.tfidf = Math.max(existing.tfidf, term.tfidf);
          existing.frequency += term.frequency;
          existing.documents.push(index);
        } else {
          keywordMap.set(term.term, {
            term: term.term,
            tfidf: term.tfidf,
            frequency: term.frequency,
            documents: [index]
          });
        }
      });
    });

    // 排序并返回前N个关键词
    return Array.from(keywordMap.values())
      .sort((a, b) => (b.tfidf * b.frequency) - (a.tfidf * a.frequency))
      .slice(0, 30)
      .map(keyword => ({
        keyword: keyword.term,
        score: keyword.tfidf,
        frequency: keyword.frequency,
        documentCount: keyword.documents.length
      }));
  }

  segmentWords(text) {
    // 简单的中文分词（实际项目中可以使用更专业的分词库）
    const words = [];
    let current = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (/[\u4e00-\u9fa5]/.test(char)) {
        if (current) {
          words.push(current);
          current = '';
        }
        words.push(char);
      } else if (/\w/.test(char)) {
        current += char;
      } else if (current) {
        words.push(current);
        current = '';
      }
    }
    
    if (current) {
      words.push(current);
    }
    
    return words;
  }

  async clusterTopics(texts) {
    const clusters = [];
    const processed = new Set();
    
    // 基于关键词相似度进行聚类
    for (let i = 0; i < texts.length; i++) {
      if (processed.has(i)) continue;
      
      const cluster = {
        id: clusters.length,
        texts: [texts[i]],
        keywords: this.extractTextKeywords(texts[i].text),
        size: 1,
        avgInteractions: texts[i].interactions
      };
      
      processed.add(i);
      
      // 寻找相似文本
      for (let j = i + 1; j < texts.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = this.calculateSimilarity(
          cluster.keywords, 
          this.extractTextKeywords(texts[j].text)
        );
        
        if (similarity > 0.3) { // 相似度阈值
          cluster.texts.push(texts[j]);
          cluster.keywords = this.mergeKeywords(cluster.keywords, this.extractTextKeywords(texts[j].text));
          cluster.size++;
          cluster.avgInteractions += texts[j].interactions;
          processed.add(j);
        }
      }
      
      cluster.avgInteractions = cluster.avgInteractions / cluster.size;
      clusters.push(cluster);
    }
    
    // 过滤小聚类，排序
    return clusters
      .filter(cluster => cluster.size >= 2)
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
  }

  extractTextKeywords(text) {
    const words = this.segmentWords(text);
    const keywords = {};
    
    words.forEach(word => {
      if (word.length > 1 && !this.stopWords.has(word)) {
        keywords[word] = (keywords[word] || 0) + 1;
      }
    });
    
    return keywords;
  }

  calculateSimilarity(keywords1, keywords2) {
    const allKeywords = new Set([...Object.keys(keywords1), ...Object.keys(keywords2)]);
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    allKeywords.forEach(keyword => {
      const count1 = keywords1[keyword] || 0;
      const count2 = keywords2[keyword] || 0;
      
      dotProduct += count1 * count2;
      magnitude1 += count1 * count1;
      magnitude2 += count2 * count2;
    });
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  mergeKeywords(keywords1, keywords2) {
    const merged = { ...keywords1 };
    
    Object.keys(keywords2).forEach(keyword => {
      merged[keyword] = (merged[keyword] || 0) + keywords2[keyword];
    });
    
    return merged;
  }

  async identifyHotTopics(data, keywords) {
    const topicScores = new Map();
    
    // 基于关键词和互动数据计算话题热度
    data.forEach(item => {
      const text = item.content || '';
      const interactions = (item.likes || 0) + (item.comments || 0) + (item.shares || 0);
      
      keywords.forEach(keyword => {
        if (text.includes(keyword.keyword)) {
          const score = keyword.frequency * (1 + interactions * 0.1);
          
          if (topicScores.has(keyword.keyword)) {
            topicScores.get(keyword.keyword).score += score;
            topicScores.get(keyword.keyword).mentions++;
          } else {
            topicScores.set(keyword.keyword, {
              topic: keyword.keyword,
              score: score,
              mentions: 1,
              avgInteractions: interactions
            });
          }
        }
      });
    });
    
    return Array.from(topicScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(topic => ({
        topic: topic.topic,
        hotness: topic.score,
        mentions: topic.mentions,
        avgInteractions: topic.avgInteractions
      }));
  }

  async analyzeTrends(data, keywords) {
    const trends = [];
    const timeGroups = this.groupByTime(data);
    
    Object.keys(timeGroups).forEach(timeGroup => {
      const groupData = timeGroups[timeGroup];
      const keywordTrends = {};
      
      keywords.forEach(keyword => {
        const mentions = groupData.filter(item => 
          (item.content || '').includes(keyword.keyword)
        ).length;
        
        keywordTrends[keyword.keyword] = mentions;
      });
      
      trends.push({
        time: timeGroup,
        data: groupData.length,
        keywords: keywordTrends
      });
    });
    
    return trends;
  }

  groupByTime(data) {
    const groups = {};
    const now = new Date();
    
    data.forEach(item => {
      const time = new Date(item.publish_time || now);
      const timeGroup = this.getTimeGroup(time);
      
      if (!groups[timeGroup]) {
        groups[timeGroup] = [];
      }
      
      groups[timeGroup].push(item);
    });
    
    return groups;
  }

  getTimeGroup(time) {
    const hour = time.getHours();
    
    if (hour < 6) return '凌晨';
    if (hour < 12) return '上午';
    if (hour < 18) return '下午';
    return '晚上';
  }

  generateTopicInsights(results) {
    const insights = [];
    
    if (results.hotTopics.length > 0) {
      const topTopic = results.hotTopics[0];
      insights.push(`最热门话题是"${topTopic.topic}"，被提及${topTopic.mentions}次`);
    }
    
    if (results.keywords.length > 0) {
      const topKeywords = results.keywords.slice(0, 3).map(k => k.keyword).join('、');
      insights.push(`核心关键词包括：${topKeywords}`);
    }
    
    if (results.topicClusters.length > 0) {
      insights.push(`发现${results.topicClusters.length}个话题聚类，用户讨论较为集中`);
    }
    
    return insights;
  }

  calculateConfidence(results) {
    const hasData = results.hotTopics.length > 0 || results.keywords.length > 0;
    const diversity = Math.min(results.hotTopics.length / 10, 1);
    
    return hasData ? 0.6 + diversity * 0.4 : 0;
  }
}

module.exports = TopicAgent;