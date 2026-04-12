'use strict';

/**
 * Limited, sandboxed Python execution simulator (educational subset).
 * No subprocess, no eval—interpreter walks a simple AST built from indentation.
 */

const MAX_STEPS = 12000;
const MAX_LOOP = 100000;

function normalizeSourceLines(code) {
  return code.split(/\r?\n/);
}

function stripComment(line) {
  const i = line.indexOf('#');
  return i < 0 ? line : line.slice(0, i);
}

function rowStream(code) {
  const out = [];
  const sourceLines = normalizeSourceLines(code);
  let lineNo = 0;
  for (const raw of sourceLines) {
    lineNo += 1;
    const line = stripComment(raw);
    if (!line.trim()) continue;
    const ws = line.match(/^(\s*)/)[1];
    const indent = ws.replace(/\t/g, '    ').length;
    out.push({ indent, text: line.trim(), line: lineNo });
  }
  return { rows: out, sourceLines };
}

class PyReturn { constructor(v) { this.value = v; } }
class PyBreak {}
class PyContinue {}

function recordStep(ctx, line, gvars, lvars, frameName) {
  if (ctx.steps.length >= MAX_STEPS) {
    throw new Error('Step limit exceeded — shorten code or loops');
  }
  ctx.stepNo += 1;
  const idx = Math.max(0, line - 1);
  const codeLine = (ctx.sourceLines[idx] || '').trimEnd();
  const variables = { ...clonePublic(gvars), ...clonePublic(lvars) };
  const frames = [
    { name: 'Global', scope: 'global', variables: clonePublic(gvars) }
  ];
  if (lvars && lvars !== gvars && Object.keys(lvars).length) {
    frames.push({ name: frameName || 'Local', scope: 'local', variables: clonePublic(lvars) });
  }
  ctx.steps.push({
    step: ctx.stepNo,
    line,
    code: codeLine,
    variables,
    frames,
    output: ctx.consoleLines.join('\n')
  });
}

function clonePublic(o) {
  const out = {};
  if (!o) return out;
  for (const k of Object.keys(o)) {
    if (k.startsWith('__')) continue;
    try {
      out[k] = JSON.parse(JSON.stringify(o[k]));
    } catch {
      out[k] = String(o[k]);
    }
  }
  return out;
}

/** Build indented block tree */
function parseBlock(rows, startIdx, baseIndent) {
  const body = [];
  let i = startIdx;
  while (i < rows.length) {
    const r = rows[i];
    if (r.indent <= baseIndent) break;
    if (r.indent > baseIndent + 4) {
      throw new Error(`Bad indentation at line ${r.line}`);
    }
    const parsed = parseStatementRow(r);
    i += 1;
    if (parsed.needsBody) {
      if (i >= rows.length || rows[i].indent <= r.indent) {
        throw new Error(`Expected indented block after line ${r.line}`);
      }
      const ch = parseBlock(rows, i, r.indent);
      parsed.attachBody(ch.body);
      i = ch.nextIndex;
    }

    // Stitch elif/else onto the immediately preceding if statement
    if (parsed.stmt.type === 'elif' || parsed.stmt.type === 'else') {
      const prev = body[body.length - 1];
      if (!prev || prev.type !== 'if') {
        throw new Error(`'elif'/'else' must follow 'if' at line ${parsed.stmt.line}`);
      }
      if (parsed.stmt.type === 'elif') {
        prev.elif.push({ test: parsed.stmt.test, body: parsed.stmt.body, line: parsed.stmt.line });
      } else {
        prev.else = parsed.stmt.body;
      }
      continue; // don't push elif/else as standalone stmts
    }

    // After an if, collect any following elif/else at the SAME indent level
    if (parsed.stmt.type === 'if') {
      while (i < rows.length && rows[i].indent === r.indent) {
        const nr = rows[i];
        if (nr.text.startsWith('elif ') && nr.text.endsWith(':')) {
          const ep = parseStatementRow(nr);
          i += 1;
          const ch = parseBlock(rows, i, nr.indent);
          ep.attachBody(ch.body);
          i = ch.nextIndex;
          parsed.stmt.elif.push({ test: ep.stmt.test, body: ep.stmt.body, line: ep.stmt.line });
        } else if (nr.text === 'else:') {
          const ep = parseStatementRow(nr);
          i += 1;
          const ch = parseBlock(rows, i, nr.indent);
          ep.attachBody(ch.body);
          i = ch.nextIndex;
          parsed.stmt.else = ep.stmt.body;
          break;
        } else break;
      }
    }

    body.push(parsed.stmt);
  }
  return { body, nextIndex: i };
}

