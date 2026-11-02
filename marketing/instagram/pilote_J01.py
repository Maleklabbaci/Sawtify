#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pilote J01 — direction publicitaire iOS/Apple-inspired, rendu JPG natif.

Images statiques 1080×1350. Le texte et les pastilles viennent de programme.py;
ce pilote ne modifie pas les exports approuvés.

    python3 marketing/instagram/pilote_J01.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import lettre as L
import programme as P
import typekit as tk

W, H, SS = 1080, 1350, 2
OUT = ROOT / "slides" / "pilote-J01"
PLAN = ROOT / "slides" / "planche-pilote-J01.jpg"

# Palette Sawtify strictement conservée.
CREAM = (242, 241, 237)
INK = (17, 17, 19)
MUTED = (96, 90, 110)
VIOLET = (109, 39, 234)
VIOLET_SOFT = (211, 195, 255)
ORANGE = (253, 96, 41)

FONT_DZ = "Amiri-Bold.ttf"
FONT_FR = "SpaceGrotesk-Bold.ttf"
FONT_FR_MED = "SpaceGrotesk-Medium.ttf"
DZ_TITLE = 96
FR_TITLE = 80
MARGIN = 72
RIGHT = W - MARGIN

PHONE = ROOT / "photos" / "phone-hand.jpg"
MIC = ROOT / "photos" / "mic-hero.jpg"
SCRIPT_PHOTO = ROOT / "photos" / "script-notebook.jpg"
MASCOT = ROOT / "assets" / "logo-mark-trim.png"


def s(v: float) -> int:
    return int(round(v * SS))


def rounded_card(base, box, fill=CREAM, *, radius=26, outline=None, shadow=True):
    x, y, w, h = box
    if shadow:
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.rounded_rectangle([s(x), s(y+9), s(x+w), s(y+h+9)],
                            radius=s(radius), fill=(*INK, 28))
        layer = layer.filter(ImageFilter.GaussianBlur(s(13)))
        base.alpha_composite(layer)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([s(x), s(y), s(x+w), s(y+h)], radius=s(radius),
                        fill=(*fill, 255),
                        outline=(*outline, 255) if outline else None,
                        width=s(1.2) if outline else 1)


def rect(base, box, fill, outline=None, width=1):
    x0,y0,x1,y1=box
    ImageDraw.Draw(base).rectangle([s(x0),s(y0),s(x1),s(y1)],fill=fill,
                                   outline=outline,width=max(1,s(width)) if outline else 1)


def line(base, points, color, width=1):
    ImageDraw.Draw(base).line([(s(x),s(y)) for x,y in points],fill=color,
                              width=max(1,s(width)),joint="curve")


def circle(base,cx,cy,r,fill=None,outline=None,width=1):
    ImageDraw.Draw(base).ellipse([s(cx-r),s(cy-r),s(cx+r),s(cy+r)],fill=fill,
                                 outline=outline,width=max(1,s(width)) if outline else 1)


def add_photo(base, path, box, *, centering=(.5,.5), duotone=False, outline=VIOLET_SOFT,
              radius=24, shadow=True):
    x,y,w,h=box
    rounded_card(base,box,fill=CREAM,radius=radius,outline=None,shadow=shadow)
    im=Image.open(path).convert("RGB")
    im=ImageOps.fit(im,(s(w),s(h)),method=Image.Resampling.LANCZOS,centering=centering)
    if duotone:
        gray=ImageOps.grayscale(im)
        im=ImageOps.colorize(gray,black=INK,white=CREAM).convert("RGB")
    layer=im.convert("RGBA")
    mask=Image.new("L",layer.size,0)
    ImageDraw.Draw(mask).rounded_rectangle([0,0,layer.width-1,layer.height-1],
                                           radius=s(radius),fill=255)
    layer.putalpha(mask)
    base.alpha_composite(layer,(s(x),s(y)))
    if outline:
        ImageDraw.Draw(base).rounded_rectangle([s(x),s(y),s(x+w),s(y+h)],
            radius=s(radius),outline=(*outline,255),width=s(1.2))


