"""Builds 02_Financial_Model/Financial_Model.xlsx (live formulas mirroring engine.js)
and 05_Documentation/Assumptions_Register.xlsx from _build/model_output.json."""
import json, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.utils import get_column_letter as L
from openpyxl.formatting.rule import CellIsRule

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, '_build', 'model_output.json'), encoding='utf-8'))
P = D['params']
SC = ['conservative', 'base', 'optimistic']

GREEN = '0F3D2E'; EMER = '1F7A5A'; GOLD = 'C9A24B'; BEIGE = 'F4EEE2'; WARM = 'FBF8F2'; CHAR = '23272A'
HDR = PatternFill('solid', fgColor=GREEN); SUB = PatternFill('solid', fgColor=BEIGE); INP = PatternFill('solid', fgColor='FFF6D9')
CHK = PatternFill('solid', fgColor='E6F4EC'); thin = Side(style='thin', color='D9D2C3')
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
WF = Font(color='FFFFFF', bold=True, name='Calibri'); BF = Font(bold=True, name='Calibri'); BLUE = Font(color='1F4E9C', name='Calibri')
SAR = '#,##0;[Red](#,##0);"-"'; SAR2 = '#,##0.00;[Red](#,##0.00);"-"'; PCT = '0.0%;[Red]-0.0%'; NUM1 = '0.0'


def title(ws, text, sub=None):
    ws['A1'] = text; ws['A1'].font = Font(bold=True, size=15, color=GREEN)
    if sub: ws['A2'] = sub; ws['A2'].font = Font(italic=True, size=9, color='6B6B6B')
    ws.sheet_view.showGridLines = False


def header(ws, row, labels, col=1):
    for i, t in enumerate(labels):
        c = ws.cell(row=row, column=col + i, value=t); c.fill = HDR; c.font = WF
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = BOX


def g(p, path):
    for k in path.split('.'): p = p[k]
    return p

# ------------------------------------------------------------------ assumptions catalogue
# name, json path, arabic, english, unit, source, confidence, note
A = [
    ('sec', 'Shipment / unit economics — بيانات الشحنة'),
    ('cartons', 'shipment.cartonsPerContainer', 'عدد الكراتين في البراد', 'Cartons per container', 'carton', 'IMAGE', 'High', 'Image: الكرتون 1700'),
    ('cartonKg', 'shipment.cartonKg', 'وزن الكرتون', 'Carton net weight', 'kg', 'CLIENT', 'High', 'Client: 13–14 kg carton ⇒ ~23 t packed vs 32 t bought (pack-out ≈72%)'),
    ('tons', 'shipment.tonsPerContainer', 'الموز المشترى للبراد (وزن حقل)', 'Bananas bought per container (field weight)', 'ton', 'IMAGE', 'High', 'Image: 32 طن موز (Sudan)'),
    ('buyPrice', 'shipment.buyPricePerTon', 'سعر شراء الطن', 'Purchase price per tonne', 'SAR/t', 'IMAGE (derived)', 'High', '20,400 ÷ 32 = 637.5'),
    ('fx', 'shipment.fxEGPperSAR', 'سعر الصرف جنيه/ريال', 'FX rate EGP per SAR', 'EGP/SAR', 'ASSUMPTION (market)', 'Medium', 'Image implies 14.90; Oct-2026 ~52.4 EGP/USD ÷ 3.75 ≈ 14.0'),
    ('treatment', 'shipment.treatment', 'مواد المعالجة', 'Treatment materials', 'SAR', 'IMAGE', 'High', '2 litres'),
    ('labor', 'shipment.labor', 'العمالة (السودان)', 'Labour (Sudan)', 'SAR', 'IMAGE', 'High', 'Image: العمالة / السودان'),
    ('coordination', 'shipment.coordination', 'تنسيق/وكيل في السودان', 'Sudan agent / coordination', 'SAR', 'ASSUMPTION', 'Low', 'Per shipment'),
    ('freight', 'shipment.freight', 'شحن البراد', 'Reefer freight Sudan → Jeddah', 'SAR', 'IMAGE', 'High', 'Port Sudan → Jeddah; get 3 forwarder quotes'),
    ('clearance', 'shipment.clearance', 'تصديق/تخليص/ترحيل', 'Certification, clearance, transfer', 'SAR', 'IMAGE', 'High', ''),
    ('dutyRate', 'shipment.dutyRate', 'نسبة الرسوم الجمركية', 'Customs duty rate', '%', 'ASSUMPTION (GAFTA)', 'Medium', 'GAFTA exempts Arab-origin agri goods; requires certificate of origin'),
    ('localTransport', 'shipment.localTransport', 'نقل داخلي في جدة', 'Local transport (Jeddah)', 'SAR', 'ASSUMPTION', 'Low', 'Not in image'),
    ('ripening', 'shipment.ripeningStorage', 'غرف إنضاج وتبريد', 'Ripening rooms & cold storage', 'SAR', 'ASSUMPTION', 'Low', 'Not in image; bananas need controlled ripening'),
    ('insRate', 'shipment.cargoInsuranceRate', 'تأمين البضاعة', 'Cargo insurance rate', '%', 'ASSUMPTION', 'Medium', 'of fruit+packaging+freight'),
    ('commRate', 'shipment.salesCommissionRate', 'عمولة البيع', 'Sales commission rate', '%', 'ASSUMPTION', 'Low', 'Wholesale market agent'),
    ('spoilage', 'shipment.spoilageRate', 'نسبة التلف', 'Spoilage / unsold rate', '%', 'ASSUMPTION', 'Medium', 'Image assumes 0%'),
    ('sellPrice', 'shipment.sellPricePerCarton', 'سعر بيع الكرتون', 'Selling price per carton', 'SAR', 'IMAGE', 'Medium', 'Image: 50 — validate with buyer LOIs'),
    ('delayCost', 'shipment.delayStorageCostPerDay', 'تكلفة يوم التأخير', 'Cost per day of delay', 'SAR/day', 'ASSUMPTION', 'Low', ''),
    ('spoilPerDay', 'shipment.spoilagePerDelayDay', 'تلف إضافي لكل يوم تأخير', 'Extra spoilage per delay day', '%', 'ASSUMPTION', 'Low', ''),
    ('sec', 'Packaging bill of materials (Egypt, EGP ex-factory) — مواد التعبئة'),
    ('pkCarton', 'packaging.cartonPriceEGP', 'سعر الكرتون', 'Carton price', 'EGP', 'CLIENT', 'High', 'أرض مصنع'),
    ('pkBagKg', 'packaging.bagPriceEGPperKg', 'سعر كيلو الأكياس', 'Bags price per kg', 'EGP/kg', 'CLIENT', 'High', 'أرض مصنع'),
    ('pkBagsPerKg', 'packaging.bagsPerKg', 'عدد الأكياس في الكيلو', 'Bags per kg', 'bags', 'CLIENT', 'Medium', 'تقريباً 40'),
    ('pkBagsPerCarton', 'packaging.bagsPerCarton', 'أكياس لكل كرتون', 'Bags per carton (incl. spare)', 'bags', 'IMAGE (derived)', 'Medium', '45 kg × 40 ÷ 1,700 ≈ 1.06'),
    ('pkFoamRoll', 'packaging.foamRollPriceEGP', 'سعر لفة الفوم', 'Foam roll price (100cm×100m, 2mm)', 'EGP', 'CLIENT', 'High', ''),
    ('pkFoamPcsRoll', 'packaging.foamPiecesPerRoll', 'قطع فوم لكل لفة', 'Foam pieces per roll (50×30 cm)', 'pcs', 'CLIENT', 'High', '666'),
    ('pkFoamPcsCarton', 'packaging.foamPiecesPerCarton', 'قطع فوم لكل كرتون', 'Foam pieces per carton', 'pcs', 'IMAGE (derived)', 'Low', '15 rolls × 666 ÷ 1,700 ≈ 5.9 — confirm'),
    ('pkCornerM', 'packaging.cornerPaperEGPperM', 'سعر متر الزوايا', 'Corner paper per metre', 'EGP/m', 'CLIENT', 'High', ''),
    ('pkCornerMeters', 'packaging.cornerPaperMeters', 'أمتار الزوايا للبراد', 'Corner paper metres per reefer', 'm', 'CLIENT', 'High', '250'),
    ('pkStrapTon', 'packaging.strapEGPperTon', 'سعر طن الشريط', 'Plastic strap per tonne', 'EGP/t', 'CLIENT', 'High', '27,000'),
    ('pkStrapKg', 'packaging.strapKg', 'كيلو الشريط للبراد', 'Strap kg per reefer', 'kg', 'CLIENT', 'Medium', '≈20 kg roll'),
    ('pkClipKg', 'packaging.clipEGPperKg', 'سعر كيلو الكلبسات', 'Steel clips per kg', 'EGP/kg', 'CLIENT', 'High', '45 (image showed 68)'),
    ('pkClipQty', 'packaging.clipKg', 'كيلو الكلبسات للبراد', 'Clips kg per reefer', 'kg', 'CLIENT', 'Medium', '≈1 kg'),
    ('pkTransport', 'packaging.transportEGP', 'نقل المواد من مصر للسودان', 'Packaging transport Egypt → Sudan', 'EGP', 'IMAGE', 'Medium', 'النقل من مصري / وأخرى'),
    ('sec', 'Volume plan — خطة الكميات'),
    ('launch', 'volume.launchMonth', 'شهر أول شحنة', 'Launch month', 'month#', 'ASSUMPTION', 'Medium', 'Months 1–2 setup & licensing'),
    ('startC', 'volume.startContainers', 'شحنات أول شهر', 'Containers in launch month', 'cont/mo', 'ASSUMPTION', 'Medium', ''),
    ('y1Target', 'volume.y1TargetContainers', 'شحنات شهرياً نهاية السنة 1', 'Run-rate at month 12', 'cont/mo', 'ASSUMPTION', 'Medium', 'Before seasonality'),
    ('growth', 'volume.monthlyGrowth', 'نمو شهري بعد السنة 1', 'Monthly growth after Y1', '%', 'ASSUMPTION', 'Low', ''),
    ('maxC', 'volume.maxContainers', 'سقف الشحنات الشهرية', 'Max containers per month', 'cont/mo', 'ASSUMPTION', 'Medium', 'Operational capacity cap'),
    ('cashConstrained', 'volume.cashConstrained', 'الشحن حسب الكاش المتوفر', 'Shipments capped by available cash (TRUE/FALSE)', 'flag', 'POLICY', '-', 'Keeps month-end cash ≥ reserve'),
    ('volShock', 'shocks.volumeChange', 'صدمة الكمية', 'Volume shock', '%', 'SENSITIVITY', '-', ''),
    ('buyShock', 'shocks.buyPriceChange', 'صدمة سعر الشراء', 'Purchase price shock', '%', 'SENSITIVITY', '-', ''),
    ('sellShock', 'shocks.sellPriceChange', 'صدمة سعر البيع', 'Selling price shock', '%', 'SENSITIVITY', '-', ''),
    ('freightShock', 'shocks.freightChange', 'صدمة الشحن', 'Freight shock', '%', 'SENSITIVITY', '-', ''),
    ('sec', 'Cycle timing (days) — دورة العمليات'),
    ('prepDays', 'timing.prepDays', 'تجهيز وتحميل ونقل لبورتسودان', 'Packing, loading & trucking to Port Sudan', 'days', 'ASSUMPTION', 'Medium', 'Sennar/Kassala → Port Sudan'),
    ('transitDays', 'timing.transitDays', 'الشحن', 'Sea transit', 'days', 'ASSUMPTION', 'Medium', 'Port Sudan → Jeddah ≈1 day sailing + port'),
    ('clearDays', 'timing.clearanceDays', 'التخليص', 'Clearance', 'days', 'ASSUMPTION', 'Medium', ''),
    ('ripenDays', 'timing.ripeningDays', 'الإنضاج', 'Ripening', 'days', 'ASSUMPTION', 'Medium', ''),
    ('sellDays', 'timing.sellingDays', 'البيع', 'Selling', 'days', 'ASSUMPTION', 'Medium', ''),
    ('delayDays', 'timing.extraDelayDays', 'تأخير إضافي', 'Extra shipping delay', 'days', 'SENSITIVITY', '-', ''),
    ('custDays', 'timing.customerDays', 'مدة تحصيل العملاء', 'Customer payment terms', 'days', 'ASSUMPTION', 'Low', 'Mix of cash market & supermarket credit'),
    ('suppDays', 'timing.supplierDays', 'مدة السداد للمورد', 'Supplier payment terms', 'days', 'ASSUMPTION', 'Medium', 'Cash on loading'),
    ('sec', 'Overheads (monthly SAR) — المصاريف الثابتة'),
    ('salaries', 'overhead.salaries', 'الرواتب', 'Salaries', 'SAR/mo', 'ASSUMPTION', 'Medium', 'Founder 5k + ops/sales 3.5k (lean)'),
    ('benefits', 'overhead.benefitsRate', 'تأمينات ومزايا', 'GOSI & benefits', '%', 'ASSUMPTION', 'Medium', ''),
    ('rent', 'overhead.rent', 'إيجار مكتب', 'Office rent', 'SAR/mo', 'ASSUMPTION', 'Medium', ''),
    ('utilIT', 'overhead.utilitiesIT', 'اتصالات وأنظمة', 'Utilities, telecom, software', 'SAR/mo', 'ASSUMPTION', 'Medium', ''),
    ('marketing', 'overhead.marketing', 'تسويق', 'Marketing', 'SAR/mo', 'ASSUMPTION', 'Medium', ''),
    ('travel', 'overhead.travel', 'سفر', 'Travel (sourcing visits)', 'SAR/mo', 'ASSUMPTION', 'Medium', ''),
    ('insurance', 'overhead.insurance', 'تأمين عام', 'General insurance', 'SAR/mo', 'ASSUMPTION', 'Medium', ''),
    ('profFees', 'overhead.professionalFees', 'أتعاب مهنية', 'Audit/legal/zakat fees', 'SAR/mo', 'ASSUMPTION', 'Medium', ''),
    ('misc', 'overhead.misc', 'متفرقات', 'Bank & misc', 'SAR/mo', 'ASSUMPTION', 'Medium', ''),
    ('preFactor', 'overhead.preLaunchFactor', 'نسبة المصاريف قبل الإطلاق', 'Pre-launch overhead factor', '%', 'ASSUMPTION', 'Medium', ''),
    ('ohGrowth', 'overhead.annualGrowth', 'نمو سنوي للمصاريف', 'Annual overhead growth', '%', 'ASSUMPTION', 'Medium', 'Inflation + hiring'),
    ('sec', 'One-time, CAPEX & deposits — التأسيس والأصول'),
    ('establish', 'oneTime.establishment', 'تأسيس وتراخيص', 'Establishment & licensing', 'SAR', 'ASSUMPTION', 'Medium', 'Sole establishment: CR, chamber, Balady, MEWA licence, SFDA'),
    ('launchMkt', 'oneTime.launchMarketing', 'تسويق الإطلاق', 'Launch marketing', 'SAR', 'ASSUMPTION', 'Medium', ''),
    ('officeIT', 'capex.officeIT', 'أثاث وتقنية', 'Office & IT', 'SAR', 'ASSUMPTION', 'Medium', ''),
    ('equipment', 'capex.equipment', 'معدات', 'Equipment (pallet jack, loggers)', 'SAR', 'ASSUMPTION', 'Medium', ''),
    ('strapEGP', 'capex.strappingMachineEGP', 'مكنة شد (جنيه)', 'Strapping machine (EGP)', 'EGP', 'IMAGE', 'High', 'Reclassified from per-shipment cost'),
    ('life', 'capex.usefulLifeYears', 'العمر الإنتاجي', 'Useful life', 'years', 'ASSUMPTION', 'Medium', ''),
    ('suppDeposit', 'deposits.supplierDeposit', 'تأمين لدى المورد', 'Supplier deposit', 'SAR', 'ASSUMPTION', 'Low', 'Refundable'),
    ('sec', 'Finance — التمويل والعوائد'),
    ('capital', 'finance.initialInvestment', 'رأس المال المستثمر', 'Initial investment', 'SAR', 'CLIENT', 'High', 'Fixed by client at SAR 100,000'),
    ('discount', 'finance.discountRate', 'معدل الخصم', 'Discount rate (NPV)', '%', 'ASSUMPTION', 'Medium', 'SME + Sudan country-risk premium'),
    ('payout', 'finance.payoutRatio', 'نسبة توزيع الأرباح', 'Dividend payout ratio', '%', 'POLICY', '-', 'Of prior-year net profit, subject to reserve'),
    ('divMonth', 'finance.dividendMonth', 'شهر التوزيع', 'Dividend month (of year)', 'month', 'POLICY', '-', 'After year-end close'),
    ('zakat', 'finance.zakatRate', 'نسبة الزكاة', 'Zakat rate', '%', 'REGULATION (simplified)', 'Medium', 'Simplified base: equity − fixed assets − deposits'),
    ('exitMult', 'finance.exitMultipleNI', 'مضاعف التخارج', 'Exit multiple on Y5 net profit', 'x', 'ASSUMPTION', 'Low', ''),
    ('resMonths', 'finance.reserveMonthsOverhead', 'احتياطي (أشهر مصاريف)', 'Reserve months of overhead', 'months', 'POLICY', '-', ''),
    ('resCont', 'finance.reserveContainers', 'احتياطي (حاويات)', 'Reserve containers', 'cont', 'POLICY', '-', ''),
]
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

