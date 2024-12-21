const gameBoard = document.getElementById('game-board');
const rowsSelect = document.getElementById('rows');
const colsSelect = document.getElementById('cols');
const startButton = document.getElementById('start-game');
const timerDisplay = document.getElementById('timer');
const correctSound = document.getElementById('correct-sound');
const errorSound = document.getElementById('error-sound');

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let startTime = null;
let timerInterval = null;

function updateTimer() {
    if (!startTime) return;
    
    const currentTime = new Date();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    
    timerDisplay.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    startTime = new Date();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function generateMathProblem(usedResults) {
    const operators = ['+', '-'];
    const maxAttempts = 50;  // Prevent infinite loop
    let attempts = 0;

    while (attempts < maxAttempts) {
        const num1 = Math.floor(Math.random() * 5) + 1;  // 1 to 5
        const num2 = Math.floor(Math.random() * 5) + 1;  // 1 to 5
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        const expression = `${num1}${operator}${num2}`;
        const result = operator === '+' ? num1 + num2 : num1 - num2;
        
        // Only use problems where result is between 0 and 9 and not used before
        if (result >= 0 && result <= 9 && !usedResults.has(result)) {
            return { expression, result };
        }
        attempts++;
    }
    return null;
}

function generateCardValues(rows, cols) {
    const pairs = (rows * cols) / 2;
    const values = [];
    const usedResults = new Set();
    
    while (values.length < pairs * 2) {
        const problem = generateMathProblem(usedResults);
        if (problem) {
            usedResults.add(problem.result);
            values.push({
                display: problem.expression,
                value: problem.result,
                type: 'expression'
            });
            values.push({
                display: problem.result.toString(),
                value: problem.result,
                type: 'result'
            });
        }
    }
    return values.sort(() => 0.5 - Math.random());
}

function createCard(cardData) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.value = cardData.value;
    card.dataset.type = cardData.type;
    card.dataset.display = cardData.display;
    card.addEventListener('click', flipCard);
    return card;
}

function flipCard() {
    if (lockBoard || this === firstCard) return;
    
    // Start timer on first card flip
    if (!startTime) {
        startTimer();
    }
    
    this.classList.add('revealed');
    this.textContent = this.dataset.display;

    if (!firstCard) {
        firstCard = this;
        return;
    }

    secondCard = this;
    lockBoard = true;

    checkForMatch();
}

function checkForMatch() {
    const isMatch = firstCard.dataset.value === secondCard.dataset.value &&
                   firstCard.dataset.type !== secondCard.dataset.type;
    isMatch ? disableCards() : unflipCards();
}

function disableCards() {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    correctSound.play();
    resetBoard();
    
    // Check if game is complete
    const matchedCards = document.querySelectorAll('.matched');
    const totalCards = document.querySelectorAll('.card');
    if (matchedCards.length === totalCards.length) {
        stopTimer();
        setTimeout(() => {
            const finalTime = timerDisplay.textContent;
            alert(`Congratulations! You won!\n${finalTime}`);
        }, 500);
    }
}

function unflipCards() {
    errorSound.play();
    setTimeout(() => {
        firstCard.classList.remove('revealed');
        secondCard.classList.remove('revealed');
        firstCard.textContent = '';
        secondCard.textContent = '';
        resetBoard();
    }, 1000);
}

function resetBoard() {
    [firstCard, secondCard, lockBoard] = [null, null, false];
}

function setupGame() {
    // Reset timer
    stopTimer();
    startTime = null;
    timerDisplay.textContent = 'Time: 00:00';
    
    // Clear existing board
    gameBoard.innerHTML = '';
    
    const rows = parseInt(rowsSelect.value);
    const cols = parseInt(colsSelect.value);
    
    if (rows * cols / 2 > 10) {
        alert('The grid size is too large! Maximum number of pairs is 10 (to avoid duplicate numbers).');
        return;
    }
    
    // Update grid layout
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, 100px)`;
    
    // Generate and shuffle cards
    const cardValues = generateCardValues(rows, cols);
    cardValues.forEach(cardData => {
        const card = createCard(cardData);
        gameBoard.appendChild(card);
    });
}

// Event listeners
startButton.addEventListener('click', setupGame);

// Initial setup
setupGame();
