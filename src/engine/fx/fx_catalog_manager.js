const fs = require('fs');
const path = require('path');

class FXCatalogManager {
  constructor() {
    this.catalog = null;
    this.indexByMatch = {};
    this.loadedPath = null;
  }

  loadCatalog(catalogPath) {
    if (!catalogPath) throw new Error('catalogPath required');
    const abs = path.resolve(catalogPath);
    const raw = fs.readFileSync(abs, { encoding: 'utf8' });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error('Invalid JSON in catalog: ' + err.message);
    }
    if (!parsed || !Array.isArray(parsed.effects)) {
      throw new Error('Catalog must be an object with an "effects" array');
    }
    this.catalog = parsed;
    this.loadedPath = abs;
    this.indexByMatch = {};
    parsed.effects.forEach(e => {
      if (e && e.matchName) this.indexByMatch[e.matchName] = e;
    });
    return this.catalog;
  }

  getEffectByMatchName(matchName) {
    if (!this.catalog) throw new Error('Catalog not loaded');
    return this.indexByMatch[matchName] || null;
  }

  searchByDisplayName(query) {
    if (!this.catalog) throw new Error('Catalog not loaded');
    const q = String(query || '').toLowerCase();
    return this.catalog.effects.filter(e => (e.displayName || '').toLowerCase().indexOf(q) !== -1);
  }

  // effectRequest: { matchName: string, params: { <paramMatchName|paramName>: value } }
  validateEffectPayload(effectRequest) {
    if (!this.catalog) throw new Error('Catalog not loaded');
    const errors = [];
    if (!effectRequest || !effectRequest.matchName) {
      errors.push('effectRequest.matchName required');
      return { valid: false, errors };
    }
    const meta = this.getEffectByMatchName(effectRequest.matchName);
    if (!meta) {
      errors.push('effect not installed: ' + effectRequest.matchName);
      return { valid: false, errors };
    }
    const params = effectRequest.params || {};
    const props = meta.properties || [];
    props.forEach(p => {
      const key = p.matchName || p.name;
      const val = params[key];
      const t = (p.type || '').toLowerCase();
      if (typeof val === 'undefined') return; // not required by schema here
      switch (t) {
        case 'slider':
        case 'one-d':
        case 'oned':
          if (typeof val !== 'number' || Number.isNaN(val)) errors.push(key + ' must be number');
          if (typeof p.min !== 'undefined' && val < p.min) errors.push(key + ' < min ' + p.min);
          if (typeof p.max !== 'undefined' && val > p.max) errors.push(key + ' > max ' + p.max);
          break;
        case 'color':
          if (!Array.isArray(val) || val.length < 3) errors.push(key + ' must be an array [r,g,b] or [r,g,b,a]');
          else {
            for (let i = 0; i < val.length; i++) {
              if (typeof val[i] !== 'number' || val[i] < 0 || val[i] > 1) errors.push(key + '[' + i + '] must be number between 0 and 1');
            }
          }
          break;
        case '3d point':
        case '3dpoint':
        case 'threed':
          if (!Array.isArray(val) || val.length !== 3) errors.push(key + ' must be [x,y,z]');
          else for (let i = 0; i < 3; i++) if (typeof val[i] !== 'number') errors.push(key + '[' + i + '] must be number');
          break;
        case 'checkbox':
        case 'bool':
          if (typeof val !== 'boolean' && !(val === 0 || val === 1)) errors.push(key + ' must be boolean or 0/1');
          break;
        case 'layer':
          if (typeof val !== 'string' && typeof val !== 'number') errors.push(key + ' must be layer name string or layer index');
          break;
        case 'popup':
        case 'pop-up':
          if (typeof val !== 'number') errors.push(key + ' (popup) must be numeric index');
          break;
        default:
          // unknown type — do light validation
          break;
      }
    });

    return { valid: errors.length === 0, errors };
  }

  // Provide a fallback mapping for common third-party plugins to native AE ones
  resolveFallback(matchName) {
    const map = {
      // examples
      'BorisFX Optical Flares': 'ADBE Lens Blur',
      'RedGiant Trapcode Particular': 'ADBE Particle Playground',
      'BorisFX Continuum Lens Flare': 'ADBE Lens Blur'
    };
    if (this.indexByMatch[matchName]) return matchName; // installed
    return map[matchName] || null;
  }
}

module.exports = FXCatalogManager;
