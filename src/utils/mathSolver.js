export function evaluateLeftToRight(expression) {
  if (!expression || expression.length === 0) return null;
  
  let result = parseFloat(expression[0]);
  if (isNaN(result)) return null;

  for (let i = 1; i < expression.length; i += 2) {
    const operator = expression[i];
    const nextVal = parseFloat(expression[i + 1]);
    
    if (isNaN(nextVal)) return null;

    switch (operator) {
      case '+': result += nextVal; break;
      case '-': result -= nextVal; break;
      case '×': result *= nextVal; break;
      case '÷': 
        if (nextVal === 0) return null;
        result /= nextVal; 
        break;
    }
  }
  
  return Math.round(result * 10000) / 10000;
}

export function formatExpression(tokens) {
  return tokens.join('');
}
