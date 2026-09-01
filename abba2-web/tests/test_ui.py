"""ABBA 2.0 시안 UI 테스트 — Playwright 390px.
손 입력 경로, 4가지 목표 분기, 기간 모름, 음수·기호 차단, 계산값 파이썬 대조.
실행: python3 tests/test_ui.py [dist|src]   (기본 dist/abba2.html)"""
import asyncio, os, re, sys, datetime
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import engine_ref as E

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TARGET = sys.argv[1] if len(sys.argv) > 1 else 'dist'
URL = 'file://' + os.path.join(ROOT, 'dist/abba2.html') if TARGET == 'dist' else 'http://localhost:5173/'
M = 10000
PASS = []; FAIL = []
def check(name, cond, detail=''):
    (PASS if cond else FAIL).append(name)
    print(('PASS ' if cond else 'FAIL ') + name + (('  -- ' + str(detail)) if detail and not cond else ''))

def won(v):
    v = round(v); s = ''
    if v >= 1e8:
        eok = v // 100000000; man = round((v % 100000000) / M)
        if man == 10000: eok += 1; man = 0
        s = f'{eok:,}억 {man:,}만 원' if man else f'{eok:,}억 원'
    elif v >= M: s = f'{round(v / M):,}만 원'
    else: s = f'{v:,}원'
    return s

def ym_add(n):
    t = datetime.date.today(); y, m = t.year, t.month - 1 + n
    return f'{y + m // 12}년 {m % 12 + 1}월'

async def type_num(pg, text):
    await pg.fill('#num', '')
    await pg.type('#num', text)

