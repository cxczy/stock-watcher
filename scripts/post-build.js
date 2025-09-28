import { rename, rm, copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

async function postBuild() {
  try {
    const distPath = join(process.cwd(), 'dist');
    const clientPath = join(distPath, 'client');
    
    // 检查client目录是否存在
    if (!existsSync(clientPath)) {
      console.log('⚠️  client目录不存在，跳过处理');
      return;
    }
    
    // 删除.vite目录
    try {
      await rm(join(clientPath, '.vite'), { recursive: true, force: true });
    } catch (error) {
      // 忽略错误，可能目录不存在
    }
    
    // 移动文件从dist/client到dist根目录
    const files = ['index.html'];
    
    for (const file of files) {
      try {
        await rename(join(clientPath, file), join(distPath, file));
        console.log(`✅ 移动 ${file} 到根目录`);
      } catch (error) {
        console.log(`⚠️  跳过 ${file}: ${error.message}`);
      }
    }
    
    // 处理assets目录
    try {
      if (existsSync(join(clientPath, 'assets'))) {
        await rename(join(clientPath, 'assets'), join(distPath, 'assets'));
        console.log('✅ 移动 assets 目录到根目录');
      }
    } catch (error) {
      console.log(`⚠️  移动assets目录失败: ${error.message}`);
    }
    
    // 删除空的client目录
    try {
      await rm(clientPath, { recursive: true, force: true });
      console.log('✅ 删除空的client目录');
    } catch (error) {
      console.log(`⚠️  删除client目录失败: ${error.message}`);
    }
    
    console.log('🎉 构建后处理完成！');
  } catch (error) {
    console.error('❌ 构建后处理失败:', error);
    process.exit(1);
  }
}

postBuild();
