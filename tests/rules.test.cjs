"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
require("../site/rules.js");
const R = NameOffice.rules;
const names = ["Lady Soup", "Dr Doofenshmirtz", "Aei Oua", "Anne Anne", "Élodie OTurnipAnneSou", "李小龙 王小明", "a\u0332bc def", "Aaaa AaaaAaaaa", "a " + "a".repeat(19)];

test("run streams reproduce by seed, cleaned name and department, independently of other streams", () => {
  const sample = random => Array.from({ length: 20 }, () => random());
  const expected = sample(R.createRandom(0, "Dr Doofenshmirtz", "Archive"));
  assert.deepEqual(sample(R.createRandom(0, " Dr.  Doofenshmirtz! ", "Archive")), expected);
  for (const values of [[1, "Dr Doofenshmirtz", "Archive"], [0, "Lady Soup", "Archive"], [0, "Dr Doofenshmirtz", "Transit"]]) {
    assert.notDeepEqual(sample(R.createRandom(...values)), expected);
  }
  const gameplay = R.createRandom(0, "Dr Doofenshmirtz", "Archive");
  const appearance = R.createRandom(0, "Dr Doofenshmirtz", "Archive/appearance");
  const earlierDepartment = R.createRandom(0, "Dr Doofenshmirtz", "Stamps");
  for (let i = 0; i < 1000; i++) { appearance(); earlierDepartment(); }
  assert.deepEqual(sample(gameplay), expected);
  assert.ok(expected.every(value => value >= 0 && value < 1));
  assert.equal(R.runCode(0), "00000000");
  assert.equal(R.runCode(0xffffffff), "FFFFFFFF");
  const seed = R.newRunSeed();
  assert.match(R.runCode(seed), /^[0-9A-F]{8}$/);
  assert.notEqual(R.newRunSeed(seed), seed);
});

test("seeded puzzle generation replays without ambient randomness and varies between runs", () => {
  const builders = [
    ["Evidence", R.makeNameEvidence], ["Recovery", (name, random) => R.shuffle(R.nameLetters(name), random)],
    ["Secrecy", R.makeNameLock], ["Stamps", (name, random) => {
      const { target, stamps } = R.makeNameStamps(name, random);
      return Array.from({ length: 5 }, () => R.makeStampTray(stamps, R.nameLetters(target)[0], random));
    }],
    ["Archive", R.makeNameArchive], ["Transit", R.makeNameMaze], ["Energy", R.makeNamePower], ["Carbon", R.makeCopyPuzzle]
  ];
  const original = Math.random;
  Math.random = () => { throw new Error("seeded generation must not use Math.random"); };
  try {
    for (const [department, build] of builders) {
      const variants = new Set();
      for (const name of names) for (let seed = 0; seed < 6; seed++) {
        const puzzle = build(name, R.createRandom(seed, name, department));
        assert.deepEqual(build(name, R.createRandom(seed, name, department)), puzzle, `${department} must replay exactly`);
        if (name === names[0]) variants.add(JSON.stringify(puzzle));
        if (department === "Energy") assert.equal(R.powerSolution(puzzle).length, 3);
        if (department === "Carbon") assert.equal(R.copySolution(puzzle.start, puzzle.target).length, 4);
      }
      assert.ok(variants.size > 1, `${department} must vary even when the name is unchanged`);
    }
    const seal = seed => {
      const random = R.createRandom(seed, "Xavier Xylophone", "Approval");
      return [0, 1].map(() => R.makeSealPuzzle(R.sealGlyph("X"), Math.floor(random() * 4294967296)));
    };
    assert.deepEqual(seal(123), seal(123));
    for (const puzzle of seal(123)) assert.ok(!R.sealDeduction(puzzle).includes(null));
  } finally { Math.random = original; }
});

test("name cleanup ignores punctuation, numbers and extra whitespace without changing case", () => {
  assert.equal(R.normalizeName("Dr. Doofenshmirtz"), "Dr Doofenshmirtz");
  assert.equal(R.normalizeName("  Anne-Marie   O’Turnip!  "), "AnneMarie OTurnip");
  assert.equal(R.normalizeName("DR.  DOOFENSHMIRTZ"), "Dr Doofenshmirtz".toUpperCase());
  assert.equal(R.normalizeName("Lady\t\nSoup42"), "Lady Soup");
  assert.equal(R.normalizeName("E\u0301lodie Soup"), "Élodie Soup");
});

