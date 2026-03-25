import { GameConfig } from './config.js';

export function generateLevel(levelNum) {
  let numInputs = 3;
  if (levelNum === 1) numInputs = 2;
  else if (levelNum === 2 || levelNum === 3) numInputs = 3;
  else if (levelNum === 4) numInputs = 4;
  else if (levelNum === 5) numInputs = 5;
  else if (levelNum === 6 || levelNum === 7) numInputs = 3;
  else if (levelNum >= 8 && levelNum <= 10) numInputs = 4;
  else if (levelNum >= 11 && levelNum <= 12) numInputs = 3;
  else if (levelNum >= 13 && levelNum <= 15) numInputs = 4;
  else if (levelNum >= 16 && levelNum <= 20) numInputs = 5;
  else if (levelNum >= 150) numInputs = 7;
  else if (levelNum >= 51) numInputs = 6;
  else if (levelNum >= 21) numInputs = 5;
  
  let numOperators = 1;
  if (levelNum <= 5) {
    numOperators = 0;
  } else if (levelNum <= 10) {
    numOperators = 1;
  } else if (numInputs === 3) {
    numOperators = 1;
  } else if (numInputs >= 4 && numInputs <= 6) {
    numOperators = Math.random() < 0.5 ? 1 : 2;
  } else if (numInputs === 7) {
    numOperators = Math.random() < 0.5 ? 2 : 3;
  }
  
  const numDigits = numInputs - numOperators;
  
  let operatorsList = ['+', '-'];
  if (levelNum >= 6 && levelNum <= 10) {
    operatorsList = ['+'];
  } else if (levelNum > 100) {
    operatorsList = ['+', '-', '×', '÷'];
  }
  
  // Vary outcomes slightly (e.g., targetOutcomesCount - 1 to targetOutcomesCount + 1)
  let baseOutcomesCount = 5;
  if (levelNum <= 5) {
    if (levelNum === 1) baseOutcomesCount = 2;
    else if (levelNum === 2) baseOutcomesCount = 3;
    else if (levelNum === 3) baseOutcomesCount = 4;
    else if (levelNum === 4) baseOutcomesCount = 5;
    else if (levelNum === 5) baseOutcomesCount = 6;
  } else if (levelNum <= 10) {
    if (levelNum === 6) baseOutcomesCount = 3;
    else if (levelNum === 7) baseOutcomesCount = 3;
    else if (levelNum === 8) baseOutcomesCount = 4;
    else if (levelNum === 9) baseOutcomesCount = 5;
    else if (levelNum === 10) baseOutcomesCount = 6;
  } else if (levelNum <= 20) {
    if (levelNum === 11 || levelNum === 12) baseOutcomesCount = 4;
    else if (levelNum === 13 || levelNum === 14) baseOutcomesCount = 5;
    else if (levelNum === 15) baseOutcomesCount = 6;
    else if (levelNum === 16) baseOutcomesCount = 6;
    else if (levelNum === 17 || levelNum === 18) baseOutcomesCount = 7;
    else if (levelNum === 19 || levelNum === 20) baseOutcomesCount = 8;
  } else if (numInputs === 4) baseOutcomesCount = 7;
  else if (numInputs === 5) baseOutcomesCount = 10;
  else if (numInputs === 6) baseOutcomesCount = 12;
  else if (numInputs >= 7) baseOutcomesCount = 14;
  
  let targetOutcomesCount;
  if (levelNum <= 20) {
    targetOutcomesCount = baseOutcomesCount;
  } else {
    targetOutcomesCount = Math.max(3, baseOutcomesCount + Math.floor(Math.random() * 3) - 1);
  }
  
  let bestLevel = null;
  let maxOutcomesFound = 0;
  let bestLevelData = null;
  
  const availableNumbers = GameConfig.getAvailableNumbers(levelNum);
  const startTime = Date.now();
  let timeoutReached = false;
  
  for (let attempt = 0; attempt < 500; attempt++) {
    if (Date.now() - startTime > 150) {
      break;
    }
    
    const inputs = [];
    for (let i = 0; i < numDigits; i++) {
      inputs.push(availableNumbers[Math.floor(Math.random() * availableNumbers.length)].toString());
    }
    for (let i = 0; i < numOperators; i++) {
      inputs.push(operatorsList[Math.floor(Math.random() * operatorsList.length)]);
    }
    
    const outcomesMap = new Map();
    let iterations = 0;
    
    const findChains = (currentChain, usedIndices) => {
      if (timeoutReached) return;
      if (++iterations % 1000 === 0) {
        if (Date.now() - startTime > 150) {
          timeoutReached = true;
          return;
        }
      }
      
      if (currentChain.length >= 2) {
        const lastToken = currentChain[currentChain.length - 1];
        if (!isNaN(parseInt(lastToken))) {
           const tokens = [];
           let currentNum = '';
           for (const val of currentChain) {
             if (!isNaN(parseInt(val))) {
               currentNum += val;
             } else {
               if (val === '-' && tokens.length === 0 && currentNum === '') {
                 currentNum = '-';
               } else {
                 if (currentNum !== '') { tokens.push(currentNum); currentNum = ''; }
                 tokens.push(val);
               }
             }
           }
           if (currentNum !== '' && currentNum !== '-') tokens.push(currentNum);
           
           if (tokens.length > 0) {
             let res = parseFloat(tokens[0]);
             let valid = !isNaN(res);
             for (let j = 1; j < tokens.length; j += 2) {
               const op = tokens[j];
               const val = parseFloat(tokens[j+1]);
               if (isNaN(val)) { valid = false; break; }
               if (op === '+') res += val;
               else if (op === '-') res -= val;
               else if (op === '×') res *= val;
               else if (op === '÷') {
                 if (val === 0 || res % val !== 0) { valid = false; break; }
                 res /= val;
               }
             }
             
             if (valid && res > 0 && Number.isInteger(res)) {
               const hasOp = currentChain.some((t, idx) => isNaN(parseInt(t)) && !(t === '-' && idx === 0));
               if (!outcomesMap.has(res)) {
                 outcomesMap.set(res, { expression: currentChain.join(''), isConcat: !hasOp });
               } else {
                 // Prefer math expressions over concat expressions if they yield the same result
                 if (hasOp && outcomesMap.get(res).isConcat) {
                   outcomesMap.set(res, { expression: currentChain.join(''), isConcat: false });
                 }
               }
             }
           }
        }
      }
      
      for (let i = 0; i < inputs.length; i++) {
        if (!usedIndices.has(i)) {
          const isOp = isNaN(parseInt(inputs[i]));
          const lastIsOp = currentChain.length > 0 && isNaN(parseInt(currentChain[currentChain.length - 1]));
          if (isOp && lastIsOp) continue;
          if (isOp && currentChain.length === 0 && inputs[i] !== '-') continue;
          
          usedIndices.add(i);
          currentChain.push(inputs[i]);
          findChains(currentChain, usedIndices);
          currentChain.pop();
          usedIndices.delete(i);
        }
      }
    };
    
    findChains([], new Set());
    
    const allOutcomes = Array.from(outcomesMap.entries()).map(([val, data]) => ({ value: val, expression: data.expression, isConcat: data.isConcat }));
    
    let mathOutcomes = allOutcomes.filter(o => !o.isConcat);
    let concatOutcomes = allOutcomes.filter(o => o.isConcat);
    
    mathOutcomes.sort(() => Math.random() - 0.5);
    concatOutcomes.sort(() => Math.random() - 0.5);
    
    let selectedOutcomes = [];
    if (levelNum <= 5) {
      selectedOutcomes = [...concatOutcomes];
    } else if (levelNum <= 10) {
      selectedOutcomes = [...mathOutcomes, ...concatOutcomes];
    } else {
      const allowConcat = Math.random() < 0.05; // 5% chance to include concatenated outcomes
      
      if (allowConcat && concatOutcomes.length > 0) {
          // If allowed, include at most 1 concatenated outcome to keep it rare
          selectedOutcomes = [concatOutcomes[0], ...mathOutcomes];
      } else {
          selectedOutcomes = [...mathOutcomes];
      }
    }
    
    selectedOutcomes = selectedOutcomes.slice(0, targetOutcomesCount);
    
    if (selectedOutcomes.length > maxOutcomesFound) {
      maxOutcomesFound = selectedOutcomes.length;
      bestLevelData = {
        id: levelNum,
        inputs: inputs,
        outcomes: selectedOutcomes
      };
    }

    if (selectedOutcomes.length >= targetOutcomesCount) {
      bestLevel = {
        id: levelNum,
        inputs: inputs,
        outcomes: selectedOutcomes
      };
      break;
    }
  }
  
  return bestLevel || bestLevelData;
}
