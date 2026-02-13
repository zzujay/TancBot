const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { createGzip } = require('zlib');
const crypto = require('crypto');

class BackupManager {
  constructor(options = {}) {
    this.backupDir = options.backupDir || path.join(process.cwd(), 'backups');
    this.compress = options.compress !== false;
    this.logger = options.logger || console;
  }
  
  async create(options = {}) {
    try {
      const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const backupPath = path.join(this.backupDir, backupId);
      
      await fs.mkdir(backupPath, { recursive: true });
      
      const backupInfo = {
        id: backupId,
        timestamp: new Date().toISOString(),
        components: [],
        options: options,
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          cwd: process.cwd(),
          pid: process.pid
        }
      };
      
      // 备份数据
      if (options.includeData) {
        await this.backupComponent('data', backupPath);
        backupInfo.components.push('data');
      }
      
      // 备份配置
      if (options.includeConfig) {
        await this.backupComponent('config', backupPath);
        backupInfo.components.push('config');
      }
      
      // 备份日志
      if (options.includeLogs) {
        await this.backupComponent('logs', backupPath);
        backupInfo.components.push('logs');
      }
      
      // 备份技能
      if (options.includeSkills) {
        await this.backupComponent('skills', backupPath);
        backupInfo.components.push('skills');
      }
      
      // 备份Web界面
      if (options.includeWeb) {
        await this.backupComponent('src/web', backupPath);
        backupInfo.components.push('web');
      }
      
      // 保存备份信息
      const backupInfoPath = path.join(backupPath, 'backup-info.json');
      await fs.writeFile(backupInfoPath, JSON.stringify(backupInfo, null, 2));
      
      // 压缩备份（如果启用）
      if (this.compress) {
        const compressedPath = await this.compressBackup(backupPath);
        await this.removeDirectory(backupPath);
        
        this.logger.info(`备份创建成功: ${backupId}`);
        return {
          id: backupId,
          path: compressedPath,
          compressed: true,
          size: await this.getFileSize(compressedPath)
        };
      }
      
      this.logger.info(`备份创建成功: ${backupId}`);
      return {
        id: backupId,
        path: backupPath,
        compressed: false,
        size: await this.getDirectorySize(backupPath)
      };
      
    } catch (error) {
      this.logger.error('备份创建失败:', error);
      throw new Error(`备份创建失败: ${error.message}`);
    }
  }
  
  async restore(backupId, options = {}) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      const backupInfoPath = path.join(backupPath, 'backup-info.json');
      
      // 检查备份是否存在
      let backupInfo;
      let restorePath = backupPath;
      
      try {
        const infoData = await fs.readFile(backupInfoPath, 'utf8');
        backupInfo = JSON.parse(infoData);
      } catch (error) {
        // 如果直接备份不存在，尝试查找压缩文件
        const compressedPath = `${backupPath}.tar.gz`;
        try {
          await fs.access(compressedPath);
          restorePath = await this.decompressBackup(compressedPath);
          const infoData = await fs.readFile(path.join(restorePath, 'backup-info.json'), 'utf8');
          backupInfo = JSON.parse(infoData);
        } catch (compressError) {
          throw new Error(`备份不存在: ${backupId}`);
        }
      }
      
      this.logger.info(`开始恢复备份: ${backupId}`);
      this.logger.info(`备份创建时间: ${backupInfo.timestamp}`);
      this.logger.info(`包含组件: ${backupInfo.components.join(', ')}`);
      
      // 创建恢复点
      if (options.createRestorePoint) {
        const restorePoint = await this.create({
          includeData: true,
          includeConfig: true,
          includeLogs: false,
          name: `restore-point-${Date.now()}`
        });
        this.logger.info(`创建恢复点: ${restorePoint.id}`);
      }
      
      // 恢复各个组件
      for (const component of backupInfo.components) {
        await this.restoreComponent(component, restorePath, options);
        this.logger.info(`恢复组件: ${component}`);
      }
      
      // 清理临时解压文件
      if (restorePath !== backupPath) {
        await this.removeDirectory(restorePath);
      }
      
      this.logger.info(`备份恢复完成: ${backupId}`);
      return backupInfo;
      
    } catch (error) {
      this.logger.error('备份恢复失败:', error);
      throw new Error(`备份恢复失败: ${error.message}`);
    }
  }
  
  async backupComponent(componentName, backupPath) {
    const sourcePath = path.join(process.cwd(), this.getComponentPath(componentName));
    const targetPath = path.join(backupPath, componentName);
    
    try {
      await fs.access(sourcePath);
      await this.copyDirectory(sourcePath, targetPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // 如果源目录不存在，创建空目录
      await fs.mkdir(targetPath, { recursive: true });
    }
  }
  
  async restoreComponent(componentName, backupPath, options = {}) {
    const sourcePath = path.join(backupPath, componentName);
    const targetPath = path.join(process.cwd(), this.getComponentPath(componentName));
    
    try {
      await fs.access(sourcePath);
      
      // 如果目标已存在且没有强制覆盖，先备份现有数据
      if (!options.force) {
        try {
          await fs.access(targetPath);
          const backupExisting = path.join(process.cwd(), `backup-existing-${componentName}-${Date.now()}`);
          await this.copyDirectory(targetPath, backupExisting);
          this.logger.info(`备份现有${componentName}到: ${backupExisting}`);
        } catch (error) {
          // 目标不存在，继续恢复
        }
      }
      
      // 删除目标目录（如果存在）
      try {
        await this.removeDirectory(targetPath);
      } catch (error) {
        // 忽略删除错误
      }
      
      // 复制备份数据
      await this.copyDirectory(sourcePath, targetPath);
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // 如果备份组件不存在，记录警告
      this.logger.warn(`备份中缺少组件: ${componentName}`);
    }
  }
  
  getComponentPath(componentName) {
    const pathMap = {
      'data': 'data',
      'config': 'config',
      'logs': 'logs',
      'skills': 'src/skills',
      'web': 'src/web',
      'src/web': 'src/web'
    };
    
    return pathMap[componentName] || componentName;
  }
  
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
  
  async removeDirectory(dir) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`删除目录失败: ${dir}`, error);
    }
  }
  
  async compressBackup(backupPath) {
    const tar = require('tar');
    const compressedPath = `${backupPath}.tar.gz`;
    
    await tar.create({
      file: compressedPath,
      gzip: true,
      cwd: this.backupDir
    }, [path.basename(backupPath)]);
    
    return compressedPath;
  }
  
  async decompressBackup(compressedPath) {
    const tar = require('tar');
    const tempPath = compressedPath.replace('.tar.gz', '-temp');
    
    await tar.extract({
      file: compressedPath,
      cwd: this.backupDir
    });
    
    return tempPath;
  }
  
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return this.formatBytes(stats.size);
    } catch (error) {
      return '未知';
    }
  }
  
  async getDirectorySize(dirPath) {
    try {
      let totalSize = 0;
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
      
      return this.formatBytes(totalSize);
    } catch (error) {
      return '未知';
    }
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  async list(options = {}) {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
      
      const backups = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('backup_')) {
          const backupPath = path.join(this.backupDir, entry.name);
          const infoPath = path.join(backupPath, 'backup-info.json');
          
          try {
            const infoData = await fs.readFile(infoPath, 'utf8');
            const info = JSON.parse(infoData);
            
            backups.push({
              id: info.id,
              timestamp: info.timestamp,
              components: info.components,
              size: await this.getDirectorySize(backupPath),
              compressed: false
            });
          } catch (error) {
            // 跳过无效的备份目录
            continue;
          }
        } else if (entry.isFile() && entry.name.endsWith('.tar.gz')) {
          const backupId = entry.name.replace('.tar.gz', '');
          
          backups.push({
            id: backupId,
            timestamp: (await fs.stat(path.join(this.backupDir, entry.name))).mtime.toISOString(),
            components: ['压缩备份'],
            size: await this.getFileSize(path.join(this.backupDir, entry.name)),
            compressed: true
          });
        }
      }
      
      // 按时间排序
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return backups;
    } catch (error) {
      this.logger.error('获取备份列表失败:', error);
      throw new Error(`获取备份列表失败: ${error.message}`);
    }
  }
  
  async delete(backupId) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      const compressedPath = `${backupPath}.tar.gz`;
      
      // 尝试删除目录备份
      try {
        await this.removeDirectory(backupPath);
      } catch (error) {
        // 如果目录不存在，尝试删除压缩文件
        await fs.unlink(compressedPath);
      }
      
      this.logger.info(`备份删除成功: ${backupId}`);
      return true;
    } catch (error) {
      this.logger.error('备份删除失败:', error);
      throw new Error(`备份删除失败: ${error.message}`);
    }
  }
}

module.exports = BackupManager;