test("letter pieces skip spaces while preserving case, accents and repeated graphemes", () => {
  assert.deepEqual(R.nameLetters("A A B B"), ["A", "A", "B", "B"]);
  assert.deepEqual(R.nameLetters("E\u0301 a\u0332 李"), ["É", "a\u0332", "李"]);
  for (const name of names) {
    assert.equal(R.nameLetters(name).join(""), name.normalize("NFC").replace(/ /g, ""));
    assert.ok(R.nameLetters(name).every(char => char !== " "));
  }
});

test("letter progress restores word spacing without adding pieces or hiding mistakes", () => {
  for (const [value, expected] of [["", ""], ["A", "A"], ["AAA", "AAA"], ["AAAB", "AAA B"], ["AAABBB", "AAA BBB"], ["BBBBAA", "BBB BAA"]]) {
    assert.equal(R.formatNameProgress("AAA BBB", value), expected);
  }
  assert.equal(R.formatNameProgress("Élodie Soup", "E\u0301lodieS"), "Élodie S");
  assert.equal(R.formatNameProgress("a\u0332bc def", "a\u0332bcd"), "a\u0332bc d");
  assert.equal(R.formatNameProgress("李小龙 王小明", "李小龙王"), "李小龙 王");
  for (const name of names) assert.equal(R.formatNameProgress(name, R.nameLetters(name).join("")), name);
});

test("intake requires exactly two names, with six to twenty letters total", () => {
  for (const name of [...names, "Dr. Doofenshmirtz", "Anne-Marie O’Turnip", "J. Turnip", "Ab Cdef", "Ab " + "C".repeat(18)]) {
    assert.equal(R.validName(name), true, name);
  }
  for (const name of ["", "A", "Lady", "Ab Cd", "Lady Soup Junior", "Élodie OTurnipAnne Sou", "A B Cdef", Array(20).fill("a").join(" "), "-- --", "Ab " + "C".repeat(19), "<script>"]) {
    assert.equal(R.validName(name), false, name);
  }
});

test("completion times retain milliseconds without rounding up across a minute", () => {
  for (const [elapsed, expected] of [[0, "0:00.000"], [1234, "0:01.234"], [59999, "0:59.999"],
    [60000, "1:00.000"], [65432, "1:05.432"], [479999, "7:59.999"], [480000, "8:00.000"], [-1, "0:00.000"]]) {
    assert.equal(R.formatRunTime(elapsed), expected);
  }
});

test("queue tickets start 30 places apart and reach the player after exactly five minutes", () => {
  for (let i = 0; i < 1000; i++) {
    const ticket = R.issueQueueTicket();
    assert.ok(ticket.number >= 100 && ticket.number <= 999);
    assert.equal(ticket.number - ticket.serving, 30);
    assert.equal(R.queueStatus(ticket, null, 1e12).phase, "waiting");
    assert.equal(R.queueStatus(ticket, null, 1e12).serving, ticket.serving);
  }
  const ticket = { number: 500, serving: 470 }, start = 1000000;
  for (const [elapsed, steps, phase] of [[0,0,"normal"], [9999,0,"normal"], [10000,1,"normal"],
    [179999,17,"normal"], [180000,18,"warning"], [240000,24,"urgent"], [270000,27,"critical"],
    [299999,29,"critical"], [300000,30,"missed"], [900000,30,"missed"]]) {
    const queue = R.queueStatus(ticket, start, start + elapsed);
    assert.equal(queue.serving, ticket.serving + steps);
    assert.equal(queue.ahead, 30 - steps);
    assert.equal(queue.phase, phase);
    assert.equal(queue.remainingMs, Math.max(0, 300000 - elapsed));
  }
  assert.equal(R.queueStatus(ticket, start, start - 1000).serving, ticket.serving);
});

