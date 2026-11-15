import NeutronGame from './neutron.js'
import { kWhitePiece, kBlackPiece, kNeutralPiece, kEmpty, kWhite1, kBlack1 } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI handlers. Cell clicks are handled in grid setup.
    document.getElementById('resetButton').addEventListener('click', () => {
        resetGameUI(game);
    });

    document.getElementById('help-button').addEventListener('click', openHelpOverlay);
    document.getElementById('close-help-button').addEventListener('click', closeHelpOverlay);
    document.getElementById('help-overlay').addEventListener('click', (event) => {
        // Click on the backdrop, not the panel, dismisses the overlay.
        if (event.target === document.getElementById('help-overlay')) {
            closeHelpOverlay();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeHelpOverlay();
        }
    });

    document.getElementById('difficultyButton').addEventListener('click', () => {
        game.setDifficulty((game.difficulty === 5) ? 1 : game.difficulty + 2);
        updateDifficultyIndicator(game);
    });

    document.getElementById('toggleModeButton').addEventListener('click', () => {
        game.aiEnabled = !game.aiEnabled;
        updateControls(game);
    });

    // Render the initial grid. Debug logging: ?debug=1 in the URL, or
    // localStorage.setItem('neutronDebug', '1') then reload.
    const debug = new URLSearchParams(window.location.search).get('debug') === '1'
        || window.localStorage.getItem('neutronDebug') === '1';
    const game = new NeutronGame(5, 5);
    game.debug = debug;
    if (debug) {
        console.log('[neutron] debug logging enabled');
    }
    resetGameUI(game);
});

function resetGameUI(game) {
    game.initializeGameState();
    const gameGridElement = document.getElementById('gameGrid');
    setupGridUI(gameGridElement, game);
    updateTurnIndicator(game);
    updateDifficultyIndicator(game);
    updateControls(game);

    setWaitVisible(false);
    updateBoardInteractivity(game);
}

// Single source of truth for the dashboard button states. Both derive from the
// game, so a handler never has to remember to re-enable a button again.
function updateControls(game) {
    const toggle = document.getElementById('toggleModeButton');
    toggle.textContent = game.aiEnabled ? 'Disable AI' : 'Enable AI';
    toggle.disabled = game.gameStarted;
    toggle.title = game.gameStarted
        ? 'Start a new game to change the opponent'
        : 'Choose whether the computer plays Black';
    document.getElementById('difficultyButton').disabled = !game.aiEnabled;
}

// The spinner owns only its own reserved slot, so the rules stay reachable and
// the dashboard keeps a fixed width through an AI turn.
function setWaitVisible(visible) {
    document.getElementById('wait-label').classList.toggle('wait-active', visible);
}

// Sets the busy flag, the spinner, and the board cursor as one operation so the
// three cannot disagree after an early return.
function setAiThinking(game, thinking) {
    game.aiThinking = thinking;
    setWaitVisible(thinking);
    updateBoardInteractivity(game);
}

// Mirrors the guard in handleCellClick so a click that will be ignored reads as
// inert. One class on the grid covers all 25 cells.
function updateBoardInteractivity(game) {
    const blocked = game.finished || game.aiThinking
        || (game.aiEnabled && game.turn === kBlackPiece);
    document.getElementById('gameGrid').classList.toggle('board-locked', blocked);
}

function openHelpOverlay() {
    document.getElementById('help-overlay').style.display = 'flex';
}

function closeHelpOverlay() {
    document.getElementById('help-overlay').style.display = 'none';
}

// Rebuilds the board from scratch. Focus is restored to the cell that held it,
// so a rebuild cannot drop a keyboard user back to the top of the page.
function setupGridUI(gameGridElement, game) {
    const focused = document.activeElement;
    const hadCellFocus = !!(focused && focused.classList && focused.classList.contains('cell'));
    const focusX = hadCellFocus ? focused.dataset.x : null;
    const focusY = hadCellFocus ? focused.dataset.y : null;

    gameGridElement.innerHTML = '';
    for (let y = 0; y < game.gridYsize; y++) {
        for (let x = 0; x < game.gridXsize; x++) {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            cellDiv.dataset.x = x;
            cellDiv.dataset.y = y;
            cellDiv.setAttribute('role', 'button');
            cellDiv.tabIndex = 0;
            cellDiv.setAttribute('aria-label', cellLabel(x, y, game.grid[x][y].state));
            cellDiv.addEventListener('click', () => {
                handleCellClick(x, y, game);
            });
            cellDiv.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCellClick(x, y, game);
                }
            });
            gameGridElement.appendChild(cellDiv);

            const cellState = game.grid[x][y].state;
            if (cellState !== kEmpty) {
                const pieceImg = document.createElement('img');
                pieceImg.src = getPieceImage(cellState);
                pieceImg.alt = pieceName(cellState);
                pieceImg.classList.add('piece');
                cellDiv.appendChild(pieceImg);
            }
        }
    }

    if (hadCellFocus) {
        const restored = gameGridElement.querySelector(`.cell[data-x='${focusX}'][data-y='${focusY}']`);
        if (restored) {
            restored.focus();
        }
    }
}

