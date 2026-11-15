/**
 * @jest-environment jsdom
 */

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

const clickEl = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const clickCell = (x, y) => clickEl(document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`));
const highlighted = () => [...document.querySelectorAll('.cell.highlight')].map((el) => `${el.dataset.x},${el.dataset.y}`);
const selectedCells = () => [...document.querySelectorAll('.cell.selected')].map((el) => `${el.dataset.x},${el.dataset.y}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The AI turn runs on real timers with a 700 ms animation fallback under jsdom.
// Poll the spinner instead of guessing a duration.
async function waitForAi(maxMs = 8000) {
  const wait = document.getElementById('wait-label');
  await sleep(400);
  for (let n = 0; n < maxMs / 100 && wait.classList.contains('wait-active'); n++) {
    await sleep(100);
  }
}

test('page renders a 25-cell grid and white-to-move indicator', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  expect(document.querySelectorAll('.cell').length).toBe(25);
  expect(document.getElementById('turnIndicator').textContent).toContain('White');
  expect(document.getElementById('turnIndicator').textContent).toContain('Move a Piece');
  expect(document.getElementById('wait-label').classList.contains('wait-active')).toBe(false);
});

test('clicking a white piece highlights its legal slide destinations', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const whiteCell = document.querySelector('.cell[data-x="0"][data-y="4"]');
  whiteCell.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  expect(document.querySelectorAll('.cell.highlight').length).toBeGreaterThan(0);
});

test('clicking a black piece on white\'s turn does not select it', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const blackCell = document.querySelector('.cell[data-x="0"][data-y="0"]');
  blackCell.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  expect(document.querySelectorAll('.cell.highlight').length).toBe(0);
});

test('toggle button flips AI mode and enables the difficulty button', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const toggle = document.getElementById('toggleModeButton');
  const difficulty = document.getElementById('difficultyButton');
  expect(toggle.textContent).toBe('Enable AI');
  expect(difficulty.disabled).toBe(true);

  toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  expect(toggle.textContent).toBe('Disable AI');
  expect(difficulty.disabled).toBe(false);
});

test('the selected piece is marked, and its destinations are highlighted', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  clickCell(0, 4);

  expect(selectedCells()).toEqual(['0,4']);
  expect(highlighted().length).toBeGreaterThan(0);
});

test('selecting a second own piece moves the selection and its destinations', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  clickCell(0, 4);
  const firstDestinations = highlighted();

  clickCell(1, 4);

  expect(selectedCells()).toEqual(['1,4']);
  const secondDestinations = highlighted();
  expect(secondDestinations.length).toBeGreaterThan(0);
  // Guards against showing the union of both pieces' legal moves.
  expect(secondDestinations.filter((cell) => firstDestinations.includes(cell))).toEqual([]);
});

test('clicking the piece already held cancels the selection', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  clickCell(0, 4);
  expect(selectedCells()).toEqual(['0,4']);

  clickCell(0, 4);

  expect(selectedCells()).toEqual([]);
  expect(highlighted()).toEqual([]);
});

test('a rejected click keeps keyboard focus on the same cell', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const cell = document.querySelector('.cell[data-x="0"][data-y="4"]');
  cell.focus();
  clickCell(0, 4);

  clickCell(3, 3);

  expect(document.activeElement).toBe(cell);
  expect(selectedCells()).toEqual([]);
});

test('the first move locks the AI toggle and leaves difficulty selectable', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  clickEl(document.getElementById('toggleModeButton'));
  clickCell(0, 4);
  clickCell(0, 1);
  await waitForAi();

  const toggle = document.getElementById('toggleModeButton');
  expect(toggle.disabled).toBe(true);
  expect(toggle.title).toContain('new game');
  expect(document.getElementById('difficultyButton').disabled).toBe(false);
});

test('the rules button stays visible while the AI thinks', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const help = document.getElementById('help-button');
  const wait = document.getElementById('wait-label');
  const helpHidden = [];
  const spinnerShown = [];

  new window.MutationObserver(() => {
    if (help.style.display === 'none') { helpHidden.push(help.style.display); }
  }).observe(help, { attributes: true, attributeFilter: ['style'] });

  new window.MutationObserver(() => {
    if (wait.classList.contains('wait-active')) { spinnerShown.push(true); }
  }).observe(wait, { attributes: true, attributeFilter: ['class'] });

  clickEl(document.getElementById('toggleModeButton'));
  clickCell(0, 4);
  clickCell(0, 1);
  await waitForAi();

  expect(spinnerShown.length).toBeGreaterThan(0);
  expect(helpHidden).toEqual([]);
});
