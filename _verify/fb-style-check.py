from PIL import Image

REF = "/home/macro/.workbuddy/clipboard-images/clipboard-2026-09-30T13-03-00-587Z-0239a89a.png"
MINE = "/home/macro/Work/js/src/github.com/maczh/mindmap-vite/fb-shots/fishbone.png"

def load(p):
    im = Image.open(p).convert("RGB")
    # 下采样加速纯 python 遍历
    w,h = im.size
    sc = max(1, w//700)
    im = im.resize((w//sc, h//sc))
    return list(im.getdata()), im.size

def near(px, tgt, tol):
    return abs(px[0]-tgt[0])+abs(px[1]-tgt[1])+abs(px[2]-tgt[2]) < tol

def stroke_palette(data, sz):
    tgt=(115,161,191); c=0; n=len(data)
    for px in data:
        if near(px,tgt,55): c+=1
    return c/n

def root_blue(data, sz):
    w,h = sz
    tgt=(115,161,191); c=0; tot=0
    for y in range(h):
        for x in range(w//4):
            tot+=1
            if near(data[y*w+x], tgt, 60): c+=1
    return c/tot

def longest_h_stroke(data, sz):
    w,h = sz
    tgt=(115,161,191)
    best=0
    for y in range(0,h,2):
        m=0; cur=0
        for x in range(w):
            if near(data[y*w+x], tgt, 55): cur+=1; m=max(m,cur)
            else: cur=0
        best=max(best,m)
    return best

rd,rsz = load(REF)
md,msz = load(MINE)
print("ref size", rsz, "mine size", msz)
print("stroke%%  ref=%.4f mine=%.4f" % (stroke_palette(rd,rsz), stroke_palette(md,msz)))
print("rootBlue left%%  ref=%.4f mine=%.4f" % (root_blue(rd,rsz), root_blue(md,msz)))
print("longest horiz stroke px (downscaled)  ref=%d mine=%d" % (longest_h_stroke(rd,rsz), longest_h_stroke(md,msz)))
