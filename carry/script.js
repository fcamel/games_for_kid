// Constants for sizes and timing
const RECT_HEIGHT = 40;
const RECT_MARGIN = 5;
const RECT_WIDTH_PERCENT = 80;
const BASE_DROP_DELAY = 200;
const BASE_DROP_DURATION = 800;
const BASE_CARRY_DELAY = 1000;
let CARRY_THRESHOLD = 10; // Make this mutable for different bases

// Stack configuration template
const STACK_TEMPLATES = [
    { id: 's0', value: 1, text: '1', className: 'rectangle' },
    { id: 's1', value: 10, text: '10', className: 'rectangle big-rectangle' },
    { id: 's2', value: 100, text: '100', className: 'rectangle hundred-rectangle' },
    { id: 's3', value: 1000, text: '1000', className: 'rectangle thousand-rectangle' },
    { id: 's4', value: 10000, text: '10000', className: 'rectangle ten-thousand-rectangle' },
    { id: 's5', value: 100000, text: '100000', className: 'rectangle hundred-thousand-rectangle' }
];

let STACKS = STACK_TEMPLATES.slice(0, 3); // Default to 3 stacks
let stackCounts = {};

function updateBase() {
    const baseInput = document.getElementById('baseInput');
    const base = parseInt(baseInput.value) || 10;
    
    if (base < 2 || base > 10) {
        alert('Please enter a base between 2 and 10');
        baseInput.value = CARRY_THRESHOLD;
        return;
    }

    CARRY_THRESHOLD = base;
    
    // Update stack height based on base number
    const height = base * (RECT_HEIGHT + RECT_MARGIN);
    document.documentElement.style.setProperty('--stack-height', `${height}px`);
    
    // Update stack values and text based on new base
    STACK_TEMPLATES.forEach((stack, index) => {
        const value = Math.pow(base, index);
        stack.value = value;
        stack.text = value.toString();
    });

    // Update current stacks
    updateStackCount();
    
    // Update digit input options
    const digitInput = document.getElementById('digitInput');
    digitInput.innerHTML = '<option value="">Select a digit</option>';
    for (let i = 1; i < base; i++) {
        const option = document.createElement('option');
        option.value = i.toString();
        option.textContent = i.toString();
        digitInput.appendChild(option);
    }
    digitInput.value = '1';

    // Update direct input max value
    const directInput = document.getElementById('directInput');
    const maxValue = Math.pow(base, STACKS.length) - 1;
    directInput.max = maxValue;
    directInput.placeholder = `Enter 1-${maxValue}`;
}

function updateStackCount() {
    const stackCountInput = document.getElementById('stackCountInput');
    const count = parseInt(stackCountInput.value) || 3;
    
    if (count < 3 || count > 6) {
        alert('Please enter a number between 3 and 6');
        stackCountInput.value = STACKS.length;
        return;
    }

    // Update STACKS array with current base values
    const base = CARRY_THRESHOLD;
    STACKS = STACK_TEMPLATES.slice(0, count).map((stack, index) => ({
        ...stack,
        value: Math.pow(base, index),
        text: Math.pow(base, index).toString()
    })).reverse();
    
    // Clear all existing stacks
    const container = document.querySelector('.stacks-container');
    container.innerHTML = '';
    
    // Create new stack elements in reverse order
    STACKS.forEach(stack => {
        container.appendChild(createStackElement(stack));
    });
    
    // Reset counts
    initializeStackCounts();
    updateCountDisplays();
    
    // Update max value for direct input
    const directInput = document.getElementById('directInput');
    const maxValue = Math.pow(base, count) - 1;
    directInput.min = 1;
    directInput.max = maxValue;
    directInput.placeholder = `Enter 1-${maxValue}`;
}

function initializeStackCounts() {
    stackCounts = STACKS.reduce((acc, stack) => {
        acc[stack.id] = 0;
        return acc;
    }, {});
}

function createStackElement(stack) {
    const stackDiv = document.createElement('div');
    stackDiv.id = stack.id;
    stackDiv.className = 'stack';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'stack-content';
    
    const countDiv = document.createElement('div');
    countDiv.className = 'stack-count';
    
    const countSpan = document.createElement('span');
    countSpan.id = `${stack.id}-count`;
    countSpan.textContent = '0';
    
    countDiv.appendChild(countSpan);
    stackDiv.appendChild(contentDiv);
    stackDiv.appendChild(countDiv);
    
    return stackDiv;
}

function updateCountDisplays() {
    STACKS.forEach(stack => {
        document.getElementById(`${stack.id}-count`).textContent = stackCounts[stack.id];
    });
}