def wordmark(base,lang,color=VIOLET):
    rtl=lang=="dz"
    tk.draw(base,"sawtify",RIGHT if rtl else MARGIN,82,23,(*color,255),FONT_FR,
            align="right" if rtl else "left",track=2.0)


def kicker(base,text,lang,*,y=142,bounds=None):
    rtl=lang=="dz"
    font=FONT_DZ if rtl else FONT_FR_MED
    fs=27 if rtl else 19
    x0,x1=bounds or (MARGIN,RIGHT)
    tw=tk.width(text,font,fs)
    pad=16
    h=40 if rtl else 36
    w=tw+pad*2+14
    x=x1-w if rtl else x0
    rounded_card(base,(x,y,w,h),fill=VIOLET_SOFT,radius=h/2,outline=None,shadow=False)
    circle(base,x+(w-13 if rtl else 13),y+h/2,4.5,(*ORANGE,255))
    # The small label follows reading direction; text sits clear of the orange dot.
    tx=x+w-pad-14 if rtl else x+pad+12
    tk.draw(base,text,tx,y+(28 if rtl else 25),fs,(*INK,255),font,
            align="right" if rtl else "left")


def measure(tokens,font,size,gap):
    return sum(tk.width(t,font,size) for t,_w,_st in tokens)+gap*max(0,len(tokens)-1)


def draw_rich_line(base,tokens,baseline,lang,*,bounds,size,color,mark_fill=VIOLET_SOFT,
                   mark_text=None,gap_factor=.12):
    rtl=lang=="dz"
    font=FONT_DZ if rtl else FONT_FR
    gap=size*gap_factor
    total=measure(tokens,font,size,gap)
    x0,x1=bounds
    if total>x1-x0+1:
        raise ValueError(f"Titre trop large ({total:.1f}px/{x1-x0}px): {tokens!r}")
    cursor=x1 if rtl else x0
    for text,_weight,style in tokens:
        tw=tk.width(text,font,size)
        x=cursor-tw if rtl else cursor
        fg=mark_text if style=="mark" and mark_text else color
        if style=="mark":
            bx0,bx1,by0,by1=L.ink_box(text,font,size)
            px,py=9,6
            rect(base,(x+bx0-px,baseline+by0-py,x+bx1+px,baseline+by1+py),
                 (*mark_fill,255))
            # Hairline orange edge: a controlled brand highlight, not a sticker.
            rect(base,(x+bx0-px,baseline+by1+py-4,x+bx1+px,baseline+by1+py),
                 (*ORANGE,255))
        tk.draw(base,text,x,baseline,size,(*fg,255),font,align="left")
        cursor=x-gap if rtl else x+tw+gap


def draw_title(base,lines,lang,*,bounds,first_y,color=INK,mark_fill=VIOLET_SOFT,
               mark_text=None,leading=1.12,size=None,gap_factor=.12):
    size=size or (DZ_TITLE if lang=="dz" else FR_TITLE)
    for i,tokens in enumerate(lines):
        draw_rich_line(base,tokens,first_y+i*size*leading,lang,bounds=bounds,
                       size=size,color=color,mark_fill=mark_fill,mark_text=mark_text,
                       gap_factor=gap_factor)


