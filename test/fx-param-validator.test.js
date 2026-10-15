const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { FxParamValidator } = require('../src/engine/fx/fx_param_validator');

(function runTests() {
  const fixtureDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  const fixturePath = path.join(fixtureDir, 'fx-parameter-catalog.json');
  const catalog = {
    generatedAt: new Date().toISOString(),
    effects: [
      {
        matchName: 'ADBE Fast Blur',
        displayName: 'Fast Blur',
        properties: [
          {
            name: 'Blurriness',
            matchName: 'ADBE FastBlur-0001',
            propertyValueType: 'Slider',
            hasMin: true,
            minValue: 0,
            hasMax: true,
            maxValue: 100
          },
          {
            name: 'Repeat Edge Pixels',
            matchName: 'ADBE FastBlur-0002',
            propertyValueType: 'Checkbox',
            defaultValue: false
          }
        ]
      },
      {
        matchName: 'ADBE Hue Saturation',
        displayName: 'Hue/Saturation',
        properties: [
          {
            name: 'Master Hue',
            matchName: 'ADBE HueHue',
            propertyValueType: 'Angle',
            hasMin: true,
            minValue: -180,
            hasMax: true,
            maxValue: 180
          },
          {
            name: 'Colorize',
            matchName: 'ADBE HueColorize',
            propertyValueType: 'Checkbox',
            defaultValue: false
          }
        ]
      }
    ]
  };

  fs.writeFileSync(fixturePath, JSON.stringify(catalog, null, 2), 'utf8');

  const validator = new FxParamValidator(fixturePath);

  const ok = validator.validateEffectParameters('ADBE Fast Blur', {
    'ADBE FastBlur-0001': 25,
    'ADBE FastBlur-0002': true
  });
  assert.strictEqual(ok.valid, true, 'valid slider and checkbox payload should pass');

  const unknown = validator.validateEffectParameters('ADBE Fast Blur', {
    'ADBE FastBlur-9999': 9
  });
  assert.strictEqual(unknown.valid, false, 'unknown parameter should fail validation');
  assert.ok(unknown.errors.some(err => err.includes('Unknown parameter')), 'should report unknown param');

  const wrongType = validator.validateEffectParameters('ADBE Fast Blur', {
    'ADBE FastBlur-0001': 'not-a-number'
  });
  assert.strictEqual(wrongType.valid, false, 'bad slider type should fail');
  assert.ok(wrongType.errors.some(err => err.includes('expected Slider')), 'should mention expected type');

  const outOfRange = validator.validateEffectParameters('ADBE Fast Blur', {
    'ADBE FastBlur-0001': 101
  });
  assert.strictEqual(outOfRange.valid, false, 'out-of-range slider should fail');
  assert.ok(outOfRange.errors.some(err => err.includes('exceeds maximum')), 'should report max-range violation');

  const validAngle = validator.validateEffectParameters('ADBE Hue Saturation', {
    'ADBE HueHue': 45,
    'ADBE HueColorize': false
  });
  assert.strictEqual(validAngle.valid, true, 'valid angle payload should pass');

  console.log('FX parameter validator tests passed');
  process.exit(0);
})();
