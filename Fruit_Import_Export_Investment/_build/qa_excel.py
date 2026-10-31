"""QA: recalculate Financial_Model.xlsx in LibreOffice and compare every monthly value with engine.js output."""
import json, os, subprocess, sys, tempfile, openpyxl
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, '_build', 'model_output.json')))
tmp = tempfile.mkdtemp()
subprocess.run(['soffice', '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', tmp, os.path.join(ROOT, '02_Financial_Model', 'Financial_Model.xlsx')], check=True, capture_output=True, timeout=300)
wb = openpyxl.load_workbook(os.path.join(tmp, 'Financial_Model.xlsx'), data_only=True)
ws = wb['Monthly_Model']
hdr = [c.value for c in ws[5]]
M = D['base']['monthly']
pairs = {'Shipments': 'shipments', 'Revenue': 'revenue', 'COGS': 'cogs', 'Commission': 'commission', 'Overhead': 'overhead', 'EBITDA': 'ebitda',
         'Zakat': 'zakat', 'Net income': 'netIncome', 'Collections': 'collections', 'Supplier payments': 'supplierPayments', 'Dividends': 'dividends',
         'Cash': 'cash', 'AR': 'ar', 'Inventory': 'inventory', 'AP & accruals': 'ap', 'Retained earnings': 'retained', 'CFO': 'cfo'}
worst = 0; fails = []
for xl, js in pairs.items():
    ci = hdr.index(xl)
    for i in range(60):
        v = ws.cell(row=6 + i, column=ci + 1).value or 0
        d = abs(v - M[js][i])
        worst = max(worst, d)
        if d > 0.01: fails.append((xl, i + 1, v, M[js][i]))
errs = []
for sh in wb.worksheets:
    for row in sh.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith('#') and c.value[1:4].isupper(): errs.append((sh.title, c.coordinate, c.value))
ret = wb['Returns']
xl_metrics = {ret.cell(row=r, column=1).value: ret.cell(row=r, column=2).value for r in range(12, 26)}
BM = D['base']['metrics']
for label, key in (('IRR — book exit (A)', 'irrBook'), ('IRR — multiple exit (B)', 'irrExit'), ('NPV @ discount rate — A', 'npvBook'), ('5-year cumulative net income', 'totalNI5y'),
                   ('Cash payback month (cum. pre-financing FCF ≥ capital)', 'cashPaybackMonth'), ('Distribution payback month (cum. dividends ≥ capital)', 'distributionPaybackMonth'),
                   ('First month with positive EBITDA', 'ebitdaBreakEvenMonth'), ('Minimum month-end cash', 'minCash')):
    xv = xl_metrics.get(label); ev = BM[key]
    if xv is None or abs(xv - ev) > 1e-6 * max(1, abs(ev)): fails.append(('returns', label, xv, ev))
checks = [(r[0].value, r[1].value) for r in wb['Checks'].iter_rows(min_row=5, max_row=13)]
# scenario switch test: set selector to 1 and 3, recalc, compare 5y NI and closing cash with engine scenarios
scen_res = {}
for sel, key in ((1, 'conservative'), (3, 'optimistic')):
    w = openpyxl.load_workbook(os.path.join(ROOT, '02_Financial_Model', 'Financial_Model.xlsx'))
    w['Assumptions']['C3'] = sel
    t2 = tempfile.mkdtemp(); src = os.path.join(t2, 'in.xlsx'); w.save(src)
    subprocess.run(['soffice', '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', os.path.join(t2, 'o'), src], check=True, capture_output=True, timeout=300)
    w2 = openpyxl.load_workbook(os.path.join(t2, 'o', 'in.xlsx'), data_only=True)['Monthly_Model']
    ni = sum((w2.cell(row=6 + i, column=hdr.index('Net income') + 1).value or 0) for i in range(60))
    cash = w2.cell(row=65, column=hdr.index('Cash') + 1).value
    e = D['scenarios'][key]['metrics']
    scen_res[key] = {'excel_NI5y': ni, 'engine_NI5y': e['totalNI5y'], 'excel_end_cash': cash, 'engine_end_cash': e['endCash']}
    if abs(ni - e['totalNI5y']) > 1 or abs(cash - e['endCash']) > 1: fails.append(('scenario', key, ni, e['totalNI5y']))
res = {'returns_vs_engine': {k: v for k, v in xl_metrics.items() if k}, 'scenario_switch': scen_res, 'cells_compared': len(pairs) * 60, 'max_abs_diff_SAR': worst, 'mismatches': fails[:10], 'formula_errors': errs[:20], 'checks': checks}
print(json.dumps(res, ensure_ascii=False, indent=1))
json.dump(res, open(os.path.join(ROOT, '_build', 'qa_excel_result.json'), 'w'), ensure_ascii=False, indent=1)
sys.exit(1 if fails or errs or not all(c[1] is True for c in checks) else 0)
