#!/usr/bin/env node
import { spawn } from 'child_process';
import { globSync } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHUNK_SIZE = 3;
const MAX_RETRIES = 2;

async function runTestChunk(files, chunkIndex) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running test chunk ${chunkIndex + 1} with ${files.length} files...`);
    
    const child = spawn('npx', [
      'vitest',
      'run',
      '--config', 'vitest.config.ci.ts',
      '--reporter', 'default',
      '--no-coverage',
      ...files
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096',
        VITEST_POOL_ID: String(chunkIndex)
      }
    });

    child.on('exit', (code) => {
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function main() {
  const testFiles = globSync('src/**/*.{test,spec}.{ts,tsx,js,jsx}', {
    cwd: path.join(__dirname, '..'),
    absolute: true
  });

  console.log(`Found ${testFiles.length} test files`);

  // Group test files into chunks
  const chunks = [];
  for (let i = 0; i < testFiles.length; i += CHUNK_SIZE) {
    chunks.push(testFiles.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Split into ${chunks.length} chunks of up to ${CHUNK_SIZE} files each`);

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