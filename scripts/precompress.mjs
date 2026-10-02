import {readdirSync,statSync,readFileSync,writeFileSync} from 'node:fs';
import {brotliCompressSync,gzipSync,constants} from 'node:zlib';
export function precompress(dir='dist'){
 for(const f of readdirSync(dir)){const path=dir+'/'+f;if(statSync(path).isDirectory()){precompress(path);continue;}
 if(!/\.(html|css|js|json|xml|txt)$/.test(f))continue;
 const data=readFileSync(path);if(data.length<1024)continue;
 writeFileSync(path+'.br',brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:9}}));
 writeFileSync(path+'.gz',gzipSync(data,{level:9}));
 }
}