test("customs and reversal preserve capitalization, accents and whole graphemes", () => {
  assert.equal(R.customs("Lady Soup"), "Ldy Sp");
  assert.equal(R.customs("Aei Oua"), "NONE");
  assert.equal(R.customs("Élodie Soup"), "Éld Sp");
  assert.equal(R.customs("a\u0332bc def"), "a\u0332bc df");
  assert.deepEqual(R.letters("E\u0301a"), ["É", "a"]);
  for (const name of names) {
    assert.equal(R.reverse(R.reverse(name)), name.normalize("NFC"));
    assert.deepEqual(R.shuffle(R.letters(name)).sort(), R.letters(name).sort());
  }
  assert.equal(R.reverse(R.customs("Aei Oua").toUpperCase()), "ENON");
});

test("customs accepts keeping or removing Y without enforcing capitalization", () => {
  for (const answer of ["Ldy Sp", "Ld Sp", "LDY SP", "ld sp..."]) {
    assert.equal(R.acceptsCustoms("Lady Soup", answer), true, answer);
  }
  assert.equal(R.acceptsCustoms("Yves Yonder", "Yvs Yndr"), true);
  assert.equal(R.acceptsCustoms("Yves Yonder", "vs ndr"), true);
  assert.equal(R.acceptsCustoms("Yaya Yoyo", "NONE"), true);
  assert.equal(R.acceptsCustoms("Aei Oua", "none"), true);
  assert.equal(R.acceptsCustoms("Élodie Soup", "éld sp"), true);
  for (const answer of ["Lady Soup", "LdyY Sp", "LdZ Sp", "Ldy S", ""]) {
    assert.equal(R.acceptsCustoms("Lady Soup", answer), false, answer);
  }
});

test("recognition has three exact matches, two typos and four distinct name decoys", () => {
  function editDistance(left, right) {
    const a = R.letters(left);
    const b = R.letters(right);
    let row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 0; i < a.length; i++) {
      const next = [i + 1];
      for (let j = 0; j < b.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + Number(a[i] !== b[j])));
      row = next;
    }
    return row[b.length];
  }
  for (const name of ["Bobby Joe", ...names]) {
    const tiles = R.makeNameEvidence(name);
    assert.equal(tiles.length, 9);
    assert.equal(tiles.filter(tile => tile === name).length, 3);
    const decoys = tiles.filter(tile => tile !== name);
    assert.equal(new Set(decoys).size, 6);
    const parts = name.split(" ");
    const distractors = [name + " Junior", "Not " + name, parts.at(-1) + ", " + parts.slice(0, -1).join(" "), name + "!"];
    for (const distractor of distractors) assert.ok(decoys.includes(distractor));
    const typos = decoys.filter(tile => !distractors.includes(tile));
    assert.equal(typos.length, 2);
    for (const typo of typos) assert.equal(editDistance(name, typo), 1, typo);
  }
});

test("four-digit file locks have one reachable combination and preserve every name letter", () => {
  for (const name of [...names, "Straße Suppe", "क्ष्ण क्ष्ण"]) for (let seed = 0; seed < 30; seed++) {
    const puzzle = R.makeNameLock(name, R.createRandom(seed, name, "Secrecy"));
    assert.equal(puzzle.encoded.length, 4);
    assert.equal(puzzle.combination.length, 4);
    const target = R.nameLetters(puzzle.target);
    assert.equal(puzzle.encoded.reduce((sum, group) => sum + R.letters(group).length, 0), target.length);
    let position = 0;
    const decoded = puzzle.encoded.map((group, i) => {
      const expected = target.slice(position, position + R.letters(group).length).join("");
      position += R.letters(group).length;
      const matches = [];
      for (let digit = 0; digit < 10; digit++) {
        const value = R.letters(group).map(char => puzzle.alphabet[(puzzle.alphabet.indexOf(char) + digit) % puzzle.alphabet.length]).join("");
        if (value === expected) matches.push(digit);
      }
      if (group) assert.deepEqual(matches, [puzzle.combination[i]]);
      return expected;
    }).join("");
    assert.equal(decoded, target.join(""));
    assert.equal(R.lockGroups(puzzle, puzzle.combination).join(""), decoded);
    assert.notEqual(R.lockGroups(puzzle, [0, 0, 0, 0]).join(""), decoded);
  }
});

