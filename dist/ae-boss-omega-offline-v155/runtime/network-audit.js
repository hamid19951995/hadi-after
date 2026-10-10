(function (root, factory) {
    "use strict";
    if (typeof module !== "undefined" && module.exports) module.exports = factory();
    else root.AEBossNetworkAudit = factory();
})(typeof window !== "undefined" ? window : this, function () {
    "use strict";
    var PATTERNS = [
        { type: "fetch", expression: /\bfetch\s*\(/gi },
        { type: "xhr", expression: /\bXMLHttpRequest\b/gi },
        { type: "websocket", expression: /\bWebSocket\b/gi },
        { type: "remote-url", expression: /https?:\/\//gi },
        { type: "cdn", expression: /\b(?:cdn|cdnjs|unpkg|jsdelivr)\b/gi },
        { type: "external-font", expression: /fonts\.googleapis\.com|fonts\.gstatic\.com/gi },
        { type: "telemetry", expression: /sendBeacon|analytics|telemetry|mixpanel|segment/gi },
        { type: "remote-script", expression: /(?:script|link)[^>]+(?:src|href)\s*=\s*["']https?:/gi }
    ];
    function scanText(text, source) {
        var findings = [];
        PATTERNS.forEach(function (pattern) {
            var match;
            pattern.expression.lastIndex = 0;
            while ((match = pattern.expression.exec(String(text || "")))) findings.push({ type: pattern.type, token: match[0], source: source || "unknown", operation: "static-audit", policy: "OFFLINE_STRICT_BLOCK", index: match.index });
        });
        return findings;
    }
    function summarize(findings) {
        var summary = {};
        (findings || []).forEach(function (finding) { summary[finding.type] = (summary[finding.type] || 0) + 1; });
        return summary;
    }
    return { scanText: scanText, summarize: summarize, patterns: PATTERNS.map(function (pattern) { return pattern.type; }) };
});
