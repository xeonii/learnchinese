export function speakChinese(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.8;

  const voices = window.speechSynthesis.getVoices();
  const chineseVoice = voices.find(voice => voice.lang.startsWith('zh'));
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function normalizePinyin(input) {
  return input.toLowerCase().trim().replace(/[0-9]/g, '');
}

export function pinyinMatches(input, target) {
  const normalizedInput = normalizePinyin(input);
  const normalizedTarget = normalizePinyin(target);
  return normalizedInput === normalizedTarget;
}
