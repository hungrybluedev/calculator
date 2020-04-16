//#region Imports, predefined constants
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
let BUFFER = 3;
let EQUATION_PRECISION = 3;
let _1 = new Decimal(1);
let _100 = new Decimal(100);
//#endregion
//#region Element retrieval functions
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
    let operationButtons = getElementsUsingEncodedString("dot");
    for (let i = 0; i <= 9; i++) {
        operationButtons.push(document.getElementById("btn-" + i));
    }
    return operationButtons;
};
/**
 * Returns all the operation buttons from the document.
 *
 * Operations can either be binary, like addition, division, etc. or unary
 * like reciprocal, square, square root. Equality is considered
 * an operation. It calculates the result of previous operations.
 *
 * @returns {Array<HTMLButtonElement>} All operation buttons.
 */
let getOperationButtons = () => {
    return getElementsUsingEncodedString("add|sub|mul|div|eq|rcp|pct|sqrt|sqr|pm");
};
/**
 * Returns the memory buttons.
 */
let getMemoryButtons = () => {
    return getElementsUsingEncodedString("mc|mr|mp|mm");
};
let getClearButtons = () => {
    return getElementsUsingEncodedString("ac|cl|del");
};
//#endregion
//#region Utility functions
let getElementsUsingEncodedString = (encodedString) => {
    let ids = encodedString.split("|");
    let storage = [];
    ids.forEach((id) => storage.push(document.getElementById("btn-" + id)));
    return storage;
};
let isDigit = (input) => {
    return ("0" <= input && input <= "9") || input === ".";
};
let isBinaryOperation = (input) => {
    return "+-*/".includes(input);
};
let isUnaryOperation = (input) => {
    return "rcp|pct|sqrt|sqr|pm".includes(input);
};
let lastChar = (input) => {
    return input[input.length - 1] || "[EMPTY STRING]";
};
let mapOp = (operation) => {
    switch (operation) {
        case "/":
            return "&divide;";
        case "*":
            return "&times;";
        default:
            return operation;
    }
};
let relevantPart = (value, precision) => {
    // Quick corner cases
    if (value === "0." || value === ".") {
        return "0.";
    }
    let generatedString = new Decimal(value)
        .toDecimalPlaces(precision)
        .toString();
    let optionalSuffix = lastChar(value) === "." ? "." : "";
    // Add back any zeros we lost
    let zeroPadding = "";
    while (lastChar(value) === "0") {
        value = value.substring(0, value.length - 1);
        zeroPadding += "0";
    }
    return generatedString + zeroPadding + optionalSuffix;
};
/**
 * Updates the primary and the equation displays based
 * on the string values of equation and primary; both of
 * these are properties of calculator.
 *
 * NOTE: It is important to make sure that all other states
 * are up to date.
 *
 * @param {Calculator} calculator The object to update.
 */