test("grouped puzzles keep first and last names separate and pad short panel rows at the end", () => {
  const example = R.makeNameLock("DR JOES", () => .5);
  assert.deepEqual(R.lockGroups(example, example.combination), ["DR", "J", "O", "ES"]);
  assert.deepEqual(R.makeCopyPuzzle("DR JOES", () => .5).strips, ["D", "R", "J", "O", "ES"]);
  assert.deepEqual(R.makeNamePower("DR JOES", () => .5).rows, [["D", "R", ""], ["J", "O", "ES"]]);
  for (const name of [...names, "A Bcdef", "Abcde F", "Straße Suppe", "क्ष्ण क्ष्ण"]) {
    const lock = R.makeNameLock(name, () => .5);
    for (const [source, chunks] of [[lock.target, R.lockGroups(lock, lock.combination)], [name, R.makeCopyPuzzle(name, () => .5).strips]]) {
      const parts = R.normalizeName(source).split(" ");
      const boundary = R.letters(parts[0]).length;
      let position = 0;
      for (const chunk of chunks) {
        const end = position + R.letters(chunk).length;
        assert.ok(!(position < boundary && end > boundary), "a chunk must not span the first/last name boundary");
        position = end;
      }
      assert.equal(chunks.join(""), parts.join(""));
    }
    const power = R.makeNamePower(name, () => .5);
    assert.deepEqual(power.rows.map(row => row.join("")), R.normalizeName(name).split(" "));
    power.rows.forEach(row => {
      assert.equal(row.length, 3);
      const blank = row.indexOf("");
      if (blank !== -1) assert.ok(row.slice(blank).every(chunk => chunk === ""), "unused panels belong at the end of a row");
    });
  }
});

test("stamp trays always show twelve unique choices including the next required letter", () => {
  for (const name of [...names, "Bobby Joe", "Straße Suppe", "ﬃﬄ Stuff", "Abcdefghij Klmnopqrst"]) {
    const { target, stamps } = R.makeNameStamps(name);
    assert.equal(target, name.toUpperCase().normalize("NFC"));
    const required = R.nameLetters(target);
    for (const char of required) assert.ok(stamps.includes(char), char);
    assert.equal(new Set(stamps).size, stamps.length);
    assert.ok(stamps.length > 0);
    assert.ok(!stamps.includes(" "));
    for (const next of [...required, undefined]) {
      const tray = R.makeStampTray(stamps, next);
      assert.equal(tray.length, 12);
      assert.equal(new Set(tray).size, 12);
      assert.ok(tray.every(char => char === char.toUpperCase() && /\p{L}/u.test(char)));
      assert.ok(tray.filter(char => stamps.includes(char)).length >= Math.min(8, stamps.length));
      const nextTray = R.makeStampTray(stamps, next, Math.random, tray);
      assert.ok(nextTray.some(char => !tray.includes(char)), "each shuffle must bring in a new letter");
      if (next !== undefined) assert.ok(tray.includes(next), "a long name must never lose its next stamp");
    }
  }
});

test("archive deductions have one solution, one liar and no decisive single clue", () => {
  const parities = new Set();
  for (const name of names) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const puzzle = R.makeNameArchive(name, R.createRandom(attempt, name, "Archive"));
      parities.add(puzzle.clues.find(clue => clue.slot === null).parity);
      const chars = R.nameLetters(name);
      assert.equal(puzzle.files.length, 6);
      assert.equal(new Set(puzzle.files.map(file => file.number)).size, 6);
      assert.equal(puzzle.clues.length, 4);
      const evaluated = puzzle.files.map(file => ({ file, truths: puzzle.clues.map(clue =>
        clue.slot === null ? file.number % 2 === (clue.parity ?? 0) : file.seal[clue.slot] === chars[clue.position]) }));
      const solutions = evaluated.filter(({ truths }) => truths.filter(Boolean).length === 3);
      assert.equal(solutions.length, 1);
      assert.equal(solutions[0].file.number, puzzle.original);
      assert.equal(solutions[0].truths.indexOf(false), puzzle.liar);
      assert.ok(evaluated.some(({ truths }) => truths.every(Boolean)), "all-honest decoy must not pass");
      for (let i = 0; i < 4; i++) {
        const matches = evaluated.filter(({ truths }) => truths[i]).length;
        assert.ok(matches >= 2 && matches <= 4, "each clue must leave multiple possibilities either way");
      }
      for (const clue of puzzle.clues.filter(clue => clue.slot !== null)) assert.notEqual(chars[clue.position], " ");
      for (const { file, truths } of evaluated) {
        assert.equal(file.seal.length, 3);
        assert.deepEqual(R.archiveTruth(file, puzzle.clues, name), truths);
      }
    }
  }
  assert.deepEqual([...parities].sort(), [0, 1], "both even and odd clues must occur across seeds");
});

