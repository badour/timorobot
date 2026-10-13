let speakToken = 0;
let speakTimer = 0;

export function hasNativeNavigation() {
  return typeof window.TimoHost?.navigate === "function";
}

export function hasNativeSpeech() {
  return typeof window.TimoHost?.speak === "function";
}

export function navigate(mapPoint) {
  if (!hasNativeNavigation()) return false;
  window.TimoHost.navigate(String(mapPoint || ""));
  return true;
}

export function stopSpeaking() {
  speakToken += 1;
  window.clearTimeout(speakTimer);
  window.speechSynthesis?.cancel();
}

export function speak(text, lang, hooks = {}) {
  const line = String(text || "").trim();
  const token = ++speakToken;
  window.clearTimeout(speakTimer);
  if (!line) {
    hooks.onend?.();
    return;
  }
  const finish = () => {
    if (token === speakToken) hooks.onend?.();
  };
  if (hasNativeSpeech()) {
    window.TimoHost.speak(line, lang);
    hooks.onstart?.();
    speakTimer = window.setTimeout(finish, Math.min(14000, 900 + line.length * 45));
    return;
  }
  if (!window.speechSynthesis) {
    finish();
    return;
  }
  const utter = new SpeechSynthesisUtterance(line);
  utter.lang = lang === "ar" ? "ar-SA" : "en-US";
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(lang));
  if (voice) utter.voice = voice;
  utter.onstart = () => {
    if (token === speakToken) hooks.onstart?.();
  };
  utter.onend = finish;
  utter.onerror = finish;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function createListener({ onResult, onEnd, onError }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let current = null;
  return {
    supported: Boolean(Recognition),
    start(lang) {
      if (!Recognition) {
        onError?.("unsupported");
        return;
      }
      current = new Recognition();
      current.lang = lang === "ar" ? "ar-SA" : "en-US";
      current.interimResults = false;
      current.maxAlternatives = 1;
      current.onresult = (event) => {
        onResult?.(event.results?.[0]?.[0]?.transcript || "");
      };
      current.onerror = (event) => onError?.(event.error || "error");
      current.onend = () => onEnd?.();
      current.start();
    },
    stop() {
      current?.stop();
    },
  };
}
