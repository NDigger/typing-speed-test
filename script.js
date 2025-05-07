const wordList = document.getElementById('word-list');
const resultWpm = document.getElementById('result-wpm');
const resultAccuracy = document.getElementById('result-accuracy');
const resultsSection = document.getElementById('best-results');
const sessions = document.getElementById('sessions');
const averageWpm = document.getElementById('average-wpm');
const averageWpmInc = document.getElementById('average-wpm-inc');
const averageAccuracy = document.getElementById('average-accuracy');
const averageAccuracyInc = document.getElementById('average-accuracy-inc');
const statsSection = document.getElementById('stats');
const message = document.getElementById('footer-message');
const tryAgainBtn = document.getElementById('try-again');

let active = false;
let letterSpans = [];

const lastResultsStorageSize = 50;
const bestResultsStorageSize = 12;

const localData = JSON.parse(localStorage.getItem('stats')) ?? {
    bestResults: [],
    lastResults: [],
    sessions: 0,
    averageWpm: 0,
    averageAccuracy: 0,
}

const wordsAmountMin = 9;
const wordsAmountMax = 11; 
const getWordsAmount = () => Math.floor(Math.random() * (wordsAmountMax - wordsAmountMin + 1)) + wordsAmountMin;

const sessionDefault = {
    symbols: 0,
    timer: 0,
    mistakes: 0,
}

let session = {...sessionDefault};

let updateTimerInterval = null; // TIMER INTERVAL HANDLER (FOR WPM CALCUTATIONS)

const convertToPercent = value => `${Math.floor(value * 1000) / 10}%`;

const round = (value, figures = 1) => Math.floor(value * Math.pow(10, figures)) / Math.pow(10, figures);

const addClass = (node, className) => { 
    if (!node.classList.contains(className)) node.classList.add(className);
}

const removeClass = (node, className) => {
    if (node.classList.contains(className)) node.classList.remove(className);
}

const addRandomWord = async addSpace => {
    let data = []

    try {
        const response = await fetch('words.json');
        data = await response.json() // WORDS LIST
    } catch (err) {
        console.log(err);
        message.textContent = err;
        message.style.color = 'red';
    }

    const rndWord = data[Math.floor(Math.random() * data.length)].split('');
    const wordContainer = document.createElement('span');
    wordContainer.classList.add('word');

    const createSpan = letter => {
        const span = document.createElement('span');
        if (letter.toLowerCase() === 'space') {
            span.textContent = '·';
            span.setAttribute('data-key', letter);
        } else {
            span.textContent = letter;
            span.setAttribute('data-key', `key${letter}`);
        }
        span.classList.add('key');
        return span;
    }

    const includeSpan = span => {
        wordContainer.append(span);
        letterSpans.push(span);
        session.symbols++;
    }

    rndWord.forEach(letter => {
        const span = createSpan(letter);
        includeSpan(span);
    })

    wordList.append(wordContainer);

    if (addSpace) {
        const span = createSpan('space');
        span.style.padding = '0 10px';
        includeSpan(span);
    }
}

const createWordList = async length => {
    for (let i = 0; i < length; i++) await addRandomWord(i !== length - 1)
    console.log(1)
}

const clearWordList = () => {
    session = {...sessionDefault};
    letterSpans = [];
    wordList.innerHTML = '';
}

const beginWordTest = async length => {
    removeClass(statsSection, 'show');
    removeClass(wordList, 'completed');
    removeClass(wordList, 'inactive');
    clearWordList();
    await createWordList(length);
    active = true;
    message.textContent = 'Press any key to begin';
}

const stopWordTest = () => {
    active = false;
    clearInterval(updateTimerInterval);
    updateTimerInterval = null;
}

const wordTestCompletion = (data, session) => {
    data.sessions++;
    calculateResult(data, session);
    addClass(wordList, 'completed');
    addClass(statsSection, 'show');
    stopWordTest();
    loadResults(data);
    loadStats(data);
    saveStats(data);
}

const updateTimer = () => {
    updateTimerInterval = setInterval(() => {
        session.timer += 1 / 100;
    }, 10)
}

const loadResults = data => {
    resultsSection.innerHTML = `
        <h1>Best Results:</h1>
    `;
    for (let i = 0; i < bestResultsStorageSize && i < data.bestResults.length - 1; i++) {
        resultsSection.innerHTML += `
        <div class="best-result">
            <p class="wpm">${data.bestResults[i].wpm} WPM</p>
            <p class="accuracy">${convertToPercent(data.bestResults[i].accuracy)}</p>
        </div>
        `;
    }
}

