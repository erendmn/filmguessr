# Aday backdrop'ları indirir (w500) ve OCR için hazırlar
import json, os, sys, concurrent.futures as cf, urllib.request, urllib.parse
TOK=[l.split('=',1)[1].strip().strip('"') for l in open('/Users/erenduman/projeler/watchwise/.env.local') if l.startswith('TMDB_READ_TOKEN=')][0]
def get(path, **q):
    url='https://api.themoviedb.org/3'+path+('?'+urllib.parse.urlencode(q) if q else '')
    req=urllib.request.Request(url, headers={'Authorization':'Bearer '+TOK})
    for i in range(3):
        try: return json.load(urllib.request.urlopen(req, timeout=20))
        except Exception as e: err=e
    print('ERR',url,err,file=sys.stderr); return None
exec(open('scripts/build_data.py').read().split('assert len(IDS)')[0].split('# Curated')[1].replace('IDS = [','IDS = [',1)) if False else None
src=open('scripts/build_data.py').read()
ids_src=src[src.index('IDS = ['):src.index(']', src.index('IDS = ['))+1]
IDS=eval(ids_src.split('=',1)[1])
os.makedirs('data/bd', exist_ok=True)
def work(mid):
    d=get(f'/movie/{mid}/images')
    if not d: return mid, []
    bds=sorted(d['backdrops'], key=lambda b:(b.get('iso_639_1') is not None, -b.get('vote_count',0), -b.get('vote_average',0)))[:14]
    out=[]
    for b in bds:
        fn=f"{mid}_{b['file_path'].strip('/').replace('.jpg','')}.jpg"
        path='data/bd/'+fn
        if not os.path.exists(path):
            try: urllib.request.urlretrieve('https://image.tmdb.org/t/p/w500'+b['file_path'], path)
            except Exception as e: print('DL ERR',b['file_path'],e,file=sys.stderr); continue
        out.append({'file':fn,'path':b['file_path'],'lang':b.get('iso_639_1'),'votes':b.get('vote_count',0)})
    return mid, out
res={}
with cf.ThreadPoolExecutor(12) as ex:
    for mid,out in ex.map(work, IDS): res[mid]=out
json.dump(res, open('data/backdrops.json','w'), ensure_ascii=False)
print('films',len(res),'images',sum(len(v) for v in res.values()))
