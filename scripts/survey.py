import json, os, sys, concurrent.futures as cf, urllib.request, urllib.parse
TOK=[l.split('=',1)[1].strip().strip('"') for l in open('/Users/erenduman/projeler/watchwise/.env.local') if l.startswith('TMDB_READ_TOKEN=')][0]
def get(path, **q):
    url='https://api.themoviedb.org/3'+path+('?'+urllib.parse.urlencode(q) if q else '')
    req=urllib.request.Request(url, headers={'Authorization':'Bearer '+TOK})
    for i in range(3):
        try: return json.load(urllib.request.urlopen(req, timeout=20))
        except Exception as e: err=e
    print('ERR',url,err,file=sys.stderr); return None
movies={}
def disc(p):
    return get('/discover/movie', with_origin_country='TR', sort_by='vote_count.desc', language='tr-TR', page=p, include_adult='false')
with cf.ThreadPoolExecutor(16) as ex:
    for d in ex.map(disc, range(1,61)):
        if d:
            for r in d['results']: movies[r['id']]=r
print('discovered',len(movies))
def imgs(mid):
    d=get(f'/movie/{mid}/images', include_image_language='null,tr,en')
    return mid, (len(d['backdrops']) if d else 0)
with cf.ThreadPoolExecutor(16) as ex:
    for mid,n in ex.map(imgs, list(movies)):
        movies[mid]['n_backdrops']=n
out=sorted(movies.values(), key=lambda m:-m.get('vote_count',0))
json.dump(out, open('data/survey.json','w'), ensure_ascii=False)
ok=[m for m in out if m['n_backdrops']>=6]
print('>=6 backdrops:',len(ok))
for m in ok[:200]: print(m['id'], m['title'], '|', m['original_title'], m['release_date'][:4], m['vote_count'], m['n_backdrops'])