def icon(base,kind,cx,cy,size,color=INK,accent=ORANGE):
    d=ImageDraw.Draw(base)
    x0,y0=cx-size/2,cy-size/2
    sw=max(2,size*.055)
    if kind=="mute":
        d.polygon([(s(x0+size*.10),s(y0+size*.40)),(s(x0+size*.31),s(y0+size*.40)),
                   (s(x0+size*.52),s(y0+size*.22)),(s(x0+size*.52),s(y0+size*.78)),
                   (s(x0+size*.31),s(y0+size*.60)),(s(x0+size*.10),s(y0+size*.60))],
                  fill=(*color,255))
        line(base,[(x0+size*.62,y0+size*.35),(x0+size*.87,y0+size*.65)],(*accent,255),sw*1.5)
        line(base,[(x0+size*.87,y0+size*.35),(x0+size*.62,y0+size*.65)],(*accent,255),sw*1.5)
    elif kind=="document":
        d.rounded_rectangle([s(x0+size*.22),s(y0+size*.10),s(x0+size*.78),s(y0+size*.90)],
                            radius=s(5),outline=(*color,255),width=s(sw))
        for j,ratio in enumerate((.40,.56,.72)):
            col=accent if j==2 else color
            line(base,[(x0+size*.34,y0+size*ratio),(x0+size*(.63 if j<2 else .56),y0+size*ratio)],
                 (*col,255),sw)
    elif kind=="download":
        line(base,[(cx,y0+size*.12),(cx,y0+size*.60)],(*color,255),sw*1.35)
        line(base,[(cx-size*.22,y0+size*.41),(cx,y0+size*.64),(cx+size*.22,y0+size*.41)],
             (*accent,255),sw*1.35)
        line(base,[(x0+size*.18,y0+size*.78),(x0+size*.82,y0+size*.78)],(*color,255),sw*1.35)
        line(base,[(x0+size*.26,y0+size*.78),(x0+size*.26,y0+size*.89),
                   (x0+size*.74,y0+size*.89),(x0+size*.74,y0+size*.78)],(*color,255),sw)
    elif kind=="speaker":
        d.polygon([(s(x0+size*.14),s(y0+size*.40)),(s(x0+size*.35),s(y0+size*.40)),
                   (s(x0+size*.60),s(y0+size*.20)),(s(x0+size*.60),s(y0+size*.80)),
                   (s(x0+size*.35),s(y0+size*.60)),(s(x0+size*.14),s(y0+size*.60))],
                  fill=(*color,255))
        d.arc([s(x0+size*.53),s(y0+size*.30),s(x0+size*.91),s(y0+size*.70)],
              -62,62,fill=(*accent,255),width=s(sw))


def wave(base,x,cy,width,max_h,*,color=VIOLET,accent=ORANGE,count=37):
    d=ImageDraw.Draw(base)
    step=width/(count-1)
    for i in range(count):
        env=.20+.80*abs(math.sin(i*.41))*(.58+.42*abs(math.cos(i*.17)))
        h=10+max_h*env
        c=accent if i in (0,1,count-2,count-1) else (VIOLET_SOFT if i%7==0 else color)
        xx=x+i*step
        d.rounded_rectangle([s(xx-2.8),s(cy-h/2),s(xx+2.8),s(cy+h/2)],
                            radius=s(2.8),fill=(*c,255))


def chip(base,item,lang,x,y,fill,*,size=None,height=52):
    rtl=lang=="dz"
    font=FONT_FR if item.get("font")=="lat" else (FONT_DZ if rtl else FONT_FR)
    fs=size or (23 if rtl else 19)
    ico=20; pad=17; gap=9
    tw=tk.width(item["t"],font,fs)
    w=tw+2*pad+ico+gap
    rounded_card(base,(x,y,w,height),fill=fill,radius=height/2,outline=None,shadow=True)
    fg=CREAM if fill in (INK,VIOLET) else INK
    if rtl:
        ix=x+w-pad-ico
        tx=x+w-pad-ico-gap
        tk.draw(base,item["t"],tx,y+height*.68,fs,(*fg,255),font,align="right")
    else:
        ix=x+pad
        tx=x+pad+ico+gap
        tk.draw(base,item["t"],tx,y+height*.68,fs,(*fg,255),font,align="left")
    try:
        art=L._icon(item.get("icon","sound"),ico,fg)
        base.alpha_composite(art,(s(ix),s(y+(height-ico)/2)))
    except KeyError:
        icon(base,"speaker",ix+ico/2,y+height/2,ico,fg,ORANGE)
    return w


