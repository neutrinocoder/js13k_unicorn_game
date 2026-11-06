const fs=require('fs'),zlib=require('zlib'),{minify}=require('terser');
async function build(){
 const source=fs.readFileSync('classic/index.html','utf8');
 const js=source.split('<script>')[1].split('</script>')[0];
 const names=require('./source-names.json');
 const compactNames=Object.fromEntries(Object.entries(names).map(([short,long])=>[long,short]));
 const result=await minify(require('./rename.cjs')(js,compactNames),{compress:{passes:2},mangle:true,format:{comments:false}});
 const html=source.replace(js,result.code);
 fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',html);
 // Single-file ZIP, using standard DEFLATE and CRC32; no runtime dependencies.
 const data=Buffer.from(html),name=Buffer.from('index.html'),packed=zlib.deflateRawSync(data,{level:9});
 let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+packed.length,16);
 const zip=Buffer.concat([local,name,packed,central,name,end]);
 if(zip.length>=13312)throw Error('Submission must be strictly below 13,312 bytes; got '+zip.length);
 fs.writeFileSync('unicorn-ascent.zip',zip);
 console.log(JSON.stringify({sourceBytes:Buffer.byteLength(source),minifiedBytes:data.length,unminifiedZipSameCompression:zlib.deflateRawSync(source,{level:9}).length+118,zipBytes:zip.length,bytesUnderLimit:13312-zip.length}));
}
build().catch(e=>{console.error(e);process.exitCode=1});
