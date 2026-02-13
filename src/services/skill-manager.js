const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class SkillManager {
  constructor() {
    this.skillsDir = path.join(__dirname, '../skills');
    this.skills = new Map();
    this.skillHistory = [];
    this.evolutionThreshold = 0.7; // 进化阈值
    this.performanceWindow = 10; // 性能窗口大小
    
    this.ensureSkillsDirectory();
  }

  async ensureSkillsDirectory() {
    await fs.ensureDir(this.skillsDir);
  }

  // 启动技能管理器
  async start() {
    logger.info('启动技能管理器...');
    
    try {
      // 加载现有技能
      await this.loadSkills();
      
      logger.info('技能管理器启动完成');
      return true;
    } catch (error) {
      logger.error('技能管理器启动失败:', error);
      throw error;
    }
  }

  // 停止技能管理器
  async stop() {
    logger.info('停止技能管理器...');
    
    try {
      // 保存技能状态
      await this.saveAllSkills();
      
      logger.info('技能管理器停止完成');
      return true;
    } catch (error) {
      logger.error('技能管理器停止失败:', error);
      throw error;
    }
  }

  // 注册技能
  async registerSkill(skill) {
    logger.info(`注册技能: ${skill.name}`);
    
    this.skills.set(skill.name, {
      ...skill,
      version: skill.version || '1.0.0',
      performance: [],
      evolutionHistory: [],
      lastUsed: null,
      usageCount: 0
    });

    // 保存技能到文件
    await this.saveSkill(skill);
    
    return true;
  }

  // 获取技能
  getSkill(name) {
    return this.skills.get(name);
  }

  // 获取所有技能
  getAllSkills() {
    return Array.from(this.skills.values());
  }

  // 执行技能
  async executeSkill(name, context, data) {
    const skill = this.skills.get(name);
    if (!skill) {
      throw new Error(`技能 ${name} 不存在`);
    }

    const startTime = Date.now();
    let result = null;
    let error = null;

    try {
      logger.info(`执行技能: ${name}`);
      result = await skill.execute(context, data);
      
      const executionTime = Date.now() - startTime;
      const performance = {
        success: true,
        executionTime,
        timestamp: new Date(),
        context: context,
        result: result
      };

      // 记录性能数据
      this.recordSkillPerformance(name, performance);
      
      // 更新使用统计
      skill.lastUsed = new Date();
      skill.usageCount++;

      // 检查是否需要进化
      await this.checkSkillEvolution(name);

      return result;
    } catch (err) {
      error = err;
      const executionTime = Date.now() - startTime;
      
      const performance = {
        success: false,
        executionTime,
        timestamp: new Date(),
        context: context,
        error: err.message
      };

      this.recordSkillPerformance(name, performance);
      throw err;
    }
  }

  // 记录技能性能
  recordSkillPerformance(name, performance) {
    const skill = this.skills.get(name);
    if (!skill) return;

    skill.performance.push(performance);
    
    // 保持性能窗口大小
    if (skill.performance.length > this.performanceWindow) {
      skill.performance.shift();
    }

    logger.info(`技能 ${name} 性能记录: 成功=${performance.success}, 用时=${performance.executionTime}ms`);
  }

  // 计算技能性能评分
  calculateSkillPerformance(name) {
    const skill = this.skills.get(name);
    if (!skill || skill.performance.length === 0) {
      return { score: 0, trend: 'stable' };
    }

    const recentPerformances = skill.performance.slice(-5);
    const successRate = recentPerformances.filter(p => p.success).length / recentPerformances.length;
    const avgExecutionTime = recentPerformances.reduce((sum, p) => sum + p.executionTime, 0) / recentPerformances.length;
    
    // 性能评分 (0-1)
    const performanceScore = successRate * 0.7 + Math.max(0, 1 - avgExecutionTime / 5000) * 0.3;
    
    // 计算趋势
    const olderPerformances = skill.performance.slice(-10, -5);
    const recentScore = this.calculatePerformanceSubset(recentPerformances);
    const olderScore = this.calculatePerformanceSubset(olderPerformances);
    
    let trend = 'stable';
    if (recentScore > olderScore + 0.1) trend = 'improving';
    else if (recentScore < olderScore - 0.1) trend = 'declining';

    return {
      score: performanceScore,
      successRate,
      avgExecutionTime,
      trend,
      recentScore,
      olderScore
    };
  }

  calculatePerformanceSubset(performances) {
    if (performances.length === 0) return 0;
    const successRate = performances.filter(p => p.success).length / performances.length;
    const avgTime = performances.reduce((sum, p) => sum + p.executionTime, 0) / performances.length;
    return successRate * 0.7 + Math.max(0, 1 - avgTime / 5000) * 0.3;
  }

  // 检查技能进化
  async checkSkillEvolution(name) {
    const skill = this.skills.get(name);
    if (!skill) return;

    const performance = this.calculateSkillPerformance(name);
    
    // 性能低于阈值且使用次数足够
    if (performance.score < this.evolutionThreshold && skill.usageCount >= 5) {
      logger.info(`技能 ${name} 需要进化，当前性能评分: ${performance.score.toFixed(2)}`);
      await this.evolveSkill(name, performance);
    }
  }

  // 技能进化
  async evolveSkill(name, currentPerformance) {
    const skill = this.skills.get(name);
    if (!skill) return;

    logger.info(`开始进化技能: ${name}`);
    
    try {
      // 分析性能问题
      const issues = this.analyzeSkillIssues(skill, currentPerformance);
      
      // 生成进化策略
      const evolutionStrategy = this.generateEvolutionStrategy(skill, issues, currentPerformance);
      
      // 执行进化
      const evolvedSkill = await this.executeEvolution(skill, evolutionStrategy);
      
      // 记录进化历史
      const evolutionRecord = {
        timestamp: new Date(),
        originalVersion: skill.version,
        newVersion: evolvedSkill.version,
        strategy: evolutionStrategy,
        performanceBefore: currentPerformance,
        issues: issues
      };

      skill.evolutionHistory.push(evolutionRecord);
      
      // 更新技能
      this.skills.set(name, evolvedSkill);
      await this.saveSkill(evolvedSkill);

      logger.info(`技能 ${name} 进化完成，新版本: ${evolvedSkill.version}`);
      
      return evolvedSkill;
    } catch (error) {
      logger.error(`技能 ${name} 进化失败:`, error);
      throw error;
    }
  }

  // 分析技能问题
  analyzeSkillIssues(skill, performance) {
    const issues = [];
    
    if (performance.successRate < 0.8) {
      issues.push({
        type: 'low_success_rate',
        severity: 'high',
        description: `成功率较低 (${(performance.successRate * 100).toFixed(1)}%)`
      });
    }
    
    if (performance.avgExecutionTime > 3000) {
      issues.push({
        type: 'slow_execution',
        severity: 'medium',
        description: `执行时间过长 (${performance.avgExecutionTime.toFixed(0)}ms)`
      });
    }
    
    if (performance.trend === 'declining') {
      issues.push({
        type: 'performance_decline',
        severity: 'high',
        description: '性能呈下降趋势'
      });
    }

    // 分析最近的错误模式
    const recentErrors = skill.performance
      .filter(p => !p.success && p.error)
      .slice(-5);
    
    if (recentErrors.length > 0) {
      const errorTypes = {};
      recentErrors.forEach(error => {
        const errorType = this.classifyError(error.error);
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      });
      
      Object.entries(errorTypes).forEach(([type, count]) => {
        if (count >= 2) {
          issues.push({
            type: 'recurring_error',
            severity: count >= 3 ? 'high' : 'medium',
            description: `频繁出现 ${type} 错误 (${count}次)`
          });
        }
      });
    }

    return issues;
  }

  classifyError(errorMessage) {
    if (errorMessage.includes('timeout')) return 'timeout';
    if (errorMessage.includes('network')) return 'network';
    if (errorMessage.includes('validation')) return 'validation';
    if (errorMessage.includes('data')) return 'data_error';
    return 'unknown';
  }

  // 生成进化策略
  generateEvolutionStrategy(skill, issues, performance) {
    const strategies = [];
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'low_success_rate':
          strategies.push({
            type: 'error_handling',
            priority: 'high',
            description: '增强错误处理和容错机制'
          });
          break;
        case 'slow_execution':
          strategies.push({
            type: 'performance',
            priority: 'medium',
            description: '优化算法复杂度或添加缓存机制'
          });
          break;
        case 'performance_decline':
          strategies.push({
            type: 'adaptation',
            priority: 'high',
            description: '调整参数或算法以适应新情况'
          });
          break;
        case 'recurring_error':
          strategies.push({
            type: 'bug_fix',
            priority: 'high',
            description: `修复 ${issue.description} 中的问题`
          });
          break;
      }
    });

    // 如果没有特定策略，使用通用优化
    if (strategies.length === 0) {
      strategies.push({
        type: 'general_optimization',
        priority: 'medium',
        description: '通用性能优化和代码改进'
      });
    }

    return {
      timestamp: new Date(),
      strategies: strategies.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)),
      target: `提升性能评分从 ${performance.score.toFixed(2)} 到 ${Math.min(performance.score + 0.2, 1.0).toFixed(2)}`
    };
  }

  getPriorityValue(priority) {
    const values = { high: 3, medium: 2, low: 1 };
    return values[priority] || 0;
  }

  // 执行进化
  async executeEvolution(skill, strategy) {
    logger.info(`执行进化策略: ${strategy.strategies[0].type}`);
    
    // 这里可以实现具体的进化逻辑
    // 例如：修改算法参数、添加新的处理逻辑、优化代码等
    
    const evolvedSkill = {
      ...skill,
      version: this.incrementVersion(skill.version),
      lastEvolved: new Date(),
      evolutionCount: (skill.evolutionCount || 0) + 1
    };

    // 根据策略类型应用具体的进化逻辑
    if (strategy.strategies[0].type === 'error_handling') {
      evolvedSkill.config = {
        ...skill.config,
        retryCount: (skill.config?.retryCount || 0) + 1,
        timeout: Math.min((skill.config?.timeout || 5000) * 1.2, 30000)
      };
    } else if (strategy.strategies[0].type === 'performance') {
      evolvedSkill.config = {
        ...skill.config,
        cacheEnabled: true,
        maxConcurrent: Math.min((skill.config?.maxConcurrent || 1) * 2, 10)
      };
    }

    return evolvedSkill;
  }

  incrementVersion(version) {
    const parts = version.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  // 保存技能到文件
  async saveSkill(skill) {
    const skillPath = path.join(this.skillsDir, `${skill.name}.json`);
    const skillData = {
      name: skill.name,
      version: skill.version,
      description: skill.description,
      config: skill.config,
      performance: skill.performance,
      evolutionHistory: skill.evolutionHistory,
      usageCount: skill.usageCount,
      lastUsed: skill.lastUsed,
      lastEvolved: skill.lastEvolved,
      evolutionCount: skill.evolutionCount
    };

    await fs.writeJson(skillPath, skillData, { spaces: 2 });
  }

  // 从文件加载技能
  async loadSkills() {
    try {
      const files = await fs.readdir(this.skillsDir);
      const skillFiles = files.filter(file => file.endsWith('.json'));

      for (const file of skillFiles) {
        const skillPath = path.join(this.skillsDir, file);
        const skillData = await fs.readJson(skillPath);
        
        // 这里需要重新创建技能实例
        // 实际实现中需要根据技能类型重新实例化
        this.skills.set(skillData.name, skillData);
        logger.info(`加载技能: ${skillData.name} v${skillData.version}`);
      }
    } catch (error) {
      logger.error('加载技能失败:', error);
    }
  }

  // 获取技能统计
  getSkillStats() {
    const stats = {
      totalSkills: this.skills.size,
      skills: []
    };

    this.skills.forEach((skill, name) => {
      const performance = this.calculateSkillPerformance(name);
      stats.skills.push({
        name: name,
        version: skill.version,
        usageCount: skill.usageCount,
        lastUsed: skill.lastUsed,
        performance: performance,
        evolutionCount: skill.evolutionCount || 0,
        lastEvolved: skill.lastEvolved
      });
    });

    return stats;
  }
}

module.exports = SkillManager;