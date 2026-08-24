const STORAGE_KEY = 'koudaozi_data';

export function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load state:', error);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

export function initializeCards(characters) {
  return characters.map((char, index) => ({
    id: index,
    char: char.char,
    pinyin: char.pinyin,
    meaning: char.meaning,
    status: 'unknown',
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    lastReview: null,
    nextReview: null,
    introducedDate: null,
  }));
}
