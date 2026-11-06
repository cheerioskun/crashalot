#!/usr/bin/env node
// Build a browser-only, offline presentation. Recipient machines need no runtime.
import { build } from 'vite';
import { readFile, writeFile, mkdir, readdir, cp, rm, mkdtemp } from 'node:fs/promises';
import { dirname, resolve, relative, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argument = process.argv.find(value => value.startsWith('--out='));
const destination = resolve(argument ? argument.slice(6) : join(root, 'exports'));
const folder = join(destination, 'crashalot');
const temporary = await mkdtemp(join(tmpdir(), 'crashalot-portable-build-'));
const moduleFiles = new Set();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const scriptSafe = value => value.replace(/<\//g, '<\\/');
const inlineJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
const mime = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.css':'text/css' };
const dataUrl = (bytes, name) => `data:${mime[extname(name)] || 'application/octet-stream'};base64,${bytes.toString('base64')}`;

async function files(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(full));
    else if (entry.isFile()) output.push(full);
  }
  return output.sort();
}
async function copy(source, target) {
  await mkdir(dirname(target), { recursive:true });
  await cp(source, target, { recursive:true });
}

// ZIP's ordinary DEFLATE format is supported by Windows Explorer's Extract All.
// Keep packaging independent of a locally installed zip/PowerShell/Python tool.
function createZip(entries) {
  const table = Array.from({ length:256 }, (_, n) => {
    for (let bit=0; bit<8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  const local = [], central = [];
  let offset = 0;
  for (const { name, bytes } of entries) {
    const encoded = Buffer.from(name);
    const compressed = deflateRawSync(bytes, { level:9 });
    let checksum = 0xffffffff;
    for (const byte of bytes) checksum = table[(checksum ^ byte) & 255] ^ (checksum >>> 8);
    checksum = (checksum ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50,0); header.writeUInt16LE(20,4);
    header.writeUInt16LE(0x0800,6); header.writeUInt16LE(8,8);
    // A deterministic valid DOS date (1980-01-01); no platform-specific metadata.
    header.writeUInt16LE(33,12); header.writeUInt32LE(checksum,14);
    header.writeUInt32LE(compressed.length,18); header.writeUInt32LE(bytes.length,22);
    header.writeUInt16LE(encoded.length,26);
    local.push(header,encoded,compressed);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50,0); directory.writeUInt16LE(20,4);
    directory.writeUInt16LE(20,6); directory.writeUInt16LE(0x0800,8);
    directory.writeUInt16LE(8,10); directory.writeUInt16LE(33,14);
    directory.writeUInt32LE(checksum,16); directory.writeUInt32LE(compressed.length,20);
    directory.writeUInt32LE(bytes.length,24); directory.writeUInt16LE(encoded.length,28);
    directory.writeUInt32LE(offset,42); central.push(directory,encoded);
    offset += header.length + encoded.length + compressed.length;
  }
  const directory = Buffer.concat(central), ending = Buffer.alloc(22);
  ending.writeUInt32LE(0x06054b50,0); ending.writeUInt16LE(entries.length,8);
  ending.writeUInt16LE(entries.length,10); ending.writeUInt32LE(directory.length,12);
  ending.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,ending]);
}

