// Minify every module in a folder in place. Used by poki_build.py.
//   node tools/minify.cjs <folder>
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

(async () => {
  const dir = process.argv[2];
  let before = 0, after = 0;
  for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
    const file = path.join(dir, name), code = fs.readFileSync(file, 'utf8');
    // Names are shortened and spacing removed, but the code is not rewritten: terser's rewriting
    // once produced a module that used a variable it never declared.
    const out = await minify(code, { module: true, compress: false, mangle: true, format: { comments: false } });
    if (!out.code) throw new Error('could not minify ' + name);
    fs.writeFileSync(file, out.code);
    before += code.length;
    after += out.code.length;
  }
  console.log(`minified ${Math.round(before / 1024)} KB of code to ${Math.round(after / 1024)} KB`);
})().catch(e => { console.error(e); process.exit(1); });
