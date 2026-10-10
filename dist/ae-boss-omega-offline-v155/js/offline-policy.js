(function () {
  "use strict";
  var OFFLINE_KEY = "aeBossOfflineStrict";
  function isStrict() { return window.localStorage.getItem(OFFLINE_KEY) !== "0"; }
  function setStrict(enabled) { window.localStorage.setItem(OFFLINE_KEY, enabled ? "1" : "0"); }
  function allowed(url) {
    try { var u = new URL(url, window.location.href); return u.protocol === "file:" || u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "::1"; } catch (e) { return false; }
  }
  function recordBlocked(url, operation) {
    var entry = { url: String(url || ""), operation: operation, source: "offline-policy", timestamp: new Date().toISOString(), reason: "OFFLINE_STRICT" };
    try { var log = JSON.parse(window.localStorage.getItem("aeBossOfflineNetworkAudit") || "[]"); log.push(entry); window.localStorage.setItem("aeBossOfflineNetworkAudit", JSON.stringify(log.slice(-200))); } catch (e) {}
    return new Error("OFFLINE_STRICT_NETWORK_BLOCKED");
  }
  function guard(url, operation) { if (isStrict() && !allowed(url)) throw recordBlocked(url, operation); }
  var nativeFetch = window.fetch;
  if (nativeFetch) {
    window.fetch = function (url, options) {
      try { guard(url, "fetch"); } catch (error) { return Promise.reject(error); }
      return nativeFetch.apply(window, arguments);
    };
  }
  var NativeXHR = window.XMLHttpRequest;
  if (NativeXHR) {
    var XHR = function () { var request = new NativeXHR(); var open = request.open; request.open = function (method, url) { guard(url, "XMLHttpRequest"); return open.apply(request, arguments); }; return request; };
    XHR.prototype = NativeXHR.prototype;
    window.XMLHttpRequest = XHR;
  }
  var NativeWebSocket = window.WebSocket;
  if (NativeWebSocket) window.WebSocket = function (url, protocols) { guard(url, "WebSocket"); return protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols); };
  if (navigator && navigator.sendBeacon) { var nativeBeacon = navigator.sendBeacon.bind(navigator); navigator.sendBeacon = function (url, data) { guard(url, "sendBeacon"); return nativeBeacon(url, data); }; }
  if (typeof MutationObserver !== "undefined" && document && document.documentElement) {
    new MutationObserver(function (records) { records.forEach(function (record) { Array.prototype.forEach.call(record.addedNodes || [], function (node) { if (node.tagName === "SCRIPT" || node.tagName === "LINK") { var url = node.src || node.href; if (url && !allowed(url)) { if (isStrict()) { recordBlocked(url, "remote-resource"); node.remove(); } } } }); }); }).observe(document.documentElement, { childList: true, subtree: true });
  }
  window.AEBossOfflinePolicy = { isStrict: isStrict, setStrict: setStrict, networkAllowed: allowed, audit: function () { try { return JSON.parse(window.localStorage.getItem("aeBossOfflineNetworkAudit") || "[]"); } catch (e) { return []; } } };
})();
