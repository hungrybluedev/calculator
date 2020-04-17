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
let EQUATION_PRECISION = 4;
let TRUNCATION_TRIGGER = ".";
let ROUND_UP_TRIGGER = ".";
for (let i = 0; i < EQUATION_PRECISION; i++) {
    TRUNCATION_TRIGGER += "0";
    ROUND_UP_TRIGGER += "9";
}
let _0 = new Decimal(0);
let _1 = new Decimal(1);
let _100 = new Decimal(100);
let _NaN = new Decimal(NaN);
let KBD_INPUT_DELAY = 50;
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
    return "+|-|*|/|&times;|&divide;|add|sub|mul|div".includes(input);
};
let isUnaryOperation = (input) => {
    return "%|rcp|pct|sqrt|sqr|pm".includes(input);
};
let isClearCommand = (input) => {
    return "Backspace|a|c".includes(input);
};
let lastChar = (input) => {
    return input[input.length - 1] || "[EMPTY STRING]";
};
let mapOp = (operation) => {
    switch (operation) {
        case "/":
        case "div":
            return "&divide;";
        case "*":
        case "mul":
            return "&times;";
        case "add":
            return "+";
        case "sub":
            return "-";
        default:
            return operation;
    }
};
let relevantPart = (value, precision) => {
    // Quick corner cases
    if (value === "0." || value === "." || value === "") {
        return "0.";
    }
    let generatedString = new Decimal(value)
        .toDecimalPlaces(precision)
        .toString();
    if (generatedString.includes(TRUNCATION_TRIGGER)) {
        generatedString = new Decimal(value).truncated().toString();
    }
    if (generatedString.includes(ROUND_UP_TRIGGER)) {
        generatedString = new Decimal(value).truncated().add(1).toString();
    }
    let shouldWeAddDot = !generatedString.includes(".");
    let optionalSuffix = shouldWeAddDot ? "." : "";
    let proposed = generatedString + optionalSuffix;
    return proposed;
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
let getDecimal = (value) => {
    return value === "." || !value ? _0 : new Decimal(value);
};
let removeLastChar = (value) => {
    return value.substring(0, value.length - 1);
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
    try {
        return args[0].div(args[1]);
    }
    catch {
        return _NaN;
    }
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
    // Add zero only if there is a digit or something already
    if (calculator.primary || digit !== "0") {
        calculator.primary = currentContent + digit;
    }
};
let handleBinaryOperation = (calculator, operation) => {
    let last = lastChar(calculator.equation);
    let lastOpRemoved = calculator.equation;
    if (last === ";") {
        let position = calculator.equation.lastIndexOf("&");
        lastOpRemoved = lastOpRemoved.substring(0, position + 1);
        last = calculator.equation.substring(position);
    }
    if (isBinaryOperation(last) && !calculator.primary) {
        // If the user accidentally pressed the wrong operation
        // button, give them a chance to change the operation
        lastOpRemoved = removeLastChar(lastOpRemoved);
        calculator.equation = lastOpRemoved + mapOp(operation);
    }
    else {
        if (calculator.lastOperation) {
            // There exists an unevaluated operation
            // Complete that first, then we proceed.
            handleEquals(calculator);
            updateDisplays(calculator);
        }
        if (calculator.primary) {
            calculator.partial = getDecimal(calculator.primary);
        }
        let valueForDisplay = relevantPart(calculator.primary, EQUATION_PRECISION);
        calculator.equation += valueForDisplay + mapOp(operation);
        calculator.primary = "";
    }
    // Store the lastOperation, which will be useful when
    // we need the final result. It is called by handleEquals
    let btnIndex;
    switch (operation) {
        case "+":
        case "add":
            btnIndex = 0;
            calculator.lastOperation = addition;
            break;
        case "-":
        case "sub":
            btnIndex = 1;
            calculator.lastOperation = subtraction;
            break;
        case "*":
        case "mul":
            btnIndex = 2;
            calculator.lastOperation = multiplication;
            break;
        case "/":
        case "div":
            btnIndex = 3;
            calculator.lastOperation = division;
            break;
    }
    calculator.operationButtons[btnIndex].animate(buttonActivatedKeyFrames, buttonActivatedTiming);
};
let handleEquals = (calculator) => {
    if (!calculator.lastOperation) {
        return;
    }
    let args = [
        calculator.partial,
        getDecimal(calculator.primary),
    ];
    calculator.partial = calculator.lastOperation(args);
    calculator.lastOperation = undefined;
    calculator.primary = calculator.partial
        .toDecimalPlaces(MAX_DIGITS + BUFFER)
        .toString();
    calculator.equation = "";
    calculator.allowDeletion = false;
};
let handleUnaryOperation = (calculator, operation) => {
    if (!calculator.primary) {
        return;
    }
    let currentValue = getDecimal(calculator.primary);
    // rcp|pct|sqrt|sqr|pm
    let btnIndex = 5;
    switch (operation) {
        case "rcp":
            btnIndex += 0;
            currentValue = reciprocal(currentValue);
            break;
        case "%":
        case "pct":
            btnIndex += 1;
            currentValue = percentage(currentValue);
            break;
        case "sqrt":
            btnIndex += 2;
            currentValue = sqrt(currentValue);
            break;
        case "sqr":
            btnIndex += 3;
            currentValue = square(currentValue);
            break;
        case "pm":
            btnIndex += 4;
            currentValue = negate(currentValue);
            break;
    }
    calculator.operationButtons[btnIndex].animate(buttonActivatedKeyFrames, buttonActivatedTiming);
    calculator.primary = currentValue
        .toDecimalPlaces(MAX_DIGITS + BUFFER)
        .toString();
};
let handleClearButton = (calculator, id) => {
    switch (id) {
        case "a":
        case "btn-ac":
            calculator.equation = "";
            calculator.partial = _0;
            calculator.memory = _0;
        case "c":
        case "btn-cl":
            calculator.primary = "";
            break;
        case "Backspace":
        case "btn-del":
            if (calculator.allowDeletion) {
                calculator.primary = removeLastChar(calculator.primary);
            }
            else {
                calculator.primary = "";
                calculator.allowDeletion = true;
            }
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
    let input = event.key;
    // if (event.key === "/") {
    //   event.preventDefault();
    // }
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
    if (isClearCommand(input)) {
        handleClearButton(calculator, input);
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
    memory: _0,
    partial: _0,
    primary: "",
    equation: "",
    lastOperation: undefined,
    allowDeletion: true,
};
// Set the precision and the rounding mode
Decimal.set({
    precision: MAX_DIGITS + BUFFER,
    rounding: Decimal.ROUND_HALF_EVEN,
    toExpPos: 8,
});
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
    // Remove the prefix "btn-"
    let content = button.id.substring(4);
    if (content === "eq") {
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
    else if (isUnaryOperation(content)) {
        button.addEventListener("click", (_) => {
            handleUnaryOperation(calculator, content);
            updateDisplays(calculator);
        });
    }
});
calculator.clearButtons.forEach((button) => {
    button.addEventListener("click", (_) => {
        handleClearButton(calculator, button.id);
        updateDisplays(calculator);
    });
});
// Add the key listener to the calculator
document.onkeydown = (event) => {
    if ("Backspace|/".includes(event.key)) {
        event.preventDefault();
    }
    setTimeout(() => handleKeyBoardInput(calculator, event), KBD_INPUT_DELAY);
};
updateDisplays(calculator);
