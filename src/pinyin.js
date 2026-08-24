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

const MARKS = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
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

export function splitSyllables(canonical) {
  return String(canonical || '').match(/[a-z]+[0-9]?/g) || [];
}

export function toneOf(syllable) {
  const m = String(syllable).match(/([0-9])$/);
  return m ? Number(m[1]) : 5;
}

export function pinyinMatches(input, target) {
  return gradePinyin(input, target).result === 'correct';
}

export function syllableKey(pinyin) {
  return toCanonical(pinyin).replace(/[0-9]/g, '');
}

/**
 * Grade typed pinyin against a target.
 * - correct: same syllables and tones (neutral 5 may be omitted)
 * - tone-slip: same syllables, at least one explicit wrong tone
 * - wrong: different syllables, or tones omitted
 */
export function gradePinyin(input, target) {
  const a = toCanonical(input);
  const b = toCanonical(target);
  if (!a || !b) return { result: 'wrong', slips: [] };

  const stripNeutral = (x) => x.replace(/5/g, '');
  if (a === b || stripNeutral(a) === stripNeutral(b)) {
    return { result: 'correct', slips: [] };
  }

  const aSyl = splitSyllables(a);
  const bSyl = splitSyllables(b);
  if (aSyl.length !== bSyl.length) return { result: 'wrong', slips: [] };

  const aBase = aSyl.map((s) => s.replace(/[0-9]/g, ''));
  const bBase = bSyl.map((s) => s.replace(/[0-9]/g, ''));
  if (aBase.join('') !== bBase.join('')) {
    return { result: 'wrong', slips: [] };
  }

  const inputHasTone = aSyl.some((s) => /[0-9]$/.test(s));
  if (!inputHasTone) return { result: 'wrong', slips: [] };

  const slips = [];
  for (let i = 0; i < aSyl.length; i += 1) {
    if (!/[0-9]$/.test(aSyl[i])) {
      return { result: 'wrong', slips: [] };
    }
    const typed = toneOf(aSyl[i]);
    const expected = toneOf(bSyl[i]);
    if (typed !== expected) {
      slips.push({
        syllable: bBase[i],
        expected,
        typed,
        pair: `${expected}→${typed}`,
      });
    }
  }

  if (!slips.length) return { result: 'correct', slips: [] };
  return { result: 'tone-slip', slips };
}

export function toMarked(input) {
  const syls = splitSyllables(toCanonical(input));
  return syls.map(markSyllable).join('');
}

function markSyllable(syl) {
  const m = String(syl).match(/^([a-z]+)([0-9])?$/);
  if (!m) return syl;
  let body = m[1].replace(/v/g, 'ü');
  const tone = Number(m[2] || 5);
  if (tone === 5 || tone === 0) return body;

  let idx = body.indexOf('a');
  if (idx < 0) idx = body.indexOf('e');
  if (idx < 0 && body.includes('ou')) idx = body.indexOf('o');
  if (idx < 0) {
    for (let i = body.length - 1; i >= 0; i -= 1) {
      if ('iouü'.includes(body[i])) {
        idx = i;
        break;
      }
    }
  }
  if (idx < 0) return body;
  const ch = body[idx];
  const marks = MARKS[ch] || MARKS.v;
  return body.slice(0, idx) + marks[tone] + body.slice(idx + 1);
}