try {
  await build({
    root, configFile:false, publicDir:false, base:'',
    define:{ 'import.meta.env.BASE_URL':JSON.stringify(''), 'process.env.NODE_ENV':JSON.stringify('production') },
    plugins:[{ name:'portable-license-inputs', transform(code,id) {
      if(id===join(root,'src/presentation.js')) return code.replace('catch { host.innerHTML', 'catch (error) { console.error(error); host.innerHTML');
    }, generateBundle(_options,bundle) {
      for (const output of Object.values(bundle)) if (output.type==='chunk') {
        for (const id of Object.keys(output.modules)) moduleFiles.add(id.split('?')[0]);
      }
    } }],
    build:{ outDir:temporary, emptyOutDir:true, minify:true,
      lib:{ entry:join(root,'src/presentation.js'), name:'Crashalot', formats:['iife'], fileName:()=> 'presentation.js' },
    },
  });
  let javascript = await readFile(join(temporary,'presentation.js'),'utf8');
  const css = await readFile(join(temporary,'crashalot.css'),'utf8');
  // The two switchable theme stylesheets must also work without sibling files.
  for (const name of (await readdir(temporary)).filter(name => name.endsWith('.css') && name!=='crashalot.css')) {
    javascript = javascript.replaceAll(name,dataUrl(await readFile(join(temporary,name)),name));
  }
  const dataNames = [...new Set(javascript.match(/data\/[a-z0-9-]+\.json/g) || [])].sort();
  if (!dataNames.length) throw new Error('No runtime chart JSON found; inspect the presentation build.');
  const chartData = {}, assets = [];
  for (const name of dataNames) chartData[name] = await readFile(join(root,'public',name),'utf8');
  for (const full of await files(join(root,'public/assets'))) {
    const name = relative(join(root,'public'),full).split('\\').join('/');
    if (!javascript.includes(name)) continue;
    const bytes = await readFile(full), url = dataUrl(bytes,name);
    javascript = javascript.replaceAll('/'+name,url).replaceAll(name,url);
    assets.push({ path:name, bytes:bytes.length, sha256:sha256(bytes) });
  }
  const bootstrap = `(() => {
    const payloads = ${inlineJson(chartData)};
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      const name = typeof input === 'string' ? input.replace(/^\\.\\//, '') : '';
      return Object.hasOwn(payloads,name)
        ? Promise.resolve(new Response(payloads[name], {status:200, headers:{'Content-Type':'application/json'}}))
        : originalFetch(input,options);
    };
    document.addEventListener('click',event => {
      const link=event.target.closest?.('a[download]');
      const name=link?.getAttribute('href')?.replace(/^\\.\\//,'');
      if(!Object.hasOwn(payloads,name)) return;
      event.preventDefault();
      const url=URL.createObjectURL(new Blob([payloads[name]],{type:'application/json'}));
      const download=document.createElement('a');download.href=url;download.download=name.split('/').pop();
      download.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    });
    const boot=document.querySelector('#portable-loading');
    const ready=()=>document.querySelector('.reveal.ready') && ['.scale-comparison','.decade-trend','.flight-exploration','.comparison-types','.comparison-aircraft','.conclusion-scene'].every(selector=>document.querySelector(selector));
    const observer=new MutationObserver(()=>{if(ready()){boot.remove();observer.disconnect();}});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    setTimeout(()=>{if(boot.isConnected) boot.querySelector('p').textContent='The presentation could not start. Close this tab and open START.html again in Microsoft Edge or Chrome.';},15000);
  })();`;
  let html = await readFile(join(root,'index.html'),'utf8');
  html = html.replace('</head>',()=>`<style>${css.replace(/<\/style/gi,'<\\/style')}</style>
    <style>#portable-loading{position:fixed;inset:0;z-index:99999;display:grid;place-content:center;background:#fff;color:#222;padding:2rem;text-align:center;font:18px system-ui}#portable-loading strong{font-size:32px;letter-spacing:-.04em}#portable-loading p{max-width:34em;color:#666;font-size:15px}</style></head>`);
  html = html.replace('<body>','<body><div id="portable-loading" role="status"><strong>Preparing your flight…</strong><p>Loading the presentation from this file.</p><noscript>Enable JavaScript in your browser to open this presentation.</noscript></div>');
  if (!html.includes('<script type="module" src="/src/presentation.js"></script>')) throw new Error('Presentation entry point changed; update the portable builder.');
  html = html.replace(/<script type="module" src="\/src\/presentation\.js"><\/script>/,()=>`<script>${scriptSafe(bootstrap)}</script><script>${scriptSafe(javascript)}</script>`);

  await mkdir(destination,{ recursive:true });
  await rm(folder,{ recursive:true, force:true });
  await mkdir(folder,{ recursive:true });
  await writeFile(join(folder,'START.html'),html);
  const source = join(folder,'source');
  for (const name of ['src','scripts','tests','index.html','components.html','package.json','package-lock.json','vite.config.js','playwright.config.js','README.md','pyproject.toml','uv.lock','data/sources.json','data/README.md','data/flight-exploration-rules.json']) {
    await copy(join(root,name),join(source,name));
  }
  for (const name of dataNames) await copy(join(root,'public',name),join(source,'public',name));
  for (const { path } of assets) await copy(join(root,'public',path),join(source,'public',path));
  for (const name of (await readdir(join(root,'docs'))).filter(name=>name.endsWith('.md'))) await copy(join(root,'docs',name),join(source,'docs',name));

  const packages = new Map();
  for (const full of moduleFiles) {
    const marker = full.lastIndexOf('/node_modules/');
    if (marker<0) continue;
    const parts = full.slice(marker+14).split('/');
    const name = parts[0].startsWith('@') ? parts.slice(0,2).join('/') : parts[0];
    const location = full.slice(0,marker+14)+name;
    const metadata = JSON.parse(await readFile(join(location,'package.json'),'utf8'));
    packages.set(name,{ name, version:metadata.version, license:metadata.license, location });
  }
  // CSS emitted by ?url is outside the JS chunk's module table.
  for (const name of ['bootstrap','bootswatch']) {
    const location=join(root,'node_modules',name),metadata=JSON.parse(await readFile(join(location,'package.json'),'utf8'));
    packages.set(name,{name,version:metadata.version,license:metadata.license,location});
  }
  const libraries=[];
  for (const library of [...packages.values()].sort((a,b)=>a.name.localeCompare(b.name))) {
    const notices=(await readdir(library.location)).filter(name=>/^(?:licen[cs]e|copying|notice)(?:\.|$|-)/i.test(name));
    if (!notices.length) throw new Error(`Missing license notice for bundled library ${library.name}`);
    const noticeDirectory=join('licenses',`${library.name.replaceAll('/','__')}@${library.version}`);
    for (const name of notices) await copy(join(library.location,name),join(folder,noticeDirectory,name));
    libraries.push({name:library.name,version:library.version,license:library.license,notices:notices.map(name=>`${noticeDirectory}/${name}`)});
  }
  let revision='unknown',sourceTreeDirty=null;
  try {
    revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    sourceTreeDirty=Boolean(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim());
  } catch { /* A source ZIP need not have Git metadata. */ }
  const manifest={format:1,builtAt:new Date().toISOString(),sourceCommit:revision,sourceTreeDirty,start:{path:'START.html',bytes:Buffer.byteLength(html),sha256:sha256(html)},data:dataNames.map(path=>({path,sha256:sha256(chartData[path]),bytes:Buffer.byteLength(chartData[path])})),assets,libraries};
  await writeFile(join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await writeFile(join(folder,'START HERE.txt'),`CRASHALOT — A DIFFERENT VIEW OF FLYING\r\n\r\n1. In Windows Explorer, right-click the ZIP and choose Extract All.\r\n2. Open the extracted crashalot folder.\r\n3. Double-click START.html. If asked, choose Microsoft Edge or Chrome.\r\n\r\nNo install, account, internet connection, or local server is required.\r\nYou can copy START.html alone to another folder and it still works.\r\n\r\nRight arrow / Next: advance. Left arrow / Back: go back and pause Auto.\r\nSpace: turn Auto reveals on or off. Auto never changes slides.\r\nEscape: slide overview. Reading-light icon: light/dark mode.\r\n\r\nThe source folder contains editable code, the JSON data used by the story,\r\nsource images, and package-lock.json. Libraries are bundled into START.html;\r\nlicenses lists their exact versions and notices. Editing/rebuilding source\r\nrequires development tools, but viewing START.html does not.\r\n\r\nData source credits and image source links remain in the presentation.\r\nSource links open online only if you choose them. Schematics retain their\r\noriginal owners' copyright; this package does not grant an image license.\r\n\r\nmanifest.json records source revision and hashes. See source/docs/windows-package.md\r\nfor build and verification instructions.\r\n`);
  const entries=[];
  for(const full of await files(folder)) entries.push({name:'crashalot/'+relative(folder,full).split('\\').join('/'),bytes:await readFile(full)});
  const zip=createZip(entries),zipPath=join(destination,'crashalot-windows.zip');
  await writeFile(zipPath,zip);
  console.log(JSON.stringify({html:join(folder,'START.html'),zip:zipPath,zipBytes:zip.length,htmlBytes:Buffer.byteLength(html),data:dataNames,assets:assets.length,libraries:libraries.length,files:entries.length},null,2));
} finally { await rm(temporary,{recursive:true,force:true}); }