wb = Workbook()
# ------------------------------------------------------------------ Cover
ws = wb.active; ws.title = 'Cover'
title(ws, 'Fresh Fruit Import — Financial Model (Sudanese bananas → Jeddah)', 'نموذج مالي متكامل لمدة 5 سنوات — شهري للسنة الأولى، ربع سنوي وسنوي للسنوات التالية')
rows = [
    ('How to use', 'Change the yellow cells in "Assumptions". Pick the scenario in Assumptions!C3 (1 Conservative, 2 Base, 3 Optimistic).'),
    ('Engine', 'Monthly_Model mirrors 01_Investor_Pitch_Deck/engine.js formula-for-formula. QA recalculates this file and compares to the engine.'),
    ('Capital', 'Initial investment fixed at SAR 100,000. Shipments are capped each month by available cash (Monthly_Model "Cap" column) so month-end cash stays ≥ the reserve.'),
    ('Currency', 'SAR, excluding VAT (VAT 15% is a pass-through; its cash timing is not modelled — see audit report).'),
    ('Timing', 'Flows that occur N days after purchase are split between month INT(N/30) and the next month (linear lag).'),
    ('Status', 'Planning model. Not audited. No figure is a guarantee of return.'),
    ('Sheets', 'Extracted_Data · Assumptions · Unit_Economics · Monthly_Model · Quarterly · Annual_Statements · Returns · Capital_Cycle · Scenarios · Sensitivity · Checks'),
]
for i, (a, b) in enumerate(rows):
    ws.cell(row=4 + i, column=1, value=a).font = BF; ws.cell(row=4 + i, column=2, value=b)
ws.column_dimensions['A'].width = 14; ws.column_dimensions['B'].width = 130