function parseStatementRow(r) {
  const t = r.text;
  const line = r.line;

  if (t.startsWith('def ')) {
    const m = t.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:\s*$/);
    if (!m) throw new Error(`Invalid function definition at line ${line}`);
    const args = m[2].trim() ? m[2].split(',').map(s => s.trim()).filter(Boolean) : [];
    const stmt = { type: 'def', name: m[1], args, body: [], line };
    return {
      needsBody: true,
      attachBody(body) { stmt.body = body; },
      stmt
    };
  }

  if (t.startsWith('if ') && t.endsWith(':')) {
    const test = t.slice(3, -1).trim();
    const stmt = { type: 'if', test, then: [], elif: [], else: null, line };
    return {
      needsBody: true,
      attachBody(body) { stmt.then = body; },
      stmt
    };
  }

  if (t.startsWith('elif ') && t.endsWith(':')) {
    const test = t.slice(5, -1).trim();
    const stmt = { type: 'elif', test, body: [], line };
    return {
      needsBody: true,
      attachBody(b) { stmt.body = b; },
      stmt
    };
  }

  if (t === 'else:') {
    const stmt = { type: 'else', body: [], line };
    return {
      needsBody: true,
      attachBody(b) { stmt.body = b; },
      stmt
    };
  }

  if (t.startsWith('while ') && t.endsWith(':')) {
    const test = t.slice(6, -1).trim();
    const stmt = { type: 'while', test, body: [], line };
    return {
      needsBody: true,
      attachBody(b) { stmt.body = b; },
      stmt
    };
  }

  // for <var> in range(...) or for <var> in <iterable>
  const forM = t.match(/^for\s+(\w+)\s+in\s+(.+):\s*$/);
  if (forM) {
    const iterExpr = forM[2].trim();
    const stmt = { type: 'for_in', var: forM[1], iterExpr, body: [], line };
    return {
      needsBody: true,
      attachBody(b) { stmt.body = b; },
      stmt
    };
  }

  if (t.startsWith('return')) {
    const rest = t.slice(6).trim().replace(/^\s*/, '');
    const expr = rest || 'None';
    return { needsBody: false, stmt: { type: 'return', expr, line } };
  }

  if (t === 'break') return { needsBody: false, stmt: { type: 'break', line } };
  if (t === 'continue') return { needsBody: false, stmt: { type: 'continue', line } };

  if (t.startsWith('print(') && t.endsWith(')')) {
    const inner = t.slice(6, -1);
    return { needsBody: false, stmt: { type: 'print', expr: inner.trim(), line } };
  }

  if (t.includes('=') && !t.includes('==') && !t.includes('!=') && !t.includes('<=') && !t.includes('>=')) {
    const eq = t.indexOf('=');
    const left = t.slice(0, eq).trim();
    const right = t.slice(eq + 1).trim();
    if (/^[a-zA-Z_]\w*(\s*,\s*[a-zA-Z_]\w*)*$/.test(left)) {
      return { needsBody: false, stmt: { type: 'assign', targets: left.split(/\s*,\s*/), expr: right, line } };
    }
  }

  return { needsBody: false, stmt: { type: 'expr', expr: t, line } };
}

