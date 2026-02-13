/**
 * Web界面服务器
 * 提供现代化的Web界面用于舆情分析
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const configManager = require('../utils/config-manager');
const errorHandler = require('../utils/error-handler');

class WebInterface {
  constructor(port = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.port = port;
    this.clients = new Map();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // CORS配置
    this.app.use(cors({
      origin: configManager.get('security.cors.origins'),
      methods: configManager.get('security.cors.methods'),
      credentials: true
    }));

    // 速率限制
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: configManager.get('security.rateLimit') || 1000,
      message: '请求过于频繁，请稍后再试'
    });
    this.app.use('/api/', limiter);

    // 解析JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 静态文件服务
    this.app.use('/static', express.static(path.join(__dirname, '../web/static')));
    this.app.use('/assets', express.static(path.join(__dirname, '../web/assets')));
  }

  setupRoutes() {
    // API路由
    this.app.use('/api/analysis', require('./routes/analysis'));
    this.app.use('/api/data', require('./routes/data'));
    this.app.use('/api/system', require('./routes/system'));
    this.app.use('/api/realtime', require('./routes/realtime'));

    // 主页面
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/index.html'));
    });

    // 仪表盘
    this.app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/dashboard.html'));
    });

    // 分析页面
    this.app.get('/analysis', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/analysis.html'));
    });

    // 实时监控
    this.app.get('/monitor', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/monitor.html'));
    });

    // 设置页面
    this.app.get('/settings', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/settings.html'));
    });

    // 错误处理
    this.app.use((err, req, res, next) => {
      errorHandler.handleError(err, {
        source: 'web_interface',
        url: req.url,
        method: req.method
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });

    // 404处理
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: '请求的页面不存在',
        path: req.path
      });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`客户端连接: ${socket.id}`);
      
      this.clients.set(socket.id, {
        id: socket.id,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // 实时数据推送
      socket.on('subscribe_realtime', (data) => {
        this.handleRealtimeSubscription(socket, data);
      });

      // 分析任务
      socket.on('start_analysis', async (data) => {
        await this.handleAnalysisRequest(socket, data);
      });

      // 系统状态
      socket.on('get_system_status', () => {
        this.sendSystemStatus(socket);
      });

      // 性能指标
      socket.on('get_performance_metrics', () => {
        this.sendPerformanceMetrics(socket);
      });

      // 断开连接
      socket.on('disconnect', () => {
        logger.info(`客户端断开连接: ${socket.id}`);
        this.clients.delete(socket.id);
      });

      // 错误处理
      socket.on('error', (error) => {
        logger.error('Socket错误:', error);
        errorHandler.handleError(error, { source: 'socket', socketId: socket.id });
      });
    });

    // 设置定时推送
    this.setupPeriodicUpdates();
  }

  handleRealtimeSubscription(socket, data) {
    const { keywords, platforms } = data;
    
    socket.join('realtime_updates');
    
    // 开始实时数据收集
    this.startRealtimeCollection(socket, keywords, platforms);
    
    socket.emit('subscription_confirmed', {
      keywords,
      platforms,
      message: '已订阅实时数据更新'
    });
  }

  async startRealtimeCollection(socket, keywords, platforms) {
    // 这里应该启动实时数据收集任务
    // 目前发送模拟数据
    const interval = setInterval(() => {
      const mockData = this.generateMockRealtimeData(keywords, platforms);
      socket.emit('realtime_data', mockData);
    }, 5000); // 每5秒更新一次

    // 存储定时器以便清理
    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  generateMockRealtimeData(keywords, platforms) {
    const data = {
      timestamp: new Date().toISOString(),
      keywords,
      platforms,
      metrics: {
        totalPosts: Math.floor(Math.random() * 1000) + 100,
        sentimentScore: (Math.random() - 0.5) * 4, // -2 到 2
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        hotTopics: [
          { topic: '产品质量', mentions: Math.floor(Math.random() * 100) },
          { topic: '用户体验', mentions: Math.floor(Math.random() * 80) },
          { topic: '价格讨论', mentions: Math.floor(Math.random() * 60) }
        ]
      },
      trend: {
        direction: Math.random() > 0.5 ? 'up' : 'down',
        change: Math.floor(Math.random() * 20) - 10 // -10% 到 10%
      }
    };

    return data;
  }

  async handleAnalysisRequest(socket, data) {
    try {
      const { keywords, options = {} } = data;
      
      // 发送开始信号
      socket.emit('analysis_started', {
        message: '开始分析任务',
        keywords,
        timestamp: new Date().toISOString()
      });

      // 模拟分析过程
      const steps = [
        { step: 'data_collection', message: '正在采集数据...', duration: 3000 },
        { step: 'data_cleaning', message: '正在清洗数据...', duration: 2000 },
        { step: 'ai_analysis', message: '正在进行AI分析...', duration: 5000 },
        { step: 'result_generation', message: '正在生成结果...', duration: 2000 }
      ];

      for (const step of steps) {
        socket.emit('analysis_progress', {
          step: step.step,
          message: step.message,
          progress: (steps.indexOf(step) + 1) / steps.length * 100
        });

        await new Promise(resolve => setTimeout(resolve, step.duration));
      }

      // 发送最终结果
      const result = this.generateMockAnalysisResult(keywords, options);
      socket.emit('analysis_completed', result);

    } catch (error) {
      logger.error('分析任务失败:', error);
      socket.emit('analysis_error', {
        message: '分析任务失败',
        error: error.message
      });
      
      errorHandler.handleError(error, { source: 'analysis_request', socketId: socket.id });
    }
  }

  generateMockAnalysisResult(keywords, options) {
    return {
      taskId: `analysis_${Date.now()}`,
      keywords,
      timestamp: new Date().toISOString(),
      summary: {
        overallSentiment: (Math.random() - 0.5) * 4,
        sentimentDistribution: {
          positive: Math.floor(Math.random() * 60) + 20,
          negative: Math.floor(Math.random() * 30) + 10,
          neutral: Math.floor(Math.random() * 50) + 20
        },
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        hotTopics: [
          { topic: '产品质量', hotness: Math.random() * 100 },
          { topic: '用户体验', hotness: Math.random() * 80 },
          { topic: '价格讨论', hotness: Math.random() * 60 }
        ]
      },
      recommendations: [
        '建议关注用户反馈，及时回应关切',
        '加强产品质量管控，提升用户满意度',
        '优化用户体验，增强品牌竞争力'
      ],
      confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
    };
  }

  sendSystemStatus(socket) {
    const status = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: require('os').loadavg(),
      activeClients: this.clients.size,
      timestamp: new Date().toISOString()
    };

    socket.emit('system_status', status);
  }

  sendPerformanceMetrics(socket) {
    const metrics = {
      responseTime: Math.random() * 1000, // 模拟响应时间
      throughput: Math.floor(Math.random() * 1000) + 500, // 模拟吞吐量
      errorRate: Math.random() * 0.05, // 模拟错误率
      timestamp: new Date().toISOString()
    };

    socket.emit('performance_metrics', metrics);
  }

  setupPeriodicUpdates() {
    // 每30秒推送系统状态
    setInterval(() => {
      this.io.to('realtime_updates').emit('system_status', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: require('os').loadavg(),
        activeClients: this.clients.size,
        timestamp: new Date().toISOString()
      });
    }, 30000);

    // 每10秒推送性能指标
    setInterval(() => {
      this.io.to('realtime_updates').emit('performance_metrics', {
        responseTime: Math.random() * 1000,
        throughput: Math.floor(Math.random() * 1000) + 500,
        errorRate: Math.random() * 0.05,
        timestamp: new Date().toISOString()
      });
    }, 10000);
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (error) => {
        if (error) {
          logger.error('Web界面启动失败:', error);
          reject(error);
        } else {
          logger.info(`Web界面已启动，端口: ${this.port}`);
          logger.info(`访问地址: http://localhost:${this.port}`);
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('Web界面已停止');
        resolve();
      });
    });
  }

  // 广播消息给所有客户端
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // 广播给特定房间
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  // 获取连接统计
  getConnectionStats() {
    return {
      totalClients: this.clients.size,
      realtimeSubscribers: this.io.sockets.adapter.rooms.get('realtime_updates')?.size || 0,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
      clients: Array.from(this.clients.values())
    };
  }
}

module.exports = WebInterface;