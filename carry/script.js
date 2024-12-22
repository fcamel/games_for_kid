// Constants for sizes
const RECT_HEIGHT = 40;
const RECT_MARGIN = 5;
const STACK_HEIGHT = 460;
const RECT_WIDTH_PERCENT = 80;

// Animation timings
const BASE_DROP_DELAY = 200;
const BASE_DROP_DURATION = 800;
const BASE_CARRY_DELAY = 1000;

// Initialize the CSS variables
document.documentElement.style.setProperty('--rect-height', `${RECT_HEIGHT}px`);
document.documentElement.style.setProperty('--rect-margin', `${RECT_MARGIN}px`);
document.documentElement.style.setProperty('--stack-height', `${STACK_HEIGHT}px`);
document.documentElement.style.setProperty('--rect-width', `${RECT_WIDTH_PERCENT}%`);

let s0Count = 0;
let s1Count = 0;

// Speed controls
const speedInput = document.getElementById('speedInput');
const speedValue = document.getElementById('speedValue');
const carryDurationInput = document.getElementById('carryDurationInput');
const carryDurationValue = document.getElementById('carryDurationValue');

speedInput.addEventListener('input', function() {
    speedValue.textContent = `${this.value}x`;
});

carryDurationInput.addEventListener('input', function() {
    carryDurationValue.textContent = `${this.value}x`;
});

function getAnimationSpeed() {
    return 1 / parseFloat(speedInput.value);
}

function getCarryDurationMultiplier() {
    return parseFloat(carryDurationInput.value);
}

function updateCountDisplays() {
    document.getElementById('s0-count').textContent = s0Count;
    document.getElementById('s1-count').textContent = s1Count;
}

function calculatePosition(index) {
    return STACK_HEIGHT - (RECT_HEIGHT + RECT_MARGIN) * (index + 1);
}

function addRectangles() {
    const digitInput = document.getElementById('digitInput');
    const count = parseInt(digitInput.value) || 1;
    
    if (count < 1 || count > 9) {
        alert('Please select a valid digit (1-9)');
        return;
    }

    const s0Content = document.querySelector('#s0 .stack-content');
    const totalCount = s0Count + count;
    const willCarry = totalCount >= 10;
    const remainingCount = willCarry ? totalCount - 10 : 0;
    
    const speedMultiplier = getAnimationSpeed();
    const dropDelay = BASE_DROP_DELAY * speedMultiplier;
    const dropDuration = BASE_DROP_DURATION * speedMultiplier;
    
    // Add new rectangles with animation
    const currentS0Count = s0Count;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const isOutOfBounds = currentS0Count + i >= 10;
            const rect = document.createElement('div');
            rect.className = 'rectangle';
            if (isOutOfBounds) {
                rect.className += ' temp';
            }
            rect.textContent = '1';
            
            const top = calculatePosition(currentS0Count + i) - (isOutOfBounds ? RECT_MARGIN * 2 : 0);
            rect.style.top = `${top}px`;
            
            rect.style.transform = `translateY(-${STACK_HEIGHT + 300}px)`;
            s0Content.appendChild(rect);
            
            setTimeout(() => {
                rect.style.transition = `transform ${dropDuration}ms ease`;
                rect.style.transform = 'translateY(0)';
            }, 50);
        }, i * dropDelay);
    }

    s0Count += count;
    updateCountDisplays();
    
    if (s0Count >= 10) {
        setTimeout(() => performCarry(remainingCount), BASE_CARRY_DELAY * speedMultiplier + count * dropDelay);
    }
    
    digitInput.value = '1';
}

function performCarry(remainingCount) {
    const s0Content = document.querySelector('#s0 .stack-content');
    const s1Content = document.querySelector('#s1 .stack-content');
    const rectangles = Array.from(s0Content.querySelectorAll('.rectangle'));
    
    if (rectangles.length < 10) return;
    
    const speedMultiplier = getAnimationSpeed();
    const carryMultiplier = getCarryDurationMultiplier();
    const dropDuration = BASE_DROP_DURATION * speedMultiplier * carryMultiplier;
    
    rectangles.slice(0, 10).forEach(rect => {
        rect.style.animation = `circleAnimation ${0.5 * carryMultiplier}s ease`;
    });
    
    setTimeout(() => {
        rectangles.slice(0, 10).forEach(rect => {
            s0Content.removeChild(rect);
        });
        
        const bigRect = document.createElement('div');
        bigRect.className = 'rectangle big-rectangle';
        bigRect.textContent = '10';
        bigRect.style.top = `${calculatePosition(s1Count)}px`;
        bigRect.style.transform = `translateY(-${STACK_HEIGHT + 300}px)`;
        s1Content.appendChild(bigRect);
        
        setTimeout(() => {
            bigRect.style.transition = `transform ${dropDuration}ms ease`;
            bigRect.style.transform = 'translateY(0)';
        }, 50);
        
        s1Count++;
        s0Count = 0;
        
        const remainingRectangles = rectangles.slice(10);
        remainingRectangles.forEach((rect, index) => {
            rect.classList.remove('temp');
            rect.style.transition = `top ${dropDuration}ms ease, background-color ${dropDuration}ms ease`;
            rect.style.top = `${calculatePosition(index)}px`;
        });
        
        s0Count = remainingRectangles.length;
        updateCountDisplays();
    }, 500 * speedMultiplier * carryMultiplier);
}

document.body.addEventListener('keydown', (event) => {
    const digitInput = document.getElementById('digitInput');
    const key = event.key;
    
    if (key === 'Enter') {
        event.preventDefault();
        addRectangles();
        return;
    }
    
    if (key >= '1' && key <= '9') {
        digitInput.value = key;
        event.preventDefault();
    }
});

updateCountDisplays();