'use strict';

const acorn = require('acorn');

const MAX_STEPS = 15000;
const MAX_LOOP_ITER = 200000;

const HIDDEN_GLOBAL_KEYS = new Set(['console', 'Math']);

const FORBIDDEN_IDS = new Set([
  'eval', 'Function', 'require', 'import', 'fetch', 'XMLHttpRequest',
  'process', 'global', 'globalThis', 'window', 'document', 'WebSocket',
  '__proto__', 'constructor'
]);

class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

class BreakSignal {}
class ContinueSignal {}

class Environment {
  constructor(parent = null) {
    this.vars = Object.create(null);
    this.parent = parent;
  }

  get(name) {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) return this.vars[name];
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError(`${name} is not defined`);
  }

  setLocal(name, val) {
    this.vars[name] = val;
  }

  /** For assignment: own binding or parent assign */
  assign(name, val) {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
      this.vars[name] = val;
      return;
    }
    if (this.parent) {
      this.parent.assign(name, val);
      return;
    }
    throw new ReferenceError(`${name} is not defined`);
  }

  hasLocal(name) {
    return Object.prototype.hasOwnProperty.call(this.vars, name);
  }
}

function stringifyVal(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'function') return `[Function]`;
  if (v && v.__native) return `[Native:${v.name}]`;
  if (v && v.type === 'js-function') return `[Function:${v.name || 'anonymous'}]`;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function serializeForStep(v) {
  if (v === null || v === undefined || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
    return v;
  }
  if (typeof v === 'function') return '[Function]';
  if (v && v.__native) return `[Native:${v.name}]`;
  if (v && v.type === 'js-function') return `[Function:${v.name || 'anonymous'}]`;
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return stringifyVal(v);
  }
}

function serializeEnv(env) {
  const out = {};
  for (const k of Object.keys(env.vars)) {
    if (k === 'arguments' || HIDDEN_GLOBAL_KEYS.has(k)) continue;
    out[k] = serializeForStep(env.vars[k]);
  }
  return out;
}

function mergeVisibleVars(globalEnv, localEnv) {
  const g = serializeEnv(globalEnv);
  if (!localEnv || localEnv === globalEnv) return { ...g };
  const l = serializeEnv(localEnv);
  return { ...g, ...l };
}

function createContext(code) {
  const sourceLines = code.split(/\r?\n/);
  return {
    sourceLines,
    steps: [],
    consoleLines: [],
    stepNo: 0,
    globalEnv: null,
    callDepth: 0
  };
}

function recordStep(ctx, line, globalEnv, localEnv, frameName) {
  if (ctx.steps.length >= MAX_STEPS) {
    throw new Error('Step limit exceeded — try shorter code or fewer loop iterations');
  }
  ctx.stepNo += 1;
  const idx = Math.max(0, line - 1);
  const code = (ctx.sourceLines[idx] || '').trimEnd();
  const variables = mergeVisibleVars(globalEnv, localEnv);
  const frames = [
    { name: 'Global', scope: 'global', variables: serializeEnv(globalEnv) }
  ];
  if (localEnv && localEnv !== globalEnv) {
    frames.push({
      name: frameName || 'Local',
      scope: 'local',
      variables: serializeEnv(localEnv)
    });
  }
  ctx.steps.push({
    step: ctx.stepNo,
    line,
    code,
    variables,
    frames,
    output: ctx.consoleLines.join('\n')
  });
}

function makeNative(name, fn) {
  return { __native: true, name, fn };
}

function createJsFunction(node, closureEnv, name) {
  return {
    type: 'js-function',
    name: name || (node.id && node.id.name) || 'anonymous',
    params: node.params,
    body: node.body,
    closure: closureEnv
  };
}

function hoistFunctionDeclarations(body, env) {
  for (const st of body) {
    if (st.type === 'FunctionDeclaration' && st.id) {
      env.setLocal(st.id.name, createJsFunction(st, env, st.id.name));
    }
  }
}

