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

test('page renders a 25-cell grid and white-to-move indicator', async () => {
  await import('../ui.js');
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  expect(document.querySelectorAll('.cell').length).toBe(25);
  expect(document.getElementById('turnIndicator').textContent).toContain('White');
  expect(document.getElementById('turnIndicator').textContent).toContain('Move a Piece');
  expect(document.getElementById('wait-label').style.display).toBe('none');
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