# ------------------------------------------------------------------ Extracted data
ws = wb.create_sheet('Extracted_Data')
title(ws, 'Extracted Project Information — البيانات المستخرجة من الصورة', 'Source: client image (packaging table in EGP, reefer cost table in SAR). Values transcribed exactly; checks recomputed.')
header(ws, 4, ['Item (AR)', 'Qty', 'Unit price', 'Total (as shown)', 'Currency', 'Recomputed', 'Diff', 'Confidence', 'Notes'])
ext = [
    ('الكرتون', 1700, 44, 74800, 'EGP', 'High', ''),
    ('الكيس / كيلو', 45, 110, 4950, 'EGP', 'High', 'Plastic bags by kg'),
    ('الفوم / كيلو', 15, 430, 6450, 'EGP', 'High', ''),
    ('ورق تثبيت / كيلو', 250, 24, 6000, 'EGP', 'High', 'Wrapping/fixing paper'),
    ('شريط', 20, 27, 540, 'EGP', 'High', 'Tape rolls'),
    ('كلبس / كيلو', 1.5, 68, 102, 'EGP', 'High', 'Client update: 45 EGP/kg, ≈1 kg per reefer (model uses 45)'),
    ('مكنة شد', 1, 7000, 7000, 'EGP', 'High', 'One-off asset → reclassified to CAPEX in model'),
    ('النقل من مصري / وأخرى', None, None, 15000, 'EGP', 'High', 'Transport of packaging from Egypt to Sudan (client clarified)'),
]
r = 5
for it in ext:
    ws.cell(row=r, column=1, value=it[0]); ws.cell(row=r, column=2, value=it[1]); ws.cell(row=r, column=3, value=it[2])
    ws.cell(row=r, column=4, value=it[3]); ws.cell(row=r, column=5, value=it[4])
    ws.cell(row=r, column=6, value=f'=IF(B{r}="",D{r},B{r}*C{r})'); ws.cell(row=r, column=7, value=f'=F{r}-D{r}')
    ws.cell(row=r, column=8, value=it[5]); ws.cell(row=r, column=9, value=it[6]); r += 1
ws.cell(row=r, column=1, value='اجمالي مواد التعبئة بالجنيه المصري').font = BF; ws.cell(row=r, column=4, value=114842); ws.cell(row=r, column=5, value='EGP')
ws.cell(row=r, column=6, value=f'=SUM(F5:F{r-1})'); ws.cell(row=r, column=7, value=f'=F{r}-D{r}'); ws.cell(row=r, column=8, value='High'); pk = r; r += 1
ws.cell(row=r, column=1, value='اجمالي مواد التعبئة بالريال السعودي').font = BF; ws.cell(row=r, column=4, value=7707.52); ws.cell(row=r, column=5, value='SAR')
ws.cell(row=r, column=6, value=f'=F{pk}/14.9'); ws.cell(row=r, column=7, value=f'=F{r}-D{r}'); ws.cell(row=r, column=8, value='High'); ws.cell(row=r, column=9, value='Implied FX = 114,842 / 7,707.52 = 14.90 EGP per SAR'); r += 2
header(ws, r, ['Reefer (البراد) — SAR', 'Qty', 'Unit', 'Total (as shown)', 'Currency', 'Recomputed', 'Diff', 'Confidence', 'Notes']); r += 1
b0 = r
brad = [('32 طن موز (السودان)', 32, 'ton', 20400, 'High', '637.5 SAR/ton; bought in Sudan'), ('مواد المعالجة 2 لتر', 2, 'litre', 350, 'High', 'Treatment (likely ripening/anti-fungal)'),
        ('العمالة / السودان', None, '', 500, 'High', 'Labour in Sudan'), ('شحن البراد', 1, 'trip', 16000, 'High', 'Reefer freight'),
        ('تصديق استيراد/تخليص/ترحيل', 1, '', 6000, 'High', 'Import certification, clearance, transfer'), ('اجمالي مواد التعبئة بالريال', None, '', 7707.52, 'High', 'From packaging table')]
for it in brad:
    ws.cell(row=r, column=1, value=it[0]); ws.cell(row=r, column=2, value=it[1]); ws.cell(row=r, column=3, value=it[2]); ws.cell(row=r, column=4, value=it[3])
    ws.cell(row=r, column=5, value='SAR'); ws.cell(row=r, column=6, value=f'=D{r}'); ws.cell(row=r, column=8, value=it[4]); ws.cell(row=r, column=9, value=it[5]); r += 1
ws.cell(row=r, column=1, value='تكلفة البراد واصل جدة').font = BF; ws.cell(row=r, column=4, value=50957.52); ws.cell(row=r, column=6, value=f'=SUM(F{b0}:F{r-1})'); ws.cell(row=r, column=7, value=f'=F{r}-D{r}'); tot = r; r += 1
ws.cell(row=r, column=1, value='سعر الكرتون واصل').font = BF; ws.cell(row=r, column=4, value=29.98); ws.cell(row=r, column=6, value=f'=F{tot}/1700'); ws.cell(row=r, column=7, value=f'=F{r}-D{r}'); ws.cell(row=r, column=9, value='Rounded in image (29.975)'); r += 1
ws.cell(row=r, column=1, value='سعر بيع الكرتون').font = BF; ws.cell(row=r, column=4, value=50); ws.cell(row=r, column=6, value=50); sp = r; r += 1
ws.cell(row=r, column=1, value='صافي الربح (كما في الصورة)').font = BF; ws.cell(row=r, column=4, value=34042.48); ws.cell(row=r, column=6, value=f'=1700*F{sp}-F{tot}'); ws.cell(row=r, column=7, value=f'=F{r}-D{r}')
ws.cell(row=r, column=9, value='Per-shipment contribution BEFORE overheads, spoilage, local costs, commission — NOT net profit'); r += 2
ws.cell(row=r, column=1, value='Not in image (must be assumed): capital, supplier names, customers, overheads, payment terms, cycle times, spoilage, local distribution, ripening, insurance, duty, FX today, seasonality, demand.').font = Font(italic=True, color='9C2A2A')
for col, w in zip('ABCDEFGHI', [34, 8, 11, 16, 9, 14, 8, 11, 70]): ws.column_dimensions[col].width = w
for row in ws.iter_rows(min_row=5, max_row=r, min_col=3, max_col=7):
    for c in row: c.number_format = SAR2

# ------------------------------------------------------------------ Assumptions
ws = wb.create_sheet('Assumptions')
title(ws, 'Assumptions — الافتراضات (yellow = editable input)', 'Active column feeds every sheet. Sources: IMAGE = extracted; ASSUMPTION = analyst estimate to be verified; POLICY = management choice.')
ws['A3'] = 'Active scenario (1=Conservative, 2=Base, 3=Optimistic)'; ws['A3'].font = BF
ws['C3'] = 2; ws['C3'].fill = INP; ws['C3'].font = Font(bold=True, color='1F4E9C', size=12); ws['D3'] = '=CHOOSE(C3,"Conservative","Base Case","Optimistic")'
wb.defined_names['ScenarioSel'] = DefinedName('ScenarioSel', attr_text='Assumptions!$C$3')
header(ws, 5, ['Key', 'البند', 'Item', 'Unit', 'Conservative', 'Base', 'Optimistic', 'ACTIVE', 'Source', 'Confidence', 'Notes'])
r = 6; NAMES = {}
for a in A:
    if a[0] == 'sec':
        ws.cell(row=r, column=1, value=a[1]).font = Font(bold=True, color=GREEN)
        for c in range(1, 12): ws.cell(row=r, column=c).fill = SUB
        r += 1; continue
    key, path, ar, en, unit, src, conf, note = a
    ws.cell(row=r, column=1, value=key); ws.cell(row=r, column=2, value=ar); ws.cell(row=r, column=3, value=en); ws.cell(row=r, column=4, value=unit)
    for j, sc in enumerate(SC):
        v = g(P[sc], path); c = ws.cell(row=r, column=5 + j, value=v); c.fill = INP; c.font = BLUE
        c.number_format = PCT if unit == '%' else ('#,##0.00' if isinstance(v, float) and v < 1000 and v != int(v) else '#,##0')
    c = ws.cell(row=r, column=8, value=f'=CHOOSE(ScenarioSel,E{r},F{r},G{r})'); c.font = BF; c.number_format = ws.cell(row=r, column=6).number_format
    ws.cell(row=r, column=9, value=src); ws.cell(row=r, column=10, value=conf); ws.cell(row=r, column=11, value=note)
    wb.defined_names[key] = DefinedName(key, attr_text=f'Assumptions!$H${r}'); NAMES[key] = r; r += 1
# seasonality
r += 1; ws.cell(row=r, column=1, value='Seasonality index (supply/quality) — مؤشر الموسمية').font = Font(bold=True, color=GREEN)
for c in range(1, 12): ws.cell(row=r, column=c).fill = SUB
r += 1; s0 = r
for i, mname in enumerate(MONTHS):
    ws.cell(row=r, column=1, value=f'season_{i+1}'); ws.cell(row=r, column=3, value=mname); ws.cell(row=r, column=4, value='index')
    for j, sc in enumerate(SC):
        c = ws.cell(row=r, column=5 + j, value=P[sc]['volume']['seasonality'][i]); c.fill = INP; c.font = BLUE
    ws.cell(row=r, column=8, value=f'=CHOOSE(ScenarioSel,E{r},F{r},G{r})').font = BF
    ws.cell(row=r, column=9, value='ASSUMPTION'); ws.cell(row=r, column=10, value='Low'); ws.cell(row=r, column=11, value='Verify Egyptian banana harvest calendar with growers'); r += 1
wb.defined_names['Seasonality'] = DefinedName('Seasonality', attr_text=f'Assumptions!$H${s0}:$H${r-1}')
ws.cell(row=r + 1, column=1, value='Model start: January 2027 (Month 1). Changing the start month is supported by the engine only.').font = Font(italic=True)
for col, w in zip('ABCDEFGHIJK', [14, 30, 40, 9, 13, 13, 13, 13, 20, 11, 60]): ws.column_dimensions[col].width = w
ws.freeze_panes = 'E6'