function assignTarget(targetNode, value, ctx, env, frameName) {
  if (targetNode.type === 'Identifier') {
    env.assign(targetNode.name, value);
    return;
  }
  if (targetNode.type === 'MemberExpression') {
    const obj = evalExpr(targetNode.object, ctx, env, frameName);
    const prop = targetNode.computed
      ? evalExpr(targetNode.property, ctx, env, frameName)
      : targetNode.property.name;
    if (obj == null) throw new TypeError(`Cannot assign to property of ${obj}`);
    obj[prop] = value;
    return;
  }
  throw new Error('Unsupported assignment target in destructuring');
}

function evalExpr(node, ctx, env, frameName) {
  if (!node) return undefined;

  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'UnaryExpression': {
      const v = evalExpr(node.argument, ctx, env, frameName);
      if (node.operator === '-') return -v;
      if (node.operator === '+') return +v;
      if (node.operator === '!') return !v;
      if (node.operator === '~') return ~v;
      if (node.operator === 'void') return undefined;
      if (node.operator === 'typeof') return typeof v;
      throw new Error(`Unsupported unary operator: ${node.operator}`);
    }
    case 'BinaryExpression': {
      const left = evalExpr(node.left, ctx, env, frameName);
      const right = evalExpr(node.right, ctx, env, frameName);
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '%': return left % right;
        case '**': return left ** right;
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        case '==': return left == right; // eslint-disable-line eqeqeq
        case '!=': return left != right; // eslint-disable-line eqeqeq
        case '===': return left === right;
        case '!==': return left !== right;
        case '<<': return left << right;
        case '>>': return left >> right;
        case '>>>': return left >>> right;
        case '|': return left | right;
        case '&': return left & right;
        case '^': return left ^ right;
        case 'in': return left in right;
        case 'instanceof': return left instanceof right;
        default:
          throw new Error(`Unsupported binary operator: ${node.operator}`);
      }
    }
    case 'LogicalExpression': {
      if (node.operator === '&&') {
        const l = evalExpr(node.left, ctx, env, frameName);
        return l && evalExpr(node.right, ctx, env, frameName);
      }
      if (node.operator === '||') {
        const l = evalExpr(node.left, ctx, env, frameName);
        return l || evalExpr(node.right, ctx, env, frameName);
      }
      if (node.operator === '??') {
        const l = evalExpr(node.left, ctx, env, frameName);
        return (l == null) ? evalExpr(node.right, ctx, env, frameName) : l; // eslint-disable-line eqeqeq
      }
      throw new Error(`Unsupported logical operator: ${node.operator}`);
    }
    case 'Identifier': {
      if (FORBIDDEN_IDS.has(node.name)) {
        throw new Error(`Identifier "${node.name}" is not allowed in the sandbox`);
      }
      return env.get(node.name);
    }
    case 'ArrayExpression': {
      return node.elements.map(el => (el ? evalExpr(el, ctx, env, frameName) : undefined));
    }
    case 'ObjectExpression': {
      const o = {};
      for (const p of node.properties) {
        if (p.type !== 'Property' || p.kind !== 'init') continue;
        const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
        o[key] = evalExpr(p.value, ctx, env, frameName);
      }
      return o;
    }
    case 'MemberExpression': {
      const obj = evalExpr(node.object, ctx, env, frameName);
      const prop = node.computed
        ? evalExpr(node.property, ctx, env, frameName)
        : node.property.name;
      if (obj == null) throw new TypeError(`Cannot read property of ${obj}`);
      return obj[prop];
    }
    case 'CallExpression': {
      const callee = node.callee;
      const args = node.arguments.map(a => evalExpr(a, ctx, env, frameName));
      return invoke(callee, args, ctx, env, frameName);
    }
    case 'AssignmentExpression': {
      const right = evalExpr(node.right, ctx, env, frameName);
      if (node.left.type === 'ArrayPattern') {
        if (node.operator !== '=') throw new Error('Compound destructuring assignment not supported');
        if (!Array.isArray(right)) throw new TypeError('Array pattern assignment expects an array');
        node.left.elements.forEach((el, i) => {
          if (el) assignTarget(el, right[i], ctx, env, frameName);
        });
        return right;
      }
      if (node.left.type === 'Identifier') {
        if (node.operator === '=') {
          env.assign(node.left.name, right);
          return right;
        }
        const cur = env.get(node.left.name);
        let next;
        switch (node.operator) {
          case '+=': next = cur + right; break;
          case '-=': next = cur - right; break;
          case '*=': next = cur * right; break;
          case '/=': next = cur / right; break;
          case '%=': next = cur % right; break;
          default: throw new Error(`Unsupported assignment: ${node.operator}`);
        }
        env.assign(node.left.name, next);
        return next;
      }
      if (node.left.type === 'MemberExpression') {
        const obj = evalExpr(node.left.object, ctx, env, frameName);
        const prop = node.left.computed
          ? evalExpr(node.left.property, ctx, env, frameName)
          : node.left.property.name;
        if (node.operator !== '=') throw new Error('Compound member assignment not supported');
        obj[prop] = right;
        return right;
      }
      throw new Error('Unsupported assignment target');
    }
    case 'UpdateExpression': {
      if (node.argument.type === 'Identifier') {
        const name = node.argument.name;
        const cur = Number(env.get(name));
        if (node.operator === '++') {
          const n = node.prefix ? cur + 1 : cur;
          env.assign(name, cur + 1);
          return node.prefix ? cur + 1 : cur;
        }
        if (node.operator === '--') {
          const n = node.prefix ? cur - 1 : cur;
          env.assign(name, cur - 1);
          return node.prefix ? cur - 1 : cur;
        }
      }
      throw new Error('Unsupported update expression');
    }
    case 'SequenceExpression': {
      let last;
      for (const e of node.expressions) {
        last = evalExpr(e, ctx, env, frameName);
      }
      return last;
    }
    case 'ConditionalExpression': {
      return evalExpr(node.test, ctx, env, frameName)
        ? evalExpr(node.consequent, ctx, env, frameName)
        : evalExpr(node.alternate, ctx, env, frameName);
    }
    case 'ThisExpression':
      throw new Error('"this" is not supported in the sandbox');
    case 'TemplateLiteral': {
      let s = '';
      for (let i = 0; i < node.quasis.length; i++) {
        s += node.quasis[i].value.cooked || '';
        if (node.expressions[i]) {
          s += String(evalExpr(node.expressions[i], ctx, env, frameName));
        }
      }
      return s;
    }
    default:
      throw new Error(`Unsupported expression: ${node.type}`);
  }
}

