const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const rootDir = path.resolve(__dirname, '..');
const adminBasicoDir = __dirname;
const outputPath = path.join(rootDir, 'admin-basico.zip');

console.log('📦 Iniciando empaquetado de Admin Básico en admin-basico.zip...');

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', function() {
  console.log(`✅ Archivo admin-basico.zip generado con éxito! Total bytes: ${archive.pointer()}`);
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('⚠️ Advertencia:', err);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

archive.glob('**/*', {
  cwd: adminBasicoDir,
  ignore: ['node_modules/**', '*.zip', '.git/**']
}, {
  prefix: 'admin-basico'
});

archive.finalize();