# ------------------------------------------------------------------ Unit economics
ws = wb.create_sheet('Unit_Economics')
title(ws, 'Unit Economics — اقتصاديات الشحنة الواحدة (Sudanese bananas → Jeddah, KSA; packaging from Egypt)', 'One 40ft reefer / truck shipment. Image figures vs model (with missing costs added).')
header(ws, 4, ['Line', 'البند', 'Model (active)', 'Per carton', 'Image', 'Payment lag (days)', 'Name'])
U = [
    ('Fruit', 'الموز', '=tons*buyPrice*(1+buyShock)', 20400, '=suppDays', 'u_fruit'),
    ('Packaging (BOM below)', 'مواد التعبئة (التفصيل أدناه)', '=pk_totalEGP/fx', 7707.52, '=suppDays', 'u_pack'),
    ('Treatment', 'مواد المعالجة', '=treatment', 350, 0, 'u_treat'),
    ('Labour (Sudan)', 'العمالة (السودان)', '=labor', 500, 0, 'u_labor'),
    ('Sudan coordination', 'تنسيق/وكيل السودان', '=coordination', 0, 0, 'u_coord'),
    ('Freight', 'شحن البراد', '=freight*(1+freightShock)', 16000, '=prepDays', 'u_freight'),
    ('Cargo insurance', 'تأمين البضاعة', '=insRate*(u_fruit+u_pack+u_freight)', 0, '=prepDays', 'u_ins'),
    ('Clearance & certification', 'تخليص وتصديق', '=clearance', 6000, '=prepDays+transitDays+delayDays', 'u_clear'),
    ('Customs duty', 'رسوم جمركية', '=dutyRate*(u_fruit+u_pack+u_freight+u_ins)', 0, '=prepDays+transitDays+delayDays', 'u_duty'),
    ('Local transport', 'نقل داخلي', '=localTransport', 0, '=prepDays+transitDays+clearDays+delayDays', 'u_local'),
    ('Ripening & storage', 'إنضاج وتخزين', '=ripening+delayDays*delayCost', 0, '=prepDays+transitDays+clearDays+delayDays', 'u_ripen'),
]
r = 5
for en, ar, f, img, lag, nm in U:
    ws.cell(row=r, column=1, value=en); ws.cell(row=r, column=2, value=ar); ws.cell(row=r, column=3, value=f).number_format = SAR2
    ws.cell(row=r, column=4, value=f'=C{r}/cartons').number_format = SAR2; ws.cell(row=r, column=5, value=img).number_format = SAR2
    ws.cell(row=r, column=6, value=lag); ws.cell(row=r, column=7, value=nm)
    wb.defined_names[nm] = DefinedName(nm, attr_text=f'Unit_Economics!$C${r}'); r += 1
def line(label, ar, f, img=None, name=None, fmt=SAR2, bold=False):
    global r
    ws.cell(row=r, column=1, value=label); ws.cell(row=r, column=2, value=ar)
    c = ws.cell(row=r, column=3, value=f); c.number_format = fmt
    if bold:
        for cc in range(1, 6): ws.cell(row=r, column=cc).font = BF
    if fmt == SAR2 and name not in ('u_spoil', 'u_cartonsSold'): ws.cell(row=r, column=4, value=f'=C{r}/cartons').number_format = SAR2
    if img is not None: ws.cell(row=r, column=5, value=img).number_format = fmt
    if name:
        ws.cell(row=r, column=7, value=name); wb.defined_names[name] = DefinedName(name, attr_text=f'Unit_Economics!$C${r}')
    r += 1
line('Landed cost', 'التكلفة واصل', f'=SUM(C5:C{4+len(U)})', 50957.52, 'u_landed', bold=True)
line('Spoilage rate', 'نسبة التلف', '=MIN(0.9,spoilage+delayDays*spoilPerDay)', 0, 'u_spoil', PCT)
line('Cartons sold', 'الكراتين المباعة', '=cartons*(1-u_spoil)', 1700, 'u_cartonsSold', '#,##0')
line('Selling price / carton', 'سعر البيع', '=sellPrice*(1+sellShock)', 50, 'u_price')
line('Revenue', 'الإيراد', '=u_cartonsSold*u_price', 85000, 'u_revenue', bold=True)
line('Gross profit', 'إجمالي الربح', '=u_revenue-u_landed', 34042.48, 'u_gp', bold=True)
line('Gross margin', 'هامش الربح الإجمالي', '=u_gp/u_revenue', '=34042.48/85000', 'u_gm', PCT)
line('Sales commission', 'عمولة البيع', '=commRate*u_revenue', 0, 'u_comm')
line('Contribution per container', 'المساهمة لكل شحنة', '=u_gp-u_comm', 34042.48, 'u_contrib', bold=True)
line('Contribution margin', 'هامش المساهمة', '=u_contrib/u_revenue', '=34042.48/85000', 'u_cm', PCT)
r += 1
ws.cell(row=r, column=1, value='Lags (months)').font = Font(bold=True, color=GREEN); r += 1
line('Days purchase → sale', 'أيام حتى البيع', '=prepDays+transitDays+clearDays+ripenDays+sellDays+delayDays', None, 'daysToSale', '0')
line('Sale lag (months)', '', '=daysToSale/30', None, 'Ls', '0.000')
line('Collection lag (months)', '', '=(daysToSale+custDays)/30', None, 'Lc', '0.000')
for nm, f in [('kS', '=INT(Ls)'), ('fS', '=Ls-kS'), ('kC', '=INT(Lc)'), ('fC', '=Lc-kC'),
              ('lagA', '=suppDays/30'), ('lagC', '=prepDays/30'), ('lagD', '=(prepDays+transitDays+delayDays)/30'), ('lagE', '=(prepDays+transitDays+clearDays+delayDays)/30')]:
    line(nm, '', f, None, nm, '0.000')
line('Cost group A (fruit+packaging @ supplier days)', '', '=u_fruit+u_pack', None, 'costA')
line('Cost group B (treatment+labour+coordination @0)', '', '=u_treat+u_labor+u_coord', None, 'costB')
line('Cost group C (freight+insurance @prep)', '', '=u_freight+u_ins', None, 'costC')
line('Cost group D (clearance+duty @arrival)', '', '=u_clear+u_duty', None, 'costD')
line('Cost group E (local+ripening @after clearance)', '', '=u_local+u_ripen', None, 'costE')
def wIn(L): return f'IF(INT({L})=0,1-({L}-INT({L})),0)'
line('Cash needed in purchase month per container', 'نقد الشحنة في شهر الشراء', f'=MAX(1,costA*{wIn("lagA")}+costB+costC*{wIn("lagC")}+costD*{wIn("lagD")}+costE*{wIn("lagE")}-(u_revenue-u_comm)*{wIn("Lc")})', None, 'netOut')
r += 1
ws.cell(row=r, column=1, value='Overheads & capital').font = Font(bold=True, color=GREEN); r += 1
line('Monthly overhead (Y1 base)', 'المصاريف الشهرية', '=salaries*(1+benefits)+rent+utilIT+marketing+travel+insurance+profFees+misc', None, 'ohBase')
line('CAPEX total', 'إجمالي الأصول الثابتة', '=officeIT+equipment+strapEGP/fx', None, 'capexTotal')
line('Monthly depreciation', 'الإهلاك الشهري', '=capexTotal/(life*12)', None, 'depM')
line('Emergency reserve', 'احتياطي الطوارئ', '=resMonths*ohBase+resCont*u_landed', None, 'reserve')
line('Break-even containers / month (Y1)', 'حاويات التعادل شهرياً', '=ohBase/u_contrib', None, 'beCont', '0.00')
line('Break-even selling price / carton', 'سعر بيع التعادل للكرتون', '=(u_landed/u_cartonsSold)/(1-commRate)', None, 'bePrice')
r += 1
ws.cell(row=r, column=1, value='Packaging bill of materials (EGP, Egypt ex-factory) — مواد التعبئة').font = Font(bold=True, color=GREEN); r += 1
header(ws, r, ['Item', 'البند', 'Qty / shipment', 'Unit', 'Unit price EGP', 'Total EGP', 'Total SAR']); r += 1
bom = [('Cartons 13–14 kg', 'كراتين', '=cartons', 'carton', '=pkCarton'),
       ('Bags', 'أكياس', '=cartons*pkBagsPerCarton/pkBagsPerKg', 'kg', '=pkBagKg'),
       ('Foam separators 2 mm', 'فوم فواصل', '=cartons*pkFoamPcsCarton/pkFoamPcsRoll', 'roll', '=pkFoamRoll'),
       ('Corner paper', 'زوايا ورق تثبيت', '=pkCornerMeters', 'm', '=pkCornerM'),
       ('Plastic strap', 'شريط ربط', '=pkStrapKg', 'kg', '=pkStrapTon/1000'),
       ('Steel clips', 'كلبسات حديد', '=pkClipQty', 'kg', '=pkClipKg'),
       ('Transport Egypt → Sudan & other', 'نقل المواد للسودان', 1, 'trip', '=pkTransport')]
b0 = r
for en, ar, q, u, pr in bom:
    ws.cell(row=r, column=1, value=en); ws.cell(row=r, column=2, value=ar)
    ws.cell(row=r, column=3, value=q).number_format = '#,##0.00'; ws.cell(row=r, column=4, value=u)
    ws.cell(row=r, column=5, value=pr).number_format = '#,##0.00'
    ws.cell(row=r, column=6, value=f'=C{r}*E{r}').number_format = SAR
    ws.cell(row=r, column=7, value=f'=F{r}/fx').number_format = SAR2; r += 1
ws.cell(row=r, column=1, value='Total packaging per shipment').font = BF
ws.cell(row=r, column=6, value=f'=SUM(F{b0}:F{r-1})').number_format = SAR; ws.cell(row=r, column=7, value=f'=F{r}/fx').number_format = SAR2
wb.defined_names['pk_totalEGP'] = DefinedName('pk_totalEGP', attr_text=f'Unit_Economics!$F${r}')
r += 1; ws.cell(row=r, column=1, value='Strapping machine (7,000 EGP) is CAPEX, not a per-shipment cost.').font = Font(italic=True, color='6B6B6B')
for col, w in zip('ABCDEFG', [44, 24, 16, 12, 14, 16, 14]): ws.column_dimensions[col].width = w