function callArrayStringMethod(obj, key, args) {
  if (Array.isArray(obj)) {
    if (key === 'join') return obj.join(args[0] != null ? String(args[0]) : ',');
    if (key === 'push') {
      obj.push(...args);
      return obj.length;
    }
    if (key === 'pop') return obj.pop();
    if (key === 'shift') return obj.shift();
    if (key === 'unshift') return obj.unshift(...args);
    if (key === 'slice') return obj.slice(
      args[0] != null ? Number(args[0]) : 0,
      args[1] != null ? Number(args[1]) : undefined
    );
    if (key === 'concat') return obj.concat(...args);
  }
  if (typeof obj === 'string') {
    if (key === 'slice') return obj.slice(
      args[0] != null ? Number(args[0]) : 0,
      args[1] != null ? Number(args[1]) : undefined
    );
    if (key === 'split') return obj.split(args[0] != null ? args[0] : '');
    if (key === 'charAt') return obj.charAt(Number(args[0]) || 0);
  }
  throw new Error(`Method ${String(key)} not supported on this value`);
}

function invoke(calleeNode, args, ctx, env, frameName) {
  if (calleeNode.type === 'MemberExpression') {
    const obj = evalExpr(calleeNode.object, ctx, env, frameName);
    const key = calleeNode.computed
      ? evalExpr(calleeNode.property, ctx, env, frameName)
      : calleeNode.property.name;
    const fn = obj[key];
    if (fn && fn.__native) {
      return fn.fn.apply(null, args);
    }
    if (fn && fn.type === 'js-function') {
      return callUserFunction(fn, args, ctx, frameName);
    }
    if (typeof fn === 'function' && obj === Math) {
      return fn.apply(obj, args);
    }
    if (Array.isArray(obj) || typeof obj === 'string') {
      return callArrayStringMethod(obj, String(key), args);
    }
    throw new Error('Only console.log, Math, array/string methods, and user-defined functions are allowed for calls');
  }

  if (calleeNode.type === 'Identifier') {
    const fn = env.get(calleeNode.name);
    if (fn && fn.type === 'js-function') {
      return callUserFunction(fn, args, ctx, frameName);
    }
  }
  throw new Error('Unsupported call target');
}

