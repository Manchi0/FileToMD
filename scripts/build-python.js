/**
 * Build Python converter to standalone executable using PyInstaller
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');
const pythonDir = path.join(projectRoot, 'python');

console.log('Building Python converter with PyInstaller...');

// Change to python directory
process.chdir(pythonDir);

// PyInstaller command - use venv and spec file
const pyinstallerCmd = [
  './venv/bin/pyinstaller',
  '--clean',
  '--noconfirm',
  'converter.spec'
].join(' ');

try {
  console.log(`Running: ${pyinstallerCmd}`);
  execSync(pyinstallerCmd, { stdio: 'inherit' });

  const distPath = path.join(pythonDir, 'dist', 'converter');
  if (fs.existsSync(distPath)) {
    console.log(`\nPython build complete!`);
    console.log(`Output: ${distPath}`);
  } else {
    console.error('Build failed: output directory not found');
    process.exit(1);
  }
} catch (error) {
  console.error('PyInstaller build failed:', error.message);
  process.exit(1);
}
