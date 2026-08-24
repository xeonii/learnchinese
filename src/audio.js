const YOUDAO = (text) =>
  `https://dict.youdao.com/dictvoice?le=zh&type=2&audio=${encodeURIComponent(text)}`;

const BAIDU = (text) =>
  `https://fanyi.baidu.com/gettts?lan=zh&spd=4&source=web&text=${encodeURIComponent(text)}`;

let currentAudio = null;

export function isChineseText(text) {
  return /[\u4e00-\u9fff]/.test(String(text || ''));
}

export function chineseAudioUrl(text, provider = 'youdao') {
  return provider === 'baidu' ? BAIDU(text) : YOUDAO(text);
}

function zhVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
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

function playFallback(text) {
  if (typeof Audio === 'undefined') return false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const audio = new Audio(chineseAudioUrl(text, 'youdao'));
  currentAudio = audio;
  audio.onerror = () => {
    const backup = new Audio(chineseAudioUrl(text, 'baidu'));
    currentAudio = backup;
    backup.play().catch(() => {});
  };
  audio.play().catch(() => {});
  return true;
}

export function speakChinese(text) {
  if (!isChineseText(text)) return false;

  const voice = pickChineseVoice();
  if (voice) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang || 'zh-CN';
    utterance.voice = voice;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  return playFallback(text);
}

export function canPlayAudio() {
  return typeof window !== 'undefined';
}

export function onVoicesChanged(callback) {
  const notify = () => callback(canPlayAudio());
  notify();
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return () => {};
  }
  window.speechSynthesis.addEventListener('voiceschanged', notify);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', notify);
}
