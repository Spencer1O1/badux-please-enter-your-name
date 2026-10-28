/* Pure puzzle rules, shared by departments and the dependency-free test suite. */
(() => {
  "use strict";
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const letters = value => [...segmenter.segment(value.normalize("NFC"))].map(part => part.segment);
  const nameLetters = name => letters(name).filter(char => char !== " ");
  function formatNameProgress(name, value) {
    const spaces = new Set();
    let position = 0;
    for (const char of letters(name)) {
      if (char === " ") spaces.add(position);
      else position++;
    }
    return nameLetters(value).map((char, i) => (i > 0 && spaces.has(i) ? " " : "") + char).join("");
  }
  const normalizeName = name => name.normalize("NFC").replace(/[^\p{L}\p{M}\s]/gu, "").trim().replace(/\s+/gu, " ");
  const reverse = value => letters(value).reverse().join("");
  const characterKind = char => /^[aeiou]$/i.test(char) ? "Vowels" : /\p{L}/u.test(char) ? "Other letters" : "Separators";
  const customs = name => letters(name).filter(char => characterKind(char) !== "Vowels").join("").trim() || "NONE";
  function acceptsCustoms(name, value) {
    const expected = customs(name);
    const withoutY = expected.replace(/y/gi, "").trim() || "NONE";
    const answer = normalizeName(value).toUpperCase().normalize("NFC");
    return [expected, withoutY].some(option => normalizeName(option).toUpperCase().normalize("NFC") === answer);
  }
  const nameStats = name => ({ letters: (name.normalize("NFC").match(/\p{L}/gu) || []).length, vowels: letters(name).filter(char => characterKind(char) === "Vowels").length });
  function validName(value) {
    const name = normalizeName(value);
    const parts = name.split(" ");
    const count = nameStats(name).letters;
    return count >= 6 && count <= 20 && parts.length === 2
      && parts.every(part => /\p{L}/u.test(part));
  }
  const queuePlaces = 48;
  const queueStepMs = 10000;
  const queueDurationMs = queuePlaces * queueStepMs;
  function formatRunTime(milliseconds) {
    const elapsed = Math.max(0, Math.floor(milliseconds));
    const minutes = Math.floor(elapsed / 60000);
    const seconds = String(Math.floor(elapsed / 1000) % 60).padStart(2, "0");
    return `${minutes}:${seconds}.${String(elapsed % 1000).padStart(3, "0")}`;
  }
  function newRunSeed(previous) {
    const value = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(value);
    else value[0] = Math.floor(Math.random() * 4294967296);
    return value[0] === previous ? (value[0] + 1) >>> 0 : value[0];
  }
  const runCode = seed => (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
  function createRandom(seed, name, department) {
    // Separate streams keep hints, cosmetics and earlier mistakes from changing
    // another department. Version the key if puzzle generation rules change.
    let state = 2166136261;
    for (const char of JSON.stringify(["name-office-v1", seed >>> 0, normalizeName(name), department])) {
      state = Math.imul(state ^ char.codePointAt(0), 16777619) >>> 0;
    }
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = Math.imul(state ^ state >>> 15, state | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function issueQueueTicket(random = Math.random) {
    const number = 100 + Math.floor(random() * 900);
    return { number, serving: number - queuePlaces };
  }
  function queueStatus(ticket, startedAt, now) {
    const elapsed = startedAt === null ? 0 : Math.max(0, now - startedAt);
    const steps = Math.min(queuePlaces, Math.floor(elapsed / queueStepMs));
    const ahead = queuePlaces - steps;
    const phase = startedAt === null ? "waiting" : ahead === 0 ? "missed"
      : ahead <= 3 ? "critical" : ahead <= 6 ? "urgent" : ahead <= 12 ? "warning" : "normal";
    return { serving: ticket.serving + steps, ahead, remainingMs: Math.max(0, queueDurationMs - elapsed), phase };
  }
  const shuffle = (items, random = Math.random) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  function makeNameEvidence(name, random = Math.random) {
    const chars = letters(name);
    const repeated = chars.findIndex((char, i) => i > 0 && char !== " " && char === chars[i - 1]);
    const removable = chars.findIndex((char, i) => char !== " " && (chars[i - 1] && chars[i - 1] !== " " || chars[i + 1] && chars[i + 1] !== " "));
    const missing = repeated >= 0 ? repeated : removable;
    const typoOne = missing >= 0 ? chars.filter((_, i) => i !== missing).join("") : chars[0] + name;
    const vowel = chars.findLastIndex(char => /^[aeiou]$/i.test(char));
    const changed = [...chars];
    if (vowel >= 0) {
      const replacements = { a: "e", e: "o", i: "e", o: "a", u: "o" };
      const replacement = replacements[chars[vowel].toLowerCase()];
      changed[vowel] = chars[vowel] === chars[vowel].toUpperCase() ? replacement.toUpperCase() : replacement;
    } else changed.push(chars[chars.length - 1]);
    const parts = name.split(" ");
    const reordered = parts[parts.length - 1] + ", " + parts.slice(0, -1).join(" ");
    return shuffle([name, name, name, typoOne, changed.join(""), name + " Junior", "Not " + name, reordered, name + "!"], random);
  }
  function decodeNameClue(book, alphabet, clue) {
    const index = alphabet.indexOf(book[clue.position]);
    return alphabet[(index + clue.offset + alphabet.length) % alphabet.length];
  }
  const nameClueLabel = ({ position, offset }) => String(position + 1).padStart(2, "0") + (offset > 0 ? `+${offset}` : offset < 0 ? `−${-offset}` : "=");
  function nameMemo(name, random = Math.random) {
    const book = nameLetters(name.toUpperCase());
    const alphabet = [...new Set([...letters("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), ...book])];
    const positions = shuffle(book.map((_, i) => i), random);
    const offsets = [2 + Math.floor(random() * 4), -(2 + Math.floor(random() * 4)), 0, ...shuffle([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], random).slice(0, 3)];
    const clues = offsets.map((offset, i) => ({ position: positions[i % positions.length], offset }));
    const decode = () => clues.map(clue => decodeNameClue(book, alphabet, clue)).join("");
    if (decode() === book.join("")) clues[0].offset = clues[0].offset === 5 ? 2 : clues[0].offset + 1;
    const encoded = clues.map(nameClueLabel).join(" · ");
    return { book, alphabet, clues, encoded, word: decode() };
  }
  function makeNameStamps(name, random = Math.random) {
    const target = name.toUpperCase().normalize("NFC");
    const needed = [...new Set(nameLetters(target))];
    const extras = shuffle(letters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), random).filter(char => !needed.includes(char));
    return { target, stamps: shuffle([...needed, ...extras.slice(0, Math.max(0, 12 - needed.length))], random) };
  }
  function makeStampTray(stamps, nextLetter, random = Math.random) {
    const required = nextLetter === undefined ? [] : [nextLetter];
    return shuffle([...required, ...shuffle(stamps.filter(char => char !== nextLetter), random).slice(0, 12 - required.length)], random);
  }
  function archiveTruth(file, clues, name) {
    const chars = nameLetters(name);
    return clues.map(clue => clue.slot === null ? file.number % 2 === 0 : file.seal[clue.slot] === chars[clue.position]);
  }
  function makeNameArchive(name, random = Math.random) {
    const chars = nameLetters(name);
    const positions = shuffle(chars.map((_, i) => i), random).slice(0, 3);
    const clues = [
      ...positions.map((position, slot) => ({ position, slot })),
      { slot: null }
    ];
    // Exactly one row has three true statements. Every column leaves several
    // candidates, including a convincing decoy for which all four are true.
    const columns = shuffle([0, 1, 2, 3], random);
    const masks = [14, 15, 0, 3, 5, 9].map(mask => columns.reduce((result, bit, i) => result | ((mask >> bit & 1) << i), 0));
    const numbers = [0, 1].map(parity => shuffle(Array.from({ length: 45 }, (_, i) => 10 + i * 2 + parity), random));
    const files = masks.map(mask => ({
      number: numbers[mask >> 3 & 1 ? 0 : 1].pop(),
      seal: positions.map((position, slot) => mask & (1 << slot) ? chars[position]
        : shuffle([...new Set([...chars, ...letters("ABCDEFGHIJKLMNOPQRSTUVWXYZ")])].filter(char => char !== chars[position]), random)[0])
    })).sort((a, b) => a.number - b.number);
    const original = files.find(file => archiveTruth(file, clues, name).filter(Boolean).length === 3);
    return { files, clues, original: original.number, liar: archiveTruth(original, clues, name).indexOf(false) };
  }
  const splitName = (name, count) => {
    const chars = letters(name);
    return Array.from({ length: count }, (_, i) => chars.slice(Math.floor(i * chars.length / count), Math.floor((i + 1) * chars.length / count)).join(""));
  };

  // Independent wiring gives exactly one switch combination for each lamp pattern.
  const powerMasks = [3, 57, 18, 19, 60, 15];
  const circuitNumbers = (mask, count = 6) => Array.from({ length: count }, (_, i) => i + 1).filter(i => mask & (1 << (i - 1)));
  const powerState = (puzzle, on) => [...on].reduce((state, circuit) => state ^ puzzle.masks[circuit - 1], puzzle.initial);
  function powerSolution(puzzle) {
    for (let mask = 0; mask < (1 << puzzle.masks.length); mask++) {
      const on = circuitNumbers(mask);
      if (powerState(puzzle, on) === puzzle.target) return on;
    }
    return null;
  }
  function makeNamePower(name, random = Math.random) {
    const [first, last] = normalizeName(name).split(" ");
    const firstLength = letters(first).length;
    const lastLength = letters(last).length;
    const count = Math.min(6, firstLength + lastLength);
    const firstCount = Math.max(1, count - lastLength, Math.min(firstLength, count - 1, Math.round(count * firstLength / (firstLength + lastLength))));
    const rows = [splitName(first, firstCount), splitName(last, count - firstCount)];
    const chunks = rows.flat();
    const masks = count === 6 ? [...powerMasks] : Array.from({ length: count }, (_, i) => 1 << i);
    const weights = count === 6 ? [3, 4] : [Math.max(1, Math.floor(count / 2))];
    const combinations = Array.from({ length: 1 << count }, (_, i) => i).filter(mask => weights.includes(circuitNumbers(mask).length));
    const solution = circuitNumbers(combinations[Math.floor(random() * combinations.length)]);
    const target = (1 << count) - 1;
    return { rows, chunks, masks, target, initial: solution.reduce((state, circuit) => state ^ masks[circuit - 1], target) };
  }

  const copyOperations = [
    { label: "Mirror", description: "Reverse all five strips", apply: reverse },
    { label: "Feed left", description: "Move the first strip to the end", apply: value => value.slice(1) + value[0] },
    { label: "Cross wires", description: "Swap the second and third strips", apply: value => value[0] + value[2] + value[1] + value.slice(3) }
  ];
  function copyPaths(start) {
    const queue = [[start, []]];
    const paths = new Map(queue);
    for (let i = 0; i < queue.length; i++) {
      const [value, path] = queue[i];
      copyOperations.forEach((operation, index) => {
        const next = operation.apply(value);
        if (!paths.has(next)) {
          const nextPath = [...path, index];
          paths.set(next, nextPath);
          queue.push([next, nextPath]);
        }
      });
    }
    return paths;
  }
  const copySolution = (start, target) => copyPaths(start).get(target) ?? null;
  let copyStarts;
  function makeCopyPuzzle(name, random = Math.random) {
    const target = "01234";
    copyStarts ??= [...copyPaths(target).keys()].filter(start => copySolution(start, target).length === 4);
    return { start: shuffle(copyStarts, random)[0], target, strips: splitName(nameLetters(name).join(""), 5) };
  }

  // Five-column stamp alphabet. Other scripts use the browser's actual glyph.
  const stampFont = {
    A: [14,17,17,31,17,17,17], B: [30,17,17,30,17,17,30], C: [15,16,16,16,16,16,15],
    D: [30,17,17,17,17,17,30], E: [31,16,16,30,16,16,31], F: [31,16,16,30,16,16,16],
    G: [15,16,16,23,17,17,15], H: [17,17,17,31,17,17,17], I: [31,4,4,4,4,4,31],
    J: [7,2,2,2,18,18,12], K: [17,18,20,24,20,18,17], L: [16,16,16,16,16,16,31],
    M: [17,27,21,21,17,17,17], N: [17,25,21,19,17,17,17], O: [14,17,17,17,17,17,14],
    P: [30,17,17,30,16,16,16], Q: [14,17,17,17,21,18,13], R: [30,17,17,30,20,18,17],
    S: [15,16,16,14,1,1,30], T: [31,4,4,4,4,4,4], U: [17,17,17,17,17,17,14],
    V: [17,17,17,17,17,10,4], W: [17,17,17,21,21,21,10], X: [17,17,10,4,10,17,17],
    Y: [17,17,10,4,4,4,4], Z: [31,1,2,4,8,16,31]
  };
  const sealInitials = name => normalizeName(name).split(" ").map(part => letters(letters(part)[0].toUpperCase())[0]);
  const sealGlyph = initial => stampFont[initial]?.map(row => Array.from({ length: 5 }, (_, col) => row >> (4 - col) & 1)) || null;
  function inkRuns(line) {
    const runs = [];
    let count = 0;
    for (const ink of [...line, 0]) {
      if (ink) count++;
      else if (count) { runs.push(count); count = 0; }
    }
    return runs.length ? runs : [0];
  }
  const patternCache = new Map();
  function sealPatterns(length, runs) {
    const key = length + ":" + runs.join(",");
    if (!patternCache.has(key)) patternCache.set(key, Array.from({ length: 1 << length }, (_, mask) =>
      Array.from({ length }, (_, i) => mask >> i & 1)).filter(line => inkRuns(line).join(",") === runs.join(",")));
    return patternCache.get(key);
  }
  function sealDeduction(puzzle) {
    const { width, height, givens } = puzzle;
    const grid = [...givens];
    let rows = puzzle.rows.map((runs, row) => sealPatterns(width, runs).filter(line => line.every((ink, col) => grid[row * width + col] === null || grid[row * width + col] === ink)));
    let columns = puzzle.columns.map((runs, col) => sealPatterns(height, runs).filter(line => line.every((ink, row) => grid[row * width + col] === null || grid[row * width + col] === ink)));
    let changed = true;
    while (changed) {
      changed = false;
      if (rows.some(lines => !lines.length) || columns.some(lines => !lines.length)) return null;
      for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
        const allowed = [0, 1].filter(ink => rows[row].some(line => line[col] === ink) && columns[col].some(line => line[row] === ink));
        if (!allowed.length) return null;
        const nextRows = rows[row].filter(line => allowed.includes(line[col]));
        const nextColumns = columns[col].filter(line => allowed.includes(line[row]));
        if (nextRows.length !== rows[row].length || nextColumns.length !== columns[col].length) changed = true;
        rows[row] = nextRows;
        columns[col] = nextColumns;
        if (allowed.length === 1) grid[row * width + col] = allowed[0];
      }
    }
    return grid;
  }
  function makeSealPuzzle(glyph, seed = 0) {
    const height = glyph.length;
    const width = glyph[0].length;
    const target = glyph.flat();
    const puzzle = { width, height, target, rows: glyph.map(inkRuns),
      columns: Array.from({ length: width }, (_, col) => inkRuns(glyph.map(row => row[col]))), givens: target.map(() => null) };
    // Add a fixed cell only when row/column deduction stalls. This guarantees
    // a unique solution obtainable without guessing, including unusual glyphs.
    let solved = sealDeduction(puzzle);
    while (solved.includes(null)) {
      const unknown = solved.map((value, i) => value === null ? i : -1).filter(i => i >= 0);
      const inked = unknown.filter(i => target[i]);
      const candidates = inked.length ? inked : unknown;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const cell = candidates[seed % candidates.length];
      puzzle.givens[cell] = target[cell];
      solved = sealDeduction(puzzle);
    }
    return puzzle;
  }
  const sealComplete = (puzzle, cells) => puzzle.target.every((ink, i) => ink === Number(cells[i] === 1));

  const neighbors = (maze, from, to) => Number.isInteger(to) && to >= 0 && to < maze.width * maze.width
    && Math.abs(Math.floor(from / maze.width) - Math.floor(to / maze.width)) + Math.abs(from % maze.width - to % maze.width) === 1;
  const adjacent = (maze, position) => [position - maze.width, position + 1, position + maze.width, position - 1]
    .filter(next => neighbors(maze, position, next) && maze.passages[position].includes(next));
  function mazePath(maze, from, to, blocked = []) {
    const queue = [[from, []]];
    const seen = new Set([from]);
    for (let i = 0; i < queue.length; i++) {
      const [position, path] = queue[i];
      if (position === to) return path;
      for (const next of adjacent(maze, position)) {
        if (!seen.has(next) && !blocked.includes(next)) {
          seen.add(next);
          queue.push([next, [...path, next]]);
        }
      }
    }
    return null;
  }
  function makeNameMaze(name, random = Math.random) {
    const width = 15;
    const start = Math.floor(width * width / 2);
    const passages = Array.from({ length: width * width }, () => []);
    const visitedRooms = new Set([start]);
    const frontier = [];
    const surrounding = cell => [cell - width, cell + 1, cell + width, cell - 1].filter(next => neighbors({ width }, cell, next));
    function connect(from, to) {
      passages[from].push(to);
      passages[to].push(from);
      visitedRooms.add(to);
      surrounding(to).filter(next => !visitedRooms.has(next)).forEach(next => frontier.push([to, next]));
    }
    // Prim's frontier grows many short branches instead of a DFS's long corridor.
    // Start with four routes from the center; walls separate cells, not whole tiles.
    surrounding(start).forEach(next => connect(start, next));
    while (frontier.length) {
      const index = Math.floor(random() * frontier.length);
      const [from, to] = frontier[index];
      frontier[index] = frontier[frontier.length - 1];
      frontier.pop();
      if (!visitedRooms.has(to)) connect(from, to);
    }
    const maze = { width, start, passages };
    // Pickups are all dead ends. No uncollected letter can block a route to
    // another one, even when repeated letters are collected in a different order.
    const chars = nameLetters(name);
    const leaves = passages.map((links, cell) => links.length === 1 ? cell : -1).filter(cell => cell >= 0);
    if (leaves.length < chars.length) return makeNameMaze(name, random);
    function branchLeaves(cell, parent) {
      return passages[cell].length === 1 ? [cell] : passages[cell].filter(next => next !== parent).flatMap(next => branchLeaves(next, cell));
    }
    const branches = shuffle(passages[start].map(cell => shuffle(branchLeaves(cell, start), random)), random);
    const positions = [];
    while (positions.length < chars.length) {
      for (const branch of branches) if (branch.length && positions.length < chars.length) positions.push(branch.pop());
    }
    maze.pickups = chars.map((char, index) => ({ char, index, cell: positions[index] }));
    return maze;
  }
  function mazeStep(maze, state, next) {
    if (!adjacent(maze, state.position).includes(next)) return { ...state, kind: "blocked" };
    const found = state.found || [];
    const piece = maze.pickups.find(piece => piece.cell === next && !found.includes(next));
    const expected = maze.pickups[state.collected];
    if (piece && piece.char.toUpperCase() !== expected?.char.toUpperCase()) return { position: maze.start, collected: 0, found: [], kind: "wrong", wrongIndex: piece.index };
    const collected = state.collected + Number(!!piece);
    const kind = piece ? collected === maze.pickups.length ? "complete" : "collected" : "moved";
    return { position: next, collected, found: piece ? [...found, next] : found, kind };
  }
  function mazeRay(maze, from, to) {
    if (from === to || Math.floor(from / maze.width) !== Math.floor(to / maze.width) && from % maze.width !== to % maze.width) return null;
    const offset = Math.floor(from / maze.width) === Math.floor(to / maze.width) ? Math.sign(to - from) : Math.sign(to - from) * maze.width;
    const path = [];
    let position = from;
    while (position !== to) {
      const next = position + offset;
      if (!adjacent(maze, position).includes(next)) return null;
      path.push(next);
      position = next;
    }
    return path;
  }
  function mazeMove(maze, state, to) {
    const path = mazeRay(maze, state.position, to);
    if (!path) return { ...state, kind: "blocked" };
    let next = state;
    for (const cell of path) {
      next = mazeStep(maze, next, cell);
      if (next.kind === "wrong" || next.kind === "complete") break;
    }
    return next;
  }
  function mazeRun(maze, state, offset) {
    if (![-maze.width, -1, 1, maze.width].includes(offset)) return state.position;
    let position = state.position;
    while (adjacent(maze, position).includes(position + offset)) {
      position += offset;
      if (adjacent(maze, position).length !== 2 || maze.pickups.some(piece => piece.cell === position && !(state.found || []).includes(piece.cell))) break;
    }
    return position;
  }

  globalThis.NameOffice = { rules: Object.freeze({
    letters, nameLetters, formatNameProgress, normalizeName, reverse, characterKind, customs, acceptsCustoms, validName, nameStats,
    queuePlaces, queueStepMs, queueDurationMs, formatRunTime, newRunSeed, runCode, createRandom, issueQueueTicket, queueStatus,
    shuffle, makeNameEvidence, decodeNameClue, nameClueLabel, nameMemo, makeNameStamps, makeStampTray, archiveTruth, makeNameArchive,
    circuitNumbers, powerState, powerSolution, makeNamePower,
    copyOperations, copySolution, makeCopyPuzzle, sealInitials, sealGlyph, inkRuns, sealDeduction, makeSealPuzzle, sealComplete, neighbors, adjacent, mazePath, makeNameMaze, mazeStep, mazeRay, mazeMove, mazeRun
  }) };
})();
