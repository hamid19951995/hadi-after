(function (root, factory) {
    "use strict";
    if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./offline-core.js"));
    else root.AEBossOfflineCache = factory(root.AEBossOfflineCore);
})(typeof window !== "undefined" ? window : this, function (offlineCore) {
    "use strict";
    var VERSION = "offline-cache.v1";
    function memoryStore() { var values = {}; return { getItem: function (key) { return values[key] || null; }, setItem: function (key, value) { values[key] = value; }, removeItem: function (key) { delete values[key]; } }; }
    function Cache(storage) { this.storage = storage || (typeof localStorage !== "undefined" ? localStorage : memoryStore()); }
    Cache.prototype.key = function (namespace, input) { return "aeBossOfflineCache:" + VERSION + ":" + namespace + ":" + offlineCore.hash(input); };
    Cache.prototype.put = function (namespace, input, value) { var key = this.key(namespace, input); var entry = { version: VERSION, key: key, inputHash: offlineCore.hash(input), value: value, valueHash: offlineCore.hash(value), timestamp: new Date().toISOString() }; this.storage.setItem(key, JSON.stringify(entry)); return entry; };
    Cache.prototype.get = function (namespace, input) { var key = this.key(namespace, input), raw = this.storage.getItem(key); if (!raw) return null; try { var entry = JSON.parse(raw); if (entry.version !== VERSION || entry.key !== key || entry.inputHash !== offlineCore.hash(input) || entry.valueHash !== offlineCore.hash(entry.value)) { this.storage.removeItem(key); return null; } return entry; } catch (error) { this.storage.removeItem(key); return null; } };
    Cache.prototype.invalidate = function (namespace, input) { this.storage.removeItem(this.key(namespace, input)); };
    return { VERSION: VERSION, Cache: Cache };
});
