// Refresh only the public, resolution-limited image shown on each reviewed free
// blueprint page. Never request full-resolution/login-only or paid-vector files.
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const manifestPath=new URL('../src/data/aircraft-schematics.json',import.meta.url);
const catalogue=JSON.parse(await readFile(manifestPath));
const target=new URL('../public/assets/aircraft-schematics/',import.meta.url);
await mkdir(target,{recursive:true});
const pages=[...new Map(catalogue.models.filter(model=>model.sourceId).map(model=>[model.sourceId,model])).values()];
const fetched=new Map();
for(let start=0;start<pages.length;start+=3) {
  await Promise.all(pages.slice(start,start+3).map(async model=>{
    const response=await fetch(model.sourceUrl);if(!response.ok)throw Error(`Source ${model.sourceId}: ${response.status}`);
    const html=await response.text();
    const tag=[...html.matchAll(/<img\b[^>]+>/g)].map(match=>match[0]).find(tag=>/id=['"]BPViewImage['"]/.test(tag));
    const source=tag?.match(/\bsrc=['"]([^'"]+)/)?.[1];
    if(!source||!source.includes('/blueprints-depot-restricted/'))throw Error(`No public limited preview on ${model.sourceUrl}`);
    const url=new URL(source.replaceAll('&amp;','&'));
    const image=await fetch(url);if(!image.ok)throw Error(`Preview ${model.sourceId}: ${image.status}`);
    const mime=image.headers.get('content-type')?.split(';')[0];
    const extension={'image/jpeg':'jpg','image/png':'png','image/gif':'gif'}[mime];
    if(!extension)throw Error(`Unexpected preview type ${mime}`);
    const bytes=Buffer.from(await image.arrayBuffer()),filename=`blueprint-${model.sourceId}.${extension}`;
    await writeFile(new URL(filename,target),bytes);
    fetched.set(model.sourceId,{asset:`assets/aircraft-schematics/${filename}`,imageUrl:url.href,sha256:createHash('sha256').update(bytes).digest('hex'),
      previewWidth:Number(tag.match(/\bwidth=['"](\d+)/)?.[1]),previewHeight:Number(tag.match(/\bheight=['"](\d+)/)?.[1]),
      status:'public-preview',credit:'Drawing · The-Blueprints.com',rights:'Third-party drawing; original rights remain with the rights holder. The source does not supply an open licence.',retrievedAt:new Date().toISOString().slice(0,10)});
    console.log(`Downloaded public preview ${model.sourceId}`);
  }));
}
for(const model of catalogue.models)if(model.sourceId)Object.assign(model,fetched.get(model.sourceId));
await writeFile(manifestPath,JSON.stringify(catalogue,null,2)+'\n');
