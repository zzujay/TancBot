const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');

// 导入路由模块
const dataRoutes = require('./routes/data');
const analysisRoutes = require('./routes/analysis');
const realtimeRoutes = require('./routes/realtime');
const systemRoutes = require('./routes/system');

// 导入核心模块
const RealTimeMonitor = require('../monitoring/realtime-monitor');
const logger = require('../utils/logger');

class WebServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.monitor = new RealTimeMonitor();
    this.isRunning = false;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
  }
  
  setupMiddleware() {
    // 基础中间件
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // 请求日志
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
  }
  
  setupRoutes() {
    // 静态文件服务
    this.app.use('/static', express.static(path.join(__dirname, 'static')));
    
    // API路由
    this.app.use('/api/data', dataRoutes);
    this.app.use('/api/analysis', analysisRoutes);
    this.app.use('/api/realtime', realtimeRoutes);
    this.app.use('/api/system', systemRoutes);
    
    // 主页
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'dashboard.html'));
    });
    
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '2.0.0'
        }
      });
    });
    
    // API文档
    this.app.get('/api/docs', (req, res) => {
      res.json({
        success: true,
        data: {
          endpoints: [
            {
              path: '/api/data',
              methods: ['GET', 'POST', 'DELETE'],
              description: '数据管理接口'
            },
            {
              path: '/api/analysis',
              methods: ['GET', 'POST'],
              description: '分析任务接口'
            },
            {
              path: '/api/realtime',
              methods: ['GET'],
              description: '实时监控接口'
            },
            {
              path: '/api/system',
              methods: ['GET', 'POST'],
              description: '系统管理接口'
            }
          ],
          version: '2.0.0',
          timestamp: new Date().toISOString()
        }
      });
    });
  }
  
  setupSocketIO() {
    this.io.on('connection', (socket) => {
      logger.info(`客户端连接: ${socket.id}`);
      
      // 发送欢迎消息
      socket.emit('welcome', {
        message: '欢迎来到舆情研判系统V2',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
      
      // 订阅实时监控数据
      socket.on('subscribe-realtime', (data) => {
        const { keywords = [], platforms = [] } = data;
        logger.info(`客户端订阅实时监控: ${JSON.stringify({ keywords, platforms })}`);
        
        // 开始监控
        this.monitor.startMonitoring(keywords, platforms);
        
        // 监听监控数据并发送给客户端
        this.monitor.on('data-update', (update) => {
          socket.emit('realtime-update', update);
        });
        
        this.monitor.on('alert', (alert) => {
          socket.emit('realtime-alert', alert);
        });
      });
      
      // 取消订阅
      socket.on('unsubscribe-realtime', () => {
        logger.info(`客户端取消订阅实时监控: ${socket.id}`);
        this.monitor.stopMonitoring();
        this.monitor.removeAllListeners('data-update');
        this.monitor.removeAllListeners('alert');
      });
      
      // 获取当前状态
      socket.on('get-status', () => {
        const status = {
          isMonitoring: this.monitor.isMonitoring,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        };
        socket.emit('status', status);
      });
      
      // 断开连接
      socket.on('disconnect', () => {
        logger.info(`客户端断开连接: ${socket.id}`);
        // 清理监控状态
        if (this.io.engine.clientsCount === 0) {
          this.monitor.stopMonitoring();
        }
      });
    });
    
    // 定期广播系统状态
    setInterval(() => {
      if (this.isRunning) {
        this.io.emit('system-status', {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // 每30秒广播一次
  }
  
  setupErrorHandling() {
    // 404处理
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: '接口不存在',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
    
    // 全局错误处理
    this.app.use((error, req, res, next) => {
      logger.error('Web服务器错误:', error);
      
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      this.gracefulShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
      this.gracefulShutdown();
    });
  }
  
  async start() {
    try {
      // 确保必要的目录存在
      await this.ensureDirectories();
      
      this.server.listen(this.port, this.host, () => {
        this.isRunning = true;
        logger.info(`Web服务器启动成功`);
        logger.info(`访问地址: http://${this.host}:${this.port}`);
        logger.info(`API文档: http://${this.host}:${this.port}/api/docs`);
        logger.info(`监控面板: http://${this.host}:${this.port}/`);
      });
      
      return {
        success: true,
        message: 'Web服务器启动成功',
        url: `http://${this.host}:${this.port}`,
        pid: process.pid
      };
      
    } catch (error) {
      logger.error('Web服务器启动失败:', error);
      throw error;
    }
  }
  
  async stop() {
    return new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          logger.error('Web服务器停止失败:', error);
          reject(error);
        } else {
          this.isRunning = false;
          logger.info('Web服务器已停止');
          resolve({ success: true, message: 'Web服务器已停止' });
        }
      });
    });
  }
  
  async ensureDirectories() {
    const directories = [
      'data',
      'logs',
      'config',
      'backups',
      'src/web/static'
    ];
    
    for (const dir of directories) {
      try {
        await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
      } catch (error) {
        logger.warn(`创建目录失败: ${dir}`, error);
      }
    }
  }
  
  gracefulShutdown() {
    logger.info('正在优雅关闭Web服务器...');
    
    this.server.close(() => {
      logger.info('Web服务器已关闭');
      process.exit(0);
    });
    
    // 强制关闭超时
    setTimeout(() => {
      logger.warn('强制关闭Web服务器');
      process.exit(1);
    }, 10000);
  }
  
  // 获取服务器状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: this.io.engine.clientsCount,
      port: this.port,
      host: this.host
    };
  }
}

module.exports = WebServer;