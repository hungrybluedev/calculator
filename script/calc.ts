//#region Imports, predefined constants

import Decimal from "./decimaljs/decimal.js";

/**
 * The click animation of a button is simple. It has 3 keyframes:
 * 1. Original, i.e. no change.
 * 2. Reduce brightness to 0.2.
 * 3. Return brightness to full.
 *
 * The original brightness is kept to accommodate for hover brightness.
 * A button animation can be triggered on click or when the appropriate
 * keyboard input is received.
 */
let buttonActivatedKeyFrames = [
  {},
  { filter: "brightness(0.2)" },
  { filter: "brightness(1.0)" },
];

// The timing properties of the button activated animation.
let buttonActivatedTiming = {
  // Noticeable duration, not too long.
  duration: 150,
  // We don't want repetitions.
  iterations: 1,
};

// This is the number of digits that the calculator will show.
// In case it is increased to a value above 20, remember to
// adjust the width of the calculator accordingly.
let MAX_DIGITS = 20;
// This is the number of digits of "cushioning" we keep
// in order to ensure that the calculations are accurate.
let BUFFER = 4;
// This is the number of digits we are willing to display
// in the equation line. Shorter because it looks cleaner
let EQUATION_PRECISION = 2;

// Sometimes even 23 (or whatever MAX_DIGITS + BUFFER is) digits
// is not enough for preserving the accuracy perfectly. We use
// some obvious trigger patters to provide cleaner results.
let TRUNCATION_TRIGGER = ""; // 0000...
let ROUND_UP_TRIGGER = ""; // 9999...

for (let i = 1; i < BUFFER; i++) {
  TRUNCATION_TRIGGER += "0";
  ROUND_UP_TRIGGER += "9";
}

// Constants that are required frequently for various operations
let _0 = new Decimal(0);
let _1 = new Decimal(1);
let _100 = new Decimal(100);
let _NaN = new Decimal(NaN);

let KBD_INPUT_DELAY = 50;

let OUT_OF_MEMORY = "Out of Memory";

//#endregion

//#region Interfaces

interface Calculator {
  // 4 categories of buttons
  numericButtons: Array<HTMLButtonElement>;
  operationButtons: Array<HTMLButtonElement>;
  memoryButtons: Array<HTMLButtonElement>;
  clearButtons: Array<HTMLButtonElement>;
  // Two lines of display
  equationDisplay: HTMLDivElement;
  primaryDisplay: HTMLDivElement;
  // Internal properties for calculation and storage
  // It is expected to update these internal properties
  // and the displays will be updated based on these.

  // memory and partial are the numeric types that the calculator
  // deals with. All the others are strings or state properties

  /** memory is the single numeric value that can be stored for later use */
  memory: Decimal.Instance;
  /**
   *  partial stores all the partial results and keeps on updating to
   *  generate the result everytime an operation is performed
   */
  partial: Decimal.Instance;

  /**
   * lastOperation stores a binary function that evaluates the result when needed.
   *
   * It is worthwhile to note that sqrt, square, plusminus and reciprocal are
   */
  lastOperation: (
    args: [Decimal.Instance, Decimal.Instance]
  ) => Decimal.Instance;
  primary: string;
  equation: string;
  allowChange: Boolean;
}

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
 * Order of buttons returned (easy reference for indexing):
 * 0. through 9. - Corresponding number buttons.
 * 10. Dot (Decimal Point)
 *
 * @returns {Array<HTMLButtonElement>} All numeric input buttons.
 */
let getNumericButtons = (): Array<HTMLButtonElement> => {
  let operationButtons = [] as Array<HTMLButtonElement>;
  for (let i = 0; i <= 9; i++) {
    operationButtons.push(
      document.getElementById("btn-" + i) as HTMLButtonElement
    );
  }
  operationButtons.push(
    document.getElementById("btn-dot") as HTMLButtonElement
  );
  return operationButtons;
};

/**
 * Returns all the operation buttons from the document.
 *
 * Operations can either be binary, like addition, division, etc. or unary
 * like reciprocal, square, square root. Equality is considered
 * an operation. It calculates the result of previous operations.
 *
 * Order of buttons returned (easy reference for indexing):
 * 0. Addition
 * 1. Subtraction
 * 2. Multiplication
 * 3. Division
 * 4. Equality
 * 5. Reciprocal
 * 6. Percentage
 * 7. Square root
 * 8. Square
 * 9. Plus/Minus
 *
 * @returns {Array<HTMLButtonElement>} All operation buttons.
 */
