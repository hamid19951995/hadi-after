const fs = require('fs');
const path = require('path');

class FxParamValidator {
  constructor(catalogPath = null) {
    this.catalog = null;
    this.indexByMatch = {};
    this.loadedPath = null;
    if (catalogPath) this.loadCatalog(catalogPath);
  }

  resolveDefaultCatalogPath() {
    const envPath = process.env.FX_PARAMETERS_CATALOG_PATH || process.env.AE_BOSS_PARAMETERS_CATALOG_PATH;
    if (envPath) return path.resolve(envPath);

    const candidateRoots = [
      __dirname,
      path.resolve(__dirname, '..', '..', '..'),
      path.resolve(__dirname, '..', '..', '..', '..'),
      process.cwd()
    ];

    for (const root of candidateRoots) {
      const defaultPath = path.join(root, 'evidence', 'fx', 'effects-parameters-catalog.json');
      if (fs.existsSync(defaultPath)) return defaultPath;
    }

    return path.resolve(__dirname, '..', '..', '..', 'evidence', 'fx', 'effects-parameters-catalog.json');
  }

  loadCatalog(catalogPath) {
    const target = catalogPath || this.resolveDefaultCatalogPath();
    const abs = path.resolve(target);
    const raw = fs.readFileSync(abs, { encoding: 'utf8' });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error('Invalid JSON in parameter catalog: ' + err.message);
    }

    const effects = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.effects) ? parsed.effects : null);
    if (!effects) {
      throw new Error('Parameter catalog must be an object with an "effects" array or an array of effects');
    }

    this.catalog = parsed && !Array.isArray(parsed) ? parsed : { effects };
    this.loadedPath = abs;
    this.indexByMatch = {};
    this.catalog.effects.forEach(effect => {
      if (effect && effect.matchName) this.indexByMatch[effect.matchName] = effect;
    });
    return this.catalog;
  }

  getEffectByMatchName(matchName) {
    if (!this.catalog) throw new Error('Parameter catalog not loaded');
    const key = String(matchName || '').trim();
    return this.indexByMatch[key] || null;
  }

  resolveParameterDefinition(effect, paramKey) {
    if (!effect || !Array.isArray(effect.properties)) return null;
    const key = String(paramKey || '').trim();
    for (const prop of effect.properties) {
      if (!prop) continue;
      const names = [prop.name, prop.matchName, prop.key];
      if (names.some(n => String(n || '').trim() === key)) return prop;
    }
    return null;
  }

  getPropertyValueType(prop) {
    if (!prop) return 'Unknown';
    return String(prop.propertyValueType || prop.valueType || prop.type || 'Unknown');
  }

  isNumberArray(value) {
    return Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'number' && !Number.isNaN(v));
  }

  isNumericValue(value) {
    return typeof value === 'number' && !Number.isNaN(value);
  }

  normalizeRange(prop) {
    const range = { hasMin: false, minValue: null, hasMax: false, maxValue: null };
    if (!prop) return range;
    if (typeof prop.hasMin !== 'undefined') range.hasMin = !!prop.hasMin;
    if (typeof prop.minValue !== 'undefined') range.minValue = prop.minValue;
    if (typeof prop.min !== 'undefined') range.minValue = prop.min;
    if (typeof prop.hasMax !== 'undefined') range.hasMax = !!prop.hasMax;
    if (typeof prop.maxValue !== 'undefined') range.maxValue = prop.maxValue;
    if (typeof prop.max !== 'undefined') range.maxValue = prop.max;
    return range;
  }

  typeMatches(value, expectedType) {
    const typeName = String(expectedType || '').trim().toLowerCase();
    if (!typeName || typeName === 'unknown') return true;

    if (typeName === 'slider' || typeName === 'oned' || typeName === 'angle' || typeName === 'angular') {
      return this.isNumericValue(value);
    }

    if (typeName === 'checkbox' || typeName === 'bool' || typeName === 'boolean') {
      return typeof value === 'boolean' || value === 0 || value === 1;
    }

    if (typeName === 'color' || typeName === 'rgba' || typeName === 'rgb') {
      if (!Array.isArray(value)) return false;
      return value.length >= 3 && value.length <= 4 && value.every(v => typeof v === 'number' && !Number.isNaN(v));
    }

    if (typeName === 'twod' || typeName === 'point' || typeName === '2d') {
      return Array.isArray(value) && value.length === 2 && value.every(v => typeof v === 'number' && !Number.isNaN(v));
    }

    if (typeName === 'threed' || typeName === '3d') {
      return Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number' && !Number.isNaN(v));
    }

    if (typeName === 'fourd' || typeName === '4d') {
      return Array.isArray(value) && value.length === 4 && value.every(v => typeof v === 'number' && !Number.isNaN(v));
    }

    if (typeName === 'popup' || typeName === 'enum' || typeName === 'layer index' || typeName === 'layerindex') {
      return typeof value === 'number' || typeof value === 'string';
    }

    return true;
  }

  validateEffectParameters(effectMatchName, params) {
    const errors = [];
    const warnings = [];

    if (!effectMatchName || !String(effectMatchName).trim()) {
      return { valid: false, errors: ['effectMatchName is required'], warnings };
    }

    if (!this.catalog) {
      return { valid: false, errors: ['Parameter catalog not loaded'], warnings };
    }

    const effect = this.getEffectByMatchName(effectMatchName);
    if (!effect) {
      return {
        valid: false,
        errors: ['Unknown effect: ' + effectMatchName],
        warnings
      };
    }

    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return { valid: false, errors: ['params must be an object keyed by parameter name or matchName'], warnings };
    }

    const entries = Object.entries(params);
    if (entries.length === 0) {
      return { valid: true, errors: [], warnings: ['No parameter values supplied; validation skipped'] };
    }

    for (const [rawKey, rawValue] of entries) {
      const key = String(rawKey || '').trim();
      const definition = this.resolveParameterDefinition(effect, key);
      if (!definition) {
        errors.push('Unknown parameter for ' + effectMatchName + ': ' + key);
        continue;
      }

      const expectedType = this.getPropertyValueType(definition);
      if (!this.typeMatches(rawValue, expectedType)) {
        errors.push('Parameter type mismatch for ' + key + ' (expected ' + expectedType + ')');
        continue;
      }

      const range = this.normalizeRange(definition);
      if (this.isNumericValue(rawValue)) {
        if (range.hasMin && rawValue < Number(range.minValue)) {
          errors.push('Parameter ' + key + ' is below minimum ' + range.minValue + ': ' + rawValue);
        }
        if (range.hasMax && rawValue > Number(range.maxValue)) {
          errors.push('Parameter ' + key + ' exceeds maximum ' + range.maxValue + ': ' + rawValue);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = { FxParamValidator };