function parseModuleRows(rows) {
  const body = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (r.indent !== 0) throw new Error(`Unexpected indent at line ${r.line}`);
    const parsed = parseStatementRow(r);
    i += 1;
    if (parsed.needsBody) {
      if (i >= rows.length || rows[i].indent <= r.indent) {
        throw new Error(`Expected indented block after line ${r.line}`);
      }
      const ch = parseBlock(rows, i, r.indent);
      parsed.attachBody(ch.body);
      i = ch.nextIndex;
    }

    if (parsed.stmt.type === 'elif' || parsed.stmt.type === 'else') {
      throw new Error(`'elif'/'else' must follow 'if' at line ${parsed.stmt.line}`);
    }

    if (parsed.stmt.type === 'if') {
      while (i < rows.length && rows[i].indent === 0) {
        const nr = rows[i];
        if (nr.text.startsWith('elif ') && nr.text.endsWith(':')) {
          const ep = parseStatementRow(nr);
          i += 1;
          if (!ep.needsBody) throw new Error('Invalid elif');
          const ch = parseBlock(rows, i, nr.indent);
          ep.attachBody(ch.body);
          i = ch.nextIndex;
          parsed.stmt.elif.push({ test: ep.stmt.test, body: ep.stmt.body });
        } else if (nr.text === 'else:') {
          const ep = parseStatementRow(nr);
          i += 1;
          if (!ep.needsBody) throw new Error('Invalid else');
          const ch = parseBlock(rows, i, nr.indent);
          ep.attachBody(ch.body);
          i = ch.nextIndex;
          parsed.stmt.else = ep.stmt.body;
          break;
        } else break;
      }
    }

    body.push(parsed.stmt);
  }
  return body;
}

function readVar(name, g, l) {
  if (l !== g && Object.prototype.hasOwnProperty.call(l, name)) return l[name];
  if (Object.prototype.hasOwnProperty.call(g, name)) return g[name];
  throw new ReferenceError(`${name} is not defined`);
}

function writeVar(name, val, g, l) {
  if (l !== g) {
    l[name] = val;
  } else {
    g[name] = val;
  }
}

function evalPy(expr, gvars, lvars, funcs, ctx) {
  return evalPyExpr(expr.trim(), gvars, lvars, funcs, ctx);
}

