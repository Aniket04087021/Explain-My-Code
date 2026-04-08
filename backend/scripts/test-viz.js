const { simulateJavaScript } = require('../services/jsExecutionSimulator');
const { simulatePython } = require('../services/pythonExecutionSimulator');

const js = `function f(a){ return a + 1 }
let x = f(2)
console.log(x)`;
const rj = simulateJavaScript(js);
console.log('JS', rj.error || 'ok', 'steps', rj.executionSteps.length, 'out', rj.consoleOutput);

const py = `x = 1
print(x)`;
const rp = simulatePython(py);
console.log('PY', rp.error || 'ok', 'steps', rp.executionSteps.length, 'out', rp.consoleOutput);

const py2 = `def f():
    return 1
x = f()
print(x)`;
const rp2 = simulatePython(py2);
console.log('PY fn', rp2.error || 'ok', 'steps', rp2.executionSteps.length);

const js2 = `function bubbleSort(arr) {
  var n = arr.length;
  for (var i = 0; i < n - 1; i++) {
    for (var j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}
console.log(bubbleSort([3,1,2]).join(','));`;
const rj2 = simulateJavaScript(js2);
console.log('JS bubble', rj2.error || 'ok', 'steps', rj2.executionSteps.length, 'out', rj2.consoleOutput);