def chips(base,spec,lang,y,fills,*,span,sizes=None,height=52,gap=14):
    items=spec.get("pills",[])
    if not items:return
    sizes=sizes or [23 if lang=="dz" else 19 for _ in items]
    widths=[]
    for item,fs in zip(items,sizes):
        font=FONT_FR if item.get("font")=="lat" else (FONT_DZ if lang=="dz" else FONT_FR)
        widths.append(tk.width(item["t"],font,fs)+2*17+20+9)
    total=sum(widths)+gap*(len(widths)-1)
    if total>span[1]-span[0]:
        sizes=[max(17,fs-2) for fs in sizes]
        widths=[]
        for item,fs in zip(items,sizes):
            font=FONT_FR if item.get("font")=="lat" else (FONT_DZ if lang=="dz" else FONT_FR)
            widths.append(tk.width(item["t"],font,fs)+2*17+20+9)
        total=sum(widths)+gap*(len(widths)-1)
    cursor=span[1] if lang=="dz" else span[0]
    for i,(item,w,fs) in enumerate(zip(items,widths,sizes)):
        fill=fills[i%len(fills)]
        x=cursor-w if lang=="dz" else cursor
        chip(base,item,lang,x,y,fill,size=fs,height=height)
        cursor=x-gap if lang=="dz" else x+w+gap


def mute_floating_card(base,cx,cy):
    rounded_card(base,(cx-42,cy-42,84,84),fill=VIOLET_SOFT,radius=25,shadow=True)
    icon(base,"mute",cx,cy,46,INK,ORANGE)


def footer(base,n,lang):
    line(base,[(MARGIN,1238),(RIGHT,1238)],(*MUTED,105),1)
    if lang=="dz":
        tk.draw(base,f"{n:02d} / 05",MARGIN,1281,17,(*MUTED,255),FONT_FR_MED,align="left")
        tk.draw(base,"sawtify.space",RIGHT,1281,17,(*MUTED,255),FONT_FR_MED,align="right")
    else:
        tk.draw(base,"sawtify.space",MARGIN,1281,17,(*MUTED,255),FONT_FR_MED,align="left")
        tk.draw(base,f"{n:02d} / 05",RIGHT,1281,17,(*MUTED,255),FONT_FR_MED,align="right")


def slide_one(base,spec,lang):
    wordmark(base,lang)
    kicker(base,spec["kicker"],lang,y=142)
    draw_title(base,spec["lines"],lang,bounds=(MARGIN,RIGHT),first_y=265,
               color=INK,mark_fill=VIOLET_SOFT,leading=1.10,gap_factor=.10)
    add_photo(base,PHONE,(MARGIN,680,936,410),duotone=False,outline=VIOLET_SOFT,radius=28)
    mute_floating_card(base,520,830)
    chips(base,spec,lang,1124,[VIOLET,CREAM],span=(MARGIN+80,RIGHT-80),height=52)
    footer(base,1,lang)