test("the AAA BBB archive fixture resolves to File 78 and Clerk B with letter-only positions", () => {
  const clues = [{ slot: 0, position: 2 }, { slot: 1, position: 1 }, { slot: 2, position: 5 }, { slot: null }];
  const files = [[15, "SUW"], [63, "KAB"], [76, "IAI"], [78, "AKB"], [89, "AAI"], [92, "AAB"]]
    .map(([number, seal]) => ({ number, seal: R.letters(seal) }));
  const solutions = files.filter(file => R.archiveTruth(file, clues, "AAA BBB").filter(Boolean).length === 3);
  assert.deepEqual(solutions.map(file => file.number), [78]);
  assert.deepEqual(R.archiveTruth(solutions[0], clues, "AAA BBB"), [true, false, true, true]);
  assert.deepEqual(R.archiveTruth(files.at(-1), clues, "AAA BBB"), [true, true, true, true]);
});

test("name switchboards have exactly one solution and require three switches", () => {
  const patterns = new Set();
  for (const name of names) {
    const puzzle = R.makeNamePower(name);
    assert.deepEqual(puzzle.rows.map(row => row.join("")), name.split(" "));
    assert.ok(puzzle.rows.every(row => row.length === 3));
    assert.equal(puzzle.target, 63);
    const solutions = [];
    for (let mask = 0; mask < 64; mask++) {
      const on = R.circuitNumbers(mask);
      if (R.powerState(puzzle, on) === puzzle.target) solutions.push(on);
    }
    assert.equal(solutions.length, 1);
    assert.equal(solutions[0].length, 3);
    assert.deepEqual(R.powerSolution(puzzle), solutions[0]);
    patterns.add(puzzle.initial);
  }
  assert.ok(patterns.size > 1, "different names must produce different damage patterns");
});

test("short and long names keep their complete labels and a unique six-panel solution", () => {
  for (const name of ["A Bcdef", "Abcde F", "Ab Cdef", "Dr Doofenshmirtz", "A " + "B".repeat(19), "B".repeat(19) + " A", "क्ष्ण क्ष्ण"]) {
    const puzzle = R.makeNamePower(name);
    assert.deepEqual(puzzle.rows.map(row => row.join("")), name.split(" "));
    assert.ok(puzzle.rows.every(row => row.length === 3));
    assert.equal(puzzle.target, 63);
    assert.equal(puzzle.masks.length, 6);
    const solutions = Array.from({ length: 1 << puzzle.masks.length }, (_, mask) => R.circuitNumbers(mask))
      .filter(on => on.length === 3 && R.powerState(puzzle, on) === puzzle.target);
    assert.equal(solutions.length, 1);
    assert.equal(R.powerSolution(puzzle).length, 3);
    assert.deepEqual(R.powerSolution(puzzle), solutions[0]);
  }
});

test("mirrored switchboards have three connections per switch and panel, with twenty unique three-switch puzzles", () => {
  const reflected = [2, 1, 0, 5, 4, 3];
  const damage = new Set();
  for (let setup = 0; setup < 20; setup++) {
    const puzzle = R.makeNamePower("A Bcdef", () => (setup + .5) / 20);
    puzzle.masks.forEach((mask, circuit) => {
      assert.equal(R.circuitNumbers(mask).length, 3);
      const mirror = reflected.reduce((value, target, source) => value | ((mask >> source & 1) << target), 0);
      assert.equal(puzzle.masks[reflected[circuit]], mirror);
    });
    for (let panel = 0; panel < 6; panel++) assert.equal(puzzle.masks.filter(mask => mask >> panel & 1).length, 3);
    const solutions = Array.from({ length: 64 }, (_, mask) => R.circuitNumbers(mask)).filter(on => R.powerState(puzzle, on) === puzzle.target);
    assert.equal(solutions.length, 1);
    assert.equal(solutions[0].length, 3);
    damage.add(puzzle.initial);
  }
  assert.equal(damage.size, 20);
});

