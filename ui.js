import NeutronGame from './neutron.js'
import { kWhitePiece, kBlackPiece, kNeutralPiece, kEmpty, kWhite1, kWhite2, kBlack1, kBlack2 } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI handlers. Cell clicks are handled in grid setup.
    document.getElementById('resetButton').addEventListener('click', () => {
            game.initializeGameState();
            resetGameUI(game);
        });

    document.getElementById('help-button').addEventListener('click', () => {
        document.getElementById('help-overlay').style.display = 'flex';
    });
    
    document.getElementById('close-help-button').addEventListener('click', () => {
        document.getElementById('help-overlay').style.display = 'none';
    });

    document.getElementById('difficultyButton').addEventListener('click', () => {
        game.setDifficulty((game.difficulty === 5) ? 1 : game.difficulty + 2);
        updateDifficultyIndicator(game);
    });

    document.getElementById('toggleModeButton').addEventListener('click', () => {
            game.aiEnabled = !game.aiEnabled;
            document.getElementById('toggleModeButton').textContent = game.aiEnabled ? "Disable AI" : "Enable AI";
            document.getElementById('difficultyButton').disabled = !game.aiEnabled;
    });
    const game = new NeutronGame(5, 5);
    // Render the initial grid
    resetGameUI(game);
});

function resetGameUI(game) {
    game.initializeGameState();
    const gameGridElement = document.getElementById('gameGrid');
    setupGridUI(gameGridElement, game); 
    updateTurnIndicator(game);  
    updateDifficultyIndicator(game);
    
    document.getElementById('wait-label').style.display='none';
    document.getElementById('help-button').style.display = 'flex';
    document.getElementById('toggleModeButton').disabled = false; 
}

function setupGridUI(gameGridElement, game) {
    gameGridElement.innerHTML = '';
    for (let y = 0; y < game.gridYsize; y++) {
        for (let x = 0; x < game.gridXsize; x++) {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            cellDiv.dataset.x = x;
            cellDiv.dataset.y = y;
            cellDiv.addEventListener('click', () => {
                handleCellClick(x, y, game);
            });
            gameGridElement.appendChild(cellDiv);

            const cellState = game.grid[x][y].state;
            if (cellState !== kEmpty) {
                const pieceImg = document.createElement('img');
                pieceImg.src = getPieceImage(cellState);
                pieceImg.classList.add('piece');
                cellDiv.appendChild(pieceImg);
            }
        }
    }
}
async function handleAITurn(game) {
    if (game.finished) {
        console.log("Game is over, no more moves allowed.");
        return; 
    }

    console.log("AI is thinking...");
    const before = new Date().getTime();
    const bestMove = game.getBestMoveForState(game, kBlackPiece);
    const after = new Date().getTime();


    console.log("AI took", after - before, "ms to make a move.");
    console.log("Best neutron move found by AI:", bestMove[0]);
    console.log("Best piece move found by AI:", bestMove[1]);

    if (bestMove.length > 0) {
        await animateMove(bestMove[0][0][0], bestMove[0][0][1], bestMove[0][1][0], bestMove[0][1][1], game);
        game.switchTurn();  

        // Ensure a slight delay between the moves to prevent overlap
        await new Promise((resolve) => setTimeout(resolve, 100));  

        await animateMove(bestMove[1][0][0], bestMove[1][0][1], bestMove[1][1][0], bestMove[1][1][1], game);
        game.switchTurn();  // Switch to the next player's turn after the piece move
        updateTurnIndicator(game);    
        document.getElementById('wait-label').style.display = 'none';    
        document.getElementById('help-button').style.display = 'flex';
    } else {
        console.log("No valid moves for AI.");
    }

    const winner = checkGameOver(game);
    if (game.finished) {
        gameOver(winner);
        return;
    }
}




