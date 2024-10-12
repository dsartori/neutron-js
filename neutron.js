import {kWhitePiece, 
        kBlackPiece, 
        kNeutralPiece, 
        kEmpty, 
        kWhite1, 
        kWhite2, 
        kBlack1, 
        kBlack2 } from './constants.js';

class NeutronGame {
    constructor(gridXsize, gridYsize) {
        this.gridXsize = gridXsize;
        this.gridYsize = gridYsize;
        this.aiEnabled = false;
        this.finished = false;
        this.selectedPiece = null;
        this.gameStarted = false;
        this.grid = this.createInitialGrid();
        this.difficulty = 3;
    }

    // Create the initial game grid and set the turn state
    createInitialGrid() {
        const grid = [];
        for (let x = 0; x < this.gridXsize; x++) {
            const row = [];
            for (let y = 0; y < this.gridYsize; y++) {
                row.push({ state: kEmpty, highlight: false });
            }
            grid.push(row);
        }

        // Black pieces 
        for (let p = 0; p < 5; p++) {
            grid[p][0].state = kBlackPiece;
        }

        // White pieces 
        for (let p = 0; p < 5; p++) {
            grid[p][this.gridYsize - 1].state = kWhitePiece;
        }

        // Neutron
        const centerX = Math.floor(this.gridXsize / 2);
        const centerY = Math.floor(this.gridYsize / 2);
        grid[centerX][centerY].state = kNeutralPiece;

        this.turn = kWhitePiece;  // kWhitePiece or kBlackPiece
        this.turnStage = kWhite2; // kWhite1, kWhite2, kBlack1, kBlack2 


        return grid;
    }

    initializeGameState() {
        this.grid = this.createInitialGrid();
        this.finished = false;
        this.selectedPiece = null;
        this.gameStarted = false;
    }


    getPiecesForColour(colour) {
        const pieces = [];
        for (let x = 0; x < this.gridXsize; x++) {
            for (let y = 0; y < this.gridYsize; y++) {
                if (this.grid[x][y].state === colour) {
                    pieces.push([x, y]);
                }
            }
        }
        return pieces;
    }

    isValidMove(fromX, fromY, toX, toY) {
        this.zeroGridHighlights();
        this.highlightMovesForX(fromX, fromY);
        const validMoves = this.getHighlightedCells();
        this.zeroGridHighlights();
        return validMoves.some(([x, y]) => x === toX && y === toY);
    }
    
    // Apply a move on the grid
    // skipValidation is used by the AI to bypass the move validation check
    movePiece(fromX, fromY, toX, toY, skipValidation = false) {
        if (!skipValidation && !this.isValidMove(fromX, fromY, toX, toY)) {
            return false;
        }
    
        // Swap the piece position
        this.grid[toX][toY].state = this.grid[fromX][fromY].state;
        this.grid[fromX][fromY].state = kEmpty;
        return true;
    }
        
    // Switch turns stages between the four possible states (White1, White2, Black1, Black2)
    // The game has two stages for each player, White1 -> White2 -> Black1 -> Black2
    // these stages are used by the user interface to sequence moves between the 
    // neutron and the player's pieces. turnStage doesn't mean anything to the game logic.
    switchTurn() {
        if (this.turnStage === kWhite1) {
            this.turnStage = kWhite2;
        } else if (this.turnStage === kWhite2) {
            this.turnStage = kBlack1;
            this.turn = kBlackPiece;
        } else if (this.turnStage === kBlack1) {
            this.turnStage = kBlack2;
        } else {
            this.turn = kWhitePiece;
            this.turnStage = kWhite1;
        }
    }
    
