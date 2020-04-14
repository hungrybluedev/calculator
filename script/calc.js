/// PRE-DEFINED OBJECTS AND CONSTANTS ///
import Decimal from "./decimal.js";
let buttonActivatedKeyFrames = [
    {},
    { filter: "brightness(0.2)" },
    { filter: "brightness(1.0)" },
];
let buttonActivatedTiming = {
    duration: 150,
    iterations: 1,
};
let MAX_DIGITS = 20;
/// FUNCTIONS ///
let getElementsUsingEncodedString = (encodedString) => {
    let ids = encodedString.split("|");
    let storage = [];
    ids.forEach((id) => storage.push(document.getElementById("btn-" + id)));
    return storage;
};
/**
 * Returns the numeric input buttons from the document.
 * The idea is to fetch all the buttons at once and access them easily
 * through the array later.
 *
 * Numeric buttons include all digit inputs, the BigInt point, as
 * well as the plus/minus sign change button.
 *
 * @returns {Array<HTMLButtonElement>} All numeric input buttons.
 */
let getNumericButtons = () => {
    let operationButtons = getElementsUsingEncodedString("dot|pm");
    for (let i = 0; i <= 9; i++) {
        operationButtons.push(document.getElementById("btn-" + i));
    }
    return operationButtons;
};
/**
 * Returns the 10 numeric input buttons from the document.
 *
 * @returns {Array<HTMLButtonElement>} All operation buttons.
 */
let getOperationButtons = () => {
    return getElementsUsingEncodedString("add|sub|mul|div|eq|rcp|pct|sqrt|sqr");
};
let getMemoryButtons = () => {
    return getElementsUsingEncodedString("mc|mr|mp|mm");
};
let getClearButtons = () => {
    return getElementsUsingEncodedString("ac|cl|del");
};
let isDigit = (input) => {
    return ("0" <= input && input <= "9") || input === ".";
};
let isOperation = (input) => {
    return "+-*/%".indexOf(input) >= 0;
};
let handleDigit = (calculator, digit) => {
    let isDot = digit === ".";
    let index = isDot ? 0 : 2 + parseInt(digit);
    let button = calculator.numericButtons[index];
    button.animate(buttonActivatedKeyFrames, buttonActivatedTiming);
    console.log(digit);
    let currentDigits = calculator.primary;
    // If the BigInt point is already present, we do not add it again
    if (isDot && currentDigits.indexOf(".") >= 0) {
        return;
    }
    // If the display is full and cannot store more digits, we return
    if (calculator.digits >= MAX_DIGITS) {
        return;
    }
    calculator.primary = currentDigits + digit;
    calculator.digits++;
    updateDisplays(calculator);
};
let handleSubtraction = (calculator) => {
    // There are two probable cases. One is where the primary string
    // is empty and we are hitting the subtraction operator for
    // the first time. In this case, we want the input to be a
    // negative number.
    if (!calculator.primary) {
        // Primary string is empty
    }
};
/**
 * Handles the keyboard input and performs the necessary actions.
 * Prevents the default action to ensure that unintended behaviour
 * does not occur.
 *
 * @param {Calculator} calculator The state object to manipulate.
 * @param {KeyboardEvent} event The event to react to.
 */
let handleKeyBoardInput = (calculator, event) => {
    // The "divide" key causes Firefox to open the search window
    event.preventDefault();
    let input = event.key;
    // event.key is a printable representation of the
    // key pressed. If it is a single character, we can
    // test if it is a digit. It can also be an operation
    if (input.length === 1) {
        if (isDigit(input)) {
            handleDigit(calculator, input);
        }
        if (isOperation(input)) {
            console.log(input);
            // The subtraction button has two different functions
            // That is why we delegate it to another function
            if (input === "-") {
                handleSubtraction(calculator);
                return;
            }
        }
    }
};
/**
 * Updates the primary and the equation displays based
 * on the string values of equation and primary; both of
 * these are properties of calculator.
 *
 * @param {Calculator} calculator The object to update.
 */
let updateDisplays = (calculator) => {
    calculator.equationDisplay.innerText = calculator.equation;
    calculator.primaryDisplay.innerText = calculator.primary;
};
/// GENERAL CODE ///
// Initialize the necessary components for the calculator
let calculator = {
    // Buttons
    numericButtons: getNumericButtons(),
    operationButtons: getOperationButtons(),
    memoryButtons: getMemoryButtons(),
    clearButtons: getClearButtons(),
    // Displays
    equationDisplay: document.getElementById("equation"),
    primaryDisplay: document.getElementById("primary"),
    memory: new Decimal(0),
    primary: "",
    equation: "",
    partial: new Decimal(0),
    digits: 0,
};
// Set the precision and the rounding mode
Decimal.set({ precision: MAX_DIGITS, rounding: Decimal.ROUND_HALF_EVEN });
console.log(calculator);
// Pressing a button has the same effect as typing
// in the necessary digit from the keyboard.
calculator.numericButtons.forEach((button) => {
    button.addEventListener("click", (_) => handleDigit(calculator, button.textContent));
});
// Add the key listener to the calculator
document.addEventListener("keypress", (event) => {
    handleKeyBoardInput(calculator, event);
});
