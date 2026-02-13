const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const errorHandler = require('../../utils/error-handler');

/**
 * 数据API路由
 * 提供数据查询、导出、统计等功能
 */

// 获取数据列表
router.get('/', async (req, res) => {
  try {
    const { 
      keyword = '', 
      platform = '', 
      startDate = '', 
      endDate = '',
      sentiment = '',
      risk = '',
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    logger.info(`获取数据列表: 关键词=${keyword}, 平台=${platform}, 时间范围=${startDate}-${endDate}`);

    // 模拟数据查询
    const mockData = generateMockDataList({
      keyword,
      platform,
      startDate,
      endDate,
      sentiment,
      risk,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: mockData.items,
      total: mockData.total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: mockData.hasMore
      },
      filters: {
        keyword,
        platform,
        startDate,
        endDate,
        sentiment,
        risk
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取数据列表失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'get_data_list' });
    
    res.status(500).json({
      success: false,
      error: '获取数据列表失败',
      message: error.message
    });
  }
});

// 获取数据统计
router.get('/stats', async (req, res) => {
  try {
    const { 
      keyword = '', 
      platform = '', 
      startDate = '', 
      endDate = '',
      groupBy = 'day' // day, week, month, platform, sentiment, risk
    } = req.query;

    logger.info(`获取数据统计: 关键词=${keyword}, 平台=${platform}, 分组=${groupBy}`);

    // 模拟数据统计
    const mockStats = generateMockDataStats({
      keyword,
      platform,
      startDate,
      endDate,
      groupBy
    });

    res.json({
      success: true,
      data: mockStats,
      metadata: {
        keyword,
        platform,
        startDate,
        endDate,
        groupBy,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('获取数据统计失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'get_data_stats' });
    
    res.status(500).json({
      success: false,
      error: '获取数据统计失败',
      message: error.message
    });
  }
});

// 导出数据
router.get('/export', async (req, res) => {
  try {
    const { 
      keyword = '', 
      platform = '', 
      startDate = '', 
      endDate = '',
      format = 'json', // json, csv, xlsx
      fields = 'all',
      includeAnalysis = false
    } = req.query;

    logger.info(`导出数据: 格式=${format}, 关键词=${keyword}, 平台=${platform}`);

    // 获取要导出的数据
    const mockData = generateMockDataList({
      keyword,
      platform,
      startDate,
      endDate,
      limit: 1000, // 导出更多数据
      offset: 0
    });

    if (format === 'csv') {
      const csvData = convertToCSV(mockData.items, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="data_export_${Date.now()}.csv"`);
      res.send(csvData);
      return;
    }

    if (format === 'xlsx') {
      // Excel格式需要额外的库支持
      res.status(501).json({
        success: false,
        error: 'Excel格式暂不支持',
        message: 'Excel导出功能开发中'
      });
      return;
    }

    // 默认返回JSON格式
    res.json({
      success: true,
      data: mockData.items,
      total: mockData.total,
      format: format,
      metadata: {
        keyword,
        platform,
        startDate,
        endDate,
        fields,
        includeAnalysis,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('导出数据失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'export_data' });
    
    res.status(500).json({
      success: false,
      error: '导出数据失败',
      message: error.message
    });
  }
});

// 获取单条数据详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAnalysis = false } = req.query;

    logger.info(`获取数据详情: ID=${id}, 包含分析=${includeAnalysis}`);

    // 模拟数据详情
    const mockData = generateMockDataDetail(id, includeAnalysis === 'true');

    if (!mockData) {
      return res.status(404).json({
        success: false,
        error: '数据不存在',
        message: `未找到ID为 ${id} 的数据`
      });
    }

    res.json({
      success: true,
      data: mockData,
      metadata: {
        id: id,
        includeAnalysis: includeAnalysis === 'true',
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('获取数据详情失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'get_data_detail' });
    
    res.status(500).json({
      success: false,
      error: '获取数据详情失败',
      message: error.message
    });
  }
});

// 更新数据（标记、分类等）
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      sentiment = null,
      risk = null,
      category = null,
      tags = [],
      notes = ''
    } = req.body;

    logger.info(`更新数据: ID=${id}, 情感=${sentiment}, 风险=${risk}, 分类=${category}`);

    // 模拟数据更新
    const updatedData = {
      id: id,
      sentiment: sentiment,
      risk: risk,
      category: category,
      tags: tags,
      notes: notes,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '数据更新成功',
      data: updatedData
    });

  } catch (error) {
    logger.error('更新数据失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'update_data' });
    
    res.status(500).json({
      success: false,
      error: '更新数据失败',
      message: error.message
    });
  }
});

// 删除数据
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`删除数据: ID=${id}`);

    // 模拟数据删除
    const success = Math.random() > 0.1; // 90%成功率

    if (success) {
      res.json({
        success: true,
        message: '数据删除成功',
        id: id
      });
    } else {
      res.status(404).json({
        success: false,
        error: '数据不存在',
        message: `未找到ID为 ${id} 的数据`
      });
    }

  } catch (error) {
    logger.error('删除数据失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'delete_data' });
    
    res.status(500).json({
      success: false,
      error: '删除数据失败',
      message: error.message
    });
  }
});

// 批量操作
router.post('/batch', async (req, res) => {
  try {
    const { 
      operation = 'update',
      ids = [],
      updates = {},
      filters = {}
    } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '数据ID列表不能为空'
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        error: '批量操作数量不能超过100个'
      });
    }

    logger.info(`批量操作: 操作=${operation}, 数量=${ids.length}`);

    // 模拟批量操作
    const results = {
      total: ids.length,
      success: Math.floor(ids.length * 0.9), // 90%成功率
      failed: Math.floor(ids.length * 0.1),
      operation: operation,
      results: ids.map(id => ({
        id: id,
        success: Math.random() > 0.1,
        message: Math.random() > 0.1 ? '操作成功' : '操作失败'
      }))
    };

    res.json({
      success: true,
      message: '批量操作完成',
      data: results
    });

  } catch (error) {
    logger.error('批量操作失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'batch_operation' });
    
    res.status(500).json({
      success: false,
      error: '批量操作失败',
      message: error.message
    });
  }
});

// 数据聚合分析
router.get('/aggregate', async (req, res) => {
  try {
    const { 
      keyword = '', 
      platform = '', 
      startDate = '', 
      endDate = '',
      metrics = ['sentiment', 'risk', 'volume'],
      dimensions = ['time', 'platform']
    } = req.query;

    logger.info(`数据聚合分析: 关键词=${keyword}, 平台=${platform}, 指标=${metrics}, 维度=${dimensions}`);

    // 模拟聚合分析
    const mockAggregation = generateMockAggregation({
      keyword,
      platform,
      startDate,
      endDate,
      metrics: Array.isArray(metrics) ? metrics : metrics.split(','),
      dimensions: Array.isArray(dimensions) ? dimensions : dimensions.split(',')
    });

    res.json({
      success: true,
      data: mockAggregation,
      metadata: {
        keyword,
        platform,
        startDate,
        endDate,
        metrics,
        dimensions,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('数据聚合分析失败:', error);
    await errorHandler.handleError(error, { source: 'data_api', action: 'aggregate_data' });
    
    res.status(500).json({
      success: false,
      error: '数据聚合分析失败',
      message: error.message
    });
  }
});

// 模拟数据生成函数
function generateMockDataList(options) {
  const { keyword, platform, startDate, endDate, sentiment, risk, limit, offset, sortBy, sortOrder } = options;
  
  const items = [];
  const totalItems = 1000;
  
  for (let i = 0; i < Math.min(limit, totalItems - offset); i++) {
    const item = {
      id: `data_${Date.now()}_${i}`,
      content: `这是一个关于${keyword || '产品'}的模拟评论内容...`,
      author: `用户${Math.floor(Math.random() * 10000)}`,
      platform: platform || ['weibo', 'douyin', 'zhihu'][Math.floor(Math.random() * 3)],
      keyword: keyword || ['华为', '小米', '苹果'][Math.floor(Math.random() * 3)],
      publishTime: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      sentiment: sentiment || ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)],
      sentimentScore: Math.random() * 2 - 1, // -1 to 1
      risk: risk || ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      riskScore: Math.random(),
      interactions: {
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 500),
        shares: Math.floor(Math.random() * 200)
      },
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 应用过滤器
    if (sentiment && item.sentiment !== sentiment) continue;
    if (risk && item.risk !== risk) continue;
    if (platform && item.platform !== platform) continue;
    if (keyword && !item.content.includes(keyword)) continue;
    
    items.push(item);
  }
  
  // 排序
  items.sort((a, b) => {
    let aValue = a[sortBy] || a.createdAt;
    let bValue = b[sortBy] || b.createdAt;
    
    if (typeof aValue === 'string') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });
  
  return {
    items: items,
    total: totalItems,
    hasMore: offset + limit < totalItems
  };
}

function generateMockDataStats(options) {
  const { keyword, platform, startDate, endDate, groupBy } = options;
  
  const stats = {
    total: Math.floor(Math.random() * 10000) + 1000,
    sentimentDistribution: {
      positive: Math.floor(Math.random() * 60) + 20,
      negative: Math.floor(Math.random() * 30) + 10,
      neutral: Math.floor(Math.random() * 50) + 20
    },
    riskDistribution: {
      low: Math.floor(Math.random() * 50) + 30,
      medium: Math.floor(Math.random() * 30) + 20,
      high: Math.floor(Math.random() * 20) + 5
    },
    platformDistribution: {
      weibo: Math.floor(Math.random() * 40) + 30,
      douyin: Math.floor(Math.random() * 35) + 25,
      zhihu: Math.floor(Math.random() * 25) + 15
    },
    timeSeries: generateTimeSeriesData(groupBy),
    topKeywords: generateTopKeywords(),
    topAuthors: generateTopAuthors()
  };
  
  return stats;
}

function generateMockDataDetail(id, includeAnalysis) {
  const data = {
    id: id,
    content: '这是一个详细的模拟评论内容，包含用户对产品的真实反馈...',
    author: '用户12345',
    platform: 'weibo',
    keyword: '华为',
    publishTime: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    url: 'https://weibo.com/12345/status/67890',
    sentiment: 'positive',
    sentimentScore: 0.8,
    risk: 'low',
    riskScore: 0.2,
    interactions: {
      likes: 150,
      comments: 45,
      shares: 23
    },
    metadata: {
      language: 'zh-CN',
      location: '北京',
      verified: false,
      followers: 1250
    },
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (includeAnalysis) {
    data.analysis = {
      sentiment: {
        score: 0.8,
        confidence: 0.92,
        keywords: ['好', '喜欢', '满意'],
        aspects: ['质量', '价格']
      },
      topics: ['产品质量', '用户体验'],
      risk: {
        level: 'low',
        score: 0.2,
        factors: ['政治', '经济']
      },
      entities: ['华为', '手机', '产品'],
      confidence: 0.85
    };
  }
  
  return data;
}

function generateTimeSeriesData(groupBy) {
  const series = [];
  const points = groupBy === 'day' ? 30 : groupBy === 'week' ? 12 : 24;
  
  for (let i = 0; i < points; i++) {
    const date = new Date();
    if (groupBy === 'day') {
      date.setDate(date.getDate() - (points - i - 1));
    } else if (groupBy === 'week') {
      date.setDate(date.getDate() - (points - i - 1) * 7);
    } else {
      date.setHours(date.getHours() - (points - i - 1));
    }
    
    series.push({
      timestamp: date.toISOString(),
      value: Math.floor(Math.random() * 1000) + 100,
      sentiment: {
        positive: Math.floor(Math.random() * 60) + 20,
        negative: Math.floor(Math.random() * 30) + 10,
        neutral: Math.floor(Math.random() * 50) + 20
      }
    });
  }
  
  return series;
}

function generateTopKeywords() {
  const keywords = ['质量', '价格', '服务', '外观', '功能', '体验', '性价比', '品牌'];
  return keywords.map(keyword => ({
    keyword: keyword,
    count: Math.floor(Math.random() * 500) + 50,
    percentage: Math.floor(Math.random() * 20) + 5
  }));
}

function generateTopAuthors() {
  return Array.from({ length: 10 }, (_, i) => ({
    author: `用户${Math.floor(Math.random() * 10000)}`,
    posts: Math.floor(Math.random() * 50) + 5,
    followers: Math.floor(Math.random() * 10000) + 100,
    influence: Math.floor(Math.random() * 100)
  }));
}

function convertToCSV(items, fields) {
  // 简化的CSV转换
  const headers = ['ID', '内容', '作者', '平台', '情感', '风险', '点赞', '评论', '转发'];
  const rows = items.map(item => [
    item.id,
    `"${item.content}"`,
    item.author,
    item.platform,
    item.sentiment,
    item.risk,
    item.interactions.likes,
    item.interactions.comments,
    item.interactions.shares
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateMockAggregation(options) {
  const { metrics, dimensions } = options;
  
  const aggregation = {
    summary: {
      total: Math.floor(Math.random() * 10000) + 1000,
      avgSentiment: (Math.random() * 2 - 1).toFixed(2),
      avgRisk: (Math.random() * 0.8).toFixed(2)
    },
    breakdowns: {}
  };
  
  dimensions.forEach(dimension => {
    aggregation.breakdowns[dimension] = generateDimensionBreakdown(dimension, metrics);
  });
  
  return aggregation;
}

function generateDimensionBreakdown(dimension, metrics) {
  const breakdown = [];
  const items = dimension === 'time' ? 24 : dimension === 'platform' ? 3 : 5;
  
  for (let i = 0; i < items; i++) {
    const item = {
      dimension: dimension,
      value: getDimensionValue(dimension, i),
      count: Math.floor(Math.random() * 1000) + 100
    };
    
    metrics.forEach(metric => {
      if (metric === 'sentiment') {
        item.sentiment = {
          positive: Math.floor(Math.random() * 60) + 20,
          negative: Math.floor(Math.random() * 30) + 10,
          neutral: Math.floor(Math.random() * 50) + 20
        };
      } else if (metric === 'risk') {
        item.risk = {
          low: Math.floor(Math.random() * 50) + 30,
          medium: Math.floor(Math.random() * 30) + 20,
          high: Math.floor(Math.random() * 20) + 5
        };
      } else if (metric === 'volume') {
        item.volume = Math.floor(Math.random() * 1000) + 100;
      }
    });
    
    breakdown.push(item);
  }
  
  return breakdown;
}

function getDimensionValue(dimension, index) {
  if (dimension === 'time') {
    return `${index}:00`;
  } else if (dimension === 'platform') {
    return ['weibo', 'douyin', 'zhihu'][index];
  } else if (dimension === 'sentiment') {
    return ['positive', 'negative', 'neutral'][index];
  } else if (dimension === 'risk') {
    return ['low', 'medium', 'high'][index];
  }
  return `value_${index}`;
}

module.exports = router;