let getOperationButtons = (): Array<HTMLButtonElement> => {
  return getElementsUsingEncodedString(
    "add|sub|mul|div|eq|rcp|pct|sqrt|sqr|pm"
  );
};

/**
 * Returns the memory buttons.
 *
 * The memory buttons are the smaller ones and constitute the
 * first row of buttons. They operate exclusively with the
 * internal memory storage.
 *
 * Order of buttons returned (easy reference for indexing):
 * 0. Memory Clean
 * 1. Memory Recall
 * 2. Memory Plus (Add)
 * 3. Memory Minus (Subtract)
 *
 * @returns {Array<HTMLButtonElement>} All memory buttons.
 */
let getMemoryButtons = (): Array<HTMLButtonElement> => {
  return getElementsUsingEncodedString("mc|mr|mp|mm");
};

/**
 * Returns the three clear buttons.
 *
 * The buttons in order:
 * 0. Clear all - Clears the primary as well as the equation displays
 * 1. Clear - Clears only the primary, leaves the equation untouched
 * 2. Delete - Deletes the last entered digit (or dot) from the primary.
 */
let getClearButtons = (): Array<HTMLButtonElement> => {
  return getElementsUsingEncodedString("ac|cl|del");
};

//#endregion

//#region Utility functions

let getElementsUsingEncodedString = (
  encodedString: string
): Array<HTMLButtonElement> => {
  let ids = encodedString.split("|");
  let storage = [] as Array<HTMLButtonElement>;

  ids.forEach((id) =>
    storage.push(document.getElementById("btn-" + id) as HTMLButtonElement)
  );
  return storage;
};

let isDigit = (input: string): Boolean => {
  return ("0" <= input && input <= "9") || input === ".";
};

let isBinaryOperation = (input: string): Boolean => {
  return "+|-|*|/|&times;|&divide;|add|sub|mul|div".includes(input);
};

let isUnaryOperation = (input: string): Boolean => {
  return "%|rcp|pct|sqrt|sqr|pm".includes(input);
};

let isClearCommand = (input: string): Boolean => {
  return "Backspace|a|c".includes(input);
};

let lastChar = (input: string) => {
  return input[input.length - 1] || "[EMPTY STRING]";
};