// An independent pathfinder treats wrong letters as walls. This verifies that
// a correct route exists, rather than trusting the game's own hint solver.
function safePath(maze, from, to, blocked = []) {
  const forbidden = new Set(blocked);
  const queue = [[from, []]];
  const visited = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const [position, path] = queue[i];
    if (position === to) return path;
    const row = Math.floor(position / maze.width);
    const col = position % maze.width;
    for (const [r, c] of [[row - 1, col], [row, col + 1], [row + 1, col], [row, col - 1]]) {
      const next = r * maze.width + c;
      if (r >= 0 && c >= 0 && r < maze.width && c < maze.width && maze.passages[position].includes(next) && !forbidden.has(next) && !visited.has(next)) {
        visited.add(next);
        queue.push([next, [...path, next]]);
      }
    }
  }
  return null;
}
test("200 generated mazes remain solvable when matching letters are collected in any order", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const name = names[seed % names.length];
    const maze = R.makeNameMaze(name, R.createRandom(seed, name, "Transit"));
    assert.equal(maze.width, 15);
    assert.equal(maze.start, 112);
    assert.equal(maze.passages[maze.start].length, 4);
    assert.equal(new Set(maze.pickups.map(piece => piece.cell)).size, R.nameLetters(name.split(" ")[0]).length);
    assert.equal(maze.pickups.map(piece => piece.char).join(""), name.split(" ")[0]);
    assert.ok(maze.pickups.every(piece => piece.char !== " " && maze.passages[piece.cell].length === 1), "every letter is in a dead end, never blocking transit");
    let state = { position: maze.start, collected: 0, found: [] };
    for (const expected of maze.pickups) {
      // Deliberately choose a different repeated letter, ignoring its original index.
      const piece = maze.pickups.findLast(piece => !state.found.includes(piece.cell) && piece.char.toUpperCase() === expected.char.toUpperCase());
      const wrong = maze.pickups.filter(piece => !state.found.includes(piece.cell) && piece.char.toUpperCase() !== expected.char.toUpperCase()).map(piece => piece.cell);
      const path = safePath(maze, state.position, piece.cell, wrong);
      assert.notEqual(path, null, `seed ${seed}: any matching letter must be reachable`);
      assert.ok(R.mazePath(maze, state.position, piece.cell).every(cell => !wrong.includes(cell)));
      for (const cell of path) {
        state = R.mazeStep(maze, state, cell);
        assert.notEqual(state.kind, "wrong");
        assert.notEqual(state.kind, "blocked");
      }
      assert.equal(state.collected, expected.index + 1);
      assert.equal(state.found.length, state.collected);
    }
    assert.equal(state.kind, "complete", "the last letter completes the maze without an exit");
  }
});

test("wrong letters restore every pickup; revisiting a collected letter never counts twice", () => {
  const maze = { width: 3, start: 4, passages: [[], [4], [], [4], [1, 3, 5, 7], [4], [], [4], []],
    pickups: [{ char: "A", index: 0, cell: 1 }, { char: "B", index: 1, cell: 3 }, { char: "a", index: 2, cell: 5 }] };
  const before = JSON.stringify(maze);
  let state = R.mazeStep(maze, { position: 4, collected: 0, found: [] }, 5);
  assert.equal(state.collected, 1, "the other A is valid, regardless of case or index");
  state = R.mazeStep(maze, state, 4);
  state = R.mazeStep(maze, state, 5);
  assert.equal(state.collected, 1, "one tile counts only once");
  state = R.mazeStep(maze, state, 4);
  const wrong = R.mazeStep(maze, state, 1);
  assert.equal(wrong.kind, "wrong", "B is required next, so the remaining A resets progress");
  assert.equal(wrong.position, 4);
  assert.equal(wrong.collected, 0);
  assert.deepEqual(wrong.found, []);
  state = R.mazeStep(maze, state, 3);
  assert.equal(state.collected, 2);
  state = R.mazeStep(maze, state, 4);
  state = R.mazeStep(maze, state, 1);
  assert.equal(state.kind, "complete");
  assert.deepEqual(new Set(state.found), new Set([1, 3, 5]));
  assert.equal(JSON.stringify(maze), before);
  assert.equal(R.neighbors(maze, 2, 3), false, "row edges must not wrap");
});

