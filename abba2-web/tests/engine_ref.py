"""머니브리핑(가칭) 시안 계산 엔진 — 파이썬 독립 구현 (HTML JS 엔진 검증용)
단위: 원. 입력은 만 원 단위를 ×10000 해서 넘긴다.
"""
RATES = {"적금": 0.035, "예금": 0.032, "채권": 0.040, "주식": 0.075}
TAX = 0.154
KEYS = ["적금", "예금", "채권", "주식"]
BASE = {"안정형": [50, 30, 15, 5], "중립형": [35, 15, 20, 30], "공격형": [20, 10, 15, 55]}
LTV = 0.70
LOAN_RATE = 0.040
LOAN_YEARS = 30


def weights(risk, months):
    w = list(BASE[risk])
    if months is not None and months <= 12:
        return [60, 35, 5, 0]
    if months is not None and months <= 36 and w[3] > 35:
        w[2] += w[3] - 35
        w[3] = 35
    return w


def project(saving, lump, n, w):
    wf = [x / 100 for x in w]
    lw = [0, wf[0] + wf[1], wf[2], wf[3]]
    rows = []
    for k, key in enumerate(KEYS):
        d = saving * wf[k]
        L = lump * lw[k]
        r = RATES[key]
        if key == "적금":
            principal = d * n + L
            gross = d * n + d * (r / 12) * n * (n + 1) / 2 + L  # L은 0
        else:
            i = r / 12
            fv_m = d * (((1 + i) ** n - 1) / i) if d else 0
            fv_l = L * (1 + i) ** n
            principal = d * n + L
            gross = fv_m + fv_l
        net = principal + (gross - principal) * (1 - TAX)
        rows.append({"key": key, "w": w[k], "monthly": d, "lump": L, "principal": principal, "gross": gross, "net": net})
    principal = sum(r["principal"] for r in rows)
    net = sum(r["net"] for r in rows)
    return {"rows": rows, "principal": principal, "net": net, "gain": net - principal}


def months_to_goal(goal, saving, lump, risk):
    for n in range(1, 601):
        if project(saving, lump, n, weights(risk, n))["net"] >= goal:
            return n
    return None


def required_saving(goal, n, lump, risk):
    w = weights(risk, n)
    lump_net = project(0, lump, n, w)["net"]
    unit = project(1, 0, n, w)["net"]
    return max(0, (goal - lump_net) / unit)


def loan_payment(principal, rate=LOAN_RATE, years=LOAN_YEARS):
    i = rate / 12
    n = years * 12
    return principal * i / (1 - (1 + i) ** (-n))


def blend_rate(w):
    return sum(w[k] / 100 * RATES[KEYS[k]] for k in range(4))


if __name__ == "__main__":
    M = 10000
    # 예시 1: 목돈 3,000만 / 24개월 / 모아둔 0 / 저축 90만 / 중립형
    w = weights("중립형", 24)
    p = project(90 * M, 0, 24, w)
    print("weights", w, "blend %.3f%%" % (blend_rate(w) * 100))
    for r in p["rows"]:
        print(" ", r["key"], r["w"], "monthly %.1f만" % (r["monthly"] / M), "principal %.1f만" % (r["principal"] / M), "net %.2f만" % (r["net"] / M), "gain %.2f만" % ((r["net"] - r["principal"]) / M))
    print("principal %.1f만 net %.1f만 gain %.1f만" % (p["principal"] / M, p["net"] / M, p["gain"] / M))
    print("short %.1f만" % ((3000 * M - p["net"]) / M))
    print("months_to_goal 3000만 @90만:", months_to_goal(3000 * M, 90 * M, 0, "중립형"))
    print("required_saving 3000만/24m: %.1f만" % (required_saving(3000 * M, 24, 0, "중립형") / M))
    # 안정형/공격형 비교
    for risk in ["안정형", "중립형", "공격형"]:
        ww = weights(risk, 24)
        pp = project(90 * M, 0, 24, ww)
        print(risk, ww, "net %.1f만" % (pp["net"] / M))
    # 예시 2: 집 3억 / 기간 모름 / 모은 2,000만 / 저축 120만 / 공격형
    equity = 30000 * M * (1 - LTV)
    n = months_to_goal(equity, 120 * M, 2000 * M, "공격형")
    print("house equity target %.0f만, months:" % (equity / M), n)
    pp = project(120 * M, 2000 * M, n, weights("공격형", n))
    loan = 30000 * M - pp["net"]
    print("loan %.0f만 pmt %.1f만/월 ratio vs 400만 %.1f%%" % (loan / M, loan_payment(loan) / M, loan_payment(loan) / (400 * M) * 100))
    # 예시 3: 목표 없음 / 저축 60만 / 모은 300만 / 안정형 → 1·2·3년 제안
    for n in (12, 24, 36):
        pp = project(60 * M, 300 * M, n, weights("안정형", n))
        print("no-goal %d개월 net %.1f만" % (n, pp["net"] / M))
    # 단기 12개월 규칙
    print("weights 12m 공격형", weights("공격형", 12))
    # 고금리 상품 갈아타기 차액(세전): 적금 월 31.5만, 24개월, +0.8%p
    d = 90 * M * 0.35
    print("extra interest %.2f만" % (d * (0.008 / 12) * 24 * 25 / 2 / M))