# ------------------------------------------------------------------ Monthly model
ws = wb.create_sheet('Monthly_Model')
title(ws, 'Monthly Engine — المحرك الشهري (60 months)', 'Every column is a formula. Mirrors engine.js. Rows 6–65 = months 1–60.')
cols = ['Month', 'Year', 'MoY', 'Quarter', 'Season', 'Plan base', 'Plan', 'Known in', 'Known out', 'Cap', 'Shipments', 'Sold (cont.)', 'Revenue', 'COGS', 'Gross profit', 'Commission',
        'Overhead', 'One-time', 'EBITDA', 'CAPEX', 'Depreciation', 'EBIT', 'Zakat', 'Net income',
        'Collections', 'Pay A', 'Pay B', 'Pay C', 'Pay D', 'Pay E', 'Supplier payments', 'Commission paid', 'Zakat paid', 'Equity in', 'Deposits',
        'Cash pre-div', 'Dividends', 'Cash', 'AR', 'Inventory', 'Deposits bal', 'Net FA', 'AP & accruals', 'Commission payable', 'Zakat payable',
        'Paid-in capital', 'Retained earnings', 'Total assets', 'Total L+E', 'BS check', 'CFO', 'CFI', 'CFF', 'Net cash flow', 'Cash tie check', 'Cum FCF', 'Cum dividends', 'Cum NI']
header(ws, 5, cols)
C = {n: L(i + 1) for i, n in enumerate(cols)}
F, LST = 6, 65
def rng(n): return f'${C[n]}${F}:${C[n]}${LST}'
# Lag lookups use ranges that END at the current row (row 5 = header = month 0), so no formula
# depends on a later row: this keeps the cash-capped shipment logic free of circular references.
def distf(col, k, f, r):
    rg = f'${C[col]}$5:${C[col]}{r}'; a = C['Month']
    return (f'(IF(${a}{r}-{k}>=1,INDEX({rg},${a}{r}-{k}+1),0)*(1-{f})+IF(${a}{r}-{k}-1>=1,INDEX({rg},${a}{r}-{k}),0)*{f})')
def lagdist(col, lag, r):
    return distf(col, f'INT({lag})', f'({lag}-INT({lag}))', r)
def priordist(col, lag, r):
    # same as lagdist but WITHOUT the current month's own shipment (used to size the cash cap)
    rg = f'${C[col]}$5:${C[col]}{r-1}'; a = C['Month']; k = f'INT({lag})'; f = f'({lag}-INT({lag}))'
    return (f'(IF(AND({k}>=1,${a}{r}-{k}>=1),INDEX({rg},${a}{r}-{k}+1),0)*(1-{f})+IF(${a}{r}-{k}-1>=1,INDEX({rg},${a}{r}-{k}),0)*{f})')
for i in range(60):
    r = F + i; p = r - 1; first = (i == 0)
    def c(n): return f'{C[n]}{r}'
    def pv(n): return '0' if first else f'{C[n]}{p}'
    def cum(n): return f'SUM({C[n]}${F}:{C[n]}{r})'
    f = {}
    f['Month'] = i + 1
    f['Year'] = f'=INT(({c("Month")}-1)/12)+1'
    f['MoY'] = f'=MOD({c("Month")}-1,12)+1'
    f['Quarter'] = f'=INT(({c("Month")}-1)/3)+1'
    f['Season'] = f'=INDEX(Seasonality,{c("MoY")})'
    f['Plan base'] = f'=IF({c("Month")}<launch,0,IF({c("Month")}<=12,IF(launch>=12,y1Target,startC+(y1Target-startC)*({c("Month")}-launch)/(12-launch)),y1Target*(1+growth)^({c("Month")}-12)))'
    f['Plan'] = f'=MAX(0,MIN(maxC,{c("Plan base")})*{c("Season")}*(1+volShock))'
    f['Known in'] = '=' + priordist('Shipments', 'Lc', r) + '*(u_revenue-u_comm)'
    f['Known out'] = ('=' + priordist('Shipments', 'lagA', r) + '*costA+' + priordist('Shipments', 'lagC', r) + '*costC+'
                      + priordist('Shipments', 'lagD', r) + '*costD+' + priordist('Shipments', 'lagE', r) + '*costE')
    f['Cap'] = (f'=MAX(0,({pv("Cash")}+{c("Equity in")}-{c("CAPEX")}-{c("Deposits")}-{c("Overhead")}-{c("One-time")}'
                f'-{c("Zakat paid")}+{c("Known in")}-{c("Known out")}-reserve)/netOut)')
    f['Shipments'] = f'=IF(cashConstrained,MAX(0,MIN({c("Plan")},{c("Cap")})),{c("Plan")})'
    f['Sold (cont.)'] = '=' + distf('Shipments', 'kS', 'fS', r)
    f['Revenue'] = f'={c("Sold (cont.)")}*u_revenue'
    f['COGS'] = f'={c("Sold (cont.)")}*u_landed'
    f['Gross profit'] = f'={c("Revenue")}-{c("COGS")}'
    f['Commission'] = f'={c("Sold (cont.)")}*u_comm'
    f['Overhead'] = f'=ohBase*(1+ohGrowth)^({c("Year")}-1)*IF({c("Month")}<launch,preFactor,1)'
    f['One-time'] = f'=IF({c("Month")}=1,establish,0)+IF({c("Month")}=MAX(1,launch-1),launchMkt,0)'
    f['EBITDA'] = f'={c("Gross profit")}-{c("Commission")}-{c("Overhead")}-{c("One-time")}'
    f['CAPEX'] = f'=IF({c("Month")}=1,capexTotal,0)'
    f['Depreciation'] = f'=MIN(depM,{cum("CAPEX")}-{"0" if first else f"SUM({C["Depreciation"]}${F}:{C["Depreciation"]}{p})"})'
    f['EBIT'] = f'={c("EBITDA")}-{c("Depreciation")}'
    f['Zakat'] = f'=IF({c("MoY")}=12,zakat*MAX(0,{pv("Paid-in capital")}+{c("Equity in")}+{pv("Retained earnings")}+{c("EBIT")}-{c("Net FA")}-{c("Deposits bal")}),0)'
    f['Net income'] = f'={c("EBIT")}-{c("Zakat")}'
    f['Collections'] = '=' + distf('Shipments', 'kC', 'fC', r) + '*u_revenue'
    f['Pay A'] = '=' + lagdist('Shipments', 'lagA', r) + '*costA'
    f['Pay B'] = f'={c("Shipments")}*costB'
    f['Pay C'] = '=' + lagdist('Shipments', 'lagC', r) + '*costC'
    f['Pay D'] = '=' + lagdist('Shipments', 'lagD', r) + '*costD'
    f['Pay E'] = '=' + lagdist('Shipments', 'lagE', r) + '*costE'
    f['Supplier payments'] = f'=SUM({c("Pay A")}:{c("Pay E")})'
    f['Commission paid'] = '=' + distf('Shipments', 'kC', 'fC', r) + '*u_comm'
    f['Zakat paid'] = f'=IF({c("Month")}-divMonth>=1,INDEX(${C["Zakat"]}$5:${C["Zakat"]}{r-1},{c("Month")}-divMonth+1),0)' if not first else 0
    f['Equity in'] = f'=IF({c("Month")}=1,capital,0)'
    f['Deposits'] = f'=IF({c("Month")}=1,suppDeposit,0)'
    f['Cash pre-div'] = (f'={pv("Cash")}+{c("Collections")}-{c("Supplier payments")}-{c("Commission paid")}-{c("Overhead")}-{c("One-time")}'
                         f'-{c("Zakat paid")}-{c("CAPEX")}-{c("Deposits")}+{c("Equity in")}')
    prevNI = f'SUMIFS(${C["Net income"]}$5:${C["Net income"]}{max(r-1,5)},${C["Year"]}$5:${C["Year"]}{max(r-1,5)},{c("Year")}-1)'
    f['Dividends'] = f'=IF(AND({c("Year")}>=2,{c("MoY")}=divMonth,{prevNI}>0),MAX(0,MIN(payout*{prevNI},{c("Cash pre-div")}-reserve)),0)'
    f['Cash'] = f'={c("Cash pre-div")}-{c("Dividends")}'
    f['AR'] = f'={cum("Revenue")}-{cum("Collections")}'
    f['Inventory'] = f'={cum("Shipments")}*u_landed-{cum("COGS")}'
    f['Deposits bal'] = f'={cum("Deposits")}'
    f['Net FA'] = f'={cum("CAPEX")}-{cum("Depreciation")}'
    f['AP & accruals'] = f'={cum("Shipments")}*u_landed-{cum("Supplier payments")}'
    f['Commission payable'] = f'={cum("Commission")}-{cum("Commission paid")}'
    f['Zakat payable'] = f'={cum("Zakat")}-{cum("Zakat paid")}'
    f['Paid-in capital'] = f'={cum("Equity in")}'
    f['Retained earnings'] = f'={cum("Net income")}-{cum("Dividends")}'
    f['Total assets'] = f'={c("Cash")}+{c("AR")}+{c("Inventory")}+{c("Deposits bal")}+{c("Net FA")}'
    f['Total L+E'] = f'={c("AP & accruals")}+{c("Commission payable")}+{c("Zakat payable")}+{c("Paid-in capital")}+{c("Retained earnings")}'
    f['BS check'] = f'=ROUND({c("Total assets")}-{c("Total L+E")},2)'
    d = lambda n: f'({c(n)}-{pv(n)})'
    f['CFO'] = f'={c("Net income")}+{c("Depreciation")}-{d("AR")}-{d("Inventory")}+{d("AP & accruals")}+{d("Commission payable")}+{d("Zakat payable")}'
    f['CFI'] = f'=-{c("CAPEX")}-{c("Deposits")}'
    f['CFF'] = f'={c("Equity in")}-{c("Dividends")}'
    f['Net cash flow'] = f'={c("CFO")}+{c("CFI")}+{c("CFF")}'
    f['Cash tie check'] = f'=ROUND({c("Cash")}-{pv("Cash")}-{c("Net cash flow")},2)'
    f['Cum FCF'] = f'=SUM({C["CFO"]}${F}:{C["CFO"]}{r})+SUM({C["CFI"]}${F}:{C["CFI"]}{r})'
    f['Cum dividends'] = f'={cum("Dividends")}'
    f['Cum NI'] = f'={cum("Net income")}'
    for n in cols:
        cell = ws.cell(row=r, column=cols.index(n) + 1, value=f[n])
        cell.number_format = NUM1 if n in ('Season', 'Plan base', 'Plan', 'Cap', 'Shipments', 'Sold (cont.)') else ('0' if n in ('Month', 'Year', 'MoY', 'Quarter') else SAR)