test("thin-wall mazes have many branches and dead ends, with four routes from the center", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const maze = R.makeNameMaze("Lady Soup", R.createRandom(seed, "Lady Soup", "Transit"));
    const cells = maze.passages;
    assert.equal(cells.length, 225);
    assert.equal(cells.reduce((sum, links) => sum + links.length, 0) / 2, cells.length - 1);
    assert.ok(cells.filter(links => links.length >= 3).length >= 40, "many actual branching decisions");
    assert.ok(cells.filter(links => links.length === 1).length >= 40, "many dead ends to explore");
    for (let cell = 0; cell < cells.length; cell++) {
      assert.notEqual(safePath(maze, maze.start, cell), null);
      for (const next of cells[cell]) {
        assert.ok(R.neighbors(maze, cell, next));
        assert.ok(cells[next].includes(cell), "walls agree in both directions");
      }
    }
  }
});

test("rook moves check walls and every intermediate letter; keys stop at junctions", () => {
  const maze = { width: 3, start: 4, passages: [[1], [0, 2, 4], [1, 5], [], [1, 5, 7], [2, 4], [], [4, 8], [7]],
    pickups: [{ char: "A", index: 0, cell: 1 }, { char: "B", index: 1, cell: 0 }, { char: "C", index: 2, cell: 2 }] };
  assert.deepEqual(R.mazeRay(maze, 0, 2), [1, 2]);
  assert.equal(R.mazeMove(maze, { position: 0, collected: 0 }, 2).kind, "wrong", "cannot leap over a later letter");
  assert.deepEqual(R.mazeMove(maze, { position: 0, collected: 0 }, 2), { position: 4, collected: 0, found: [], kind: "wrong", wrongIndex: 2 });
  assert.equal(R.mazeMove(maze, { position: 0, collected: 2, found: [0, 1] }, 2).kind, "complete");
  assert.equal(R.mazeMove(maze, { position: 0, collected: 0 }, 8).kind, "blocked", "diagonal movement is forbidden");
  assert.equal(R.mazeMove(maze, { position: 0, collected: 0 }, 6).kind, "blocked", "walls cannot be crossed");
  assert.equal(R.mazeMove(maze, { position: 2, collected: 3 }, 3).kind, "blocked", "row edges never wrap");
  assert.equal(R.mazeRun(maze, { position: 0, collected: 0 }, 1), 1, "stop on a pickup or junction");
  const corridor = { width: 5, passages: Array.from({ length: 25 }, (_, i) => i < 5 ? [i - 1, i + 1].filter(n => n >= 0 && n < 5) : []), pickups: [] };
  assert.equal(R.mazeRun(corridor, { position: 0, collected: 0 }, 1), 4, "one key press travels a whole straight corridor");
  assert.equal(R.mazeMove(corridor, { position: 0, collected: 0 }, 4).position, 4);
});

test("copier puzzles restore the actual name and always need exactly four operations", () => {
  for (const name of names) {
    const { start, target, strips } = R.makeCopyPuzzle(name);
    const path = R.copySolution(start, target);
    assert.equal(path.length, 4);
    assert.equal(path.reduce((value, operation) => R.copyOperations[operation].apply(value), start), target);
    assert.equal(target, "01234");
    assert.equal([...target].map(i => strips[Number(i)]).join(""), name.replace(/ /g, ""));
    assert.ok(strips.every(strip => !strip.includes(" ")), "carbon strips have no space characters");
    assert.ok(strips.every(strip => strip.length), "valid names have enough material for five strips");
  }
});

