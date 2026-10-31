// Runs the single financial engine and writes every output used by the documents and the Excel snapshot.
const fs = require('fs');
const path = require('path');
const E = require('../01_Investor_Pitch_Deck/engine.js');

const base = E.run(E.scenarioParams('base'));
const scen = E.runScenarios();
const sens = E.sensitivity(E.scenarioParams('base'));
const params = {};
['conservative', 'base', 'optimistic'].forEach(k => {
  const p = E.scenarioParams(k);
  p.finance.initialInvestment = scen[k].metrics.requiredCapital;
  params[k] = p;
});
const out = {
  generatedAt: new Date().toISOString(),
  params, base: { metrics: base.metrics, unit: base.unit, years: base.years, quarters: base.quarters, uses: base.uses, investor: base.investor,
    monthly: base.R },
  scenarios: scen, sensitivity: sens
};
fs.writeFileSync(path.join(__dirname, 'model_output.json'), JSON.stringify(out, null, 1));
// a small JS file so static HTML documents can embed the same snapshot without fetch()
console.log('capital', base.metrics.capital, 'IRR', base.metrics.irrBook.toFixed(4), 'NI5y', Math.round(base.metrics.totalNI5y));