async def wait_q(pg, snippet):
    await pg.wait_for_function(f"document.body.innerText.includes({snippet!r})", timeout=5000)
    await pg.wait_for_function("!document.querySelector('.typing')", timeout=5000)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'Failed to load resource' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))

        # ---------- 0. 파일 정적 점검 ----------
        src = open(os.path.join(ROOT, 'dist/abba2.html'), encoding='utf-8').read()
        emoji = re.findall(r'[\U0001F300-\U0001FAFF☀-➿\U0001F1E6-\U0001F1FF]', src)
        check('파일에 이모지 없음', not emoji, emoji[:5])
        check('외부 의존은 웹폰트 1개뿐', src.count('<link') == 1 and src.count('<script src') == 0 and 'pretendard' in src.lower())

        # ---------- 1. 시작 화면 ----------
        await pg.goto(URL); await pg.wait_for_timeout(300)
        check('시작 화면 렌더', await pg.is_visible('text=목표 정하기 시작'))

        # ---------- 2. 손 입력 경로 (목돈 3,000만 / 24개월 / 0 / 250 / 지출 160 / 저축 90 / 중립형) ----------
        await pg.click('text=목표 정하기 시작'); await pg.wait_for_timeout(200)
        check('첫 질문 표시', '무엇을 위해' in await pg.inner_text('#log'))
        check('진행 표시 0/6', '0/6' in await pg.inner_text('.top'))
        await pg.click('button.chip:has-text("목돈 모으기")')
        await wait_q(pg, '얼마를 모으고 싶으세요')
        check('목표 선택 후 진행 표시 1/7', '1/7' in await pg.inner_text('.top'))
        check('입력 전 보내기 비활성', await pg.is_disabled('#send'))
        await type_num(pg, '3000')
        check('콤마 포맷 적용', await pg.input_value('#num') == '3,000')
        check('도움말 = 3,000만 원', '= 3,000만 원' in await pg.inner_text('#helpL'))
        check('손 입력 후 보내기 활성', not await pg.is_disabled('#send'))
        await pg.press('#num', 'Enter')
        await wait_q(pg, '언제까지 모으고 싶으세요')
        check('금액 사용자 말풍선', '3,000만 원' in await pg.locator('.msg.me').last.inner_text())
        # 캐럿 보존: "24" 입력 뒤 커서를 맨 앞에 두고 "1" 입력 → "124"
        await type_num(pg, '24')
        await pg.evaluate("document.getElementById('num').setSelectionRange(0,0)")
        await pg.type('#num', '1')
        check('캐럿 보존(앞에 삽입 → 124)', await pg.input_value('#num') == '124')
        await type_num(pg, '24')
        check('개월 도움말', f'24개월 = {ym_add(23)}까지' in await pg.inner_text('#helpL'))
        await pg.click('#send')
        await wait_q(pg, '모아둔 돈이 있나요')
        await type_num(pg, '0'); await pg.click('#send')
        await wait_q(pg, '한 달 수입은')
        # ---------- 음수·기호 차단 (v1.3에서 추가) ----------
        await pg.fill('#num', ''); await pg.click('#num')
        await pg.press('#num', '-')
        check('마이너스 키가 입력창에 들어가지 않음', await pg.input_value('#num') == '')
        check('마이너스 키 → 음수 안내', '음수는 입력할 수 없어요' in await pg.inner_text('#helpL'))
        check('마이너스만 있으면 보내기 비활성', await pg.is_disabled('#send'))
        check('안내가 빨간 상태로 표시', 'err' in (await pg.get_attribute('#help', 'class')))
        await type_num(pg, '-250')
        check('"-250" 타이핑 → 250만 남음', await pg.input_value('#num') == '250')
        check('음수 기호를 뺀 값으로 정상 진행', not await pg.is_disabled('#send') and '= 250만 원' in await pg.inner_text('#helpL'))
        # 붙여넣기: el.value 직접 대입은 React의 값 추적기가 걸러내는 합성 경로라 실제 동작과 다르다.
        # insert_text는 브라우저 편집 파이프라인(beforeinput/input)을 그대로 타므로 진짜 붙여넣기와 같다.
        await pg.fill('#num', ''); await pg.click('#num')
        await pg.keyboard.insert_text('-250')
        check('붙여넣기 경로도 음수 제거 + 안내', await pg.input_value('#num') == '250' and '음수는 입력할 수 없어요' in await pg.inner_text('#helpL'))
        await pg.fill('#num', ''); await pg.click('#num'); await pg.press('#num', 'a')
        check('숫자가 아닌 글자키 → 숫자만 안내', '숫자만 입력할 수 있어요' in await pg.inner_text('#helpL'))
        await type_num(pg, '0')
        check('0 입력 거부', await pg.is_disabled('#send') and '0보다 큰 금액' in await pg.inner_text('#helpL'))
        await type_num(pg, '200000')
        check('비현실적으로 큰 수입 거부', await pg.is_disabled('#send') and '이하로 입력해' in await pg.inner_text('#helpL'))
        await type_num(pg, '5')
        check('10만 원 미만 수입 거부', await pg.is_disabled('#send'))
        if TARGET == 'dist':
            neg = await pg.evaluate("ENGINE.project(-1000000, -500000, 24, ENGINE.weights('중립형', 24)).net")
            check('엔진 음수 방어: 음수 저축·모아둔 돈 → 0', neg == 0, neg)
            negm = await pg.evaluate("ENGINE.project(900000, 0, -12, ENGINE.weights('중립형', 24)).net")
            check('엔진 음수 방어: 음수 개월 → 0', negm == 0, negm)

        await type_num(pg, '250'); await pg.click('#send')
        await wait_q(pg, '한 달 지출은')
        # 검증: 지출 ≥ 수입
        await type_num(pg, '300')
        check('지출>수입이면 보내기 비활성', await pg.is_disabled('#send'))
        check('지출>수입 오류 문구', '크거나 같아요' in await pg.inner_text('#helpL'))
        await type_num(pg, '160')
        check('지출 도움말 남는 돈', '남는 돈 90만 원' in await pg.inner_text('#helpL'))
        await pg.click('#send')
        await wait_q(pg, '이 중 얼마를 저축할까요')
        check('저축 질문에 최대 90만 원 안내', '최대 90만 원' in await pg.inner_text('#log'))
        await type_num(pg, '100')
        check('저축>가능액이면 비활성', await pg.is_disabled('#send'))
        await type_num(pg, '90'); await pg.click('#send')
        await wait_q(pg, '투자 성향을 골라주세요')
        # 이전 답변 수정 → 저축 질문으로 복귀
        await pg.click('button.undo'); await pg.wait_for_timeout(150)
        check('이전 답변 수정 → 저축 질문으로 복귀', '#num' in [''] or await pg.is_visible('#num'))
        check('되돌린 뒤 성향 질문 사라짐', '투자 성향' not in await pg.inner_text('#log'))
        await type_num(pg, '90'); await pg.click('#send')
        await wait_q(pg, '투자 성향을 골라주세요')
        await pg.click('button.chip:has-text("중립형")')
        await wait_q(pg, '필요한 정보는 다 모였어요')
        log = await pg.inner_text('#log')
        check('성향 확인 문구(주식 30%, 채권 20%)', '주식 30%, 채권 20%' in log)
        check('완료 CTA 표시', await pg.is_visible('text=추천 계획 보기'))
        await pg.click('text=추천 계획 보기'); await pg.wait_for_timeout(250)

        # ---------- 3. 계획 화면 수치 대조 ----------
        w = E.weights('중립형', 24); pr = E.project(90 * M, 0, 24, w)
        body = await pg.inner_text('.main')
        check('해시 라우팅 #/plan', (await pg.evaluate('location.hash')) == '#/plan')
        check('예상 총액 = 파이썬 엔진', won(pr['net']) in body, won(pr['net']))
        check('원금·수익 표시', won(pr['principal']) in body and won(pr['net'] - pr['principal']) in body)
        check('부족액 표시', f"{won(3000 * M - pr['net'])} 부족" in body)
        check('도달 시점', f'{ym_add(23)} 도달' in body)
        check('상태 재설계 필요', '재설계 필요' in body)
        n2 = E.months_to_goal(3000 * M, 90 * M, 0, '중립형'); req = E.required_saving(3000 * M, 24, 0, '중립형')
        check('조정안 기간', f'기간을 {n2}개월로 늘리기' in body, n2)
        check('조정안 월 저축', f'월 저축을 {won(-(-req // M) * M)}으로 올리기' in body)
        check('월 121만은 가능액 초과 안내', '90만 원까지만 가능' in body)
        for r in pr['rows']:
            amt = r['monthly'] / M
            lab = f'월 {amt:g}만 원'
            check(f'배분 행 {r["key"]} {r["w"]}%', f'{r["key"]} {r["w"]}%' in re.sub(r'\s+', ' ', body) and lab in body, lab)
        check('가정 수익률 연 4.8%', '연 4.8%' in body)
        # 성향 전환
        await pg.click('.segp button:has-text("공격형")'); await pg.wait_for_timeout(150)
        pa = E.project(90 * M, 0, 24, E.weights('공격형', 24)); body = await pg.inner_text('.main')
        check('공격형 전환 시 총액 변경', won(pa['net']) in body, won(pa['net']))
        check('3년 이내 주식 35% 규칙 문구', '35%까지만' in body)
        await pg.click('.segp button:has-text("중립형")'); await pg.wait_for_timeout(150)
        # 조정안 적용 (기간)
        await pg.click('.alt.rec button:has-text("적용")'); await pg.wait_for_timeout(200)
        body = await pg.inner_text('.main')
        check('기간 적용 후 계획대로 가능', '계획대로 가능' in body and f'{n2}개월' in body)
        # 뒤로가기 → 대화
        await pg.go_back(); await pg.wait_for_timeout(200)
        check('브라우저 뒤로가기 → 대화 화면', (await pg.evaluate('location.hash')) == '#/chat' and await pg.is_visible('#log'))
        await pg.go_forward(); await pg.wait_for_timeout(200)

        # ---------- 4. 브리핑 / 설정 / 데이터 ----------
        await pg.click('.cta button:has-text("매일 브리핑 받기")'); await pg.wait_for_timeout(250)
        body = await pg.inner_text('.main')
        check('브리핑 화면', '오늘의 브리핑' in await pg.inner_text('.top') and '예시 데이터' in await pg.inner_text('.top'))
        for t in ['내 계획 점검', '보유 종목 등락', '더 높은 금리 상품', '종목 뉴스 호재·악재 분석', '지표 전망', '오늘 할 일']:
            check(f'브리핑 카드: {t}', t in body)
        check('내 계획 기준(예시 계획 문구 없음)', '예시 계획' not in body)
        d = 90 * M * 0.35; n = n2
        extra = d * (0.008 / 12) * n * (n + 1) / 2
        check('고금리 갈아타기 차액 계산', f'약 {won(extra)} 늘어요' in body, won(extra))
        check('알림 기준 초과 태그(삼성전자 -3.2%)', '알림 기준 ±3% 초과' in body)
        check('골든크로스·데드크로스 일수 표시', re.search(r'골든크로스 \d일째', body) and re.search(r'데드크로스 \d일째', body))
        check('스파크라인 SVG 2개', await pg.locator('svg.spark').count() == 2)
        await pg.click('a[href="#/settings"]'); await pg.wait_for_timeout(200)
        body = await pg.inner_text('.main')
        check('설정 화면 내 목표 표시', '목돈 모으기 3,000만 원' in body and f'{n2}개월' in body)
        await pg.click('.mini button:has-text("±5%")'); await pg.wait_for_timeout(100)
        await pg.click('button.sw[aria-label="news"]'); await pg.wait_for_timeout(100)
        check('뉴스 알림 토글 끔', (await pg.get_attribute('button.sw[aria-label="news"]', 'aria-checked')) == 'false')
        await pg.click('.mini button:has-text("09:00")'); await pg.wait_for_timeout(100)
        await pg.click('a[href="#/brief"]'); await pg.wait_for_timeout(200)
        body = await pg.inner_text('.main')
        check('뉴스 카드 꺼짐 표시', '알림 꺼짐' in body)
        check('기준 ±5%면 초과 태그 없음', '초과' not in body)
        check('브리핑 시간 09:00 반영', '09:00' in body)
        await pg.click('a[href="#/data"]'); await pg.wait_for_timeout(200)
        body = await pg.inner_text('.main')
        check('데이터 화면 출처 6개', await pg.locator('.src').count() == 6)
        check('토스증권 공개 API 없음 확인 필요 표기', '토스증권' in body and '확인 필요' in body)
        check('데이터 화면에서 설정 탭 활성', 'on' in (await pg.get_attribute('.tabbar a[href="#/settings"]', 'class')))

        # ---------- 5. 화면 목록 시트 ----------
        await pg.click('.strip button'); await pg.wait_for_timeout(100)
        check('화면 목록 시트 6개 링크', await pg.locator('.sheet a:not(.doc)').count() == 6)
        check('팀 문서 링크 4개', await pg.locator('.sheet a.doc').count() == 4)
        await pg.click('.sheet a[href="#/"]'); await pg.wait_for_timeout(200)
        check('시트로 시작 화면 이동', await pg.is_visible('text=목표 정하기 시작'))

        # ---------- 6. 집 사기 / 기간 모름 / 저축액 모드 / 공격형 ----------
        await pg.click('text=목표 정하기 시작'); await pg.wait_for_timeout(150)
        await pg.click('button.chip:has-text("집 사기")'); await wait_q(pg, '목표 집값은')
        await pg.click('button.chip:has-text("직접 입력")')
        check('직접 입력 칩 → 입력창 포커스', await pg.evaluate("document.activeElement && document.activeElement.id==='num'"))
        await type_num(pg, '30000')
        check('억 단위 도움말', '= 3억 원' in await pg.inner_text('#helpL'))
        await pg.press('#num', 'Enter'); await wait_q(pg, '언제까지')
        check('집 자기자본 안내(9,000만 원)', '9,000만 원이 저축 목표' in await pg.inner_text('#log'))
        await pg.click('button.chip:has-text("아직 모르겠어요")'); await wait_q(pg, '모아둔 돈')
        await type_num(pg, '2000'); await pg.press('#num', 'Enter'); await wait_q(pg, '한 달 수입은')
        await type_num(pg, '400'); await pg.press('#num', 'Enter'); await wait_q(pg, '한 달 지출은')
        await pg.click('.seg button:has-text("저축액으로 답하기")'); await pg.wait_for_timeout(100)
        await type_num(pg, '120')
        check('저축액 모드 도움말(수입의 30%)', '수입의 30%' in await pg.inner_text('#helpL'))
        await pg.press('#num', 'Enter'); await wait_q(pg, '투자 성향')
        check('저축액 모드면 저축 추가 질문 없음', '이 중 얼마를' not in await pg.inner_text('#log'))
        await pg.click('button.chip:has-text("공격형")'); await wait_q(pg, '필요한 정보는')
        await pg.click('text=추천 계획 보기'); await pg.wait_for_timeout(250)
        body = await pg.inner_text('.main')
        eq = 30000 * M * 0.3; nh = E.months_to_goal(eq, 120 * M, 2000 * M, '공격형')
        ph = E.project(120 * M, 2000 * M, nh, E.weights('공격형', nh))
        loan = 30000 * M - ph['net']; pmt = E.loan_payment(loan)
        check('집: 기간 계산 표시', f'{nh}개월 (계산)' in body, nh)
        check('집: 대출 카드 필요 대출액', won(loan) in body, won(loan))
        check('집: LTV 상한 2억 1,000만 원', '2억 1,000만 원' in body)
        check('집: 월 상환액', f'{pmt / M:.1f}만 원' in body, f'{pmt / M:.1f}')
        check('집: 수입 대비 비율 여유', f'{round(pmt / (400 * M) * 100)}%' in body and '여유' in body)
        check('집: 기간 계산 카드', '기간을 계산했어요' in body)
        check('집: 모아둔 돈 예금 배분 표기', '모아둔 돈' in body)

        # ---------- 7. 목표 없음 / 기간 모름 → 제안 ----------
        await pg.goto(URL + '#/'); await pg.wait_for_timeout(150)
        await pg.click('text=목표 정하기 시작'); await pg.wait_for_timeout(150)
        await pg.click('button.chip:has-text("그냥 재테크")'); await wait_q(pg, '얼마 동안 모을 생각이세요')
        await pg.click('button.chip:has-text("아직 모르겠어요")'); await wait_q(pg, '모아둔 돈')
        await type_num(pg, '300'); await pg.press('#num', 'Enter'); await wait_q(pg, '한 달 수입은')
        await type_num(pg, '200'); await pg.press('#num', 'Enter'); await wait_q(pg, '한 달 지출은')
        await pg.click('.seg button:has-text("저축액으로 답하기")'); await pg.wait_for_timeout(100)
        await type_num(pg, '60'); await pg.press('#num', 'Enter'); await wait_q(pg, '투자 성향')
        await pg.click('button.chip:has-text("안정형")'); await wait_q(pg, '필요한 정보는')
        await pg.click('text=추천 계획 보기'); await pg.wait_for_timeout(250)
        body = await pg.inner_text('.main')
        def sug(n): return (int(E.project(60 * M, 300 * M, n, E.weights('안정형', n))['net'] // (10 * M))) * 10 * M
        check('목표 없음: 제안 카드 3개', await pg.locator('.opt').count() == 3)
        check('목표 없음: 기본 2년 제안 금액', won(sug(24)) in body and f'제안 목표 {won(sug(24))}' in body, won(sug(24)))
        check('목표 없음: 계획대로 가능', '계획대로 가능' in body)
        await pg.click('.opt:has-text("1년 뒤")'); await pg.wait_for_timeout(200)
        body = await pg.inner_text('.main')
        nb = re.sub(r'\s+', ' ', body)
        check('목표 없음: 1년 선택 시 금액·주식 0%', won(sug(12)) in body and '주식 0%' in nb and '1년 이내' in body)

        # ---------- 8. 물건 / 12개월 / 지출 모드 → 단기 규칙 ----------
        await pg.goto(URL + '#/'); await pg.wait_for_timeout(150)
        await pg.click('text=목표 정하기 시작'); await pg.wait_for_timeout(150)
        await pg.click('button.chip:has-text("사고 싶은 물건")'); await wait_q(pg, '물건은 얼마인가요')
        await pg.click('button.chip:has-text("500만")'); await wait_q(pg, '언제까지')
        await pg.click('button.chip:has-text("1년")'); await wait_q(pg, '모아둔 돈')
        await pg.click('button.chip:has-text("없어요")'); await wait_q(pg, '한 달 수입은')
        await pg.click('button.chip:has-text("200만")'); await wait_q(pg, '한 달 지출은')
        await pg.click('button.chip:has-text("150만")'); await wait_q(pg, '이 중 얼마를')
        await pg.click('button.chip:has-text("전부 50만 원")'); await wait_q(pg, '투자 성향')
        await pg.click('button.chip:has-text("잘 모르겠어요")'); await wait_q(pg, '필요한 정보는')
        check('잘 모르겠어요 → 중립형 안내', '중립형으로 시작할게요' in await pg.inner_text('#log'))
        await pg.click('text=추천 계획 보기'); await pg.wait_for_timeout(250)
        body = await pg.inner_text('.main')
        p12 = E.project(50 * M, 0, 12, E.weights('중립형', 12))
        check('물건 12개월: 총액', won(p12['net']) in body, won(p12['net']))
        check('물건 12개월: 계획대로 가능 + 여유', '계획대로 가능' in body and f"{won(p12['net'] - 500 * M)} 여유" in body)
        nb = re.sub(r'\s+', ' ', body)
        check('물건 12개월: 적금 60% 규칙', '적금 60%' in nb and '주식 0%' in nb)
        # 기간 단축 제안
        n3 = E.months_to_goal(500 * M, 50 * M, 0, '중립형')
        check('물건: 기간 단축 제안', f'기간을 {n3}개월로 줄이기' in body, n3)

        # ---------- 9. 예시 값 버튼 / 계획 없이 브리핑 ----------
        await pg.goto(URL + '#/'); await pg.wait_for_timeout(150)
        await pg.click('text=예시 값으로 계획 화면 바로 보기'); await pg.wait_for_timeout(250)
        check('예시 값 → 계획 화면', (await pg.evaluate('location.hash')) == '#/plan' and '2,248만 원' in await pg.inner_text('.main'))
        await pg.goto(URL); await pg.wait_for_timeout(150)  # 새로고침: 상태 초기화
        await pg.goto(URL + '#/plan'); await pg.wait_for_timeout(250)
        check('계획 없이 #/plan → 대화로 보냄', (await pg.evaluate('location.hash')) == '#/chat')
        await pg.goto(URL + '#/brief'); await pg.wait_for_timeout(250)
        check('계획 없이 브리핑 → 예시 계획 문구', '예시 계획' in await pg.inner_text('.main'))

        check('콘솔·페이지 에러 없음', not errs, errs[:3])
        await b.close()
    print(f'\n{len(PASS)} passed, {len(FAIL)} failed')
    if FAIL: print('FAILED:', FAIL)

asyncio.run(main())