function animateMove(fromX, fromY, toX, toY, game) {
    const cellElement = document.querySelector(`.cell[data-x="${fromX}"][data-y="${fromY}"]`);

    if (cellElement) {
        const pieceElement = cellElement.querySelector('.piece');

        if (pieceElement) {
            const cellSize = cellElement.getBoundingClientRect().width; 

            const deltaX = (toX - fromX) * cellSize;
            const deltaY = (toY - fromY) * cellSize;

            // animate in a Promise to be resolved when the animation ends
            return new Promise((resolve) => {
                pieceElement.style.transition = 'transform 0.5s ease';
                pieceElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                pieceElement.addEventListener('transitionend', function handleTransition() {
                    pieceElement.removeEventListener('transitionend', handleTransition);

                    // Now move the piece in game logic
                    game.movePiece(fromX, fromY, toX, toY);  // Update game state after animation

                    const targetCellElement = document.querySelector(`.cell[data-x="${toX}"][data-y="${toY}"]`);
                    if (targetCellElement) {
                        targetCellElement.appendChild(pieceElement);
                    }

                    pieceElement.style.transition = '';  
                    pieceElement.style.transform = ''; 
                    clearHighlights();

                    resolve();  
                }, { once: true });
            });
        } else {
            console.error(`No piece found in the cell at (${fromX}, ${fromY}) to animate.`);
        }
    } else {
        console.error(`No cell found at (${fromX}, ${fromY}) to animate.`);
    }

    return Promise.resolve();  
}



function handleMove(fromX, fromY, toX, toY, game) {

    return animateMove(fromX, fromY, toX, toY, game)
        .then(() => {
            if (game.turn === kBlackPiece) {
                document.getElementById('wait-label').style.display='flex';
                document.getElementById('help-button').style.display = 'none';
            }
            return new Promise((resolve) => setTimeout(resolve, 300));  
        })
        .then(() => {
            if (game.turn === kBlackPiece && game.aiEnabled) {
                
                handleAITurn(game);  
            }
        })
        .catch((error) => {
            console.error("Error in handleMove:", error);
        });
}

function handleCellClick(x, y, game) {
    if (game.finished) {
        console.log("Game is over, no more moves allowed.");
        return;  
    }
    const cellState = game.grid[x][y].state;
    if (game.selectedPiece !== null) {
        if (game.isValidMove(game.selectedPiece.x, game.selectedPiece.y, x, y)) {
            handleMove( game.selectedPiece.x, game.selectedPiece.y, x, y, game);
            game.switchTurn();
            updateTurnIndicator(game);
            game.selectedPiece = null;   
            const winner = checkGameOver(game);
            if (game.finished) {
                console.log("Game is over, no more moves allowed.");
                gameOver(winner);
                return;
            }

            // When the first move has been made, disable the AI toggle button
            if (!game.gameStarted) {
                game.gameStarted = true;
                document.getElementById('toggleModeButton').disabled = true; 
                document.getElementById('difficultyButton').disabled = true;
            }


        } else {
            // Invalid move, reset 
            game.selectedPiece = null;
            setupGridUI(document.getElementById('gameGrid'), game);  
        }
    } else {
        if ((cellState === game.turn && (game.turnStage === kWhite2 || game.turnStage === kBlack2))
         || (cellState === kNeutralPiece && (game.turnStage === kWhite1 || game.turnStage === kBlack1))) {
            game.selectedPiece = { x, y };
            game.highlightMovesForX(x, y);  // highlight in game object
            highlightValidMoves(game); // highlight in UI
        }
    }
}

function checkGameOver(game) {
    const neutronPos = game.getPiecesForColour(kNeutralPiece)[0];
    if (!neutronPos) {
        console.error('Neutron not found on the board');
        return null;
    }
    const neutronY = neutronPos[1];

    if (neutronY === 0) {
        game.finished = true;
        return kBlackPiece;  // Black wins
    } else if (neutronY === game.gridYsize - 1) {
        game.finished = true;
        return kWhitePiece;  // White wins
    }

    if (!game.neutronHasMoves()) {
        game.finished = true;
        return (game.turn === kBlack1) ? kWhitePiece : kBlackPiece;  // Other player wins
    }

    return null;  // No winner yet
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
    
    turnIndicator.innerText = turnText;

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

    turnIndicator.innerText = turnText;
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