function cellLabel(x, y, state) {
    return `${pieceName(state)} at column ${x + 1}, row ${y + 1}`;
}

function pieceName(state) {
    switch (state) {
        case kBlackPiece:
            return 'Black piece';
        case kWhitePiece:
            return 'White piece';
        case kNeutralPiece:
            return 'Neutron';
        default:
            return 'Empty cell';
    }
}

// Applies the move to the engine synchronously, then animates the picture.
// Engine state and the board are never more than one move apart.
// Applies the AI's move in two stages (neutron, then piece) and updates
// the board. Bails out silently if the board was reset mid-move.
async function applyBestMove(game, bestMove, revision, before) {
    const after = new Date().getTime();
    console.log('AI took', after - before, 'ms to make a move.');

    if (game.revision !== revision) {
        setAiThinking(game, false);
        return;
    }

    if (!bestMove) {
        console.log('AI has no move.');
        setAiThinking(game, false);
        finishIfGameOver(game);
        return;
    }

    const [neutronMove, pieceMove] = bestMove;
    if (game.debug) {
        console.log('[neutron] ai applies neutron move');
    }
    game.movePiece(neutronMove[0][0], neutronMove[0][1], neutronMove[1][0], neutronMove[1][1], true);
    game.switchTurn();
    if (game.revision !== revision) {
        setAiThinking(game, false);
        return;
    }
    await animateMove(neutronMove[0][0], neutronMove[0][1], neutronMove[1][0], neutronMove[1][1]);

    if (game.revision !== revision) {
        setAiThinking(game, false);
        return;
    }
    // A winning neutron slide ends the game. No piece phase follows.
    if (finishIfGameOver(game)) {
        setAiThinking(game, false);
        return;
    }
    // Short pause so the neutron animation reads before the piece animation.
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (game.debug) {
        console.log('[neutron] ai applies piece move');
    }
    game.movePiece(pieceMove[0][0], pieceMove[0][1], pieceMove[1][0], pieceMove[1][1], true);
    game.switchTurn();
    if (game.debug) {
        const terminal = game.getTerminalResult(game.turn);
        if (terminal) {
            console.log('[neutron] game decided on this move');
        } else if (game.hasImmediateWin()) {
            console.log('[neutron] WARNING: side to move can slide the neutron onto an edge row');
        } else {
            console.log('[neutron] side to move cannot slide the neutron onto an edge row');
        }
    }
    if (game.revision !== revision) {
        setAiThinking(game, false);
        return;
    }
    await animateMove(pieceMove[0][0], pieceMove[0][1], pieceMove[1][0], pieceMove[1][1]);

    updateTurnIndicator(game);
    setAiThinking(game, false);
    finishIfGameOver(game);
}

// The search runs in a Web Worker so the board stays responsive at depth 5.
// Falls back to a synchronous search when workers are unavailable.
async function handleAITurn(game) {
    if (game.finished || game.aiThinking) {
        return;
    }

    setAiThinking(game, true);
    const revision = game.revision;
    const before = new Date().getTime();
    const snapshot = game.getSearchState();
    if (game.debug) {
        console.log('[neutron] ai search rev=' + revision + ' depth=' + game.difficulty);
    }

    if (typeof Worker === 'undefined') {
        if (game.debug) {
            console.log('[neutron] ai path=sync (no Web Worker)');
        }
        await applyBestMove(game, game.getBestMoveForState(game, kBlackPiece), revision, before);
        return;
    }

    if (game.debug) {
        console.log('[neutron] ai path=worker');
    }
    let worker;
    try {
        worker = new Worker('ai-worker.js', { type: 'module' });
    } catch (error) {
        console.warn('Web Worker unavailable; searching synchronously.', error);
        await applyBestMove(game, game.getBestMoveForState(game, kBlackPiece), revision, before);
        return;
    }

    worker.onmessage = (event) => {
        worker.terminate();
        applyBestMove(game, event.data, revision, before)
            .catch((error) => {
                console.error('Failed to apply the AI move.', error);
                setAiThinking(game, false);
            });
    };
    worker.onerror = (event) => {
        console.warn('AI worker failed; searching synchronously.', event.message);
        worker.terminate();
        applyBestMove(game, game.getBestMoveForState(game, kBlackPiece), revision, before)
            .catch((error) => {
                console.error('Failed to apply the AI move.', error);
                setAiThinking(game, false);
            });
    };
    worker.postMessage(snapshot);
}