def slide_two(base,spec,lang):
    wordmark(base,lang)
    kicker(base,spec["kicker"],lang,y=142)
    lines=spec["lines"]
    if lang=="dz":
        flat=[t for row in lines for t in row]
        lines=[[flat[0]],[flat[1]],[flat[2]],flat[3:]]
    draw_title(base,lines,lang,bounds=(MARGIN,RIGHT),first_y=250,
               color=INK,mark_fill=VIOLET_SOFT,leading=1.10,gap_factor=.10)
    rtl=lang=="dz"
    left_box=(MARGIN,650,420,450)
    right_box=(588,650,420,450)
    mic_box=left_box if rtl else right_box
    card_box=right_box if rtl else left_box
    add_photo(base,MIC,mic_box,duotone=True,outline=VIOLET_SOFT,radius=28)
    x,y,w,h=mic_box
    # One fine orange slash explains the mic-free promise without adding copy.
    line(base,[(x+w*.22,y+h*.32),(x+w*.78,y+h*.69)],(*ORANGE,255),7)
    rounded_card(base,card_box,fill=VIOLET_SOFT,radius=28,outline=None,shadow=True)
    cx=card_box[0]+card_box[2]/2
    wave(base,cx-140,card_box[1]+190,280,92,color=VIOLET,accent=ORANGE,count=27)
    # A compact time marker is part of the existing promise, not new copy.
    tk.draw(base,"30",cx,card_box[1]+335,92,(*INK,255),FONT_FR,align="center")
    tk.draw(base,"s",cx+85,card_box[1]+335,31,(*MUTED,255),FONT_FR_MED,align="left")
    # The original benefit chips sit in front of both product surfaces.
    chips(base,spec,lang,1035,[CREAM,ORANGE],span=(MARGIN+20,RIGHT-20),
          sizes=[20 if lang=="dz" else 17 for _ in spec.get("pills",[])],height=50)
    footer(base,2,lang)


def draw_arrow(base,x0,x1,y):
    line(base,[(x0,y),(x1,y)],(*VIOLET,150),2)
    direction=1 if x1>x0 else -1
    ImageDraw.Draw(base).polygon([(s(x1),s(y)),(s(x1-direction*11),s(y-7)),
                                  (s(x1-direction*11),s(y+7))],fill=(*VIOLET,190))


def slide_three(base,spec,lang):
    wordmark(base,lang)
    kicker(base,spec["kicker"],lang,y=142)
    draw_title(base,spec["lines"],lang,bounds=(MARGIN,RIGHT),first_y=265,
               color=INK,mark_fill=VIOLET_SOFT,leading=1.10,gap_factor=.10)
    centers=[224,540,856]
    if lang=="dz":centers=list(reversed(centers))
    boxes=[(centers[0]-132,690,264,340),(centers[1]-132,690,264,340),(centers[2]-132,690,264,340)]
    # Soft, carefully aligned surfaces; the arrows show the real sequence.
    for i in range(2):
        edge=132
        a=centers[i]+(edge if centers[i+1]>centers[i] else -edge)
        b=centers[i+1]-(edge if centers[i+1]>centers[i] else -edge)
        draw_arrow(base,a,b,838)
    for i,box in enumerate(boxes):
        rounded_card(base,box,fill=CREAM,radius=28,outline=VIOLET_SOFT,shadow=True)
    # Source material, an audio waveform, and a download symbol; no numbered tiles.
    add_photo(base,SCRIPT_PHOTO,(centers[0]-92,732,184,142),duotone=True,
              outline=None,radius=17,shadow=False)
    circle(base,centers[1],803,59,(*VIOLET_SOFT,255))
    wave(base,centers[1]-40,803,80,42,color=VIOLET,accent=ORANGE,count=13)
    circle(base,centers[2],803,59,(*VIOLET_SOFT,255))
    icon(base,"download",centers[2],803,56,VIOLET,ORANGE)
    labels=(['النص','الصوت','الملف'] if lang=='dz' else ['TEXTE','VOIX','FICHIER'])
    font=FONT_DZ if lang=="dz" else FONT_FR
    fs=30 if lang=="dz" else 22
    for cx,label in zip(centers,labels):
        tk.draw(base,label,cx,960,fs,(*INK,255),font,align="center")
    chips(base,spec,lang,1074,[VIOLET,CREAM],span=(MARGIN+45,RIGHT-45),height=50)
    footer(base,3,lang)