let updateDisplays = (calculator) => {
    calculator.equationDisplay.innerHTML = calculator.equation || "0.";
    calculator.primaryDisplay.innerHTML =
        relevantPart(calculator.primary, MAX_DIGITS) || "0.";
};
//#endregion
//#region Operation functions
let addition = (args) => {
    return args[0].add(args[1]);
};
let subtraction = (args) => {
    return args[0].sub(args[1]);
};
let multiplication = (args) => {
    return args[0].mul(args[1]);
};
let division = (args) => {
    return args[0].div(args[1]);
};
let percentage = (value) => {
    return value.div(_100);
};
let negate = (value) => {
    return value.neg();
};
let reciprocal = (value) => {
    return _1.div(value);
};
let square = (value) => {
    return value.mul(value);
};
let sqrt = (value) => {
    return value.sqrt();
};
//#endregion
//#region Handler functions
let handleDigit = (calculator, digit) => {
    let isDot = digit === ".";
    let index = isDot ? 0 : 1 + parseInt(digit);
    let button = calculator.numericButtons[index];
    button.animate(buttonActivatedKeyFrames, buttonActivatedTiming);
    let currentContent = calculator.primary;
    // If the BigInt point is already present, we do not add it again
    if (isDot && currentContent.includes(".")) {
        return;
    }
    // If the display is full and cannot store more digits, we return
    let precision = calculator.primary.length;
    if (isDot) {
        precision -= 1;
    }
    if (precision >= MAX_DIGITS) {
        return;
    }
    calculator.primary = currentContent + digit;
};
let handleBinaryOperation = (calculator, operation) => {
    let last = lastChar(calculator.equation);
    if (isBinaryOperation(last) && !calculator.primary) {
        // If the user accidentally pressed the wrong operation
        // button, give them a chance to change the operation
        let len = calculator.equation.length;
        calculator.equation =
            calculator.equation.substring(0, len - 1) + mapOp(operation);
    }
    else {
        if (calculator.lastOperation) {
            // There exists an unevaluated operation
            // Complete that first, then we proceed.
            handleEquals(calculator);
            updateDisplays(calculator);
        }
        if (calculator.primary) {
            calculator.partial = new Decimal(calculator.primary);
        }
        calculator.equation +=
            relevantPart(calculator.primary, EQUATION_PRECISION) + mapOp(operation);
        calculator.primary = "";
    }
    // Store the lastOperation, which will be useful when
    // we need the final result. It is called by handleEquals
    switch (operation) {
        case "+":
            calculator.lastOperation = addition;
            break;
        case "-":
            calculator.lastOperation = subtraction;
            break;
        case "*":
            calculator.lastOperation = multiplication;
            break;
        case "/":
            calculator.lastOperation = division;
            break;
    }
};
let handleEquals = (calculator) => {
    if (!calculator.lastOperation) {
        return;
    }
    let args = [
        calculator.partial,
        new Decimal(calculator.primary),
    ];
    calculator.partial = calculator.lastOperation(args);
    calculator.lastOperation = undefined;
    calculator.primary = calculator.partial
        .toDecimalPlaces(MAX_DIGITS + BUFFER)
        .toString();
    calculator.equation = "";
};
let handleUnaryOperation = (calculator, operation) => {
    if (!calculator.primary) {
        return;
    }
    let currentValue = new Decimal(calculator.primary);
    console.log(operation);
    switch (operation) {
        case "btn-pct":
            currentValue = percentage(currentValue);
            break;
        case "btn-rcp":
            currentValue = reciprocal(currentValue);
            break;
        case "btn-sqrt":
            currentValue = sqrt(currentValue);
            break;
        case "btn-sqr":
            currentValue = square(currentValue);
            break;
        case "btn-pm":
            currentValue = negate(currentValue);
            break;
    }
    calculator.primary = currentValue
        .toDecimalPlaces(MAX_DIGITS + BUFFER)
        .toString();
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
    let input = event.key;
    if (event.key === "/") {
        event.preventDefault();
    }
    // event.key is a printable representation of the
    // key pressed. If it is a single character, we can
    // test if it is a digit. It can also be an operation
    if (input === "=" || input === "Enter") {
        handleEquals(calculator);
        updateDisplays(calculator);
        return;
    }
    if (input.length === 1) {
        if (isDigit(input)) {
            handleDigit(calculator, input);
        }
        if (isBinaryOperation(input)) {
            handleBinaryOperation(calculator, input);
        }
    }
    if (isUnaryOperation(input)) {
        handleBinaryOperation(calculator, input);
    }
    updateDisplays(calculator);
};
//#endregion
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
    partial: new Decimal(0),
    primary: "",
    equation: "",
    lastOperation: undefined,
};
// Set the precision and the rounding mode
Decimal.set({
    precision: MAX_DIGITS + BUFFER,
    rounding: Decimal.ROUND_HALF_EVEN,
});
console.log(calculator);
// Pressing a button has the same effect as typing
// in the necessary digit from the keyboard.
calculator.numericButtons.forEach((button) => {
    let content = button.innerHTML;
    if (isDigit(content)) {
        button.addEventListener("click", (_) => {
            handleDigit(calculator, content);
            updateDisplays(calculator);
        });
    }
});
calculator.operationButtons.forEach((button) => {
    let content = button.innerHTML;
    if (content === "=") {
        button.addEventListener("click", (_) => {
            handleEquals(calculator);
            updateDisplays(calculator);
        });
    }
    else if (isBinaryOperation(content)) {
        // We have the binary operators here
        button.addEventListener("click", (_) => {
            handleBinaryOperation(calculator, content);
            updateDisplays(calculator);
        });
    }
    else {
        button.addEventListener("click", (_) => {
            handleUnaryOperation(calculator, button.id);
            updateDisplays(calculator);
        });
    }
});
// Add the key listener to the calculator
document.onkeydown = (event) => {
    if ("Backspace".includes(event.key)) {
        event.preventDefault();
    }
};
document.addEventListener("keypress", (event) => {
    handleKeyBoardInput(calculator, event);
});
updateDisplays(calculator);