    neutronHasMoves() {
        const neutralPieces = this.getPiecesForColour(kNeutralPiece);
        const x = neutralPieces[0][0];
        const y = neutralPieces[0][1];
        
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (x + i < 0 || x + i >= this.gridXsize || y + j < 0 || y + j >= this.gridYsize) {
                    count++;
                } else {
                    const cell = this.grid[x + i][y + j];
                    if (cell.state > 0 && !(i === 0 && j === 0)) {
                        count++;
                    }
                }
            }
        }
        if (y === 0 || y === this.gridYsize - 1) {
            return 0;
        }
        return count < 8;
    }
    
    getMovesForGrid(state, turn) {
        const moves = [];
        
        if (state.finished) {
            return [];
        }

        const neutronPos = state.getPiecesForColour(kNeutralPiece);
        
        // Get all neutron moves
        const nMove = [neutronPos[0]];
        state.highlightMovesForX(neutronPos[0][0], neutronPos[0][1]);
        nMove.push(...state.getHighlightedCells());
        state.zeroGridHighlights();

        const pieces = turn === kWhitePiece ? state.getPiecesForColour(kWhitePiece) : state.getPiecesForColour(kBlackPiece);
        // piece moves
        for (let n = 1; n < nMove.length; n++) {
            for (let i = 0; i < pieces.length; i++) {
                const stateCopy = state.cloneGrid(state);
                // * In the copy:
                // * Move the neutron 
                stateCopy.movePiece(neutronPos[0][0], neutronPos[0][1], nMove[n][0], nMove[n][1],true);
                // * Get moves for current piece 
                stateCopy.highlightMovesForX(pieces[i][0], pieces[i][1]);
                const highlightedCells = stateCopy.getHighlightedCells();
                // Create moves array
                for (let h = 0; h < highlightedCells.length; h++) {
                    const tmpNeutronMove = [neutronPos[0], nMove[n]];  // Neutron's move
                    const tmpMove = [pieces[i], highlightedCells[h]];  // Piece's move
                    moves.push([tmpNeutronMove, tmpMove]);
                }
                stateCopy.zeroGridHighlights();
            }
        }
        return moves;
    }

    

    highlightMovesForX(x, y) {
        this.zeroGridHighlights();
    
        let i, hCell, myCell;
    
        // Up
        for (i = y - 1; i >= 0; i--) {
            myCell = this.grid[x][i];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    
        // Down
        for (i = y + 1; i < this.gridYsize; i++) {
            myCell = this.grid[x][i];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    
        // Left
        for (i = x - 1; i >= 0; i--) {
            myCell = this.grid[i][y];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    
        // Right
        for (i = x + 1; i < this.gridXsize; i++) {
            myCell = this.grid[i][y];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    
        // Up-left diagonal
        let s = Math.min(x, y);
        for (i = 1; i <= s; i++) {
            myCell = this.grid[x - i][y - i];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    
        // Up-right diagonal
        s = Math.min(this.gridXsize - x - 1, y);
        for (i = 1; i <= s; i++) {
            myCell = this.grid[x + i][y - i];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    
        // Down-right diagonal
        s = Math.min(this.gridXsize - x - 1, this.gridYsize - y - 1);
        for (i = 1; i <= s; i++) {
            myCell = this.grid[x + i][y + i];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    
        // Down-left diagonal
        s = Math.min(x, this.gridYsize - y - 1);
        for (i = 1; i <= s; i++) {
            myCell = this.grid[x - i][y + i];
            if (myCell.state === kEmpty) {
                hCell = myCell;
            } else {
                break;
            }
        }
        if (hCell) hCell.highlight = true;
    }
    alphaBeta(state, turn, depth, alpha, beta) {
        const validMoves = this.getMovesForGrid(state, turn);
    
        // Game over or max depth
        if (depth === 0 || validMoves.length === 0 || state.finished) {
            return state.evaluateStateTurn(turn);  
        }
    
        let bestScore = (turn === kBlackPiece) ? -1001 : 1001; 
        let nTurn = (turn === kBlackPiece) ? kWhitePiece : kBlackPiece; 
    
        for (let i = 0; i < validMoves.length; i++) {
            const newState = this.applyMoves(state, validMoves[i]);
    
            // Evaluate the new state after the move
            // * in the copy
            // * Evaluate the state for the next turn
            let score = newState.evaluateStateTurn(nTurn);  
    
            if (!newState.finished) {  
                // * If the game isn't over, continue recursion
                score = this.alphaBeta(newState, nTurn, depth - 1, alpha, beta);
            }
    
            if (turn === kBlackPiece) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }
    
            if (alpha >= beta) {
                break;
            }
        }
    
        return bestScore;
    }

    setDifficulty(difficulty){
        if ([1, 3, 5].includes(difficulty)) {
            this.difficulty = difficulty;
        }
    }
        
    evaluateMoves(state, turn, depth) {
        const validMoves = this.getMovesForGrid(state, turn);
    
        // Game over or max depth
        if (depth === 0 || validMoves.length === 0 || state.finished) {
            return state.evaluateStateTurn(turn);  
        }
    
        let bestMoves = [];
        let bestRank = (turn === kBlackPiece) ? -1001 : 1001;
        let nTurn = (turn === kBlackPiece) ? kWhitePiece : kBlackPiece;
    
        for (let i = 0; i < validMoves.length; i++) {
            const newState = this.applyMoves(state, validMoves[i]);
    
            // Check if the game ends after the move
            let score = newState.evaluateStateTurn(nTurn);  
    
            if (!newState.finished) {  // Only continue if game is not finished
                score = this.alphaBeta(newState, nTurn, depth - 1, -1001, 1001);
            }
    
            // Track the best move based on score
            if (turn === kBlackPiece && score > bestRank) {
                bestRank = score;
                bestMoves = [validMoves[i]];
            } else if (turn === kWhitePiece && score < bestRank) {
                bestRank = score;
                bestMoves = [validMoves[i]];
            } else if (score === bestRank) {
                bestMoves.push(validMoves[i]);
            }
        }
    
        return bestMoves;
    }
    
    // Apply best-move evaluation
    getBestMoveForState(state, turn) {
        const possibleMoves = this.evaluateMoves(state, turn, this.difficulty);
        if (possibleMoves.length > 0) {
            const randomIndex = Math.floor(Math.random() * possibleMoves.length);
            return possibleMoves[randomIndex];
        }
        return null;
    }
    
    
    // Helper function to apply moves in the cloned state
    applyMoves(state, move) {
        const neutronMove = move[0];
        const pieceMove = move[1];
        const [neutronStart, neutronEnd] = neutronMove;
        const [pieceStart, pieceEnd] = pieceMove;
    
        const newState = this.cloneGrid(state);
        newState.movePiece(neutronStart[0], neutronStart[1], neutronEnd[0], neutronEnd[1], true);
        newState.movePiece(pieceStart[0], pieceStart[1], pieceEnd[0], pieceEnd[1], true);
    
        return newState;
    }
    

    evaluateStateTurn(turn) {
        let score = 0;
    
        let neutronPos = this.getPiecesForColour(kNeutralPiece)[0];  
        const black = this.getPiecesForColour(kBlackPiece);
        const white = this.getPiecesForColour(kWhitePiece);
    
        const x = neutronPos[0];  
        const y = neutronPos[1];  
    
        let tmpCell;

        const multiplier = (turn === kWhitePiece) ? 1 : 1;
    
        // Endgame conditions
        if (y === this.gridYsize - 1) {
            score = -1000; // white win
            this.finished = true;

            return score;
        }
        if (y === 0) {
            score = 1000 //  black win
            this.finished = true;
            return score;
        }
    
        // No valid moves
        if (!this.neutronHasMoves()) {
            score = (turn === kBlackPiece) ? -1000 : 1000;
            this.finished = true;
            return score;
        }

        const opponent = turn === kWhitePiece ? kBlackPiece : kWhitePiece;
        const opponentMoves = this.getMovesForGrid(this, opponent);
        
        for (let oppMove of opponentMoves) {
            if (this.isWinningMove(this, oppMove)) {
                score -= 500; // Heavy penalty if opponent has a winning move. Only relevant at max depth
                return score;
            }
        }
        // Evaluate piece positions 
        const evaluatePieces = (pieces, isWhite) => {
            for (let i = 0; i < pieces.length; i++) {
                const pieceY = pieces[i][1];
                switch (pieceY) {
                    case 4:
                        score += 5 * (isWhite ? -1 : 1);
                        break;
                    case 3:
                        score += 3  * (isWhite ? -1 : 1);
                        break;
                    case 2:
                        score += 1 * (isWhite ? -1 : 1);
                        break;
                    case 1:
                        score -= 3  * (isWhite ? -1 : 1);
                        break;
                    case 0:
                        score -= 5  * (isWhite ? -1 : 1);
                        break;
                }
            }
        };
    
        evaluatePieces(white, true);   
        evaluatePieces(black, false);  
    
        // Check vertical paths
        const checkVerticalPath = (startY, endY, isWhite) => {
            tmpCell = this.grid[x][endY];
            if (tmpCell.state === kEmpty) {
                let flag = true;
                for (let i = startY; i !== endY; i += isWhite ? 1 : -1) {
                    tmpCell = this.grid[x][i];
                    if (tmpCell.state !== kEmpty) {
                        flag = false;
                        break;
                    }
                }
                if (flag) score += (isWhite ? -300 : 300) ;  
            }
        };
    
        checkVerticalPath(y + 1, this.gridYsize - 1, true);  
        checkVerticalPath(y - 1, 0, false); 
    
        // Check diagonal paths for both players
        const checkDiagonalPath = (isWhite) => {
            let tmpCell;
            let i;
            const modifier = (isWhite ? -25 : 25);
    
            // Up-left diagonal
            for (i = 1; x - i >= 0 && y - i >= 0; i++) {
                tmpCell = this.grid[x - i][y - i];
                if (tmpCell.state !== kEmpty) break;
            }
            if (i > 1 && x - i >= 0 && y - i >= 0 && this.grid[x - i][y - i].state === kEmpty) {
                score +=  modifier;
            }
    
            // Up-right diagonal
            for (i = 1; x + i < this.gridXsize && y - i >= 0; i++) {
                tmpCell = this.grid[x + i][y - i];
                if (tmpCell.state !== kEmpty) break;
            }
            if (i > 1 && x + i < this.gridXsize && y - i >= 0 && this.grid[x + i][y - i].state === kEmpty) {
                score +=  modifier;
            }
    
            // Down-left diagonal
            for (i = 1; x - i >= 0 && y + i < this.gridYsize; i++) {
                tmpCell = this.grid[x - i][y + i];
                if (tmpCell.state !== kEmpty) break;
            }
            if (i > 1 && x - i >= 0 && y + i < this.gridYsize && this.grid[x - i][y + i].state === kEmpty) {
                score += modifier;
            }
    
            // Down-right diagonal
            for (i = 1; x + i < this.gridXsize && y + i < this.gridYsize; i++) {
                tmpCell = this.grid[x + i][y + i];
                if (tmpCell.state !== kEmpty) break;
            }
            if (i > 1 && x + i < this.gridXsize && y + i < this.gridYsize && this.grid[x + i][y + i].state === kEmpty) {
                score += modifier;
            }
        };
    
        checkDiagonalPath(true);   
        checkDiagonalPath(false);  
    
        if (isNaN(score) || !isFinite(score)) {
            score = 0;  
        }
        return score;
    }
        
    cloneGrid(state) {
        const newState = new NeutronGame(this.gridXsize, this.gridYsize);
        for (let x = 0; x < this.gridXsize; x++) {
            for (let y = 0; y < this.gridYsize; y++) {
                newState.grid[x][y].state = state.grid[x][y].state;
            }
        }
        return newState;
    }
    
    getHighlightedPiece() {
        for (let x = 0; x < this.gridXsize; x++) {
            for (let y = 0; y < this.gridYsize; y++) {
                const cell = this.grid[x][y];
                if (cell.state > 0 && cell.highlight) {
                    return [x, y];
                }
            }
        }
        return null;
    }
    

    getHighlightedCells() {
        const highlightedCells = [];
        for (let x = 0; x < this.gridXsize; x++) {
            for (let y = 0; y < this.gridYsize; y++) {
                if (this.grid[x][y].highlight) {
                    highlightedCells.push([x, y]);
                }
            }
        }
        return highlightedCells;
    }
    
    zeroGridState() {
        for (let x = 0; x < this.gridXsize; x++) {
            for (let y = 0; y < this.gridYsize; y++) {
                this.grid[x][y].state = kEmpty; 
            }
        }
    }
    

    zeroGridHighlights() {
        for (let x = 0; x < this.gridXsize; x++) {
            for (let y = 0; y < this.gridYsize; y++) {
                this.grid[x][y].highlight = false; 
            }
        }
    }

    printMoves(moves) {
        let text = ''
        text+=('--- Moves Array ---\n');
        moves.forEach((movePair, index) => {
            const [neutronMove, pieceMove] = movePair;
            const [neutronStart, neutronEnd] = neutronMove;
            const [pieceStart, pieceEnd] = pieceMove;
            text+=(`Move ${index + 1}:\n`);
            text+=(`  Neutron [${neutronStart[0]}, ${neutronStart[1]}] -> [${neutronEnd[0]}, ${neutronEnd[1]}] - `);
            text+=(`  Piece [${pieceStart[0]}, ${pieceStart[1]}] -> [${pieceEnd[0]}, ${pieceEnd[1]}]\n\n`);
        });
        text+=('-------------------');
        return text;
    }

     printBoardState(grid) {
        let boardString = '\n';
        for (let y = 0; y < grid[0].length; y++) {
            let row = '';
            for (let x = 0; x < grid.length; x++) {
                const state = grid[x][y].state;
                if (state === kEmpty) {
                    row += '. '; 
                } else if (state === kWhitePiece) {
                    row += 'W '; 
                } else if (state === kBlackPiece) {
                    row += 'B '; 
                } else if (state === kNeutralPiece) {
                    row += 'N '; 
                }
            }
            boardString += row + '\n';
        }
    }

    isWinningMove(state, move) {
        const [neutronMove, pieceMove] = move;
        const neutronEnd = neutronMove[1];
        // Check if neutron reaches the opponent's winning row
        if (neutronEnd[1] === 0 || neutronEnd[1] === state.gridYsize - 1) {
            return true;
        }
        return false;
    }

}


export default NeutronGame;
