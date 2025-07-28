#!/usr/bin/env bun

/**
 * Build script for Line CLI
 * Creates standalone executables for different platforms
 */

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const targets = [
  { name: 'linux-x64', target: 'bun-linux-x64' },
  { name: 'linux-arm64', target: 'bun-linux-arm64' },
  { name: 'darwin-x64', target: 'bun-darwin-x64' },
  { name: 'darwin-arm64', target: 'bun-darwin-arm64' },
  { name: 'windows-x64', target: 'bun-windows-x64', ext: '.exe' }
];

async function build() {
  console.log('🔨 Building Line CLI executables...\n');
  
  // Create dist directory
  const distDir = join(process.cwd(), 'dist');
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }
  
  // Build for each target
  for (const { name, target, ext = '' } of targets) {
    console.log(`📦 Building for ${name}...`);
    
    const outputFile = join(distDir, `line-${name}${ext}`);
    
    try {
      await $`bun build index.ts --compile --target=${target} --outfile=${outputFile}`;
      console.log(`✅ Built: ${outputFile}`);
      
      // Get file size
      const stats = await Bun.file(outputFile).size;
      const sizeMB = (stats / 1024 / 1024).toFixed(1);
      console.log(`   Size: ${sizeMB} MB`);
    } catch (error) {
      console.error(`❌ Failed to build for ${name}:`, error);
    }
  }
  
  console.log('\n🎉 Build complete! Executables are in ./dist/');
  console.log('\n📝 Built files:');
  
  try {
    await $`ls -la dist/`;
  } catch (error) {
    console.log('Could not list dist directory');
  }
}

// Run build
build().catch(console.error);