const calculateResult = (data, session) => {
    const calculateAccuracy = (symbols, mistakes) => round((symbols - mistakes) / symbols);
    const result = {
        wpm: Math.floor(Math.floor(session.symbols / 5) / (session.timer / 60)), 
        accuracy: calculateAccuracy(session.symbols, session.mistakes),
    }

    const pushResultsTo = resultsArray => {
        resultsArray.push({
            wpm: result.wpm, 
            accuracy: calculateAccuracy(session.symbols, session.mistakes),
        });
    }

    if (data.lastResults.length < lastResultsStorageSize) pushResultsTo(data.lastResults);
    else {
        pushResultsTo(data.lastResults);
        data.lastResults.shift();
    }
    
    let isResultLowerFound = false;
    if (data.bestResults.length < bestResultsStorageSize) {
        pushResultsTo(data.bestResults);
        data.bestResults.sort((a, b) => b.wpm - a.wpm);
    } else {
        data.bestResults = data.bestResults.reverse().map(dataResult => {
            if (result.wpm > dataResult.wpm && !isResultLowerFound) {
                isResultLowerFound = true;
                return result;
            }
            return dataResult;
        }).sort((a, b) => b.wpm === a.wpm ? b.accuracy - a.accuracy : b.wpm - a.wpm);
    }

    const convertDifferenceText = value => value !== 0 ? `(${value > 0 ? `+${value.toFixed(1)}` : `${value.toFixed(1)}`})` : ``;
    const getDifferenceColor = value => value < 0 ? 'red' : 'yellowgreen';
    const oldAverageWpm = data.averageWpm;
    data.averageWpm = round((data.lastResults.reduce((sum, acc) => sum + acc.wpm, 0) / data.lastResults.length));
    const averageWpmDifference = round((data.averageWpm - oldAverageWpm));
    averageWpmInc.textContent = convertDifferenceText(averageWpmDifference);
    averageWpmInc.style.color = getDifferenceColor(averageWpmDifference)

    const oldAverageAccuracy = data.averageAccuracy;
    data.averageAccuracy = data.lastResults.reduce((sum, acc) => sum + acc.accuracy, 0) / data.lastResults.length;
    const averageAccuracyDifference = data.averageAccuracy - oldAverageAccuracy;
    averageAccuracyInc.textContent = convertDifferenceText(averageAccuracyDifference * 100).replace(/\)/, '%)');
    averageAccuracyInc.style.color = getDifferenceColor(averageAccuracyDifference);
    resultAccuracy.textContent = `Accuracy: ${convertToPercent(result.accuracy)}`;
    resultWpm.textContent = Math.floor(result.wpm);
}

// LOCAL STORAGE CONTROL
const saveStats = data => {
    localStorage.setItem('stats', JSON.stringify(data));
}

const loadStats = data => {
    averageWpm.textContent = data.averageWpm;
    averageAccuracy.textContent = convertToPercent(data.averageAccuracy);
    sessions.textContent = data.sessions;
}

const checkLetterInput = e => {
    const span = letterSpans[0];
    const nextSpan = letterSpans[1];
    if (updateTimerInterval == null) { // WORKS WHEN FIRST KEY IS PRESSED
        updateTimer();
        message.textContent = '';
    }
    if (!span || !active) return
    if (e.code.toLowerCase() === span.getAttribute('data-key').toLowerCase()) {
        removeClass(span, 'current-key');
        if (nextSpan) nextSpan.classList.add('current-key');
        addClass(span, 'entered');
        if (span.classList.contains('wrong')) span.classList.add('wrong-key');
        letterSpans.shift();
        if (!letterSpans.length) wordTestCompletion(localData, session);
    } else {
        if (!span.classList.contains('wrong')) session.mistakes++;
        addClass(span, 'wrong');
    }
}

const handleAnyInput = e => {
    if (!active) {
        if (!statsSection.classList.contains('show') || e.code === 'Enter') beginWordTest(getWordsAmount());
        return;
    }
}

const handleKeyInput = e => {
    if (active) checkLetterInput(e);
}


document.addEventListener('keydown', handleAnyInput);
document.addEventListener('click', handleAnyInput);
document.addEventListener('keydown', handleKeyInput);

document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === 'hidden' && active && !statsSection.classList.contains('show')) {
        stopWordTest();
        wordList.classList.add('inactive');
    };
});

tryAgainBtn.addEventListener('click', () => {if (!active) beginWordTest(getWordsAmount())})

createWordList(getWordsAmount()); // MENU WITH WORDS ON LOAD
loadStats(localData);