// getWinnerStatus sets game.finished, so the board cursor can be refreshed here
// for both the human and the AI winning paths.
function finishIfGameOver(game) {
    const status = game.getWinnerStatus();
    if (status.finished) {
        if (game.debug) {
            console.log('[neutron] game over winner=' + (status.winner === kWhitePiece ? 'white' : 'black'));
        }
        gameOver(status.winner);
        updateBoardInteractivity(game);
        return true;
    }
    return false;
}

// FLIP animation: the image moves into its destination cell first, then slides
// in from the origin cell. The DOM always agrees with the engine about which
// cell holds a piece, so lookups never fail mid-animation.
function animateMove(fromX, fromY, toX, toY) {
    const cellElement = document.querySelector(`.cell[data-x="${fromX}"][data-y="${fromY}"]`);

    if (!cellElement) {
        console.error(`No cell found at (${fromX}, ${fromY}) to animate.`);
        return Promise.resolve();
    }
    const pieceElement = cellElement.querySelector('.piece');
    if (!pieceElement) {
        console.error(`No piece found in the cell at (${fromX}, ${fromY}) to animate.`);
        return Promise.resolve();
    }
    const targetCellElement = document.querySelector(`.cell[data-x="${toX}"][data-y="${toY}"]`);
    if (!targetCellElement) {
        console.error(`No cell found at (${toX}, ${toY}) to animate into.`);
        return Promise.resolve();
    }

    const cellSize = cellElement.getBoundingClientRect().width;
    const deltaX = (toX - fromX) * cellSize;
    const deltaY = (toY - fromY) * cellSize;

    // Move the image to its destination cell, then slide it in from the origin.
    targetCellElement.appendChild(pieceElement);
    pieceElement.style.transition = '';
    pieceElement.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;
    // Force layout so the inverted position is registered before the transition starts.
    pieceElement.getBoundingClientRect();

    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) {
                return;
            }
            done = true;
            pieceElement.style.transition = '';
            pieceElement.style.transform = '';
            clearHighlights();
            resolve();
        };

        pieceElement.style.transition = 'transform 0.5s ease';
        pieceElement.style.transform = 'translate(0, 0)';
        pieceElement.addEventListener('transitionend', finish, { once: true });
        window.setTimeout(finish, 700);
    });
}

function handleCellClick(x, y, game) {
    if (game.finished || game.aiThinking) {
        return;
    }
    // Do not let the human move the AI's pieces.
    if (game.aiEnabled && game.turn === kBlackPiece) {
        return;
    }

    const cellState = game.grid[x][y].state;
    if (game.selectedPiece !== null) {
        if (game.isValidMove(game.selectedPiece.x, game.selectedPiece.y, x, y)) {
            const fromX = game.selectedPiece.x;
            const fromY = game.selectedPiece.y;
            if (game.debug) {
                console.log('[neutron] human move (' + fromX + ',' + fromY + ')->(' + x + ',' + y + ') stage=' + game.turnStage);
            }
            game.movePiece(fromX, fromY, x, y);
            animateMove(fromX, fromY, x, y);
            game.switchTurn();
            updateTurnIndicator(game);
            game.selectedPiece = null;
            updateSelectionMark(game);
            updateBoardInteractivity(game);

            game.gameStarted = true;
            updateControls(game);

            // A winning neutron slide ends the game. No piece phase follows.
            if (finishIfGameOver(game)) {
                return;
            }

            if (game.aiEnabled && game.turn === kBlackPiece) {
                // Let the piece animation play before the AI starts. Re-check at
                // fire time so a reset during the delay does not trigger an
                // out-of-turn move on the fresh board.
                window.setTimeout(() => {
                    if (game.aiEnabled && !game.finished && !game.aiThinking && game.turn === kBlackPiece) {
                        handleAITurn(game);
                    }
                }, 300);
            }
        } else if (x === game.selectedPiece.x && y === game.selectedPiece.y) {
            // Clicking the piece already held is a deliberate cancel.
            clearSelection(game);
        } else if (canSelectCell(game, cellState)) {
            // Re-point the selection at the piece just clicked. The grid rebuild
            // here used to cost the player both the selection and the focus.
            selectPiece(game, x, y);
        } else {
            clearSelection(game);
        }
    } else if (canSelectCell(game, cellState)) {
        selectPiece(game, x, y);
    }
}