function evalPyExpr(expr, gvars, lvars, funcs, ctx, depth = 0) {
  if (depth > 80) throw new Error('Expression too deep');
  expr = expr.trim();
  if (expr === 'True') return true;
  if (expr === 'False') return false;
  if (expr === 'None') return null;
  if (/^-?\d+$/.test(expr)) return parseInt(expr, 10);
  if (/^-?\d+\.\d+$/.test(expr)) return parseFloat(expr);

  const fs = expr.match(/^f(["'])(.*)\1$/s);
  if (fs) {
    let s = fs[2];
    s = s.replace(/\{([^}]+)\}/g, (_, inner) => String(evalPyExpr(inner, gvars, lvars, funcs, ctx, depth + 1)));
    return s;
  }

  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }

  if (expr.startsWith('(') && expr.endsWith(')')) {
    return evalPyExpr(expr.slice(1, -1), gvars, lvars, funcs, ctx, depth);
  }

  if (expr.startsWith('len(') && expr.endsWith(')')) {
    const v = evalPyExpr(expr.slice(4, -1), gvars, lvars, funcs, ctx, depth + 1);
    if (!Array.isArray(v) && typeof v !== 'string') throw new TypeError('len() needs list or string');
    return v.length;
  }

  const rangeM = expr.match(/^range\s*\(\s*([^)]+)\s*\)$/);
  if (rangeM) {
    const inner = rangeM[1].trim();
    const parts = inner.split(/\s*,\s*/).map(p => evalPyExpr(p, gvars, lvars, funcs, ctx, depth + 1));
    if (parts.length === 1) return [...Array(Math.max(0, parts[0])).keys()];
    if (parts.length === 2) {
      const start = parts[0];
      const end = parts[1];
      const out = [];
      for (let i = start; i < end; i++) out.push(i);
      return out;
    }
    if (parts.length === 3) {
      const start = parts[0], end = parts[1], step = parts[2];
      const out = [];
      if (step > 0) { for (let i = start; i < end; i += step) out.push(i); }
      else if (step < 0) { for (let i = start; i > end; i += step) out.push(i); }
      return out;
    }
    throw new Error('range() requires 1, 2, or 3 integer arguments');
  }

  if (expr.startsWith('[') && expr.endsWith(']')) {
    const inner = expr.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(x => evalPyExpr(x.trim(), gvars, lvars, funcs, ctx, depth + 1));
  }

  const bin = splitBinary(expr);
  if (bin) {
    const [op, left, right] = bin;
    const a = evalPyExpr(left, gvars, lvars, funcs, ctx, depth + 1);
    const b = evalPyExpr(right, gvars, lvars, funcs, ctx, depth + 1);
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '//': return Math.floor(a / b);
      case '/': return a / b;
      case '%': return a % b;
      case '**': return a ** b;
      case '==': return a === b;
      case '!=': return a !== b;
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      case ' and ': return a && b;
      case ' or ': return a || b;
      default: throw new Error(`Op ${op} not supported`);
    }
  }

  if (expr.startsWith('not ')) {
    return !evalPyExpr(expr.slice(4), gvars, lvars, funcs, ctx, depth + 1);
  }

  const callM = expr.match(/^(\w+)\s*\(([^)]*)\)$/);
  if (callM && !['range', 'len', 'int', 'str', 'bool'].includes(callM[1])) {
    const name = callM[1];
    const argsStr = callM[2].trim();
    const args = argsStr ? argsStr.split(/\s*,\s*/).map(x => evalPyExpr(x, gvars, lvars, funcs, ctx, depth + 1)) : [];
    return callPyUser(name, args, gvars, lvars, funcs, ctx);
  }

  if (/^\w+$/.test(expr)) {
    return readVar(expr, gvars, lvars);
  }

  const sub = expr.match(/^([\w.]+)\s*\[\s*([^[\]]+)\s*\]$/);
  if (sub) {
    const base = sub[1];
    const idx = evalPyExpr(sub[2], gvars, lvars, funcs, ctx, depth + 1);
    const obj = readVar(base, gvars, lvars);
    return obj[idx];
  }

  const intM = expr.match(/^int\s*\(\s*([^)]+)\s*\)$/);
  if (intM) return Number(evalPyExpr(intM[1], gvars, lvars, funcs, ctx, depth + 1)) | 0;

  // Method calls: obj.method(args)  e.g. arr.append(x), s.split(',')
  const methodM = expr.match(/^(\w+)\.(\w+)\s*\(([^)]*)\)$/);
  if (methodM) {
    const [, objName, method, argsRaw] = methodM;
    const obj = readVar(objName, gvars, lvars);
    const args = argsRaw.trim()
      ? argsRaw.split(/\s*,\s*/).map(a => evalPyExpr(a.trim(), gvars, lvars, funcs, ctx, depth + 1))
      : [];
    if (method === 'append' && Array.isArray(obj)) { obj.push(args[0]); return null; }
    if (method === 'pop' && Array.isArray(obj)) { return obj.pop(); }
    if (method === 'split' && typeof obj === 'string') { return obj.split(args[0] ?? ''); }
    if (method === 'join' && typeof obj === 'string') { return (args[0] || []).join(obj); }
    if (method === 'strip' && typeof obj === 'string') { return obj.trim(); }
    if (method === 'upper' && typeof obj === 'string') { return obj.toUpperCase(); }
    if (method === 'lower' && typeof obj === 'string') { return obj.toLowerCase(); }
    throw new Error(`Method ${objName}.${method}() not supported`);
  }

  // list() constructor
  const listM = expr.match(/^list\s*\(([^)]*)\)$/);
  if (listM) {
    const inner = listM[1].trim();
    if (!inner) return [];
    const val = evalPyExpr(inner, gvars, lvars, funcs, ctx, depth + 1);
    return Array.isArray(val) ? val : typeof val === 'string' ? val.split('') : [val];
  }

  // str() constructor
  const strM = expr.match(/^str\s*\(([^)]*)\)$/);
  if (strM) return String(evalPyExpr(strM[1].trim(), gvars, lvars, funcs, ctx, depth + 1));

  // abs(), min(), max()
  const builtinM = expr.match(/^(abs|min|max)\s*\(([^)]*)\)$/);
  if (builtinM) {
    const fn = builtinM[1];
    const args = builtinM[2].trim()
      ? builtinM[2].split(/\s*,\s*/).map(a => evalPyExpr(a.trim(), gvars, lvars, funcs, ctx, depth + 1))
      : [];
    if (fn === 'abs') return Math.abs(args[0]);
    if (fn === 'min') return Math.min(...args);
    if (fn === 'max') return Math.max(...args);
  }

  throw new Error(`Unsupported Python expression: ${expr}`);
}

