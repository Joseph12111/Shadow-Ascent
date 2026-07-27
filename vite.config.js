import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function resolveWritableDir(preferredPath, fallbackPath) {
  try {
    fs.mkdirSync(preferredPath, { recursive: true });
    const probeFilePath = path.join(preferredPath, '.vite-write-probe');
    fs.writeFileSync(probeFilePath, 'ok');
    fs.rmSync(probeFilePath, { force: true });
    return preferredPath;
  } catch {
    return fallbackPath;
  }
}

const fallbackRootPath = path.join(os.tmpdir(), 'shadow-ascent-vite');
const cacheDirPath = resolveWritableDir(path.resolve('node_modules/.vite'), path.join(fallbackRootPath, 'cache'));
const outDirPath = resolveWritableDir(path.resolve('dist'), path.join(fallbackRootPath, 'dist'));

export default defineConfig({
  plugins: [react()],
  cacheDir: cacheDirPath,
  build: {
    outDir: outDirPath,
    emptyOutDir: true,
  },
});