// The turn stage decides which piece a click may pick up: the neutron first,
// then a piece belonging to the side to move.
function canSelectCell(game, cellState) {
    if (game.turnStage === kWhite1 || game.turnStage === kBlack1) {
        return cellState === kNeutralPiece;
    }
    return cellState === game.turn;
}

// The previous piece's destinations must go first, or switching selection shows
// the union of two pieces' legal moves.
function selectPiece(game, x, y) {
    game.selectedPiece = { x, y };
    game.highlightMovesForX(x, y);  // highlight in game object
    clearHighlights();              // drop the previous piece's destinations
    highlightValidMoves(game);      // highlight in UI
    updateSelectionMark(game);
}

function clearSelection(game) {
    game.selectedPiece = null;
    game.zeroGridHighlights();
    clearHighlights();
    updateSelectionMark(game);
}

function gameOver(winner) {
    const turnIndicator = document.getElementById('turnIndicator');
    let turnText = "";

    if (winner === kWhitePiece) {
        turnText = "White Wins!";
        turnIndicator.classList.add('white-turn');
        turnIndicator.classList.remove('black-turn');
    } else {
        turnText = "Black Wins!";
        turnIndicator.classList.add('black-turn');
        turnIndicator.classList.remove('white-turn');
    }

    turnIndicator.textContent = turnText;
}

function highlightValidMoves(game) {
    const highlightedCells = game.getHighlightedCells();
    highlightedCells.forEach(([x, y]) => {
        const cellDiv = document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
        if (cellDiv) {
            cellDiv.classList.add('highlight');
        }
    });
}

// Marks the piece the player holds. Separate from .highlight, which marks
// destinations, so the source stays marked while its move animates.
function updateSelectionMark(game) {
    document.querySelectorAll('.cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    const selected = game.selectedPiece;
    if (!selected) {
        return;
    }
    const cellDiv = document.querySelector(`.cell[data-x='${selected.x}'][data-y='${selected.y}']`);
    if (cellDiv) {
        cellDiv.classList.add('selected');
    }
}

function getPieceImage(state) {
    switch (state) {
        case kBlackPiece:
            return 'img/black.png';
        case kWhitePiece:
            return 'img/white.png';
        case kNeutralPiece:
            return 'img/neutron.png';
        default:
            return '';
    }
}

function updateTurnIndicator(game) {
    const turnIndicator = document.getElementById('turnIndicator');
    let turnText = "";

    if (game.turn === kWhitePiece) {
        turnText = "White: ";
        turnIndicator.classList.add('white-turn');
        turnIndicator.classList.remove('black-turn');
    } else {
        turnText = "Black: ";
        turnIndicator.classList.add('black-turn');
        turnIndicator.classList.remove('white-turn');
    }

    if (game.turnStage === kWhite1 || game.turnStage === kBlack1) {
        turnText += "Move the Neutron";
        turnIndicator.classList.add('neutron-stage');
    } else {
        turnText += "Move a Piece";
        turnIndicator.classList.remove('neutron-stage');
    }

    turnIndicator.textContent = turnText;
}

function updateDifficultyIndicator(game) {
    const difficultyIndicator = document.getElementById('difficultyButton');
    let difficultyText = '';
    switch (game.difficulty) {
        case 1:
            difficultyText = 'Easy';
            break;
        case 3:
            difficultyText = 'Normal';
            break;
        case 5:
            difficultyText = 'Hard';
            break;
        default:
            difficultyText = 'Unknown';
    }
    difficultyIndicator.textContent = `Difficulty: ${difficultyText}`;
}

function clearHighlights() {
    const highlightedCells = document.querySelectorAll('.highlight');

    highlightedCells.forEach(cell => {
        cell.classList.remove('highlight');
    });
}