// Independent enumeration validates that the generated seal has only one answer.
function sealAnswers(puzzle) {
  const runKey = line => line.join("").split("0").filter(Boolean).map(run => run.length).join(",") || "0";
  const possibilities = (length, runs) => Array.from({ length: 2 ** length }, (_, mask) => Array.from({ length }, (_, i) => mask >> i & 1))
    .filter(line => runKey(line) === runs.join(","));
  const rows = puzzle.rows.map((runs, row) => possibilities(puzzle.width, runs).filter(line => line.every((ink, col) => puzzle.givens[row * puzzle.width + col] === null || puzzle.givens[row * puzzle.width + col] === ink)));
  const cols = puzzle.columns.map(runs => possibilities(puzzle.height, runs));
  const answers = [];
  function visit(chosen) {
    if (answers.length === 2) return;
    if (chosen.length === puzzle.height) { answers.push(chosen.flat()); return; }
    for (const row of rows[chosen.length]) {
      const next = [...chosen, row];
      if (cols.every((lines, col) => lines.some(line => next.every((row, r) => row[col] === line[r])))) visit(next);
    }
  }
  visit([]);
  return answers;
}

test("every initial stamp has one answer and can be solved by row/column deduction", () => {
  const glyphs = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(R.sealGlyph);
  glyphs.push(Array.from({ length: 7 }, (_, row) => Array.from({ length: 5 }, (_, col) => (row + col) % 2)));
  for (const glyph of glyphs) for (const seed of [0, 42, 729]) {
    const puzzle = R.makeSealPuzzle(glyph, seed);
    assert.deepEqual(R.sealDeduction(puzzle), glyph.flat());
    assert.deepEqual(sealAnswers(puzzle), [glyph.flat()]);
    assert.ok(puzzle.givens.every((ink, i) => ink === null || ink === puzzle.target[i]));
    assert.equal(R.sealComplete(puzzle, puzzle.target.map(ink => ink || null)), true, "blank squares need not all be marked");
    const wrong = [...puzzle.target]; wrong[0] = 1 - wrong[0];
    assert.equal(R.sealComplete(puzzle, wrong), false);
  }
  assert.deepEqual(R.sealInitials("Lady Soup"), ["L", "S"]);
  assert.deepEqual(R.sealInitials("Élodie OTurnip"), ["É", "O"]);
  assert.deepEqual(R.sealInitials("李小龙 王小明"), ["李", "王"]);
  assert.equal(R.sealGlyph("É"), null, "unsupported stencil letters use the browser glyph renderer");
});


test("file assessment text uses the matching name group's Caesar shift", () => {
  const puzzle = { alphabet: R.letters("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), combination: [2, 3, 4, 5] };
  assert.equal(R.lockText(puzzle, "Abc XYZ!", 0, 0), "Yza VWX!");
  assert.equal(R.lockText(puzzle, "Abc XYZ!", 1, 0), "Xyz UVW!");
  assert.equal(R.lockText(puzzle, "Abc XYZ!", 0, 3), "Bcd YZA!");
  for (let group = 0; group < 4; group++) {
    assert.equal(R.lockText(puzzle, "Any editable sentence. 123!", group, puzzle.combination[group]), "Any editable sentence. 123!");
  }
});


test("assessment lines interleave four cipher assignments and require every dial", () => {
  const puzzle = { alphabet: R.letters("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), combination: [1, 2, 3, 4] };
  const text = "ABCDEFGHIJKLMNOP";
  for (let row = 0; row < 4; row++) {
    const solved = R.lockAssessment(puzzle, text, row, puzzle.combination);
    assert.deepEqual(solved.map(part => part.dial), Array.from({ length: text.length }, (_, column) => (row + column) % 4));
    assert.equal(solved.map(part => part.text).join(""), text);
    for (let dial = 0; dial < 4; dial++) {
      const wrong = [...puzzle.combination]; wrong[dial]++;
      const shifted = R.lockAssessment(puzzle, text, row, wrong);
      shifted.forEach((part, column) => {
        if (part.dial === dial) assert.notEqual(part.text, solved[column].text);
        else assert.equal(part.text, solved[column].text);
      });
    }
  }
});


test("assessment cipher counts letters without consuming spaces or punctuation", () => {
  const puzzle = { alphabet: R.letters("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), combination: [1, 2, 3, 4] };
  const parts = R.lockAssessment(puzzle, "A B! C, D. E", 1, [0, 0, 0, 0]);
  assert.deepEqual(parts.filter(part => part.dial !== null).map(part => part.dial), [1, 2, 3, 0, 1]);
  assert.equal(parts.filter(part => part.dial === null).map(part => part.text).join(""), " ! , . ");
});
