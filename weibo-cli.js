/**
 * 简化版微博数据采集CLI命令
 * 仅支持微博平台，使用Cookie认证，无模拟数据
 */

const WeiboCollector = require('./src/data-collection/weibo-collector-simplified');
const PublicOpinionSystemSimplified = require('./src/index-simplified');
const logger = require('./src/utils/logger');

/**
 * 微博数据采集CLI命令处理
 */
class WeiboCLI {
  constructor() {
    this.weiboCollector = new WeiboCollector();
    this.opinionSystem = new PublicOpinionSystemSimplified();
  }

  /**
   * 处理微博数据采集命令
   */
  async handleWeiboCollect(args) {
    console.log('🔍 微博数据采集工具 - 简化版');
    console.log('=' .repeat(50));
    
    try {
      // 解析参数
      const options = this.parseCollectArgs(args);
      
      if (options.help) {
        this.showCollectHelp();
        return;
      }
      
      // 检查Cookie配置
      if (!this.checkCookieConfig()) {
        console.log('⚠️  WEIBO_COOKIE 未配置');
        console.log('💡 请先配置微博Cookie才能采集真实数据');
        console.log('   运行: node weibo-simple-login-tool.js');
        return;
      }
      
      console.log(`🎯 开始采集微博数据：关键词="${options.keywords.join(', ')}"`);
      console.log(`📊 最大结果数：${options.maxResults}`);
      
      // 采集数据
      const results = await this.weiboCollector.search(options.keywords[0], options.maxResults);
      
      console.log(`\n✅ 采集完成！共获得 ${results.length} 条微博数据`);
      
      if (results.length > 0) {
        console.log('\n📋 数据样本：');
        results.slice(0, 3).forEach((item, index) => {
          console.log(`\n${index + 1}. 作者：${item.author}`);
          console.log(`   内容：${item.content.substring(0, 80)}...`);
          console.log(`   时间：${item.time}`);
          console.log(`   👍 ${item.likes}  🔄 ${item.reposts}  💬 ${item.comments}`);
        });
        
        // 保存结果
        if (options.save) {
          await this.saveResults(results, options.keywords[0]);
        }
        
        // 显示统计信息
        this.showCollectionStats(results);
      }
      
    } catch (error) {
      console.error('❌ 微博数据采集失败:', error.message);
      logger.error('微博数据采集失败', error);
    }
  }

  /**
   * 处理微博舆情分析命令
   */
  async handleWeiboAnalyze(args) {
    console.log('🤖 微博舆情分析工具 - 简化版');
    console.log('=' .repeat(50));
    
    try {
      const options = this.parseAnalyzeArgs(args);
      
      if (options.help) {
        this.showAnalyzeHelp();
        return;
      }
      
      console.log('🚀 初始化舆情分析系统...');
      await this.opinionSystem.initialize();
      
      if (options.keywords && options.keywords.length > 0) {
        // 关键词分析模式
        console.log(`🎯 开始分析关键词：${options.keywords.join(', ')}`);
        
        const result = await this.opinionSystem.start(options.keywords, {
          maxResults: options.maxResults || 30
        });
        
        if (result.success) {
          console.log('\n✅ 微博舆情分析完成！');
          this.displayAnalysisResults(result);
        } else {
          console.log('\n❌ 分析失败:', result.message);
        }
        
      } else if (options.content) {
        // 内容分析模式
        console.log('📝 分析指定内容...');
        console.log(`内容：${options.content.substring(0, 100)}...`);
        
        const analysisResult = await this.opinionSystem.analyzer.analyzeContent(options.content, {
          type: options.type || 'comprehensive'
        });
        
        if (analysisResult.success) {
          console.log('\n✅ 内容分析完成！');
          this.displayContentAnalysis(analysisResult);
        } else {
          console.log('\n❌ 内容分析失败:', analysisResult.error);
        }
      }
      
    } catch (error) {
      console.error('❌ 微博舆情分析失败:', error.message);
      logger.error('微博舆情分析失败', error);
    }
  }

