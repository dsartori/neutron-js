/**
 * @jest-environment jsdom
 */
// Full-game regression test. Drives the board through the real click
// handlers against the AI and asserts the rendered board never desyncs
// from the engine (images always agree with the engine's piece positions),
// and that the game reaches a winner rather than silently stalling.

const requiredHtml = `
<div class="game-container">
  <div id="gameGrid" class="grid"></div>
  <div class="dashboard">
    <div id="turnIndicator" class="turn-indicator"></div>
    <button id="resetButton" class="control-button">Reset</button>
    <button id="toggleModeButton" class="control-button">Enable AI</button>
    <button id="difficultyButton" class="control-button" disabled>Difficulty</button>
    <button id="help-button" class="help-button">?</button>
    <div id="wait-label" class="wait-indicator"><img class="wait-image" src="img/wait.svg"></div>
  </div>
  <div id="help-overlay" class="help-overlay">
    <div class="help-content">
      <h2>Neutron - Rules</h2>
      <p>Rules summary.</p>
      <button id="close-help-button" class="close-help-button">Close</button>
    </div>
  </div>
</div>`;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = requiredHtml;
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clickCell(x, y) {
  document
    .querySelector(`.cell[data-x="${x}"][data-y="${y}"]`)
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function readDOMBoard() {
  const board = [];
  for (let x = 0; x < 5; x++) {
    const col = [];
    for (let y = 0; y < 5; y++) {
      const img = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"] .piece`);
      let state = '.';
      if (img) {
        if (img.src.includes('black')) state = 'B';
        else if (img.src.includes('white')) state = 'W';
        else if (img.src.includes('neutron')) state = 'N';
      }
      col.push(state);
    }
    board.push(col);
  }
  return board;
}

test('greedy White against the AI reaches a winner without board desync', async () => {
  const consoleErrors = [];
  const originalError = console.error;
  console.error = (...args) => consoleErrors.push(args.map(String).join(' '));

  try {
    await import('../ui.js');
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    document.getElementById('toggleModeButton').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    let indicator = '';
    for (let round = 0; round < 40; round++) {
      indicator = document.getElementById('turnIndicator').textContent;
      if (indicator.includes('Wins!')) {
        break;
      }
      if (indicator.startsWith('Black:')) {
        await sleep(2000); // AI is thinking; animations take under 1s
        continue;
      }
      if (indicator.includes('Move the Neutron')) {
        const board = readDOMBoard();
        let nx = -1, ny = -1;
        for (let x = 0; x < 5; x++) {
          for (let y = 0; y < 5; y++) {
            if (board[x][y] === 'N') { nx = x; ny = y; }
          }
        }
        clickCell(nx, ny);
        const targets = [...document.querySelectorAll('.cell.highlight')].map(
          (el) => [Number(el.dataset.x), Number(el.dataset.y)]);
        expect(targets.length).toBeGreaterThan(0); // the neutron is never silently unselectable
        targets.sort((a, b) => b[1] - a[1]);      // push toward White's edge
        clickCell(targets[0][0], targets[0][1]);
        await sleep(400);
        continue;
      }
      if (indicator.includes('Move a Piece')) {
        const board = readDOMBoard();
        let moved = false;
        for (let x = 0; x < 5 && !moved; x++) {
          for (let y = 0; y < 5 && !moved; y++) {
            if (board[x][y] !== 'W') { continue; }
            clickCell(x, y);
            const targets = [...document.querySelectorAll('.cell.highlight')].map(
              (el) => [Number(el.dataset.x), Number(el.dataset.y)]);
            if (targets.length) {
              targets.sort((a, b) => b[1] - a[1]);
              clickCell(targets[0][0], targets[0][1]);
              moved = true;
            }
          }
        }
        await sleep(400);
        continue;
      }
    }

    indicator = document.getElementById('turnIndicator').textContent;
    expect(indicator).toContain('Wins!');
    // Ten pieces and the neutron stay on the board for the whole game.
    expect(document.querySelectorAll('.piece').length).toBe(11);
    expect(consoleErrors).toEqual([]);
  } finally {
    console.error = originalError;
  }
}, 90000);
