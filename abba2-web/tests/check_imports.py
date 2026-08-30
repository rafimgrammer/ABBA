#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""모듈 간 임포트 누락 검사.
단일 파일(dist)로 합치면 한 스코프라 임포트를 빼먹어도 동작한다.
모듈(index.html)에서만 터지는 이 실수를 커밋 전에 잡는다.
실행: python3 tests/check_imports.py"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'src/js')
FILES = ['config.js', 'utils.js', 'icons.js', 'engine.js', 'questions.js', 'state.js', 'validate.js', 'ui.js',
         'screens/start.js', 'screens/chat.js', 'screens/plan.js', 'screens/brief.js',
         'screens/data.js', 'screens/settings.js', 'router.js', 'main.js']
IGNORE = {'ma', 'undo'}   # 객체 키·아이콘 이름과 겹치는 오탐


def names_of(src, pattern):
    return {m.group(1) for m in re.finditer(pattern, src, re.M)}


def main():
    exports = {}
    for f in FILES:
        s = open(f'{JS}/{f}', encoding='utf-8').read()
        n = set()
        for m in re.finditer(r'^export\s*\{([^}]*)\}', s, re.M):
            n |= {x.strip() for x in m.group(1).split(',') if x.strip()}
        n |= names_of(s, r'^export\s+(?:const|let|function)\s+([A-Za-z_$][\w$]*)')
        exports[f] = n
    owner = {n: f for f, ns in exports.items() for n in ns}
    bad = 0
    for f in FILES:
        s = open(f'{JS}/{f}', encoding='utf-8').read()
        imported = set()
        for m in re.finditer(r'^import\s*\{([^}]*)\}\s*from', s, re.M):
            imported |= {x.strip() for x in m.group(1).split(',') if x.strip()}
        declared = names_of(s, r'^(?:export\s+)?(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)')
        scan = re.sub(r'\son\w+="[^"]*"', ' ', re.sub(r'^import .*$', '', s, flags=re.M))  # 인라인 핸들러는 window 참조
        used = set(re.findall(r'\b[A-Za-z_$][\w$]*\b', scan))
        missing = sorted((used & set(owner)) - imported - declared - exports[f] - IGNORE)
        if missing:
            bad += 1
            print(f'FAIL {f} — 임포트 누락: ' + ', '.join(f'{n} ({owner[n]})' for n in missing))
    print('PASS 임포트 누락 없음' if not bad else f'{bad}개 파일에서 누락 발견')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
