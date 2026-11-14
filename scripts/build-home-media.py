#!/usr/bin/env python3
"""Reuse the existing local product videos for home screenshots and a 72s tour."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = json.loads((ROOT / 'content/home.json').read_text())
STEMS = ['01-home', '02-catalog', '03-editor', '04-partners', '05-contracts', '06-activation', '07-led', '08-invoices', '09-analytics']
IMAGES = ROOT / 'assets/home'
VIDEOS = ROOT / 'videos/home'
IMAGES.mkdir(parents=True, exist_ok=True)
VIDEOS.mkdir(parents=True, exist_ok=True)


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def timestamp(seconds):
    return f'00:{seconds // 60:02}:{seconds % 60:02}.000'


for lang, content in CONTENT.items():
    image = IMAGES / f'product-{lang}.png'
    if not image.exists():
        run(['-ss', '7', '-i', str(ROOT / f'videos/features/03-editor-{lang}.mp4'), '-frames:v', '1', '-vf', 'crop=1498:714:51:33,scale=1400:-2', str(image)])
    video = VIDEOS / f'overview-{lang}.mp4'
    if not video.exists():
        inputs = []
        for stem in STEMS:
            inputs += ['-ss', '4', '-t', '8', '-i', str(ROOT / f'videos/features/{stem}-{lang}.mp4')]
        filters = ';'.join(f'[{i}:v]scale=1280:720,setsar=1,setpts=PTS-STARTPTS[v{i}]' for i in range(9))
        filters += ';' + ''.join(f'[v{i}]' for i in range(9)) + 'concat=n=9:v=1:a=0[out]'
        run([*inputs, '-filter_complex', filters, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(video)])
    captions = 'WEBVTT\n\n'
    for i, title in enumerate(content['tourChapters']):
        captions += f'{timestamp(i * 8)} --> {timestamp((i + 1) * 8)}\n{title}\n{content["modules"][i][1]}\n\n'
    (VIDEOS / f'overview-{lang}.vtt').write_text(captions)
    print(f'Prepared {lang} screenshot, tour and captions', flush=True)
