#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""src/ 모듈 → 단일 HTML 빌드.
   python3 build.py
     dist/abba2.html           더블클릭으로 바로 열리는 단일 파일(팀 공유·시연용)
     dist/abba2.artifact.html  Claude 아티팩트 게시용(문서 래퍼 없음)
   모듈을 한 스코프로 합치므로 최상위 이름은 전부 달라야 한다(중복 시 빌드가 멈춘다)."""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CSS = ['tokens', 'base', 'components', 'screens']
# 로드 순서 = 의존 순서. const가 평가되는 시점 때문에 config·utils가 먼저다.
JS = ['config', 'utils', 'icons', 'engine', 'questions', 'state', 'validate', 'ui',
      'screens/start', 'screens/chat', 'screens/plan', 'screens/brief', 'screens/data', 'screens/settings',
      'router', 'main']
FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css'


def strip_modules(src: str) -> str:
    out = []
    for line in src.split('\n'):
        s = line.strip()
        if re.match(r'^import\b.*\bfrom\s*[\'"]', s) or re.match(r'^import\s*[\'"]', s):
            continue          # 줄 끝 주석이 있어도 걸러지도록 from 절로 판단한다
        if s.startswith('export {'):
            continue
        line = re.sub(r'^export\s+(const|let|function|class)\b', r'\1', line)
        out.append(line)
    return '\n'.join(out).strip()


def build():
    css = '\n'.join(open(f'{ROOT}/src/styles/{n}.css', encoding='utf-8').read().strip() for n in CSS)
    parts, names = [], {}
    for n in JS:
        raw = open(f'{ROOT}/src/js/{n}.js', encoding='utf-8').read()
        for m in re.finditer(r'^(?:export\s+)?(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)', raw, re.M):
            if m.group(1) in names:
                sys.exit(f'[build] 최상위 이름 충돌: {m.group(1)} ({names[m.group(1)]} ↔ {n})')
            names[m.group(1)] = n
        parts.append(f'/* ===== {n}.js ===== */\n' + strip_modules(raw))
    js = '\n\n'.join(parts)
    left = [l for l in js.split('\n') if re.match(r'^\s*(import|export)\b', l)]
    if left:
        sys.exit('[build] import/export가 남았다(번들이 깨진다):\n  ' + '\n  '.join(left[:5]))
    body = '<div class="frame" id="app"></div>\n<div id="layer"></div>\n<script>\n' + js + '\n</script>'
    head = f'<title>ABBA 2.0 시안</title>\n<link rel="stylesheet" href="{FONT}">\n<style>\n{css}\n</style>'
    os.makedirs(f'{ROOT}/dist', exist_ok=True)
    full = ('<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'{head}\n</head>\n<body>\n{body}\n</body>\n</html>\n')
    open(f'{ROOT}/dist/abba2.html', 'w', encoding='utf-8').write(full)
    art = ('<title>ABBA 2.0 시안</title>\n'
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap">\n'
           f'<style>\n{css}\n</style>\n{body}\n')
    open(f'{ROOT}/dist/abba2.artifact.html', 'w', encoding='utf-8').write(art)
    print(f'[build] dist/abba2.html {len(full):,}자 · 최상위 이름 {len(names)}개 · 모듈 {len(JS)}개')


if __name__ == '__main__':
    build()
