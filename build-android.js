// build-android.js - 复制游戏文件到 www 目录供 Capacitor 打包
const fs = require('fs');
const path = require('path');

const www = 'www';

// 清理并创建 www 目录
if (fs.existsSync(www)) fs.rmSync(www, { recursive: true });
fs.mkdirSync(www);

// 需要复制的文件和目录
const files = ['index.html'];
const dirs = ['src', 'assets', 'lib'];

// 复制文件
files.forEach(f => {
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(www, f));
});

// 递归复制目录
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

dirs.forEach(d => {
  if (fs.existsSync(d)) copyDir(d, path.join(www, d));
});

// 统计
let totalSize = 0;
function getSize(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) getSize(p);
    else totalSize += fs.statSync(p).size;
  }
}
getSize(www);

console.log(`✅ www 目录已生成 (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
