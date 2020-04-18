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
let OUT_OF_MEMORY = "Out of Memory";
let getNumericButtons = () => {
    let operationButtons = [];
    for (let i = 0; i <= 9; i++) {
        operationButtons.push(document.getElementById("btn-" + i));
    }
    operationButtons.push(document.getElementById("btn-dot"));
    return operationButtons;
};
let getOperationButtons = () => {
    return getElementsUsingEncodedString("add|sub|mul|div|eq|rcp|pct|sqrt|sqr|pm");
};
let getMemoryButtons = () => {
    return getElementsUsingEncodedString("mc|mr|mp|mm");
};
let getClearButtons = () => {
    return getElementsUsingEncodedString("ac|cl|del");
};
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
    if (value === "0." || value === "." || value === "") {
        return "0.";
    }
    if (value === OUT_OF_MEMORY) {
        return OUT_OF_MEMORY;
    }
    let generatedString = new Decimal(value).toDecimalPlaces(precision).toFixed();
    if (generatedString.includes(TRUNCATION_TRIGGER)) {
        generatedString = new Decimal(value).truncated().toString();
    }
    if (generatedString.includes(ROUND_UP_TRIGGER)) {
        generatedString = new Decimal(value).truncated().add(1).toString();
    }
    if (generatedString.length > MAX_DIGITS) {
        return OUT_OF_MEMORY;
    }
    let shouldWeAddDot = !generatedString.includes(".");
    let optionalSuffix = shouldWeAddDot ? "." : "";
    let proposed = generatedString + optionalSuffix;
    return proposed;
};
let updateDisplays = (calculator) => {
    calculator.equationDisplay.innerHTML = calculator.equation || "0.";
    let textToDisplay = relevantPart(calculator.primary, MAX_DIGITS);
    if (textToDisplay === OUT_OF_MEMORY) {
        calculator.partial = _0;
        calculator.equation = "";
        calculator.primary = OUT_OF_MEMORY;
        calculator.allowChange = false;
    }
    calculator.primaryDisplay.innerHTML = textToDisplay || "0.";
};
let getDecimal = (value) => {
    return value === "." || !value ? _0 : new Decimal(value);
};
let removeLastChar = (value) => {
    return value.substring(0, value.length - 1);
};
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
let handleDigit = (calculator, digit) => {
    if (!calculator.allowChange) {
        calculator.primary = "";
        calculator.allowChange = true;
    }
    let isDot = digit === ".";
    let index = isDot ? 10 : parseInt(digit);
    let button = calculator.numericButtons[index];
    button.animate(buttonActivatedKeyFrames, buttonActivatedTiming);
    let currentContent = calculator.primary;
    if (isDot && currentContent.includes(".")) {
        return;
    }
    let precision = calculator.primary.length;
    if (isDot) {
        precision -= 1;
    }
    if (precision >= MAX_DIGITS) {
        return;
    }
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
        lastOpRemoved = removeLastChar(lastOpRemoved);
        calculator.equation = lastOpRemoved + mapOp(operation);
    }
    else {
        if (calculator.lastOperation) {
            handleEquals(calculator);
            updateDisplays(calculator);
        }
        if (calculator.primary === OUT_OF_MEMORY) {
            calculator.lastOperation = undefined;
            calculator.allowChange = false;
            return;
        }
        if (calculator.primary) {
            calculator.partial = getDecimal(calculator.primary);
        }
        let valueForDisplay = relevantPart(calculator.primary, EQUATION_PRECISION);
        if (valueForDisplay === OUT_OF_MEMORY) {
            calculator.equation = OUT_OF_MEMORY;
            calculator.lastOperation = undefined;
            calculator.allowChange = false;
            return;
        }
        else {
            calculator.equation += valueForDisplay + mapOp(operation);
            calculator.primary = "";
        }
    }
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
    calculator.allowChange = false;
};
let handleUnaryOperation = (calculator, operation) => {
    if (!calculator.primary || calculator.primary === OUT_OF_MEMORY) {
        return;
    }
    let currentValue = getDecimal(calculator.primary);
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
    let result = currentValue.toDecimalPlaces(MAX_DIGITS + BUFFER).toString();
    calculator.primary = relevantPart(result, MAX_DIGITS);
};
let handleClearButton = (calculator, id) => {
    let button;
    switch (id) {
        case "a":
        case "btn-ac":
            calculator.equation = "";
            calculator.primary = "";
            calculator.partial = _0;
            calculator.memory = _0;
            button = calculator.clearButtons[0];
            break;
        case "c":
        case "btn-cl":
            calculator.primary = "";
            button = calculator.clearButtons[1];
            break;
        case "Backspace":
        case "btn-del":
            button = calculator.clearButtons[2];
            if (calculator.allowChange) {
                calculator.primary = removeLastChar(calculator.primary);
            }
            else {
                calculator.primary = "";
                calculator.allowChange = true;
            }
            break;
    }
    button.animate(buttonActivatedKeyFrames, buttonActivatedTiming);
};
let handleMemoryButton = (calculator, id) => { };
let handleKeyBoardInput = (calculator, event) => {
    let input = event.key;
    if (input === "=" || input === "Enter") {
        handleEquals(calculator);
        updateDisplays(calculator);
        return;
    }
    if (isClearCommand(input)) {
        handleClearButton(calculator, input);
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
    updateDisplays(calculator);
};
let calculator = {
    numericButtons: getNumericButtons(),
    operationButtons: getOperationButtons(),
    memoryButtons: getMemoryButtons(),
    clearButtons: getClearButtons(),
    equationDisplay: document.getElementById("equation"),
    primaryDisplay: document.getElementById("primary"),
    memory: _0,
    partial: _0,
    primary: "",
    equation: "",
    lastOperation: undefined,
    allowChange: true,
};
Decimal.set({
    precision: MAX_DIGITS + BUFFER,
    rounding: Decimal.ROUND_HALF_EVEN,
    toExpPos: 8,
});
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
    let content = button.id.substring(4);
    if (content === "eq") {
        button.addEventListener("click", (_) => {
            handleEquals(calculator);
            updateDisplays(calculator);
        });
    }
    else if (isBinaryOperation(content)) {
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
document.onkeydown = (event) => {
    if ("Backspace|/".includes(event.key)) {
        event.preventDefault();
    }
    setTimeout(() => handleKeyBoardInput(calculator, event), KBD_INPUT_DELAY);
};
updateDisplays(calculator);
//# sourceMappingURL=calc.js.map