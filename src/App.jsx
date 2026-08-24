import { useState, useEffect } from 'react';
import './App.css';
import charactersData from './data/characters.json';
import { loadState, saveState, initializeCards } from './utils/storage';
import { calculateNextReview, getDueCards, getNewCardsForToday } from './utils/srs';
import { speakChinese, pinyinMatches } from './utils/audio';

const DAILY_NEW_LIMIT = 5;

function App() {
  const [cards, setCards] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [mode, setMode] = useState('loading');
  const [drillType, setDrillType] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [placementIndex, setPlacementIndex] = useState(0);
  const [multipleChoices, setMultipleChoices] = useState([]);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });

  useEffect(() => {
    const savedState = loadState();
    if (savedState && savedState.cards) {
      setCards(savedState.cards);
      setMode('menu');
    } else {
      const initialCards = initializeCards(charactersData);
      setCards(initialCards);
      setMode('placement');
      startPlacement(initialCards);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (cards.length > 0 && mode !== 'loading') {
      saveState({ cards });
    }
  }, [cards, mode]);

  const startPlacement = (cardList) => {
    const unknownCards = cardList.filter(c => c.status === 'unknown');
    if (unknownCards.length === 0 || placementIndex >= unknownCards.length) {
      setMode('menu');
      return;
    }
    setCurrentCard(unknownCards[placementIndex]);
    speakChinese(unknownCards[placementIndex].pinyin);
  };

  const handlePlacementChoice = (choice) => {
    const updatedCards = cards.map(c => {
      if (c.id === currentCard.id) {
        if (choice === 'know-both') {
          return { ...c, status: 'learning', introducedDate: new Date().toDateString() };
        } else if (choice === 'know-word') {
          return { ...c, status: 'new' };
        } else {
          return { ...c, status: 'unknown' };
        }
      }
      return c;
    });

    setCards(updatedCards);
    const nextIndex = placementIndex + 1;
    setPlacementIndex(nextIndex);

    const unknownCards = updatedCards.filter(c => c.status === 'unknown');
    if (nextIndex >= unknownCards.length || nextIndex >= 30) {
      setMode('menu');
    } else {
      setCurrentCard(unknownCards[nextIndex]);
      speakChinese(unknownCards[nextIndex].pinyin);
    }
  };

  const startDrill = (type) => {
    setDrillType(type);
    setSessionStats({ correct: 0, incorrect: 0 });
    nextCard(type);
  };

  const nextCard = (type) => {
    const dueCards = getDueCards(cards);
    const newCards = getNewCardsForToday(cards, DAILY_NEW_LIMIT);
    
    let availableCards = [];
    if (dueCards.length > 0) {
      availableCards = dueCards.filter(c => c.status === 'learning');
    } else if (newCards.length > 0) {
      availableCards = newCards;
    }

    if (availableCards.length === 0) {
      setMode('session-complete');
      return;
    }

    const card = availableCards[Math.floor(Math.random() * availableCards.length)];
    setCurrentCard(card);
    setUserInput('');
    setFeedback(null);
    setRevealed(false);
    setMode('drill');

    if (type === 'pinyin-to-char') {
      generateMultipleChoices(card);
      speakChinese(card.pinyin);
    }
  };

  const generateMultipleChoices = (correctCard) => {
    const choices = [correctCard.char];
    const otherCards = cards.filter(c => c.id !== correctCard.id && c.char !== correctCard.char);
    
    while (choices.length < 4 && otherCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherCards.length);
      const randomCard = otherCards[randomIndex];
      if (!choices.includes(randomCard.char)) {
        choices.push(randomCard.char);
      }
      otherCards.splice(randomIndex, 1);
    }

    setMultipleChoices(choices.sort(() => Math.random() - 0.5));
  };

  const handleSubmitPinyin = () => {
    const isCorrect = pinyinMatches(userInput, currentCard.pinyin);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setRevealed(true);
    
    if (isCorrect) {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }

    speakChinese(currentCard.char);
  };

  const handleChoiceClick = (choice) => {
    const isCorrect = choice === currentCard.char;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setRevealed(true);

    if (isCorrect) {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
  };

  const handleContinue = () => {
    const quality = feedback === 'correct' ? 4 : 2;
    const updatedCard = calculateNextReview(currentCard, quality);
    
    if (currentCard.status === 'new') {
      updatedCard.status = 'learning';
      updatedCard.introducedDate = new Date().toDateString();
    }

    const updatedCards = cards.map(c => c.id === currentCard.id ? updatedCard : c);
    setCards(updatedCards);
    
    nextCard(drillType);
  };

  const getTodayStats = () => {
    const today = new Date().toDateString();
    const newToday = cards.filter(c => c.introducedDate === today).length;
    const reviewed = cards.filter(c => {
      if (!c.lastReview) return false;
      const reviewDate = new Date(c.lastReview).toDateString();
      return reviewDate === today;
    }).length;
    
    return { newToday, reviewed };
  };

  const getProgress = () => {
    const learned = cards.filter(c => c.status === 'learning').length;
    const total = cards.length;
    return { learned, total, percentage: (learned / total) * 100 };
  };

  if (mode === 'loading') {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (mode === 'placement') {
    return (
      <div className="app">
        <div className="header">
          <h1>口到字</h1>
          <p>Placement Test</p>
        </div>
        <div className="content">
          <div className="card">
            <p style={{ fontSize: '20px', marginBottom: '24px' }}>
              Listen to the word. Do you know this character?
            </p>
            <button className="audio-btn" onClick={() => speakChinese(currentCard.pinyin)}>
              🔊
            </button>
            <div className="pinyin">{currentCard.pinyin}</div>
            <div className="placement-options">
              <button 
                className="placement-btn"
                onClick={() => handlePlacementChoice('know-both')}
              >
                ✓ Yes, I know the word and recognize the 汉字
              </button>
              <button 
                className="placement-btn"
                onClick={() => handlePlacementChoice('know-word')}
              >
                ~ I know the word but not the 汉字
              </button>
              <button 
                className="placement-btn"
                onClick={() => handlePlacementChoice('dont-know')}
              >
                ✗ I don't know this word
              </button>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: '#6b7280' }}>
            {placementIndex + 1} / {Math.min(30, cards.filter(c => c.status === 'unknown').length)}
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'menu') {
    const stats = getTodayStats();
    const progress = getProgress();
    const dueCount = getDueCards(cards).filter(c => c.status === 'learning').length;
    const newAvailable = getNewCardsForToday(cards, DAILY_NEW_LIMIT).length;

    return (
      <div className="app">
        <div className="header">
          <h1>口到字</h1>
          <p>Learn Chinese Characters Through Sound</p>
        </div>
        <div className="content">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
          </div>

          <div className="stats">
            <div className="stat-card">
              <span className="stat-value">{progress.learned}</span>
              <span className="stat-label">Characters Learned</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.newToday}</span>
              <span className="stat-label">New Today</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{dueCount}</span>
              <span className="stat-label">Due for Review</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.reviewed}</span>
              <span className="stat-label">Reviewed Today</span>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>Choose a Drill</h2>
            <div className="btn-group" style={{ flexDirection: 'column' }}>
              <button 
                className="btn btn-primary"
                onClick={() => startDrill('char-to-pinyin')}
                disabled={dueCount === 0 && newAvailable === 0}
              >
                字 → Pinyin
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => startDrill('pinyin-to-char')}
                disabled={dueCount === 0 && newAvailable === 0}
              >
                Pinyin + Audio → 字
              </button>
            </div>
            {dueCount === 0 && newAvailable === 0 && (
              <p style={{ textAlign: 'center', marginTop: '16px', color: '#6b7280' }}>
                All done for today! Come back tomorrow for more.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'session-complete') {
    return (
      <div className="app">
        <div className="header">
          <h1>口到字</h1>
          <p>Session Complete</p>
        </div>
        <div className="content">
          <div className="session-complete">
            <h2>Great work! 🎉</h2>
            <p>You've completed this session.</p>
            <div className="stats">
              <div className="stat-card">
                <span className="stat-value">{sessionStats.correct}</span>
                <span className="stat-label">Correct</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{sessionStats.incorrect}</span>
                <span className="stat-label">Incorrect</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setMode('menu')}>
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'drill' && currentCard) {
    if (drillType === 'char-to-pinyin') {
      return (
        <div className="app">
          <div className="header">
            <h1>口到字</h1>
            <p>字 → Pinyin</p>
          </div>
          <div className="content">
            <div className="stats" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <span className="stat-value">{sessionStats.correct}</span>
                <span className="stat-label">Correct</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{sessionStats.incorrect}</span>
                <span className="stat-label">Incorrect</span>
              </div>
            </div>

            <div className="card">
              <div className="character">{currentCard.char}</div>
              
              {!revealed ? (
                <>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Enter pinyin..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmitPinyin()}
                      autoFocus
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleSubmitPinyin}>
                    Submit
                  </button>
                </>
              ) : (
                <>
                  <div className={`feedback feedback-${feedback}`}>
                    {feedback === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
                  </div>
                  <div className="pinyin">{currentCard.pinyin}</div>
                  <div className="meaning">{currentCard.meaning}</div>
                  <button className="audio-btn" onClick={() => speakChinese(currentCard.char)}>
                    🔊
                  </button>
                  <button className="btn btn-primary" onClick={handleContinue}>
                    Continue
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (drillType === 'pinyin-to-char') {
      return (
        <div className="app">
          <div className="header">
            <h1>口到字</h1>
            <p>Pinyin + Audio → 字</p>
          </div>
          <div className="content">
            <div className="stats" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <span className="stat-value">{sessionStats.correct}</span>
                <span className="stat-label">Correct</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{sessionStats.incorrect}</span>
                <span className="stat-label">Incorrect</span>
              </div>
            </div>

            <div className="card">
              <button className="audio-btn" onClick={() => speakChinese(currentCard.pinyin)}>
                🔊
              </button>
              <div className="pinyin">{currentCard.pinyin}</div>
              
              {!revealed ? (
                <>
                  <p style={{ marginTop: '24px', marginBottom: '16px' }}>
                    Which character matches this sound?
                  </p>
                  <div className="choices">
                    {multipleChoices.map((choice, idx) => (
                      <button
                        key={idx}
                        className="choice-btn"
                        onClick={() => handleChoiceClick(choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className={`feedback feedback-${feedback}`}>
                    {feedback === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
                  </div>
                  <div className="character">{currentCard.char}</div>
                  <div className="meaning">{currentCard.meaning}</div>
                  <button className="btn btn-primary" onClick={handleContinue}>
                    Continue
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}

export default App;
