# 口到字 (kǒu-dào-zì)

**From Sound to Character** - A spaced repetition web app for heritage Mandarin speakers learning to read Chinese characters.

## Overview

口到字 helps heritage speakers who understand spoken Mandarin but need to connect the sounds they know to written 汉字 (Chinese characters). Built for learners with strong listening comprehension who primarily read and type in pinyin.

## Features

- **Placement Test**: Quickly categorize characters you already know vs. need to learn
- **Two Drill Modes**:
  - 字 → Pinyin: See a character, type its pronunciation
  - Pinyin + Audio → 字: Hear a word, choose the correct character
- **Spaced Repetition**: SM-2 algorithm for optimal learning intervals
- **Progress Tracking**: Monitor your character recognition against ~1,600 G1-2 curriculum characters
- **Client-Only**: All data stored locally (no accounts, no server)
- **Daily Limits**: Maximum 5 new characters per day to prevent overwhelm
- **Review Priority**: Due reviews shown before new characters

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to the URL shown (typically `http://localhost:5173`).

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Deploy these static files to any web host.

## Data

The app includes 400+ simplified Chinese characters from the 课标 基本字表 (National Curriculum Basic Character List) covering Grade 1-2 high-frequency characters. Each character includes:

- Simplified 汉字
- Pinyin with tone marks
- English meaning
- Audio pronunciation via Web Speech API (browser TTS)

## Usage

### First Session

1. **Placement Test**: Listen to words and indicate:
   - ✓ Know word + character
   - ~ Know word, not character
   - ✗ Don't know word
   
2. **Choose a Drill**: Practice with either:
   - Character → Pinyin (typing practice)
   - Pinyin + Audio → Character (recognition practice)

3. **Daily Practice**: Complete reviews first, then learn up to 5 new characters per day

### Pinyin Input

Both numbered pinyin (ni3, hao3) and marked pinyin (nǐ, hǎo) are accepted. Tones are normalized for matching.

## Design Decisions

- **No handwriting recognition**: Focus on reading/typing workflow
- **No speech scoring**: Audio is a model, not assessed
- **No grammar**: Pure character-sound association
- **HSK-independent**: Progress tracked against G1-2 curriculum, not HSK levels
- **Simplified only**: Traditional characters not included
- **No Anki import**: Purpose-built for heritage learners' specific needs

## Technical Stack

- React 18
- Vite 5
- Web Speech API for TTS
- localStorage for persistence
- SM-2 spaced repetition algorithm

## Browser Support

Requires a modern browser with:
- ES6+ JavaScript
- localStorage
- Web Speech API (for audio)

Best experience in Chrome/Edge (best Chinese TTS support).

## License

MIT License - see LICENSE file for details

## Contributing

This is a v1 focused on core functionality. Contributions welcome for:
- Additional character sets
- Improved TTS pronunciation
- Bug fixes
- Performance improvements

## Data Sources

Character selection based on:
- 《义务教育语文课程标准》基本字表
- High-frequency character lists from G1-2 Chinese curriculum

---

Built for heritage speakers by understanding their unique starting point: strong ears, developing eyes.