  /**
   * 解析采集参数
   */
  parseCollectArgs(args) {
    const options = {
      keywords: [],
      maxResults: 20,
      save: false,
      help: false
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--keywords':
        case '-k':
          // 收集所有关键词直到下一个参数或结束
          i++;
          while (i < args.length && !args[i].startsWith('-')) {
            options.keywords.push(args[i]);
            i++;
          }
          i--; // 回退一个位置
          break;
          
        case '--max-results':
        case '-m':
          options.maxResults = parseInt(args[++i]) || 20;
          break;
          
        case '--save':
        case '-s':
          options.save = true;
          break;
          
        case '--help':
        case '-h':
          options.help = true;
          break;
          
        default:
          if (!arg.startsWith('-') && options.keywords.length === 0) {
            options.keywords.push(arg);
          }
          break;
      }
    }
    
    // 如果没有明确的关键词，使用默认关键词
    if (options.keywords.length === 0) {
      options.keywords = ['热点', '新闻'];
    }
    
    return options;
  }

  /**
   * 解析分析参数
   */
  parseAnalyzeArgs(args) {
    const options = {
      keywords: [],
      content: '',
      maxResults: 30,
      type: 'comprehensive',
      help: false
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--keywords':
        case '-k':
          i++;
          while (i < args.length && !args[i].startsWith('-')) {
            options.keywords.push(args[i]);
            i++;
          }
          i--;
          break;
          
        case '--content':
        case '-c':
          i++;
          options.content = args[i] || '';
          break;
          
        case '--max-results':
        case '-m':
          options.maxResults = parseInt(args[++i]) || 30;
          break;
          
        case '--type':
        case '-t':
          options.type = args[++i] || 'comprehensive';
          break;
          
        case '--help':
        case '-h':
          options.help = true;
          break;
          
        default:
          if (!arg.startsWith('-') && options.keywords.length === 0 && !options.content) {
            options.content = arg;
          }
          break;
      }
    }
    
    return options;
  }

  /**
   * 检查Cookie配置
   */
  checkCookieConfig() {
    const weiboCookie = process.env.WEIBO_COOKIE;
    return weiboCookie && weiboCookie.length > 50;
  }

  /**
   * 保存结果
   */
  async saveResults(results, keyword) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `weibo-data-${keyword}-${timestamp}.json`;
      const filepath = path.join('./data', filename);
      
      // 确保data目录存在
      if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data', { recursive: true });
      }
      
      const data = {
        keyword: keyword,
        count: results.length,
        timestamp: new Date().toISOString(),
        platform: 'weibo',
        results: results
      };
      
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`💾 数据已保存到: ${filepath}`);
      
    } catch (error) {
      console.error('❌ 保存数据失败:', error.message);
    }
  }

  /**
   * 显示采集统计
   */
  showCollectionStats(results) {
    console.log('\n📊 采集统计信息：');
    console.log('-' .repeat(40));
    
    // 基本统计
    console.log(`📈 总数据量：${results.length} 条`);
    
    // 互动数据统计
    const totalLikes = results.reduce((sum, item) => sum + (item.likes || 0), 0);
    const totalReposts = results.reduce((sum, item) => sum + (item.reposts || 0), 0);
    const totalComments = results.reduce((sum, item) => sum + (item.comments || 0), 0);
    
    console.log(`👍 总点赞数：${totalLikes}`);
    console.log(`🔄 总转发数：${totalReposts}`);
    console.log(`💬 总评论数：${totalComments}`);
    
    // 平均互动数据
    if (results.length > 0) {
      console.log(`📊 平均点赞：${(totalLikes / results.length).toFixed(1)}`);
      console.log(`📊 平均转发：${(totalReposts / results.length).toFixed(1)}`);
      console.log(`📊 平均评论：${(totalComments / results.length).toFixed(1)}`);
    }
    
    // 时间分布
    const timeDistribution = this.analyzeTimeDistribution(results);
    console.log(`⏰ 时间分布：${timeDistribution}`);
    
    console.log('\n💡 建议：');
    console.log('  • 可以使用这些数据进行分析');
    console.log('  • 建议定期采集以跟踪变化趋势');
    console.log('  • 可以结合舆情分析功能进行深入分析');
  }

  /**
   * 分析时间分布
   */
  analyzeTimeDistribution(results) {
    const now = new Date();
    const timeRanges = {
      '1小时内': 0,
      '1-6小时': 0,
      '6-24小时': 0,
      '1-7天': 0,
      '7天以上': 0
    };
    
    results.forEach(item => {
      try {
        const publishTime = new Date(item.publishTime || item.time);
        const hoursAgo = (now - publishTime) / (1000 * 60 * 60);
        
        if (hoursAgo <= 1) timeRanges['1小时内']++;
        else if (hoursAgo <= 6) timeRanges['1-6小时']++;
        else if (hoursAgo <= 24) timeRanges['6-24小时']++;
        else if (hoursAgo <= 168) timeRanges['1-7天']++;
        else timeRanges['7天以上']++;
        
      } catch (error) {
        // 忽略解析错误
      }
    });
    
    const total = results.length;
    const distribution = Object.entries(timeRanges)
      .map(([range, count]) => `${range}(${Math.round(count/total*100)}%)`)
      .join(', ');
    
    return distribution;
  }

  /**
   * 显示分析结果
   */
  displayAnalysisResults(result) {
    console.log('\n📊 微博舆情分析结果：');
    console.log('-' .repeat(50));
    
    const data = result.data;
    
    // 基础统计
    console.log(`📈 原始数据：${data.rawDataCount} 条微博`);
    console.log(`🤖 分析完成：${data.analyzedCount} 条数据`);
    console.log(`💾 保存成功：${data.savedCount} 条结果`);
    
    // 详细报告
    if (data.report && data.report.statistics) {
      const stats = data.report.statistics;
      
      console.log('\n💭 情感分析：');
      console.log(`   正面：${stats.sentiment.positive}条 (${stats.sentiment.percentages.positive}%)`);
      console.log(`   负面：${stats.sentiment.negative}条 (${stats.sentiment.percentages.negative}%)`);
      console.log(`   中性：${stats.sentiment.neutral}条 (${stats.sentiment.percentages.neutral}%)`);
      console.log(`   置信度：${(stats.sentiment.averageConfidence * 100).toFixed(1)}%`);
      
      console.log('\n⚠️ 风险分析：');
      console.log(`   低风险：${stats.risk.low}条 (${stats.risk.percentages.low}%)`);
      console.log(`   中等风险：${stats.risk.medium}条 (${stats.risk.percentages.medium}%)`);
      console.log(`   高风险：${stats.risk.high}条 (${stats.risk.percentages.high}%)`);
      console.log(`   平均风险：${stats.risk.averageLevel}/10`);
      
      console.log('\n🌟 影响力分析：');
      console.log(`   低影响力：${stats.influence.low}条 (${stats.influence.percentages.low}%)`);
      console.log(`   中等影响力：${stats.influence.medium}条 (${stats.influence.percentages.medium}%)`);
      console.log(`   高影响力：${stats.influence.high}条 (${stats.influence.percentages.high}%)`);
      console.log(`   平均影响力：${stats.influence.averageScore}/10`);
      
      console.log('\n📈 趋势分析：');
      console.log(`   上升趋势：${stats.trends.rising}条 (${stats.trends.percentages.rising}%)`);
      console.log(`   稳定趋势：${stats.trends.stable}条 (${stats.trends.percentages.stable}%)`);
      console.log(`   下降趋势：${stats.trends.falling}条 (${stats.trends.percentages.falling}%)`);
      
      if (stats.topics && stats.topics.length > 0) {
        console.log('\n🏷️ 主要话题：');
        stats.topics.slice(0, 5).forEach(topic => {
          console.log(`   ${topic.topic}：${topic.count}条 (${topic.percentage}%)`);
        });
      }
      
      if (stats.keywords && stats.keywords.length > 0) {
        console.log('\n🔑 主要关键词：');
        stats.keywords.slice(0, 8).forEach(keyword => {
          console.log(`   ${keyword.keyword}：${keyword.count}次 (${keyword.percentage}%)`);
        });
      }
      
      if (data.report.recommendations && data.report.recommendations.length > 0) {
        console.log('\n💡 建议：');
        data.report.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
    }
    
    console.log('\n📝 详细数据已保存到数据库');
    console.log('💡 可以使用其他命令查看更多统计信息');
  }

  /**
   * 显示内容分析结果
   */
  displayContentAnalysis(result) {
    console.log('\n📊 内容分析结果：');
    console.log('-' .repeat(50));
    
    const analysis = result.analysis;
    
    if (analysis.sentiment) {
      console.log(`💭 情感倾向：${analysis.sentiment.label} (置信度: ${(analysis.sentiment.confidence * 100).toFixed(1)}%)`);
    }
    
    if (analysis.risk_level !== undefined) {
      console.log(`⚠️ 风险等级：${analysis.risk_level}/10`);
    }
    
    if (analysis.influence_score !== undefined) {
      console.log(`🌟 影响力：${analysis.influence_score}/10`);
    }
    
    if (analysis.trend_prediction) {
      console.log(`📈 趋势预测：${analysis.trend_prediction}`);
    }
    
    if (analysis.topics && analysis.topics.length > 0) {
      console.log(`🏷️ 主要话题：${analysis.topics.join(', ')}`);
    }
    
    if (analysis.keywords && analysis.keywords.length > 0) {
      console.log(`🔑 主要关键词：${analysis.keywords.join(', ')}`);
    }
    
    if (analysis.summary) {
      console.log(`📝 摘要：${analysis.summary}`);
    }
    
    console.log(`⏱️ 分析耗时：${result.metadata.duration}ms`);
    console.log(`🤖 使用模型：${result.metadata.provider} - ${result.metadata.model}`);
  }

  /**
   * 显示采集帮助
   */
  showCollectHelp() {
    console.log(`
🎯 微博数据采集帮助

使用方法：
  npm run weibo:collect [选项] [关键词]

选项：
  --keywords, -k <关键词>    要搜索的关键词（多个关键词用空格分隔）
  --max-results, -m <数量>   最大采集数量（默认：20）
  --save, -s                保存结果到文件
  --help, -h                显示帮助信息

示例：
  npm run weibo:collect 人工智能                    # 采集关于"人工智能"的微博
  npm run weibo:collect -k 疫情 防控                # 采集关于"疫情"和"防控"的微博
  npm run weibo:collect --keywords 新能源汽车 -m 50   # 采集50条关于"新能源汽车"的微博
  npm run weibo:collect 春节 --save                   # 采集关于"春节"的微博并保存结果

注意：
  • 需要先配置微博Cookie才能采集真实数据
  • 运行：node weibo-simple-login-tool.js 来配置Cookie
  • 建议合理设置采集数量，避免频繁请求
  • 采集的数据可用于后续的舆情分析
`);
  }

  /**
   * 显示分析帮助
   */
  showAnalyzeHelp() {
    console.log(`
🤖 微博舆情分析帮助

使用方法：
  npm run weibo:analyze [选项] [内容]

选项：
  --keywords, -k <关键词>    要分析的关键词（会采集相关微博数据）
  --content, -c <内容>       直接分析指定的文本内容
  --max-results, -m <数量>   最大分析数量（默认：30）
  --type <类型>              分析类型：comprehensive（综合）、sentiment（情感）、topics（主题）、risk（风险）
  --help, -h                 显示帮助信息

示例：
  npm run weibo:analyze 人工智能                    # 分析关于"人工智能"的微博舆情
  npm run weibo:analyze -k 疫情 防控                # 分析关于"疫情"和"防控"的舆情
  npm run weibo:analyze --content "某品牌发布了新产品..."  # 分析指定内容
  npm run weibo:analyze 新能源汽车 --type sentiment   # 只进行情感分析

注意：
  • 支持关键词模式和内容模式两种分析方式
  • 关键词模式会采集相关微博数据进行分析
  • 内容模式直接分析指定的文本内容
  • 分析结果包含情感、风险、影响力等多个维度
  • 使用国产LLM模型进行智能分析
`);
  }
}

/**
 * 主函数 - 处理命令行参数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ 请指定命令');
    console.log('可用命令：');
    console.log('  collect    采集微博数据');
    console.log('  analyze    分析微博舆情');
    console.log('  help       显示帮助信息');
    return;
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  const cli = new WeiboCLI();
  
  switch (command) {
    case 'collect':
      await cli.handleWeiboCollect(commandArgs);
      break;
      
    case 'analyze':
      await cli.handleWeiboAnalyze(commandArgs);
      break;
      
    case 'help':
      console.log(`
🎯 微博舆情工具 - 简化版

可用命令：
  collect    采集微博数据
  analyze    分析微博舆情
  help       显示帮助信息

使用示例：
  npm run weibo:collect 人工智能
  npm run weibo:analyze 新能源汽车
  npm run weibo:collect --help
  npm run weibo:analyze --help

配置Cookie：
  运行：node weibo-simple-login-tool.js
`);
      break;
      
    default:
      console.log(`❌ 未知命令：${command}`);
      console.log('可用命令：collect, analyze, help');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { WeiboCLI };