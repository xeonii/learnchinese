const TONE_MARK = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['v', 1], ǘ: ['v', 2], ǚ: ['v', 3], ǜ: ['v', 4],
  ń: ['n', 2], ň: ['n', 3], ǹ: ['n', 4],
  ḿ: ['m', 2],
};

function syllableToNumbered(syl) {
  let tone = 0;
  let out = '';
  for (const ch of syl) {
    if (TONE_MARK[ch]) {
      tone = TONE_MARK[ch][1];
      out += TONE_MARK[ch][0];
    } else {
      out += ch === 'ü' ? 'v' : ch;
    }
  }
  out = out.replace(/ü/g, 'v');
  if (/\d/.test(out)) return out;
  if (tone) return out + tone;
  return out;
}

export function toCanonical(input) {
  if (input == null) return '';
  let s = String(input)
    .trim()
    .toLowerCase()
    .replace(/u:/g, 'v')
    .replace(/ü/g, 'v')
    .replace(/['’\-]/g, ' ')
    .replace(/\s+/g, '');

  if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]/.test(s)) {
    const re = /(?:zh|ch|sh|[bpmfdtnlgkhjqxzcsryw])?(?:[iuvü]?[aeiouvüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+|[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiouvü]+)(?:ng|n|r)?|ńg|ňg|ǹg|ng|ḿ/gi;
    const matches = s.match(re) || [s];
    s = matches.map(syllableToNumbered).join('');
  }

  return s.replace(/ü/g, 'v');
}

export function pinyinMatches(input, target) {
  const a = toCanonical(input);
  const b = toCanonical(target);
  if (!a || !b) return false;
  if (a === b) return true;
  const stripNeutral = (x) => x.replace(/5/g, '');
  return stripNeutral(a) === stripNeutral(b);
}

export function syllableKey(pinyin) {
  return toCanonical(pinyin).replace(/[0-9]/g, '');
}
