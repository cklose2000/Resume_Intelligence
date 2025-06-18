#!/usr/bin/env node
import { spawn } from 'child_process';
import { globSync } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHUNK_SIZE = process.env.TEST_CHUNK_SIZE ? parseInt(process.env.TEST_CHUNK_SIZE) : 2;
const MAX_RETRIES = process.env.TEST_MAX_RETRIES ? parseInt(process.env.TEST_MAX_RETRIES) : 2;
const WSL_MODE = process.env.WSL_DISTRO_NAME !== undefined;

async function runTestChunk(files, chunkIndex) {
  return new Promise((resolve, reject) => {
    // Memory cleanup for WSL2
    if (WSL_MODE && global.gc) {
      global.gc();
    }
    
    console.log(`\n🧪 Running test chunk ${chunkIndex + 1} with ${files.length} files...`);
    files.forEach(f => console.log(`  - ${path.basename(f)}`));
    
    const startTime = Date.now();
    const configFile = WSL_MODE ? 'vitest.config.wsl.ts' : 'vitest.config.ci.ts';
    const child = spawn('npx', [
      'vitest',
      'run',
      '--config', configFile,
      '--reporter', 'default',
      '--reporter', 'junit',
      '--no-coverage',
      ...files
    ], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_OPTIONS: WSL_MODE ? '--max-old-space-size=2048 --expose-gc' : '--max-old-space-size=4096',
        VITEST_POOL_ID: String(chunkIndex)
      }
    });

    child.on('exit', (code) => {
      const duration = Date.now() - startTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = ((duration % 60000) / 1000).toFixed(1);
      console.log(`  ⏱️  Chunk ${chunkIndex + 1} completed in ${minutes}m ${seconds}s`);
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test chunk ${chunkIndex + 1} failed with code ${code}`));
      }
    });
  });
}

async function runTestsWithRetry(files, chunkIndex, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`\n🔄 Retry attempt ${attempt} for chunk ${chunkIndex + 1}...`);
      }
      await runTestChunk(files, chunkIndex);
      return true;
    } catch (error) {
      if (attempt === retries) {
        console.error(`\n❌ Chunk ${chunkIndex + 1} failed after ${retries + 1} attempts`);
        throw error;
      }
      // Longer delay in WSL2 mode
      await new Promise(resolve => setTimeout(resolve, WSL_MODE ? 5000 : 2000));
    }
  }
}

async function main() {
  const pattern = process.argv[2] || 'src/**/__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}';
  const clientDir = path.join(__dirname, '..');
  const testFiles = globSync(pattern, {
    cwd: clientDir,
    absolute: true
  });

  console.log(`Found ${testFiles.length} test files`);

  // Group test files into chunks
  const chunks = [];
  for (let i = 0; i < testFiles.length; i += CHUNK_SIZE) {
    chunks.push(testFiles.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Split into ${chunks.length} chunks of up to ${CHUNK_SIZE} files each`);
  if (WSL_MODE) {
    console.log('🐧 Running in WSL mode with optimized settings');
  }

  // Run chunks sequentially to avoid overwhelming the system
  const failedChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      await runTestsWithRetry(chunks[i], i);
    } catch (error) {
      failedChunks.push(i);
    }
  }

  if (failedChunks.length > 0) {
    console.error(`\n❌ ${failedChunks.length} chunks failed`);
    process.exit(1);
  } else {
    console.log('\n✅ All test chunks passed!');
    
    // Run coverage as a separate step
    console.log('\n📊 Generating coverage report...');
    const coverage = spawn('npx', [
      'vitest',
      'run',
      '--config', 'vitest.config.ci.ts',
      '--coverage'
    ], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    });

    coverage.on('exit', (code) => {
      process.exit(code);
    });
  }
}

main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});