function getStackContent(stackId) {
    return document.querySelector(`#${stackId} .stack-content`);
}

function createRectangle(stackConfig, position, isTemp = false) {
    const rect = document.createElement('div');
    rect.className = stackConfig.className;
    if (isTemp) rect.className += ' temp';
    rect.textContent = stackConfig.text;
    rect.style.top = `${position}px`;
    return rect;
}

function clearRectangles(stackId) {
    getStackContent(stackId).innerHTML = '';
}

function animateRectangles(rectangles, duration) {
    rectangles.forEach(rect => {
        rect.style.animation = `circleAnimation ${duration}s ease`;
    });
}

function moveRectangles(rectangles, duration, getNewPosition) {
    rectangles.forEach((rect, index) => {
        rect.classList.remove('temp');
        rect.style.transition = `top ${duration}ms ease, background-color ${duration}ms ease`;
        rect.style.top = `${getNewPosition(index)}px`;
    });
}

async function dropRectangle(rect, duration) {
    rect.style.transform = `translateY(-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stack-height')) + 300}px)`;
    await new Promise(resolve => setTimeout(resolve, 50));
    rect.style.transition = `transform ${duration}ms ease`;
    rect.style.transform = 'translateY(0)';
    // Wait for the drop animation to complete
    await new Promise(resolve => setTimeout(resolve, duration));
}

async function performCarryAnimation(fromStack, toStack, speedMultiplier, carryMultiplier) {
    const fromContent = getStackContent(fromStack.id);
    const toContent = getStackContent(toStack.id);
    const rectangles = Array.from(fromContent.querySelectorAll('.rectangle')).slice(0, CARRY_THRESHOLD);
    
    // Animate gathering rectangles
    animateRectangles(rectangles, 0.5 * carryMultiplier);
    await new Promise(resolve => setTimeout(resolve, 500 * speedMultiplier * carryMultiplier));
    
    // Remove old rectangles
    rectangles.forEach(rect => fromContent.removeChild(rect));
    
    // Create and drop new rectangle
    const newRect = createRectangle(toStack, calculatePosition(stackCounts[toStack.id]));
    toContent.appendChild(newRect);
    
    const dropDuration = BASE_DROP_DURATION * speedMultiplier * carryMultiplier * (toStack.value >= 100 ? 2 : 1);
    await dropRectangle(newRect, dropDuration);
    
    // Update counts
    stackCounts[fromStack.id] = 0;
    stackCounts[toStack.id]++;
    
    return Array.from(fromContent.querySelectorAll('.rectangle'));
}

async function performCarry() {
    const speedMultiplier = getAnimationSpeed();
    const carryMultiplier = getCarryDurationMultiplier();
    const remainingOperations = [];
    
    // Start from the last stack (ones) and move towards the first stack
    for (let i = STACKS.length - 1; i > 0; i--) {
        const currentStack = STACKS[i];
        const nextStack = STACKS[i - 1];
        
        if (stackCounts[currentStack.id] >= CARRY_THRESHOLD) {
            const remainingRectangles = await performCarryAnimation(
                currentStack,
                nextStack,
                speedMultiplier,
                carryMultiplier
            );
            
            // Store the remaining rectangles operation as a closure
            if (remainingRectangles.length > 0) {
                remainingOperations.push(async () => {
                    moveRectangles(
                        remainingRectangles,
                        BASE_DROP_DURATION * speedMultiplier * carryMultiplier,
                        calculatePosition
                    );
                    stackCounts[currentStack.id] = remainingRectangles.length;
                });
            }
            
            updateCountDisplays();
            
            // Check if we need to continue carrying
            if (stackCounts[nextStack.id] >= CARRY_THRESHOLD) {
                await new Promise(resolve => setTimeout(resolve, 200 * speedMultiplier)); // Small pause between carries
            }
        }
    }

    // Execute all remaining rectangle operations simultaneously
    await Promise.all(remainingOperations.map(op => op()));
}