let mapOp = (operation: string) => {
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

let relevantPart = (value: string, precision: number): string => {
  // Quick corner cases
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

  if (generatedString.indexOf(".") >= MAX_DIGITS) {
    return OUT_OF_MEMORY;
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
let updateDisplays = (calculator: Calculator) => {
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

let getDecimal = (value: string): Decimal.Instance => {
  return value === "." || !value ? _0 : new Decimal(value);
};

let removeLastChar = (value: string): string => {
  return value.substring(0, value.length - 1);
};

//#endregion

//#region Operation functions

let addition = (
  args: [Decimal.Instance, Decimal.Instance]
): Decimal.Instance => {
  return args[0].add(args[1]);
};

let subtraction = (
  args: [Decimal.Instance, Decimal.Instance]
): Decimal.Instance => {
  return args[0].sub(args[1]);
};

let multiplication = (
  args: [Decimal.Instance, Decimal.Instance]
): Decimal.Instance => {
  return args[0].mul(args[1]);
};

let division = (
  args: [Decimal.Instance, Decimal.Instance]
): Decimal.Instance => {
  try {
    return args[0].div(args[1]);
  } catch {
    return _NaN;
  }
};

let percentage = (value: Decimal.Instance): Decimal.Instance => {
  return value.div(_100);
};

let negate = (value: Decimal.Instance): Decimal.Instance => {
  return value.neg();
};

let reciprocal = (value: Decimal.Instance): Decimal.Instance => {
  return _1.div(value);
};

let square = (value: Decimal.Instance): Decimal.Instance => {
  return value.mul(value);
};

let sqrt = (value: Decimal.Instance): Decimal.Instance => {
  return value.sqrt();
};

//#endregion

//#region Handler functions

let handleDigit = (calculator: Calculator, digit: string) => {
  if (!calculator.allowChange) {
    calculator.primary = "";
    calculator.allowChange = true;
  }

  let isDot = digit === ".";
  let index = isDot ? 10 : parseInt(digit);
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

let updateLastOperationAndAnimate = (
  calculator: Calculator,
  operation: string
) => {
  let btnIndex: number;
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
  calculator.operationButtons[btnIndex].animate(
    buttonActivatedKeyFrames,
    buttonActivatedTiming
  );
};

let handleBinaryOperation = (calculator: Calculator, operation: string) => {
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
  } else {
    if (calculator.lastOperation) {
      // There exists an unevaluated operation
      // Complete that first, then we proceed.

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
    } else {
      calculator.equation += valueForDisplay + mapOp(operation);
      calculator.primary = "";
    }
  }

  updateLastOperationAndAnimate(calculator, operation);
};

let handleEquals = (calculator: Calculator) => {
  calculator.operationButtons[4].animate(
    buttonActivatedKeyFrames,
    buttonActivatedTiming
  );
  if (!calculator.lastOperation) {
    return;
  }
  if (calculator.primary === OUT_OF_MEMORY) {
    return;
  }

  let args: [Decimal.Instance, Decimal.Instance] = [
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

let handleUnaryOperation = (calculator: Calculator, operation: string) => {
  if (!calculator.primary || calculator.primary === OUT_OF_MEMORY) {
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

  calculator.operationButtons[btnIndex].animate(
    buttonActivatedKeyFrames,
    buttonActivatedTiming
  );

  let result = currentValue.toDecimalPlaces(MAX_DIGITS + BUFFER).toString();

  calculator.primary = relevantPart(result, MAX_DIGITS);
};

let handleClearButton = (calculator: Calculator, id: string) => {
  let button: HTMLButtonElement;
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
      } else {
        calculator.primary = "";
        calculator.allowChange = true;
      }
      break;
  }
  button.animate(buttonActivatedKeyFrames, buttonActivatedTiming);
};

let handleMemoryButton = (calculator: Calculator, id: string) => {
  let button: HTMLButtonElement;
  switch (id.substring(4)) {
    case "mc":
      button = calculator.memoryButtons[0];
      calculator.memory = _0;
      break;
    case "mr":
      button = calculator.memoryButtons[1];
      calculator.primary =
        relevantPart(calculator.memory.toString(), MAX_DIGITS) || "0.";
      break;
    case "mp":
      button = calculator.memoryButtons[2];
      calculator.memory = calculator.memory.add(
        new Decimal(relevantPart(calculator.primary, MAX_DIGITS))
      );
      calculator.allowChange = false;
      break;
    case "mm":
      button = calculator.memoryButtons[3];
      calculator.memory = calculator.memory.sub(
        new Decimal(relevantPart(calculator.primary, MAX_DIGITS))
      );
      calculator.allowChange = false;
      break;
  }
  button.animate(buttonActivatedKeyFrames, buttonActivatedTiming);
};

/**
 * Handles the keyboard input and performs the necessary actions.
 * Prevents the default action to ensure that unintended behaviour
 * does not occur.
 *
 * @param {Calculator} calculator The state object to manipulate.
 * @param {KeyboardEvent} event The event to react to.
 */
let handleKeyBoardInput = (calculator: Calculator, event: KeyboardEvent) => {
  let input = event.key;

  // event.key is a printable representation of the
  // key pressed. If it is a single character, we can
  // test if it is a digit. It can also be a binary operation

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
  equationDisplay: document.getElementById("equation") as HTMLDivElement,
  primaryDisplay: document.getElementById("primary") as HTMLDivElement,
  memory: _0,
  partial: _0,
  primary: "",
  equation: "",
  lastOperation: undefined,
  allowChange: true,
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
  } else if (isBinaryOperation(content)) {
    // We have the binary operators here
    button.addEventListener("click", (_) => {
      handleBinaryOperation(calculator, content);
      updateDisplays(calculator);
    });
  } else if (isUnaryOperation(content)) {
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

calculator.memoryButtons.forEach((button) => {
  button.addEventListener("click", (_) => {
    handleMemoryButton(calculator, button.id);
    updateDisplays(calculator);
  });
});

// Add the key listener to the calculator
document.onkeydown = (event) => {
  // preventDefault stops the following:
  // 1. Backspace from returning to the previous page
  // 2. / from searching in Firefox
  // 3. Also, | from activating. We use | as a separator in strings
  if ("Backspace|/".includes(event.key)) {
    event.preventDefault();
  }
  setTimeout(() => handleKeyBoardInput(calculator, event), KBD_INPUT_DELAY);
};

updateDisplays(calculator);
