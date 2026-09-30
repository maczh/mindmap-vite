from PIL import Image
from collections import Counter
MINE = "/home/macro/WorkBuddy/2026-09-29-22-26-44/youdao-mindmap-vite/fb-shots/fishbone.png"
im = Image.open(MINE).convert("RGB")
w,h = im.size
print("size", w, h)
# 左 12% 区域（根胶囊应在此）→ 统计主色
def region_colors(x0,x1,y0,y1,k=12):
    c=Counter()
    for y in range(y0,y1,3):
        for x in range(x0,x1,3):
            c[im.getpixel((x,y))]+=1
    return c.most_common(k)
print("LEFT root region:", region_colors(0,int(w*0.12),0,h))
# 全局主色
allc=Counter()
for y in range(0,h,4):
    for x in range(0,w,4):
        allc[im.getpixel((x,y))]+=1
print("GLOBAL top:", allc.most_common(15))
