const YOUDAO = (text) =>
  `https://dict.youdao.com/dictvoice?le=zh&type=2&audio=${encodeURIComponent(text)}`;

const BAIDU = (text) =>
  `https://fanyi.baidu.com/gettts?lan=zh&spd=4&source=web&text=${encodeURIComponent(text)}`;

let player = null;

export function isChineseText(text) {
  return /[\u4e00-\u9fff]/.test(String(text || ''));
}

export function chineseAudioUrl(text, provider = 'youdao') {
  return provider === 'baidu' ? BAIDU(text) : YOUDAO(text);
}

function getPlayer() {
  if (typeof Audio === 'undefined') return null;
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.playsInline = true;
    player.setAttribute('playsinline', '');
    player.controls = false;
    player.style.position = 'absolute';
    player.style.width = '0';
    player.style.height = '0';
    player.style.opacity = '0';
    player.setAttribute('aria-hidden', 'true');
    if (document.body) document.body.appendChild(player);
  }
  return player;
}

export function stopChinese() {
  if (player) {
    player.pause();
    player.removeAttribute('src');
    try { player.load(); } catch { /* ignore */ }
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function unlockAudio() {
  const el = getPlayer();
  if (!el) return;
  el.muted = true;
  el.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  el.play().catch(() => {}).finally(() => {
    el.muted = false;
  });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(id); resolve(value); },
      (error) => { clearTimeout(id); reject(error); },
    );
  });
}

async function playElement(src) {
  const el = getPlayer();
  if (!el) throw new Error('no audio');
  if (!el.isConnected && document.body) document.body.appendChild(el);
  el.pause();
  el.src = src;
  await withTimeout(el.play(), 5000);
}

async function playHttp(text) {
  const urls = [chineseAudioUrl(text, 'youdao'), chineseAudioUrl(text, 'baidu')];
  let lastError = null;
  for (const url of urls) {
    try {
      await playElement(url);
      return true;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('http audio failed');
}

function speakNative(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve(false);
  }
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith('zh'));
  if (!voice) return Promise.resolve(false);

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang || 'zh-CN';
    utterance.voice = voice;
    utterance.rate = 0.85;
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    utterance.onstart = () => done(true);
    utterance.onerror = () => done(false);
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
      setTimeout(() => done(window.speechSynthesis.speaking || window.speechSynthesis.pending), 400);
    }, 80);
  });
}

export async function speakChinese(text) {
  if (!isChineseText(text)) return false;
  stopChinese();
  try {
    await playHttp(text);
    return true;
  } catch {
    return speakNative(text);
  }
}

export function canPlayAudio() {
  return typeof window !== 'undefined';
}
