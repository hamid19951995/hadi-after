const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FXCatalogManager = require('../src/engine/fx/fx_catalog_manager');

(function runTests() {
  const testDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  const catalogPath = path.join(testDir, 'fx-mock-catalog.json');

  const mockCatalog = {
    generatedAt: new Date().toISOString(),
    effects: [
      {
        matchName: 'ADBE CurvesCustom',
        displayName: 'Curves Custom',
        category: 'Color Correction',
        properties: [
          { name: 'Master', matchName: 'ADBE CurvesMaster', index: 1, type: 'Popup' },
          { name: 'Amount', matchName: 'ADBE CurvesAmount', index: 2, type: 'Slider', min: -100, max: 100 }
        ]
      },
      {
        matchName: 'ADBE Fast Blur',
        displayName: 'Fast Blur',
        category: 'Blur & Sharpen',
        properties: [
          { name: 'Blurriness', matchName: 'ADBE FastBlur-0001', index: 1, type: 'Slider', min: 0, max: 100 },
          { name: 'Repeat Edge Pixels', matchName: 'ADBE FastBlur-0002', index: 2, type: 'Checkbox' }
        ]
      },
      {
        matchName: 'ADBE Hue Saturation',
        displayName: 'Hue/Saturation',
        category: 'Color Correction',
        properties: [
          { name: 'Master Hue', matchName: 'ADBE HueHue', index: 1, type: 'Slider', min: -180, max: 180 },
          { name: 'Colorize', matchName: 'ADBE HueColorize', index: 2, type: 'Checkbox' }
        ]
      }
    ]
  };

  fs.writeFileSync(catalogPath, JSON.stringify(mockCatalog, null, 2), 'utf8');

  console.log('Catalog fixture written to', catalogPath);

  const mgr = new FXCatalogManager();
  // load
  const loaded = mgr.loadCatalog(catalogPath);
  assert(loaded.effects.length === 3, 'catalog should have 3 effects');

  // get by matchName
  const fb = mgr.getEffectByMatchName('ADBE Fast Blur');
  assert(fb && fb.displayName === 'Fast Blur', 'getEffectByMatchName should return Fast Blur');

  // search by displayName
  const found = mgr.searchByDisplayName('hue');
  assert(found.length === 1 && found[0].matchName === 'ADBE Hue Saturation', 'searchByDisplayName should find Hue Saturation');

  // validate good payload
  const goodReq = { matchName: 'ADBE Fast Blur', params: { 'ADBE FastBlur-0001': 25, 'ADBE FastBlur-0002': 1 } };
  const goodResult = mgr.validateEffectPayload(goodReq);
  assert(goodResult.valid, 'valid payload should pass');

  // validate bad payload (out of range)
  const badReq = { matchName: 'ADBE Fast Blur', params: { 'ADBE FastBlur-0001': 1000 } };
  const badResult = mgr.validateEffectPayload(badReq);
  assert(!badResult.valid && badResult.errors.length > 0, 'out of range should fail');

  // invalid type
  const badTypeReq = { matchName: 'ADBE Hue Saturation', params: { 'ADBE HueHue': 'not-a-number' } };
  const badTypeRes = mgr.validateEffectPayload(badTypeReq);
  assert(!badTypeRes.valid, 'invalid type should fail');

  // fallback mapping
  const fbk = mgr.resolveFallback('RedGiant Trapcode Particular');
  // map returns null if not installed, but our manager's resolveFallback maps known keys
  // this test only asserts that method returns either a string or null (no throw)
  assert(typeof fbk === 'string' || fbk === null, 'resolveFallback should return string or null');

  console.log('All fx-catalog-manager tests passed');
  process.exit(0);
})();