function splitTopLevelCommas(s) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') depth--;
    if ((c === ',' && depth === 0) || i === s.length) {
      const chunk = s.slice(start, i).trim();
      if (chunk) out.push(chunk);
      start = i + 1;
    }
  }
  return out;
}

function splitBinary(expr) {
  const ops = ['==', '!=', '<=', '>=', '//', '**', '<', '>', '+', '-', '*', '/', '%', ' and ', ' or '];
  let depth = 0;
  for (let i = expr.length - 1; i >= 0; i--) {
    const c = expr[i];
    if (c === ')') depth++;
    if (c === '(') depth--;
    if (depth !== 0) continue;
    for (const op of ops) {
      if (i - op.length + 1 >= 0 && expr.slice(i - op.length + 1, i + 1) === op) {
        const left = expr.slice(0, i - op.length + 1).trim();
        const right = expr.slice(i + 1).trim();
        if (left && right) return [op, left, right];
      }
    }
  }
  return null;
}

function callPyUser(name, args, gvars, lvars, funcs, ctx) {
  const fn = funcs[name];
  if (!fn) throw new ReferenceError(`Function ${name} is not defined`);
  const local = Object.create(null);
  fn.args.forEach((a, i) => { local[a] = args[i]; });
  try {
    runBlockList(fn.body, ctx, gvars, local, name);
    return null;
  } catch (e) {
    if (e instanceof PyReturn) return e.value;
    throw e;
  }
}

function assignTargets(targets, value, gvars, lvars) {
  if (targets.length === 1) {
    writeVar(targets[0], value, gvars, lvars);
    return;
  }
  if (!Array.isArray(value)) throw new TypeError('Unpacking needs iterable');
  if (value.length < targets.length) throw new TypeError('Not enough values to unpack');
  targets.forEach((t, i) => { writeVar(t, value[i], gvars, lvars); });
}

function runBlockList(block, ctx, gvars, lvars, frameName) {
  for (const st of block) {
    runStatement(st, ctx, gvars, lvars, frameName);
  }
}