function callUserFunction(fnVal, args, ctx, frameName) {
  const funcEnv = new Environment(fnVal.closure);
  fnVal.params.forEach((param, i) => {
    if (param.type !== 'Identifier') throw new Error('Only simple parameters supported');
    funcEnv.setLocal(param.name, args[i]);
  });
  ctx.callDepth += 1;
  if (ctx.callDepth > 64) throw new Error('Call stack depth exceeded');
  const name = fnVal.name || 'anonymous';
  try {
    if (fnVal.body.type === 'BlockStatement') {
      hoistFunctionDeclarations(fnVal.body.body, funcEnv);
      execBody(fnVal.body.body, ctx, funcEnv, name, true);
      return undefined;
    }
    return evalExpr(fnVal.body, ctx, funcEnv, name);
  } catch (e) {
    if (e instanceof ReturnSignal) return e.value;
    throw e;
  } finally {
    ctx.callDepth -= 1;
  }
}

function declarePattern(pattern, value, env) {
  if (pattern.type === 'Identifier') {
    env.setLocal(pattern.name, value);
    return;
  }
  if (pattern.type === 'ArrayPattern') {
    if (!Array.isArray(value)) throw new TypeError('Array destructuring expects array');
    pattern.elements.forEach((el, i) => {
      if (!el) return;
      declarePattern(el, value[i], env);
    });
    return;
  }
  throw new Error('Unsupported destructuring pattern');
}

