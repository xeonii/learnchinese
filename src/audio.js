function zhVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    return lang.startsWith('zh');
  });
}

export function pickChineseVoice() {
  const voices = zhVoices();
  return (
    voices.find((v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith('zh-cn'))
    || voices.find((v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith('zh-tw'))
    || voices[0]
    || null
  );
}

export function hasChineseVoice() {
  return Boolean(pickChineseVoice());
}

export function speakChinese(text) {
  if (!text || !('speechSynthesis' in window)) return false;
  const voice = pickChineseVoice();
  if (!voice) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang || 'zh-CN';
  utterance.voice = voice;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function onVoicesChanged(callback) {
  if (!('speechSynthesis' in window)) {
    callback(false);
    return () => {};
  }
  const notify = () => callback(hasChineseVoice());
  notify();
  window.speechSynthesis.addEventListener('voiceschanged', notify);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', notify);
}