ws.freeze_panes = 'B6'
for i in range(len(cols)): ws.column_dimensions[L(i + 1)].width = 12
for n in ('BS check', 'Cash tie check'):
    ws.conditional_formatting.add(f'{C[n]}{F}:{C[n]}{LST}', CellIsRule(operator='notEqual', formula=['0'], fill=PatternFill('solid', fgColor='F8C9C9')))
MM = C

# ------------------------------------------------------------------ helper for period statements
def period_sheet(name, ttl, n, keycol, labels):
    ws = wb.create_sheet(name); title(ws, ttl, 'Flows = SUMIFS over the monthly engine; balances = closing month of the period.')
    header(ws, 4, ['Line', 'البند'] + labels)
    return ws

FLOW = [('Containers shipped', 'عدد الشحنات', 'Shipments', NUM1), ('Revenue', 'الإيرادات', 'Revenue', SAR), ('COGS (landed)', 'تكلفة البضاعة', 'COGS', SAR),
        ('Gross profit', 'إجمالي الربح', 'Gross profit', SAR), ('Sales commission', 'عمولات البيع', 'Commission', SAR), ('Overheads', 'المصاريف الثابتة', 'Overhead', SAR),
        ('One-time setup', 'مصاريف التأسيس', 'One-time', SAR), ('EBITDA', 'EBITDA', 'EBITDA', SAR), ('Depreciation', 'الإهلاك', 'Depreciation', SAR),
        ('EBIT', 'EBIT', 'EBIT', SAR), ('Zakat', 'الزكاة', 'Zakat', SAR), ('Net income', 'صافي الربح', 'Net income', SAR)]
CFL = [('Net income', 'صافي الربح', 'Net income'), ('Depreciation', 'الإهلاك', 'Depreciation'), ('Cash from operations (CFO)', 'التدفق التشغيلي', 'CFO'),
       ('CAPEX', 'الأصول الثابتة', 'CAPEX'), ('Deposits', 'التأمينات', 'Deposits'), ('Cash from investing (CFI)', 'التدفق الاستثماري', 'CFI'),
       ('Equity injected', 'رأس المال المدفوع', 'Equity in'), ('Dividends paid', 'التوزيعات', 'Dividends'), ('Cash from financing (CFF)', 'التدفق التمويلي', 'CFF'),
       ('Net change in cash', 'صافي التغير في النقد', 'Net cash flow')]
BAL = [('Cash', 'النقدية', 'Cash'), ('Accounts receivable', 'ذمم مدينة', 'AR'), ('Inventory (incl. in transit)', 'مخزون وبضاعة بالطريق', 'Inventory'),
       ('Supplier deposits', 'تأمينات', 'Deposits bal'), ('Net fixed assets', 'صافي الأصول الثابتة', 'Net FA'), ('TOTAL ASSETS', 'إجمالي الأصول', 'Total assets'),
       ('Payables & accruals', 'ذمم دائنة ومستحقات', 'AP & accruals'), ('Commission payable', 'عمولات مستحقة', 'Commission payable'),
       ('Zakat payable', 'زكاة مستحقة', 'Zakat payable'), ('Paid-in capital', 'رأس المال', 'Paid-in capital'), ('Retained earnings', 'أرباح مبقاة', 'Retained earnings'),
       ('TOTAL LIABILITIES + EQUITY', 'إجمالي الخصوم وحقوق الملكية', 'Total L+E'), ('Balance check', 'فحص التوازن', 'BS check')]

def statements(ws, keycol, nper, start_row, endrow_fn, labelrow=None):
    r = start_row
    def sect(t):
        nonlocal r
        ws.cell(row=r, column=1, value=t).font = Font(bold=True, color=GREEN)
        for cc in range(1, nper + 3): ws.cell(row=r, column=cc).fill = SUB
        r += 1
    sect('INCOME STATEMENT — قائمة الدخل')
    for en, ar, k, fmt in FLOW:
        ws.cell(row=r, column=1, value=en); ws.cell(row=r, column=2, value=ar)
        for j in range(nper):
            c = ws.cell(row=r, column=3 + j, value=f"=SUMIFS(Monthly_Model!{rng(k)},Monthly_Model!{rng(keycol)},{j+1})"); c.number_format = fmt
        if en in ('Gross profit', 'EBITDA', 'Net income'):
            for cc in range(1, nper + 3): ws.cell(row=r, column=cc).font = BF
        r += 1
    for en, ar, num in [('Gross margin', 'هامش إجمالي', 'Gross profit'), ('EBITDA margin', 'هامش EBITDA', 'EBITDA'), ('Net margin', 'هامش صافي', 'Net income')]:
        ws.cell(row=r, column=1, value=en); ws.cell(row=r, column=2, value=ar)
        nr = [x[0] for x in FLOW].index({'Gross profit': 'Gross profit', 'EBITDA': 'EBITDA', 'Net income': 'Net income'}[num])
        for j in range(nper):
            col = L(3 + j); ws.cell(row=r, column=3 + j, value=f'=IFERROR({col}{start_row+1+nr}/{col}{start_row+2},0)').number_format = PCT
        r += 1
    r += 1; sect('CASH FLOW STATEMENT — قائمة التدفقات النقدية')
    for en, ar, k in CFL:
        ws.cell(row=r, column=1, value=en); ws.cell(row=r, column=2, value=ar)
        for j in range(nper):
            ws.cell(row=r, column=3 + j, value=f"=SUMIFS(Monthly_Model!{rng(k)},Monthly_Model!{rng(keycol)},{j+1})").number_format = SAR
        if k in ('CFO', 'CFI', 'CFF', 'Net cash flow'):
            for cc in range(1, nper + 3): ws.cell(row=r, column=cc).font = BF
        r += 1
    ws.cell(row=r, column=1, value='Opening cash'); ws.cell(row=r, column=2, value='نقد أول المدة')
    for j in range(nper):
        e = endrow_fn(j)
        ws.cell(row=r, column=3 + j, value=0 if j == 0 else f"=INDEX(Monthly_Model!{rng('Cash')},{endrow_fn(j-1)})").number_format = SAR
    r += 1
    ws.cell(row=r, column=1, value='Closing cash').font = BF; ws.cell(row=r, column=2, value='نقد آخر المدة')
    for j in range(nper):
        ws.cell(row=r, column=3 + j, value=f'={L(3+j)}{r-1}+{L(3+j)}{r-2}').number_format = SAR
    r += 1
    r += 1; sect('BALANCE SHEET (closing) — الميزانية العمومية')
    for en, ar, k in BAL:
        ws.cell(row=r, column=1, value=en); ws.cell(row=r, column=2, value=ar)
        for j in range(nper):
            ws.cell(row=r, column=3 + j, value=f"=INDEX(Monthly_Model!{rng(k)},{endrow_fn(j)})").number_format = SAR
        if en.isupper():
            for cc in range(1, nper + 3): ws.cell(row=r, column=cc).font = BF
        r += 1
    r += 1; sect('WORKING CAPITAL — رأس المال العامل')
    for en, ar, f in [('Receivables', 'ذمم مدينة', "AR"), ('Inventory', 'مخزون', "Inventory"), ('Less payables & accruals', 'ناقص دائنون', "AP & accruals"), ('Less commission payable', 'ناقص عمولات', "Commission payable")]:
        ws.cell(row=r, column=1, value=en); ws.cell(row=r, column=2, value=ar)
        for j in range(nper):
            sign = '-' if en.startswith('Less') else ''
            ws.cell(row=r, column=3 + j, value=f"={sign}INDEX(Monthly_Model!{rng(f)},{endrow_fn(j)})").number_format = SAR
        r += 1
    ws.cell(row=r, column=1, value='Net working capital').font = BF; ws.cell(row=r, column=2, value='صافي رأس المال العامل')
    for j in range(nper): ws.cell(row=r, column=3 + j, value=f'=SUM({L(3+j)}{r-4}:{L(3+j)}{r-1})').number_format = SAR
    r += 1
    ws.cell(row=r, column=1, value='Change in NWC'); ws.cell(row=r, column=2, value='التغير في رأس المال العامل')
    for j in range(nper): ws.cell(row=r, column=3 + j, value=f'={L(3+j)}{r-1}' + ('' if j == 0 else f'-{L(2+j)}{r-1}')).number_format = SAR
    ws.column_dimensions['A'].width = 34; ws.column_dimensions['B'].width = 26
    for j in range(nper): ws.column_dimensions[L(3 + j)].width = 14
    ws.freeze_panes = 'C5'
    return r

