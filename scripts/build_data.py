import json, sys, re, hashlib, random, concurrent.futures as cf, urllib.request, urllib.parse
TOK=[l.split('=',1)[1].strip().strip('"') for l in open('/Users/erenduman/projeler/watchwise/.env.local') if l.startswith('TMDB_READ_TOKEN=')][0]
def get(path, **q):
    url='https://api.themoviedb.org/3'+path+('?'+urllib.parse.urlencode(q) if q else '')
    req=urllib.request.Request(url, headers={'Authorization':'Bearer '+TOK})
    err=None
    for i in range(3):
        try: return json.load(urllib.request.urlopen(req, timeout=20))
        except Exception as e: err=e
    print('ERR',url,err,file=sys.stderr); return None

# Curated 100 Turkish films (TMDB ids), classics + modern
_ids=json.load(open('data/ids.json')); CURATED=set(_ids['curated']); IDS=_ids['curated']+_ids['auto']
assert len(IDS)==len(set(IDS)), 'dup ids'
print('candidates',len(IDS))

GENRE_TR={28:'Aksiyon',12:'Macera',16:'Animasyon',35:'Komedi',80:'Suç',99:'Belgesel',18:'Dram',10751:'Aile',14:'Fantastik',36:'Tarih',27:'Korku',10402:'Müzik',9648:'Gizem',10749:'Romantik',878:'Bilim Kurgu',10770:'TV Filmi',53:'Gerilim',10752:'Savaş',37:'Western'}

def clean_franchise(name, title):
    import re
    n=re.sub(r'\s*(\[Seri\]|Koleksiyonu|Serisi|Üçlemesi|Collection|Serisi)\s*$','',name).strip()
    return n if n and n.lower() in title.lower() else ''
BD=json.load(open('data/backdrops.json'))
OCR=json.load(open('data/ocr.json'))
DUPES=json.load(open('data/dupes.json'))
FACES=json.load(open('data/faces.json'))
def face_score(mid, path):
    # yüz ne kadar büyük/çok ise görsel o kadar 'tanınır' -> sona bırak
    fs=FACES.get(f"{mid}_{path.strip('/').replace('.jpg','')}.jpg",[])
    if not fs: return 0.0
    return max(w*h for _,_,w,h in fs)*3 + 0.03*len(fs)
# Elle işaretlenen spoiler görseller (logo/afiş; OCR yakalayamadı)
MANUAL_BLACKLIST={'/saKuvyZZaPLFAHSLnIQCLqptJGW.jpg','/luvOF1TM1NGYZy2isUtTDu1REH1.jpg',  # G.O.R.A. logo
 '/xwBMzAq3JFO4U7aSvAng9jcoZyH.jpg','/eFu4MjMjOehLqh61u0bjinuwVpg.jpg','/yhSXAOU9vAMbba4TQsOS3IQf0e8.jpg',  # Arif V 216 logo
 '/adSkMZfcdsN8d8ZKhL14ntEeT22.jpg',  # Vizontele Tuuba yunanca afiş
}
def norm(t):
    return re.sub(r'[^a-z0-9çğıöşü]+',' ', t.replace('İ','i').replace('I','ı').lower()).split()
def lev(a,b):
    if abs(len(a)-len(b))>1: return 9
    prev=list(range(len(b)+1))
    for i,ca in enumerate(a,1):
        cur=[i]
        for j,cb in enumerate(b,1):
            cur.append(min(prev[j]+1,cur[j-1]+1,prev[j-1]+(ca!=cb)))
        prev=cur
    return prev[-1]
def has_spoiler_text(fn, title):
    txt=OCR.get(fn,'')
    if not txt: return False
    tw=[w for w in norm(title) if len(w)>=4]
    for line in txt.split('\n'):
        if not line: continue
        s_,h=line.rsplit('|',1)
        if float(h)>=0.05: return True
        for w in norm(s_):
            if len(w)>=4 and any(lev(w,t)<=1 for t in tw): return True
    return False
def fetch(mid):
    d=get(f'/movie/{mid}', language='tr-TR', append_to_response='credits')
    if not d: return None
    cands=BD.get(str(mid),[])
    bd=[b for b in cands if b['file'] not in DUPES and b['path'] not in MANUAL_BLACKLIST and not has_spoiler_text(b['file'], d['title'])]
    dropped=len(cands)-len(bd)
    bd=sorted(bd, key=lambda b:(b['lang'] is not None, -b['votes']))[:8]
    bd=sorted(bd, key=lambda b:face_score(mid, b['path']))
    cast=[c['name'] for c in d['credits']['cast'][:3]]
    directors=[c['name'] for c in d['credits']['crew'] if c['job']=='Director']
    return {
        'id':mid,'title':d['title'],'original_title':d['original_title'],
        'year':(d.get('release_date') or '')[:4],
        'genres':[GENRE_TR.get(g['id'],g['name']) for g in d['genres']],
        'rating':round(d.get('vote_average') or 0,1),'votes':d.get('vote_count',0),
        'actor':cast[0] if cast else '', 'cast':cast,
        'director':', '.join(directors),
        'franchise':clean_franchise((d.get('belongs_to_collection') or {}).get('name',''), d['title']),
        'overview':d.get('overview',''),'poster':d.get('poster_path'),
        'backdrops':[b['path'] for b in bd], 'dropped':dropped,
    }

