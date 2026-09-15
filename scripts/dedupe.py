# Near-duplicate backdrops (dHash) -> data/dupes.json {file: canonical_file}
import json, os
from PIL import Image
def dhash(path, size=8):
    im=Image.open(path).convert('L').resize((size+1,size), Image.LANCZOS)
    px=list(im.getdata())
    bits=[]
    for r in range(size):
        for c in range(size):
            bits.append(px[r*(size+1)+c] > px[r*(size+1)+c+1])
    return bits
def ham(a,b): return sum(x!=y for x,y in zip(a,b))
bd=json.load(open('data/backdrops.json'))
dupes={}
for mid,items in bd.items():
    hs=[]
    for it in items:
        p='data/bd/'+it['file']
        if not os.path.exists(p): continue
        h=dhash(p)
        for f,h2 in hs:
            if ham(h,h2)<=6:
                dupes[it['file']]=f; break
        else: hs.append((it['file'],h))
json.dump(dupes, open('data/dupes.json','w'))
print('dupes',len(dupes))