function handleSubmit() {
    const messageDiv = document.getElementById('message');

    if (isAnimating) {
        messageDiv.innerText = 'Animation is still playing. Please wait.';
        messageDiv.style.color = 'red';
        return;
    }

    isAnimating = true;
    messageDiv.innerText = 'Animation is starting. Please wait...';
    messageDiv.style.color = 'red';

    const digitInput = document.getElementById('digitInput');
    const count = parseInt(digitInput.value) || 1;

    if (count < 1 || count > CARRY_THRESHOLD - 1) {
        messageDiv.innerText = `Please select a valid digit (1-${CARRY_THRESHOLD - 1})`;
        messageDiv.style.color = 'red';
        isAnimating = false;
        return;
    }

    // Get the ones stack (last stack in the reversed order)
    const onesStack = STACKS[STACKS.length - 1];
    const stackContent = getStackContent(onesStack.id);
    const totalCount = stackCounts[onesStack.id] + count;
    const willCarry = totalCount >= CARRY_THRESHOLD;
    const speedMultiplier = getAnimationSpeed();
    const dropDelay = BASE_DROP_DELAY * speedMultiplier;
    const dropDuration = BASE_DROP_DURATION * speedMultiplier;

    // Add new rectangles with animation
    const currentCount = stackCounts[onesStack.id];
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const isOutOfBounds = currentCount + i >= CARRY_THRESHOLD;
            const rect = createRectangle(onesStack, calculatePosition(currentCount + i), isOutOfBounds);
            rect.style.transform = `translateY(-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stack-height')) + 300}px)`;
            stackContent.appendChild(rect);

            setTimeout(() => {
                rect.style.transition = `transform ${dropDuration}ms ease`;
                rect.style.transform = 'translateY(0)';
            }, 50);
        }, i * dropDelay);
    }

    stackCounts[onesStack.id] += count;
    updateCountDisplays();

    if (stackCounts[onesStack.id] >= CARRY_THRESHOLD) {
        setTimeout(() => performCarry(), BASE_CARRY_DELAY * speedMultiplier + count * dropDelay);
    }

    digitInput.value = '1';

    setTimeout(() => {
        isAnimating = false;
        messageDiv.innerText = 'Animation complete! You can submit again.';
        messageDiv.style.color = 'green';
    }, (BASE_CARRY_DELAY * speedMultiplier + count * dropDelay) + (willCarry ? 500 * speedMultiplier * getCarryDurationMultiplier() : 0));
}

function handleDirectInput() {
    const directInput = document.getElementById('directInput');
    const value = parseInt(directInput.value);
    const maxValue = Math.pow(CARRY_THRESHOLD, STACKS.length) - 1;

    if (isNaN(value) || value < 1 || value > maxValue) {
        alert(`Please enter a number between 1 and ${maxValue}`);
        return;
    }

    // Clear all stacks
    STACKS.forEach(stack => clearRectangles(stack.id));

    // Calculate digits for each position
    const digits = STACKS.map((stack, index) => {
        const stackIndex = STACKS.length - 1 - index; // Reverse the index since stacks are reversed
        const divisor = Math.pow(CARRY_THRESHOLD, stackIndex);
        return Math.floor((value % (divisor * CARRY_THRESHOLD)) / divisor);
    });

    // Update counts and create rectangles
    STACKS.forEach((stack, index) => {
        stackCounts[stack.id] = digits[index];
        const content = getStackContent(stack.id);
        
        for (let i = 0; i < digits[index]; i++) {
            const rect = createRectangle(stack, calculatePosition(i));
            content.appendChild(rect);
        }
    });

    updateCountDisplays();
    directInput.value = '';
    directInput.blur();
}

// Event Listeners
document.body.addEventListener('keydown', (event) => {
    const digitInput = document.getElementById('digitInput');
    const directInput = document.getElementById('directInput');
    const key = event.key;

    // Don't prevent default if Alt or Ctrl is pressed
    if (event.altKey || event.ctrlKey) {
        return;
    }

    if (document.activeElement !== directInput) {
        if (key >= '1' && key <= (CARRY_THRESHOLD - 1).toString()) {
            event.preventDefault();
            digitInput.value = key;
        } else if (key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        }
        return;
    }

    if (document.activeElement === directInput && key === 'Enter') {
        event.preventDefault();
        handleDirectInput();
    }
});

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

let isAnimating = false;

function getAnimationSpeed() {
    return 1 / parseFloat(speedInput.value);
}

function getCarryDurationMultiplier() {
    return parseFloat(carryDurationInput.value);
}

function calculatePosition(index) {
    const stackHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stack-height'));
    const maxRectangles = CARRY_THRESHOLD * 2 - 1; // Maximum possible rectangles in a stack
    const totalHeight = maxRectangles * (RECT_HEIGHT + RECT_MARGIN);
    const startFromTop = totalHeight - stackHeight; // How far from top we should start
    return totalHeight - (RECT_HEIGHT + RECT_MARGIN) * (index + 1) - startFromTop;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    updateBase();
    initializeStackCounts();
    updateCountDisplays();
});