function runStatement(st, ctx, gvars, lvars, frameName) {
  const funcs = ctx.functions;

  switch (st.type) {
    case 'def':
      funcs[st.name] = { args: st.args, body: st.body };
      recordStep(ctx, st.line, gvars, lvars, frameName);
      return;
    case 'assign': {
      let val;
      if (st.targets.length > 1) {
        const parts = splitTopLevelCommas(st.expr);
        if (parts.length !== st.targets.length) {
          throw new TypeError(`Unpacking: expected ${st.targets.length} values, got ${parts.length}`);
        }
        val = parts.map(p => evalPy(p, gvars, lvars, funcs, ctx));
      } else {
        val = evalPy(st.expr, gvars, lvars, funcs, ctx);
      }
      assignTargets(st.targets, val, gvars, lvars);
      recordStep(ctx, st.line, gvars, lvars, frameName);
      return;
    }
    case 'print': {
      const v = evalPy(st.expr, gvars, lvars, funcs, ctx);
      ctx.consoleLines.push(String(v));
      recordStep(ctx, st.line, gvars, lvars, frameName);
      return;
    }
    case 'expr': {
      evalPy(st.expr, gvars, lvars, funcs, ctx);
      recordStep(ctx, st.line, gvars, lvars, frameName);
      return;
    }
    case 'if': {
      const ok = !!evalPy(st.test, gvars, lvars, funcs, ctx);
      recordStep(ctx, st.line, gvars, lvars, frameName);
      if (ok) runBlockList(st.then, ctx, gvars, lvars, frameName);
      else {
        let done = false;
        for (const el of st.elif) {
          if (evalPy(el.test, gvars, lvars, funcs, ctx)) {
            runBlockList(el.body, ctx, gvars, lvars, frameName);
            done = true;
            break;
          }
        }
        if (!done && st.else) runBlockList(st.else, ctx, gvars, lvars, frameName);
      }
      return;
    }
    case 'while': {
      let c = 0;
      while (evalPy(st.test, gvars, lvars, funcs, ctx)) {
        recordStep(ctx, st.line, gvars, lvars, frameName);
        try {
          runBlockList(st.body, ctx, gvars, lvars, frameName);
        } catch (e) {
          if (e instanceof PyBreak) break;
          if (e instanceof PyContinue) continue;
          throw e;
        }
        c += 1;
        if (c > MAX_LOOP) throw new Error('Infinite loop in while');
      }
      return;
    }
    case 'for_in': {
      const iterable = evalPy(st.iterExpr, gvars, lvars, funcs, ctx);
      // Resolve to an array — handles range(), list variables, strings
      let items;
      if (Array.isArray(iterable)) {
        items = iterable;
      } else if (typeof iterable === 'string') {
        items = iterable.split('');
      } else if (typeof iterable === 'number') {
        // bare range(n) returns a number alias in older path — unlikely now but safe
        items = [...Array(Math.max(0, iterable)).keys()];
      } else {
        throw new TypeError(`'${st.iterExpr}' is not iterable`);
      }
      if (items.length > MAX_LOOP) throw new Error('for loop iterable too large');
      for (const item of items) {
        writeVar(st.var, item, gvars, lvars);
        recordStep(ctx, st.line, gvars, lvars, frameName);
        try {
          runBlockList(st.body, ctx, gvars, lvars, frameName);
        } catch (e) {
          if (e instanceof PyBreak) break;
          if (e instanceof PyContinue) continue;
          throw e;
        }
      }
      return;
    }
    case 'return':
      throw new PyReturn(evalPy(st.expr, gvars, lvars, funcs, ctx));
    case 'break':
      throw new PyBreak();
    case 'continue':
      throw new PyContinue();
    default:
      throw new Error(`Unsupported stmt ${st.type}`);
  }
}

function simulatePython(code) {
  try {
    const stream = rowStream(code);
    const body = parseModuleRows(stream.rows);
    const ctx = {
      sourceLines: stream.sourceLines,
      steps: [],
      stepNo: 0,
      consoleLines: [],
      functions: Object.create(null)
    };
    const gvars = Object.create(null);
    try {
      runBlockList(body, ctx, gvars, gvars, 'Global');
    } catch (e) {
      if (e instanceof PyReturn) {
        /* top-level return invalid */
      } else throw e;
    }
    return {
      executionSteps: ctx.steps,
      error: null,
      consoleOutput: ctx.consoleLines.join('\n'),
      truncated: ctx.steps.length >= MAX_STEPS,
      language: 'python'
    };
  } catch (e) {
    return {
      executionSteps: [],
      error: e.message || String(e),
      consoleOutput: '',
      language: 'python'
    };
  }
}

module.exports = { simulatePython };