#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ZEP Proxy Server Quick Start\n');

const proxyDir = path.join(__dirname, 'proxy-server');

// Check if proxy-server directory exists
if (!fs.existsSync(proxyDir)) {
  console.error('❌ Error: proxy-server directory not found');
  console.log('Please make sure you have the proxy-server folder in the same directory as this script.');
  process.exit(1);
}

// Check if package.json exists
const packageJsonPath = path.join(proxyDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found in proxy-server directory');
  process.exit(1);
}

// Check if node_modules exists
const nodeModulesPath = path.join(proxyDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  
  const install = spawn('npm', ['install'], {
    cwd: proxyDir,
    stdio: 'inherit',
    shell: true
  });

  install.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ npm install failed with code ${code}`);
      process.exit(1);
    }
    
    console.log('✅ Dependencies installed successfully');
    startServer();
  });

  install.on('error', (error) => {
    console.error('❌ Failed to install dependencies:', error.message);
    console.log('\nPlease run manually:');
    console.log('cd proxy-server && npm install && npm start');
    process.exit(1);
  });
} else {
  console.log('✅ Dependencies already installed');
  startServer();
}

function startServer() {
  console.log('\n🎯 Starting proxy server...');
  console.log('📍 Server will run at: http://localhost:3000');
  console.log('🔗 Proxy endpoint: http://localhost:3000/api/zep');
  console.log('💡 Configure your extension to use this proxy URL');
  console.log('\n' + '='.repeat(50));
  
  const server = spawn('npm', ['start'], {
    cwd: proxyDir,
    stdio: 'inherit',
    shell: true
  });

  server.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Server exited with code ${code}`);
    }
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
    console.log('\nPlease run manually:');
    console.log('cd proxy-server && npm start');
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down proxy server...');
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down proxy server...');
    server.kill('SIGTERM');
  });
} 