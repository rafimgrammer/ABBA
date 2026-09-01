"""AI 상세 계획 실검증 — 진짜 Gemini를 부른다.

CI에서는 돌리지 않는다. 무료 한도(429)에 걸리고 응답이 매번 달라 불안정하다.
숫자 검증기 자체의 회귀 테스트는 tests/test_ui.py에 있다(네트워크 없이 돈다).

실행: python3 tests/test_ai.py [dist|src]
확인하는 것
  1) 카드가 실제로 뜨고 "숫자 검증 통과"가 붙는지
  2) 화면에 찍힌 금액·비율·기간이 전부 엔진 팩트시트에 있던 값인지 (파이썬이 독립적으로 재검사)
  3) 성향을 바꾸면 다시 만들고, 되돌리면 캐시로 즉시 뜨는지
"""
import asyncio, os, re, sys, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = sys.argv[1] if len(sys.argv) > 1 else 'dist'
URL = 'file://' + os.path.join(ROOT, 'dist/abba2.html') if TARGET == 'dist' else 'http://localhost:5173/'

PASS, FAIL = [], []
def check(name, cond, detail=''):
    (PASS if cond else FAIL).append(name)
    print(('PASS ' if cond else 'FAIL ') + name + (('  -- ' + str(detail)) if detail and not cond else ''))

# coach.js의 NUM과 같은 규칙. 앱과 따로 구현해 두어야 서로를 검증할 수 있다.
NUM = re.compile(r'(\d[\d,]*(?:\.\d+)?)\s*(억\s*원|만\s*원|개월|%p|억|만|원|년|월|%)')
EXTRA = {'15.4%', '70%', '40%', '30%', '0원', '1개월'}

def toks(text):
    return {m.group(1).replace(',', '') + re.sub(r'\s+', '', m.group(2)) for m in NUM.finditer(text)}

def allow_from(facts):
    a = toks(facts) | EXTRA
    for t in list(a):
        m = re.fullmatch(r'(\d+)개월', t)
        if m and int(m.group(1)) % 12 == 0:
            a.add(f'{int(m.group(1)) // 12}년')
    return a

async def wait_card(pg, timeout=60000):
    """카드 완성을 기다린다. 실패하면 화면에 뜬 사유(한도 초과 등)를 그대로 돌려준다."""
    try:
        await pg.wait_for_selector('.aifoot', timeout=timeout)
        return None
    except Exception:
        state = await pg.evaluate('() => ({ status: S.ai.status, error: S.ai.error })')
        return state.get('error') or f'상태 {state.get("status")}에서 멈춤'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        await ctx.add_init_script('window.__ABBA_AI_AUTO = true')   # 자동화에서도 진짜 호출하게 한다
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))

        await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.click('text=예시 값으로 계획 화면 바로 보기')

        t0 = time.time()
        why = await wait_card(pg)
        if why:
            check('AI 카드 생성', False, why)
            print('\n한도(429)라면 잠시 뒤 다시 돌리세요. 무료 등급은 분당 요청 수가 적습니다.')
            print(f'\n{len(PASS)} passed, {len(FAIL)} failed'); await b.close(); sys.exit(1)
        check(f'AI 카드 생성 ({time.time() - t0:.1f}초)', True)

        card = pg.locator('.card').filter(has=pg.locator('.aifoot')).first
        body = await card.inner_text()
        check('검증 통과 배지', '검증 통과' in body or '검증 실패' in body)   # 폴백도 정상 경로다
        check('진단·근거·할 일·위험·중간 점검 모두 있음',
              all(s in body for s in ['왜 이 배분인가요', '지금 할 일', '확인할 위험', '중간 점검']))

        # 앱이 AI에게 넘긴 팩트시트를 그대로 꺼내, 화면 문구를 파이썬이 다시 검사한다.
        facts = await pg.evaluate('() => S.ai.meta.facts')
        allow = allow_from(facts)
        prose = re.sub(r'AI가 본 자료.*', '', body, flags=re.S)      # 근거 원문(=팩트시트)은 검사 대상이 아니다
        bad = sorted(t for t in toks(prose) if t not in allow)
        check('화면의 모든 숫자가 엔진 계산값에 있음', not bad, bad)
        check('팩트시트가 화면 계산값과 일치', '2,248만 원' in facts and '752만 원' in facts)

        meta = await pg.evaluate('() => S.ai.meta')
        print(f'  모델 {meta["model"]} · {meta["ms"]}ms'
              + (f' · 1회 교정({", ".join(meta["corrected"])})' if meta['retried'] else ' · 1회 통과'))

        # 성향을 바꾸면 새로 만들고, 되돌리면 캐시에서 즉시 나온다
        await pg.click('.segp button:has-text("공격형")')
        await pg.wait_for_timeout(1000)
        why = await wait_card(pg)
        if why:
            check('성향 변경 시 다시 생성', False, why)
        else:
            agg = await pg.evaluate('() => S.ai.planKey')
            check('성향 변경 시 다시 생성', '공격형' in agg, agg)

            t1 = time.time()
            await pg.click('.segp button:has-text("중립형")')
            await pg.wait_for_timeout(900)   # 디바운스(700ms)보다 길게
            why = await wait_card(pg, timeout=3000)
            check(f'되돌리면 캐시로 즉시 표시 ({time.time() - t1:.1f}초)', not why and time.time() - t1 < 3, why)

        # ---- 물어보기: 답해야 할 것과 거절해야 할 것 ----
        card = pg.locator('.card').filter(has=pg.locator('input[aria-label="계획에 대한 질문"]')).first
        await card.scroll_into_view_if_needed()
        await pg.click('button.chip:has-text("왜 이런 비율로")')
        try:
            await pg.wait_for_function('() => S.ask.items.length > 0 || S.ask.error', timeout=60000)
        except Exception:
            pass
        st = await pg.evaluate('() => ({ n: S.ask.items.length, e: S.ask.error })')
        if st['n']:
            it = await pg.evaluate('() => S.ask.items[0]')
            check('물어보기: 계획 질문에 답함', it['answerable'], it['answer'][:60])
            check('물어보기: 근거 항목 제시', len(it['basis']) >= 1, it['basis'])
            bad = sorted(t for t in toks(it['answer']) if t not in allow)
            check('물어보기: 답의 숫자가 엔진 값에 있음', not bad, bad)

            inp = card.locator('input[aria-label="계획에 대한 질문"]')
            await inp.fill('삼성전자 지금 사야 할까요?')
            await inp.press('Enter')
            try:
                await pg.wait_for_function('() => S.ask.items.length > 1 || S.ask.error', timeout=60000)
            except Exception:
                pass
            if await pg.evaluate('() => S.ask.items.length') > 1:
                it2 = await pg.evaluate('() => S.ask.items[1]')
                check('물어보기: 종목 추천은 거절', not it2['answerable'], it2['answer'][:60])
        else:
            check('물어보기: 계획 질문에 답함', False, st['e'])

        check('콘솔·페이지 에러 없음', not errs, errs[:3])
        await b.close()
    print(f'\n{len(PASS)} passed, {len(FAIL)} failed')
    if FAIL: print('FAILED:', FAIL); sys.exit(1)

asyncio.run(main())