ws = period_sheet('Annual_Statements', 'Annual Financial Statements — القوائم المالية السنوية', 5, 'Year', ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'])
statements(ws, 'Year', 5, 5, lambda j: 12 * (j + 1))
ws = period_sheet('Quarterly', 'Quarterly Statements — القوائم الربع سنوية (20 quarters)', 20, 'Quarter', [f'Y{q//4+1}-Q{q%4+1}' for q in range(20)])
statements(ws, 'Quarter', 20, 5, lambda j: 3 * (j + 1))

# ------------------------------------------------------------------ Returns
ws = wb.create_sheet('Returns')
title(ws, 'Investment Returns — العوائد واسترداد رأس المال', 'Investor = all shareholders combined. Terminal value A = closing book equity; B = max(book, multiple × Y5 net profit).')
header(ws, 4, ['Metric', 'Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'])
AS = "Annual_Statements"
ws['A5'] = 'Dividends'; ws['B5'] = '=-capital'
for j in range(5): ws.cell(row=5, column=3 + j, value=f'=SUMIFS(Monthly_Model!{rng("Dividends")},Monthly_Model!{rng("Year")},{j+1})')
ws['A5'] = 'Distributions (Y0 = capital out)'
ws['A6'] = 'Closing book equity'; ws['G6'] = f"=INDEX(Monthly_Model!{rng('Paid-in capital')},60)+INDEX(Monthly_Model!{rng('Retained earnings')},60)"
ws['A7'] = 'Y5 net income'; ws['G7'] = f'=SUMIFS(Monthly_Model!{rng("Net income")},Monthly_Model!{rng("Year")},5)'
ws['A8'] = 'Exit value (B)'; ws['G8'] = '=MAX(G6,exitMult*G7)'
ws['A9'] = 'Cash flows A (book exit)'; ws['A10'] = 'Cash flows B (multiple exit)'
for j in range(6):
    col = L(2 + j)
    ws[f'{col}9'] = f'={col}5' + ('+G6' if j == 5 else ''); ws[f'{col}10'] = f'={col}5' + ('+G8' if j == 5 else '')
for rr in range(5, 11):
    for cc in range(2, 8): ws.cell(row=rr, column=cc).number_format = SAR
K = [('IRR — book exit (A)', '=IRR(B9:G9)', PCT), ('IRR — multiple exit (B)', '=IRR(B10:G10)', PCT),
     ('NPV @ discount rate — A', '=B9+NPV(discount,C9:G9)', SAR), ('NPV @ discount rate — B', '=B10+NPV(discount,C10:G10)', SAR),
     ('ROI 5-year (dividends + book equity − capital) / capital', '=(SUM(C5:G5)+G6-capital)/capital', PCT),
     ('Annualised ROI', '=((SUM(C5:G5)+G6)/capital)^(1/5)-1', PCT),
     ('5-year cumulative net income', f'=SUM(Monthly_Model!{rng("Net income")})', SAR),
     ('Cash payback month (cum. pre-financing FCF ≥ capital)', f'=IF(_xlfn.MINIFS(Monthly_Model!{rng("Month")},Monthly_Model!{rng("Cum FCF")},">="&capital)=0,"> 60",_xlfn.MINIFS(Monthly_Model!{rng("Month")},Monthly_Model!{rng("Cum FCF")},">="&capital))', '0'),
     ('Distribution payback month (cum. dividends ≥ capital)', f'=IF(_xlfn.MINIFS(Monthly_Model!{rng("Month")},Monthly_Model!{rng("Cum dividends")},">="&capital)=0,"> 60",_xlfn.MINIFS(Monthly_Model!{rng("Month")},Monthly_Model!{rng("Cum dividends")},">="&capital))', '0'),
     ('First month with positive EBITDA', f'=_xlfn.MINIFS(Monthly_Model!{rng("Month")},Monthly_Model!{rng("EBITDA")},">0",Monthly_Model!{rng("Month")},">="&launch)', '0'),
     ('Minimum month-end cash', f'=MIN(Monthly_Model!{rng("Cash")})', SAR),
     ('Emergency reserve target', '=reserve', SAR),
     ('Break-even containers / month (Y1 overhead)', '=beCont', '0.00'),
     ('Break-even selling price / carton', '=bePrice', SAR2)]
r = 12
for name, f, fmt in K:
    ws.cell(row=r, column=1, value=name); c = ws.cell(row=r, column=2, value=f); c.number_format = fmt; c.font = BF; r += 1
r += 1
ws.cell(row=r, column=1, value='ROE by year (net income / average equity)').font = Font(bold=True, color=GREEN); r += 1
for j in range(5):
    ws.cell(row=r, column=1, value=f'Year {j+1}')
    eqE = f"(INDEX(Monthly_Model!{rng('Paid-in capital')},{12*(j+1)})+INDEX(Monthly_Model!{rng('Retained earnings')},{12*(j+1)}))"
    eqO = 'capital' if j == 0 else f"(INDEX(Monthly_Model!{rng('Paid-in capital')},{12*j})+INDEX(Monthly_Model!{rng('Retained earnings')},{12*j}))"
    ws.cell(row=r, column=2, value=f'=SUMIFS(Monthly_Model!{rng("Net income")},Monthly_Model!{rng("Year")},{j+1})/(({eqO}+{eqE})/2)').number_format = PCT; r += 1
ws.column_dimensions['A'].width = 58
for cc in 'BCDEFG': ws.column_dimensions[cc].width = 15

# ------------------------------------------------------------------ Capital cycle
ws = wb.create_sheet('Capital_Cycle')
title(ws, 'Capital Turnover Cycle — دورة دوران رأس المال', '')
header(ws, 4, ['Step', 'الخطوة', 'Days', 'Cash event'])
steps = [('1 Purchase & pay supplier', 'شراء الموز ودفع المورد', '=suppDays', 'Cash out (fruit + packaging) after supplier days'),
         ('2 Pack & load', 'التعبئة والتحميل', '=prepDays', 'Labour, treatment paid'),
         ('3 International transit', 'الشحن الدولي', '=transitDays', 'Freight & insurance paid at loading'),
         ('4 Customs clearance', 'التخليص الجمركي', '=clearDays', 'Clearance (and duty if any) paid'),
         ('5 Ripening & storage', 'الإنضاج والتخزين', '=ripenDays', 'Local transport & ripening paid'),
         ('6 Selling', 'البيع', '=sellDays', 'Revenue recognised'),
         ('7 Collection', 'التحصيل', '=custDays', 'Cash in (net of commission)'),
         ('Delay (stress)', 'تأخير إضافي', '=delayDays', '')]
r = 5
for a, b, c, d in steps:
    ws.cell(row=r, column=1, value=a); ws.cell(row=r, column=2, value=b); ws.cell(row=r, column=3, value=c); ws.cell(row=r, column=4, value=d); r += 1
KK = [('Inventory days (purchase → sale)', '=daysToSale', '0'),
      ('Shipping & transit days (prep+transit+clearance+delay)', '=prepDays+transitDays+clearDays+delayDays', '0'),
      ('Accounts receivable days (DSO)', '=custDays', '0'),
      ('Accounts payable days (DPO, weighted by supplier share)', '=suppDays*costA/u_landed', '0.0'),
      ('Cash conversion cycle (days)', '=daysToSale+custDays-suppDays*costA/u_landed', '0.0'),
      ('Capital cycles per year', '=365/(daysToSale+custDays-suppDays*costA/u_landed)', '0.00'),
      ('Capital tied per container (landed cost)', '=u_landed', SAR),
      ('Annual sales per SAR 100,000 of working capital', '=100000/u_landed*365/(daysToSale+custDays-suppDays*costA/u_landed)*u_revenue', SAR),
      ('Capital turnover Y2 (revenue / initial capital)', f'=Annual_Statements!D7/capital', '0.00')]
r += 1
for a, f, fmt in KK:
    ws.cell(row=r, column=1, value=a).font = BF; c = ws.cell(row=r, column=3, value=f); c.number_format = fmt; r += 1
ws.column_dimensions['A'].width = 56; ws.column_dimensions['B'].width = 26; ws.column_dimensions['C'].width = 16; ws.column_dimensions['D'].width = 50

# ------------------------------------------------------------------ Scenarios snapshot
ws = wb.create_sheet('Scenarios')
title(ws, 'Scenario Comparison — مقارنة السيناريوهات (engine snapshot)', 'Values produced by engine.js at build time. Switch Assumptions!C3 to reproduce each one live.')
header(ws, 4, ['Metric', 'Conservative', 'Base Case', 'Optimistic'])
S = D['scenarios']
def mv(k, fn): return [fn(S[s]) for s in SC]
rowsS = [
    ('Required capital (to keep cash ≥ reserve)', mv(0, lambda s: s['metrics']['requiredCapital']), SAR),
    ('Contribution per container', mv(0, lambda s: s['unit']['contribution']), SAR),
    ('Contribution margin', mv(0, lambda s: s['unit']['contributionMargin']), PCT),
    ('Revenue Y1', mv(0, lambda s: s['years'][0]['revenue']), SAR), ('Revenue Y3', mv(0, lambda s: s['years'][2]['revenue']), SAR),
    ('Revenue Y5', mv(0, lambda s: s['years'][4]['revenue']), SAR),
    ('Gross profit 5y', mv(0, lambda s: sum(y['grossProfit'] for y in s['years'])), SAR),
    ('Net income Y1', mv(0, lambda s: s['years'][0]['netIncome']), SAR), ('Net income Y3', mv(0, lambda s: s['years'][2]['netIncome']), SAR),
    ('Net income 5y', mv(0, lambda s: s['metrics']['totalNI5y']), SAR),
    ('Cash from operations 5y', mv(0, lambda s: sum(y['cfo'] for y in s['years'])), SAR),
    ('ROI 5y', mv(0, lambda s: s['metrics']['roi5y']), PCT),
    ('IRR (book exit)', mv(0, lambda s: s['metrics']['irrBook'] if s['metrics']['irrBook'] is not None else 'n/a'), PCT),
    ('Cash payback month', mv(0, lambda s: s['metrics']['cashPaybackMonth'] or '> 60'), '0'),
    ('— With base capital only: cash goes negative in month', mv(0, lambda s: s['atBaseCapital']['cashOutMonth'] or 'never'), '0'),
    ('— With base capital only: IRR (book exit)', mv(0, lambda s: s['atBaseCapital']['irrBook'] if s['atBaseCapital']['irrBook'] is not None else 'n/a'), PCT),
]
r = 5
for name, vals, fmt in rowsS:
    ws.cell(row=r, column=1, value=name)
    for j, v in enumerate(vals): c = ws.cell(row=r, column=2 + j, value=v); c.number_format = fmt
    r += 1
ws.column_dimensions['A'].width = 56
for cc in 'BCD': ws.column_dimensions[cc].width = 18

# ------------------------------------------------------------------ Sensitivity snapshot
ws = wb.create_sheet('Sensitivity')
SE = D['sensitivity']
title(ws, 'Sensitivity Analysis — تحليل الحساسية (engine snapshot, base capital held constant)', f"Capital held at SAR {SE['capitalHeld']:,.0f}. Base 5y NI = {SE['base']['ni5y']:,.0f}; base IRR = {SE['base']['irr']:.1%}")
header(ws, 4, ['Shock', 'الصدمة', 'Contribution / container', '5y net income', 'Δ vs base', 'Y2 net income', 'NPV (book)', 'IRR (book)', 'Min cash', 'Capital needed'])
r = 5
for x in SE['rows']:
    vals = [x['en'], x['ar'], x['contribution'], x['ni5y'], x['dNi5y'], x['niY2'], x['npv'], x['irr'] if x['irr'] is not None else 'n/a', x['minCash'], x['requiredCapital']]
    for j, v in enumerate(vals):
        c = ws.cell(row=r, column=1 + j, value=v); c.number_format = PCT if j == 7 else SAR
    r += 1
r += 1; ws.cell(row=r, column=1, value='Contribution per container: selling-price change (columns) × purchase-price change (rows)').font = Font(bold=True, color=GREEN); r += 1
ws.cell(row=r, column=1, value='Buy \\ Sell')
for j, s in enumerate(SE['grid']['sell']): ws.cell(row=r, column=2 + j, value=s).number_format = PCT
r += 1
for i, b in enumerate(SE['grid']['buy']):
    ws.cell(row=r, column=1, value=b).number_format = PCT
    for j, v in enumerate(SE['grid']['v'][i]): ws.cell(row=r, column=2 + j, value=v).number_format = SAR
    r += 1
ws.column_dimensions['A'].width = 38; ws.column_dimensions['B'].width = 30
for cc in 'CDEFGHIJ': ws.column_dimensions[cc].width = 15

# ------------------------------------------------------------------ Checks
ws = wb.create_sheet('Checks')
title(ws, 'Model Integrity Checks — فحوصات سلامة النموذج', 'All must show TRUE.')
B = D['base']['metrics']
checks = [
    ('Balance sheet balances every month', f'=MAX(Monthly_Model!{rng("BS check")})=0'),
    ('Balance sheet balances (min)', f'=MIN(Monthly_Model!{rng("BS check")})=0'),
    ('Cash flow ties to balance-sheet cash every month', f'=AND(MAX(Monthly_Model!{rng("Cash tie check")})=0,MIN(Monthly_Model!{rng("Cash tie check")})=0)'),
    ('Capital is not counted as revenue', f'=SUM(Monthly_Model!{rng("Revenue")})=SUMPRODUCT(Monthly_Model!{rng("Sold (cont.)")})*u_revenue'),
    ('Annual net income = sum of monthly', f'=ROUND(SUM(Annual_Statements!C16:G16)-SUM(Monthly_Model!{rng("Net income")}),2)=0'),
    ('Cash never below zero', f'=MIN(Monthly_Model!{rng("Cash")})>=0'),
    ('Shipments never exceed the plan', f'=SUMPRODUCT((Monthly_Model!{rng("Shipments")}>Monthly_Model!{rng("Plan")}+0.000001)*1)=0'),
    ('Cash stays ≥ emergency reserve (funding adequate)', f'=MIN(Monthly_Model!{rng("Cash")})>=reserve-0.01'),
    ('Base: 5y net income matches engine.js (±1 SAR) — valid when scenario = 2', f'=OR(ScenarioSel<>2,ABS(SUM(Monthly_Model!{rng("Net income")})-{B["totalNI5y"]:.4f})<1)'),
    ('Base: closing cash matches engine.js (±1 SAR) — valid when scenario = 2', f'=OR(ScenarioSel<>2,ABS(INDEX(Monthly_Model!{rng("Cash")},60)-{B["endCash"]:.4f})<1)'),
]
header(ws, 4, ['Check', 'Result'])
r = 5
for a, f in checks:
    ws.cell(row=r, column=1, value=a); c = ws.cell(row=r, column=2, value=f); c.font = BF; c.fill = CHK; r += 1
ws.column_dimensions['A'].width = 70; ws.column_dimensions['B'].width = 12

# fix: annual NI row reference used in Checks (row of Net income in Annual_Statements)
ann = wb['Annual_Statements']
for rr in range(1, 40):
    if ann.cell(row=rr, column=1).value == 'Net income':
        wb['Checks']['B9'] = f'=ROUND(SUM(Annual_Statements!C{rr}:G{rr})-SUM(Monthly_Model!{rng("Net income")}),2)=0'; break
for rr in range(1, 40):
    if ann.cell(row=rr, column=1).value == 'Revenue':
        wb['Capital_Cycle'].cell(row=wb['Capital_Cycle'].max_row, column=3).value = f'=Annual_Statements!D{rr}/capital'; break

out = os.path.join(ROOT, '02_Financial_Model', 'Financial_Model.xlsx'); wb.save(out); print('saved', out)

# ================================================================== Assumptions register
wr = Workbook(); ws = wr.active; ws.title = 'Assumptions_Register'
title(ws, 'Assumptions Register — سجل الافتراضات', 'Every input of the engine. Status: IMAGE (extracted) / ASSUMPTION (needs verification) / POLICY. Values identical to Financial_Model.xlsx and engine.js.')
header(ws, 4, ['#', 'Key', 'البند', 'Item', 'Unit', 'Conservative', 'Base', 'Optimistic', 'Source', 'Confidence', 'Notes', 'Verification action', 'Owner'])
ACT = {'IMAGE': 'Confirm with supplier invoice / quotation', 'IMAGE (derived)': 'Confirm with supplier invoice', 'IMAGE (adjusted)': 'Confirm itemised packaging quotation',
       'ASSUMPTION': 'Obtain 2–3 written quotes / market survey', 'ASSUMPTION (market)': 'Lock rate at contract; monitor CBE rate',
       'ASSUMPTION (GAFTA)': 'Confirm with licensed customs broker in Jeddah', 'POLICY': 'Board / shareholders decision', 'ENGINE': 'Re-run engine after inputs change',
       'SENSITIVITY': 'Stress-test only', 'REGULATION (simplified)': 'Zakat adviser to compute actual base'}
r = 5; n = 1
for a in A:
    if a[0] == 'sec':
        ws.cell(row=r, column=2, value=a[1]).font = Font(bold=True, color=GREEN)
        for c in range(1, 14): ws.cell(row=r, column=c).fill = SUB
        r += 1; continue
    key, path, ar, en, unit, src, conf, note = a
    vals = [g(P[s], path) for s in SC]
    row = [n, key, ar, en, unit] + vals + [src, conf, note, ACT.get(src, ''), 'Founder / CFO']
    for j, v in enumerate(row):
        c = ws.cell(row=r, column=1 + j, value=v)
        if 5 <= j <= 7: c.number_format = PCT if unit == '%' else '#,##0.###'
    if src.startswith('ASSUMPTION') and conf == 'Low':
        for c in range(1, 14): ws.cell(row=r, column=c).fill = PatternFill('solid', fgColor='FCE8D8')
    r += 1; n += 1
r += 1; ws.cell(row=r, column=2, value='Seasonality index Jan..Dec').font = BF
for j, s in enumerate(SC): ws.cell(row=r, column=6 + j, value=', '.join(str(x) for x in P[s]['volume']['seasonality']))
ws.cell(row=r, column=9, value='ASSUMPTION'); ws.cell(row=r, column=10, value='Low'); ws.cell(row=r, column=12, value='Harvest calendar from 2+ Egyptian growers')
for col, w in zip('ABCDEFGHIJKLM', [4, 13, 28, 36, 9, 13, 13, 13, 22, 11, 55, 42, 14]): ws.column_dimensions[col].width = w
ws.freeze_panes = 'C5'
# missing data sheet
ws2 = wr.create_sheet('Missing_Data')
title(ws2, 'Missing Data — البيانات الناقصة من الصورة', 'Items required by investors but absent from the source image.')
header(ws2, 4, ['Item', 'Why it matters', 'How the model treats it', 'Priority'])
miss = [('Supplier identity & contracts', 'Supply security, quality, payment terms', 'Generic Egyptian grower/packhouse; cash on loading', 'Critical'),
        ('Customer list / LOIs in Saudi', 'Validates 50 SAR price and volumes', 'Volume plan is an assumption', 'Critical'),
        ('Capital available', 'Determines scale', 'Engine computes required capital', 'Critical'),
        ('Overheads & team', 'Drives break-even', 'Assumed SAR ~45k/month', 'High'),
        ('Spoilage history', 'Perishable product', '5% base, 7% conservative', 'High'),
        ('Ripening / cold-storage cost in Jeddah', 'Bananas must be ripened', 'SAR 2,500 per container', 'High'),
        ('Seasonality of Egyptian banana supply', 'Year-round assumption is unsafe', 'Seasonality index, summer dip', 'High'),
        ('Customs duty status', 'Margin', '0% (GAFTA) — verify', 'Medium'),
        ('Container payload (32 t)', 'Above typical reefer payload', 'Kept as per image — verify', 'Medium'),
        ('Meaning of "العمالة / السودان" and "النقل من مصري"', 'Cost classification', 'Kept as per-shipment costs', 'Low')]
for i, m in enumerate(miss):
    for j, v in enumerate(m): ws2.cell(row=5 + i, column=1 + j, value=v)
for col, w in zip('ABCD', [40, 40, 44, 10]): ws2.column_dimensions[col].width = w
out2 = os.path.join(ROOT, '05_Documentation', 'Assumptions_Register.xlsx'); wr.save(out2); print('saved', out2)