with cf.ThreadPoolExecutor(12) as ex:
    films=[f for f in ex.map(fetch, IDS) if f]

from PIL import Image, ImageStat
def best_crop(mid, src, z, seed):
    # en 'dolu' (yüksek std) kırpma bölgesini seç; aynı görselin farklı kırpmaları için seed ile çeşitlendir
    p=f"data/bd/{mid}_{src.strip('/').replace('.jpg','')}.jpg"
    try: im=Image.open(p).convert('L')
    except Exception: return 50,50
    W,H=im.size; cw,ch=W/z, H/z
    best=(-1,50,50)
    cands=[(x,y) for x in range(10,91,10) for y in range(10,91,10)]
    rnd=random.Random(src+str(seed)); rnd.shuffle(cands)
    faces=FACES.get(f"{mid}_{src.strip('/').replace('.jpg','')}.jpg",[])
    for x,y in cands:
        left=(W-cw)*x/100; top=(H-ch)*y/100
        st=ImageStat.Stat(im.crop((int(left),int(top),int(left+cw),int(top+ch)))).stddev[0]
        # kırpma penceresi bir yüzü içeriyorsa cezalandır (ilk sahneler yüz göstermesin)
        l,t,r,b=left/W, top/H, (left+cw)/W, (top+ch)/H
        for fx,fy,fw,fh in faces:
            ox=max(0,min(r,fx+fw)-max(l,fx)); oy=max(0,min(b,fy+fh)-max(t,fy))
            if ox*oy > 0.3*fw*fh: st-=1000; break
        if st>best[0]: best=(st,x,y)
    return best[1],best[2]
def h(s):
    return int(hashlib.md5(s.encode()).hexdigest(),16)

puzzles=[]
for f in films:
    bd=f['backdrops']
    k=min(len(bd),6)
    print(f"{f['title']:35s} usable={len(bd):2d} dropped={f['dropped']}")
    if k<(2 if f['id'] in CURATED else 3):
        print('SKIP (too few backdrops)',f['title'],len(bd)); continue
    bd=bd[:k]
    # Sahne sırası: zor -> kolay. 1-2: yüz içermeyen yakın plan kırpmalar; sonra tam kareler,
    # yüzü en az olandan en belirgin olana doğru.
    n_crops=max(2, 6-k)
    zooms=[2.4,1.7,2.8,2.0]
    views=[]
    for i in range(n_crops):
        src=bd[i%k]
        x,y=best_crop(f['id'], src, zooms[i], i)
        views.append({'p':src,'z':zooms[i],'x':x,'y':y})
    n_full=6-n_crops
    unseen=bd[n_crops:]
    fulls=unseen[:n_full]
    if len(fulls)<n_full: fulls+=bd[:n_full-len(fulls)]
    fulls=sorted(fulls, key=lambda p:face_score(f['id'], p))
    for src in fulls: views.append({'p':src,'z':1,'x':50,'y':50})
    assert len(views)==6
    answers=[f['title']]
    if f['original_title'] and f['original_title'].lower()!=f['title'].lower(): answers.append(f['original_title'])
    puzzles.append({'id':f['id'],'answers':answers,'year':f['year'],'genre':', '.join(f['genres']),'rating':f['rating'],
                    'actor':f['actor'],'director':f['director'],'franchise':f['franchise'],'overview':f['overview'],
                    'poster':f['poster'],'views':views})

print('puzzles',len(puzzles))
random.Random(4242).shuffle(puzzles)
for i,p in enumerate(puzzles): p['num']=i+1
json.dump(puzzles, open('src/data/puzzles.json','w'), ensure_ascii=False)

# suggestion list from survey + puzzle answers
survey=json.load(open('data/survey.json'))
titles={}
def add(t,y,fr=''):
    if not t: return
    key=t.strip().lower()
    if key not in titles: titles[key]={'t':t.strip(),'y':y or '','f':fr}
for m in survey:
    if not m.get('title'): continue
    add(m['title'],(m.get('release_date') or '')[:4])
    if m.get('original_title') and m['original_title'].lower()!=m['title'].lower():
        add(m['original_title'],(m.get('release_date') or '')[:4])
for p in puzzles:
    for a in p['answers']: 
        add(a,p['year'],p['franchise'])
        titles[a.strip().lower()]['f']=p['franchise']
out=sorted(titles.values(), key=lambda x:x['t'].lower())
json.dump(out, open('src/data/titles.json','w'), ensure_ascii=False)
print('titles',len(out))
for p in puzzles[:100]: print(p['num'],p['answers'][0],p['year'],len(p['views']),'crops=',sum(1 for v in p['views'] if v['z']>1), p['franchise'])
