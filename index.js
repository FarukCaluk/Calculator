const displayEl = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const keysEl = document.querySelector(".keys");

const OPERATORS = new Set(["+", "-", "*", "/"]);

let buffer = "0";
let expressionLine = "\u00a0";
let justEvaluated = false;

function isOperator(ch) {
  return OPERATORS.has(ch);
}

function formatForDisplay(raw) {
  return raw.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
}

function setExpressionLine(text) {
  expressionLine = text && text.trim().length > 0 ? text : "\u00a0";
  expressionEl.textContent = formatForDisplay(expressionLine);
}

function setBuffer(next) {
  buffer = next;
  displayEl.value = formatForDisplay(buffer);
}

function resetAll() {
  justEvaluated = false;
  setExpressionLine("\u00a0");
  setBuffer("0");
}

function lastNumberSegment(str) {
  // Returns the last numeric segment (including unary '-')
  let i = str.length - 1;
  while (i >= 0) {
    const ch = str[i];
    if (isOperator(ch)) {
      // treat unary minus as part of number
      if (ch === "-" && (i === 0 || isOperator(str[i - 1]))) {
        i--;
        continue;
      }
      break;
    }
    i--;
  }
  return str.slice(i + 1);
}

function appendDigit(digit) {
  if (justEvaluated) {
    setExpressionLine("\u00a0");
    setBuffer("0");
    justEvaluated = false;
  }

  if (digit === ".") {
    const segment = lastNumberSegment(buffer);
    if (segment.includes(".")) {
      return;
    }
    const last = buffer[buffer.length - 1];
    if (segment === "" || segment === "-" || isOperator(last)) {
      setBuffer(buffer + "0.");
      return;
    }
    setBuffer(buffer + ".");
    return;
  }

  const segment = lastNumberSegment(buffer);

  // Avoid awkward leading zeros like "00" or "5+03".
  if (segment === "0" && !segment.includes(".")) {
    if (digit === "0") {
      return;
    }
    setBuffer(buffer.slice(0, -1) + digit);
    return;
  }

  if (segment === "-0" && !segment.includes(".")) {
    if (digit === "0") {
      return;
    }
    setBuffer(buffer.slice(0, -1) + digit);
    return;
  }

  if (buffer === "0") {
    // (segment handled above)
    setBuffer(digit);
    return;
  }

  setBuffer(buffer + digit);
}

function appendOperator(op) {
  if (!OPERATORS.has(op)) return;

  if (justEvaluated) {
    justEvaluated = false;
  }

  // allow starting negative numbers
  if (buffer === "0" && op === "-") {
    setBuffer("-");
    return;
  }

  const last = buffer[buffer.length - 1];
  if (!last) return;

  if (isOperator(last)) {
    // replace operator (but keep unary '-')
    if (last === "-" && buffer.length === 1) return;
    setBuffer(buffer.slice(0, -1) + op);
    return;
  }

  setBuffer(buffer + op);
}

function backspace() {
  if (justEvaluated) {
    justEvaluated = false;
  }

  if (buffer.length <= 1) {
    setBuffer("0");
    return;
  }

  const next = buffer.slice(0, -1);
  if (next === "-" || next === "") {
    setBuffer("0");
    return;
  }
  setBuffer(next);
}

function normalizeNumber(n) {
  // Reduce common floating-point artifacts (e.g. 0.30000000000000004)
  return String(Number(n.toFixed(12)));
}

function percent() {
  if (buffer === "Error") {
    resetAll();
    return;
  }

  const segmentOriginal = lastNumberSegment(buffer);
  if (!segmentOriginal || segmentOriginal === "-") return;

  let segment = segmentOriginal;
  if (segment.endsWith(".")) {
    segment = segment.slice(0, -1);
  }
  if (!segment || segment === "-") return;

  const value = Number(segment);
  if (Number.isNaN(value)) return;

  const percentValue = value / 100;
  const replaced =
    buffer.slice(0, buffer.length - segmentOriginal.length) +
    normalizeNumber(percentValue);

  setBuffer(replaced);
  justEvaluated = false;
}

function canEvaluate(expr) {
  if (!expr) return false;
  if (!/^[0-9+\-*/.]+$/.test(expr)) return false;
  if (isOperator(expr[expr.length - 1])) return false;
  if (expr === "-") return false;
  if (expr.includes("..")) return false;
  return true;
}

function evaluate() {
  const expr = buffer;

  if (!canEvaluate(expr)) {
    setExpressionLine(expr);
    setBuffer("Error");
    setTimeout(() => {
      resetAll();
    }, 650);
    return;
  }

  try {
    // Safer than eval: still evaluates math, but we strictly control allowed characters.
    const result = Function(`"use strict"; return (${expr});`)();
    if (!Number.isFinite(result)) {
      throw new Error("Non-finite result");
    }

    setExpressionLine(expr + " =");
    setBuffer(String(result));
    justEvaluated = true;
  } catch {
    setExpressionLine(expr);
    setBuffer("Error");
    setTimeout(() => {
      resetAll();
    }, 650);
  }
}

function handleValue(value) {
  if (value == null) return;
  if (/^\d$/.test(value)) {
    appendDigit(value);
    return;
  }
  if (value === ".") {
    appendDigit(".");
    return;
  }
  if (OPERATORS.has(value)) {
    appendOperator(value);
    return;
  }
}

keysEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const value = btn.dataset.value;

  if (action === "clear") {
    resetAll();
    return;
  }
  if (action === "backspace") {
    backspace();
    return;
  }
  if (action === "percent") {
    percent();
    return;
  }
  if (action === "equals") {
    evaluate();
    return;
  }

  handleValue(value);
});

document.addEventListener("keydown", (e) => {
  const key = e.key;

  if (key === "Escape") {
    e.preventDefault();
    resetAll();
    return;
  }
  if (key === "Backspace") {
    e.preventDefault();
    backspace();
    return;
  }
  if (key === "Enter" || key === "=") {
    e.preventDefault();
    evaluate();
    return;
  }

  if (key === "%") {
    e.preventDefault();
    percent();
    return;
  }

  if (/^\d$/.test(key) || key === "." || OPERATORS.has(key)) {
    e.preventDefault();
    handleValue(key);
  }
});

resetAll();