def slide_four(base,spec,lang):
    wordmark(base,lang)
    kicker(base,spec["kicker"],lang,y=142)
    draw_title(base,spec["lines"],lang,bounds=(MARGIN,RIGHT),first_y=265,
               color=INK,mark_fill=VIOLET_SOFT,leading=1.12,gap_factor=.10)
    rounded_card(base,(MARGIN,675,936,440),fill=INK,radius=30,outline=None,shadow=True)
    # Five tonal waveform clusters echo the existing five-voice pack ratio.
    centers=[220,380,540,700,860]
    heights=[28,52,82,47,96,53,30]
    for group,cx in enumerate(centers):
        for j,h in enumerate(heights):
            xx=cx+(j-3)*13
            col=ORANGE if group==4 and j in (2,3,4) else (VIOLET_SOFT if j%2==0 else CREAM)
            ImageDraw.Draw(base).rounded_rectangle([s(xx-3),s(865-h/2),s(xx+3),s(865+h/2)],
                                                   radius=s(3),fill=(*col,255))
    chips(base,spec,lang,1008,[VIOLET_SOFT],span=(MARGIN+150,RIGHT-150),height=54)
    footer(base,4,lang)


def slide_five(base,spec,lang):
    wordmark(base,lang)
    kicker(base,spec["kicker"],lang,y=142)
    draw_title(base,spec["lines"],lang,bounds=(MARGIN,RIGHT),first_y=265,
               color=INK,mark_fill=VIOLET_SOFT,leading=1.12,gap_factor=.10)
    rounded_card(base,(MARGIN,665,936,455),fill=VIOLET_SOFT,radius=30,outline=None,shadow=True)
    # A small violet medallion frames the real Sawtify mascot without replacing it.
    rtl=lang=="dz"
    cx=MARGIN+205 if rtl else RIGHT-205
    cy=895
    circle(base,cx,cy,151,(*VIOLET,255))
    mascot=Image.open(MASCOT).convert("RGBA")
    target_h=280
    target_w=int(mascot.width*target_h/mascot.height)
    mascot=mascot.resize((s(target_w),s(target_h)),Image.Resampling.LANCZOS)
    base.alpha_composite(mascot,(s(cx-target_w/2),s(cy-target_h/2)))
    # CTA chips stay on the open side of the card, in the foreground.
    span=(MARGIN+395,RIGHT-26) if rtl else (MARGIN+26,RIGHT-395)
    chips(base,spec,lang,835,[ORANGE,CREAM],span=span,height=52,
          sizes=[20 if lang=="dz" else 17 for _ in spec.get("pills",[])])
    footer(base,5,lang)


def render_one(spec,idx,lang):
    base=Image.new("RGBA",(s(W),s(H)),(*CREAM,255))
    if idx==0:slide_one(base,spec,lang)
    elif idx==1:slide_two(base,spec,lang)
    elif idx==2:slide_three(base,spec,lang)
    elif idx==3:slide_four(base,spec,lang)
    else:slide_five(base,spec,lang)
    return base.convert("RGB").resize((W,H),Image.Resampling.LANCZOS)


def make_contact_sheet():
    tw,th,gap,margin=360,450,16,20
    out=Image.new("RGB",(margin*2+5*tw+4*gap,margin*2+2*th+gap),INK)
    for row,lang in enumerate(("dz","fr")):
        for col in range(5):
            im=Image.open(OUT/lang/f"{col+1:02d}.jpg").convert("RGB")
            im=im.resize((tw,th),Image.Resampling.LANCZOS)
            out.paste(im,(margin+col*(tw+gap),margin+row*(th+gap)))
    out.save(PLAN,quality=95,optimize=True,subsampling=0)


def main():
    day=P.DAYS[0]
    for lang in ("dz","fr"):
        target=OUT/lang
        target.mkdir(parents=True,exist_ok=True)
        for idx,spec in enumerate(day[lang]):
            im=render_one(spec,idx,lang)
            im.save(target/f"{idx+1:02d}.jpg",quality=96,optimize=True,subsampling=0)
            print(f"ok {lang} {idx+1:02d} {im.size}")
    make_contact_sheet()
    print(f"planche {PLAN} {Image.open(PLAN).size}")


if __name__=="__main__":
    main()
