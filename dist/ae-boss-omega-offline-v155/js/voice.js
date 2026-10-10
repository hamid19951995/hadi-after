(function () {
  "use strict";
  window.AEBossVoice = function (options) {
    options = options || {};
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = null, listening = false;
    var endpoint = options.transcriptionEndpoint || window.localStorage.getItem("aeBossVoiceEndpoint") || "";
    function supported() { return !!Recognition; }
    function start(language) {
      if (!Recognition) return Promise.reject(new Error("VOICE_RECOGNITION_UNAVAILABLE"));
      return new Promise(function (resolve, reject) {
        recognition = new Recognition();
        recognition.lang = language === "fa" ? "fa-IR" : (language || "en-US");
        recognition.continuous = false;
        recognition.interimResults = true;
        listening = true;
        var finalText = "", confidence = null;
        recognition.onresult = function (event) {
          var text = "";
          for (var i = event.resultIndex; i < event.results.length; i++) {
            var r = event.results[i]; text += r[0].transcript;
            if (r.isFinal) { finalText += r[0].transcript; confidence = r[0].confidence; }
            options.onInterim && options.onInterim(text.trim(), r.isFinal);
          }
        };
        recognition.onerror = function (e) { listening = false; reject(new Error(e.error || "VOICE_RECOGNITION_FAILED")); };
        recognition.onend = function () { listening = false; finalText ? resolve({ transcript: finalText.trim(), confidence: confidence, source: "browser-speech" }) : reject(new Error("VOICE_EMPTY_TRANSCRIPT")); };
        recognition.start();
      });
    }
    function stop() { if (recognition && listening) recognition.stop(); }
    function transcribeFile(file) {
      if (!endpoint) return Promise.reject(new Error("VOICE_TRANSCRIPTION_ENDPOINT_NOT_CONFIGURED"));
      var form = new FormData(); form.append("audio", file); form.append("language", options.language || "auto");
      return fetch(endpoint, { method: "POST", body: form }).then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || "VOICE_TRANSCRIPTION_FAILED"); return { transcript: b.text || b.transcript || "", confidence: b.confidence == null ? null : b.confidence, source: "audio-file" }; }); });
    }
    return { supported: supported, start: start, stop: stop, transcribeFile: transcribeFile, isListening: function(){ return listening; } };
  };
}());
