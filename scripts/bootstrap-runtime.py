"""Isolated build dependencies and SHA256-verified model downloads. No system install."""
import hashlib, json, os, shutil, sys, time, urllib.request, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'tools'

def fetch(url, path, sha=None, size=None):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and (size is None or path.stat().st_size == size):
        if sha is None or digest(path) == sha:
            print('Verified:', path.name, flush=True); return
    part = path.with_suffix(path.suffix + '.part')
    for attempt in range(6):
        try:
            offset = part.stat().st_size if part.exists() else 0
            req = urllib.request.Request(url, headers={'Range': f'bytes={offset}-', 'User-Agent':'HellrasherMusicGenerator/1.0'})
            with urllib.request.urlopen(req, timeout=120) as r:
                append = r.status == 206 and r.headers.get('Content-Range','').startswith(f'bytes {offset}-')
                if not append: offset = 0
                with part.open('ab' if append else 'wb') as f:
                    last=time.monotonic()
                    while b:=r.read(4*1024*1024):
                        f.write(b); offset+=len(b)
                        if time.monotonic()-last>15:
                            print(f'{path.name}: {offset/1e9:.2f} GB' + (f' / {size/1e9:.2f} GB' if size else ''),flush=True); last=time.monotonic()
            if size is not None and part.stat().st_size!=size: raise ValueError('size mismatch')
            if sha and digest(part)!=sha:
                part.unlink(); raise ValueError('SHA256 mismatch; partial removed')
            part.replace(path); print('Verified:', path.name, flush=True); return
        except Exception as e:
            print(f'Download attempt {attempt+1}: {e}',flush=True)
            if attempt==5: raise
            time.sleep(min(2**attempt,20))

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while b:=f.read(8*1024*1024):h.update(b)
    return h.hexdigest()

def cuda():
    manifest=json.loads((TOOLS/'cuda-redist.json').read_text(encoding='utf-8-sig'))
    dest=TOOLS/'cuda'; dest.mkdir(exist_ok=True)
    for name in ['cuda_nvcc','cuda_cudart','libcublas','cuda_cccl','cuda_crt','libnvvm','cuda_nvrtc','cuda_nvml_dev']:
        if name not in manifest: continue
        item=manifest[name]['windows-x86_64']; url='https://developer.download.nvidia.com/compute/cuda/redist/'+item['relative_path']
        archive=TOOLS/Path(item['relative_path']).name
        fetch(url,archive,item['sha256'],int(item['size']))
        with zipfile.ZipFile(archive) as z:
            for info in z.infolist():
                rel=Path(*Path(info.filename).parts[1:])
                if not rel.parts or info.is_dir():continue
                target=(dest/rel).resolve()
                if not target.is_relative_to(dest.resolve()): raise ValueError('unsafe archive')
                target.parent.mkdir(parents=True,exist_ok=True)
                with z.open(info) as src,target.open('wb') as out:shutil.copyfileobj(src,out)
    (dest/'version.json').write_text(json.dumps({'cuda':{'name':'CUDA SDK','version':'13.0.2'}}))
    print('CUDA SDK ready',flush=True)

def models():
    m=json.loads((ROOT/'resources/models/upstream.json').read_text(encoding='utf-8-sig'))
    for item in m['siblings']:
        name=item['rfilename']
        if not (name.endswith('-Q8_0.gguf') or name.endswith('-F32.gguf') and ('condition_encoder' in name or 'vocoder' in name)): continue
        fetch(f"https://huggingface.co/Serveurperso/MiniMax-Music3-GGUF/resolve/{m['sha']}/{name}?download=true",ROOT/'models'/name,item['lfs']['sha256'],item['size'])
    print('Default Q8_0 model set verified',flush=True)

if __name__=='__main__':
    {'cuda':cuda,'models':models}[sys.argv[1]]()