function execStatement(st, ctx, env, frameName) {
  const line = st.loc ? st.loc.start.line : 1;

  switch (st.type) {
    case 'EmptyStatement':
    case 'DebuggerStatement':
      return;
    case 'ExpressionStatement':
      evalExpr(st.expression, ctx, env, frameName);
      recordStep(ctx, line, ctx.globalEnv, env, frameName);
      return;
    case 'VariableDeclaration': {
      for (const d of st.declarations) {
        let val = d.init ? evalExpr(d.init, ctx, env, frameName) : undefined;
        if (st.kind === 'var' && !d.init) val = undefined;
        declarePattern(d.id, val, env);
      }
      recordStep(ctx, line, ctx.globalEnv, env, frameName);
      return;
    }
    case 'BlockStatement': {
      const blockEnv = new Environment(env);
      hoistFunctionDeclarations(st.body, blockEnv);
      for (const inner of st.body) {
        if (inner.type === 'FunctionDeclaration') continue;
        execStatement(inner, ctx, blockEnv, frameName);
      }
      return;
    }
    case 'IfStatement': {
      const take = !!evalExpr(st.test, ctx, env, frameName);
      recordStep(ctx, line, ctx.globalEnv, env, frameName);
      if (take) {
        execStatement(st.consequent, ctx, env, frameName);
      } else if (st.alternate) {
        execStatement(st.alternate, ctx, env, frameName);
      }
      return;
    }
    case 'WhileStatement': {
      let c = 0;
      while (evalExpr(st.test, ctx, env, frameName)) {
        recordStep(ctx, line, ctx.globalEnv, env, frameName);
        try {
          execStatement(st.body, ctx, env, frameName);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (e instanceof ContinueSignal) { /* continue */ } else throw e;
        }
        c += 1;
        if (c > MAX_LOOP_ITER) throw new Error('Infinite loop detected in while');
      }
      return;
    }
    case 'ForStatement': {
      const forEnv = new Environment(env);
      if (st.init) {
        if (st.init.type === 'VariableDeclaration') {
          for (const d of st.init.declarations) {
            const val = d.init ? evalExpr(d.init, ctx, forEnv, frameName) : undefined;
            declarePattern(d.id, val, forEnv);
          }
        } else {
          evalExpr(st.init, ctx, forEnv, frameName);
        }
      }
      let c = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (st.test && !evalExpr(st.test, ctx, forEnv, frameName)) break;
        recordStep(ctx, line, ctx.globalEnv, forEnv, frameName);
        try {
          execStatement(st.body, ctx, forEnv, frameName);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (!(e instanceof ContinueSignal)) throw e;
        }
        if (st.update) evalExpr(st.update, ctx, forEnv, frameName);
        c += 1;
        if (c > MAX_LOOP_ITER) throw new Error('Infinite loop detected in for');
      }
      return;
    }
    case 'BreakStatement':
      throw new BreakSignal();
    case 'ContinueStatement':
      throw new ContinueSignal();
    case 'ReturnStatement': {
      const v = st.argument ? evalExpr(st.argument, ctx, env, frameName) : undefined;
      recordStep(ctx, line, ctx.globalEnv, env, frameName);
      throw new ReturnSignal(v);
    }
    case 'FunctionDeclaration':
      return;
    case 'ThrowStatement':
      throw new Error(`Throw not supported: ${stringifyVal(evalExpr(st.argument, ctx, env, frameName))}`);
    default:
      throw new Error(`Unsupported statement: ${st.type}`);
  }
}

function execBody(body, ctx, env, frameName, skipHoistedFns = false) {
  if (!skipHoistedFns) hoistFunctionDeclarations(body, env);
  for (const st of body) {
    if (st.type === 'FunctionDeclaration') continue;
    try {
      execStatement(st, ctx, env, frameName);
    } catch (e) {
      if (e instanceof BreakSignal || e instanceof ContinueSignal) throw e;
      if (e instanceof ReturnSignal) throw e;
      throw e;
    }
  }
}

function simulateJavaScript(code) {
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, locations: true, sourceType: 'script' });
  } catch (e) {
    return { executionSteps: [], error: `JavaScript parse error: ${e.message}`, consoleOutput: '' };
  }

  const ctx = createContext(code);
  const env = new Environment(null);
  ctx.globalEnv = env;

  env.setLocal('console', {
    log: makeNative('log', (...args) => {
      ctx.consoleLines.push(args.map(stringifyVal).join(' '));
    })
  });
  env.setLocal('Math', Math);

  try {
    hoistFunctionDeclarations(ast.body, env);
    execBody(ast.body, ctx, env, 'Global');
  } catch (e) {
    if (e instanceof ReturnSignal) {
      /* top-level return shouldn't happen */
    }
    return {
      executionSteps: ctx.steps,
      error: e.message || String(e),
      consoleOutput: ctx.consoleLines.join('\n'),
      truncated: ctx.steps.length >= MAX_STEPS
    };
  }

  return {
    executionSteps: ctx.steps,
    error: null,
    consoleOutput: ctx.consoleLines.join('\n'),
    truncated: ctx.steps.length >= MAX_STEPS,
    language: 'javascript'
  };
}

module.exports = { simulateJavaScript };
