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
        this.aiThinking = false;
        this.revision = 0;
        this.grid = this.createInitialGrid();
        this.difficulty = 3;
        this.random = Math.random;
        this.debug = false;
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
        this.aiThinking = false;
        this.revision += 1;
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

    // Plain, serialisable snapshot used to hand the position to the AI worker.
    getSearchState() {
        return {
            grid: this.grid.map(col => col.map(cell => cell.state)),
            turn: this.turn,
            turnStage: this.turnStage,
            difficulty: this.difficulty,
            debug: this.debug,
        };
    }

    // Inverse of getSearchState. Used by the AI worker.
    static fromSearchState(snapshot) {
        const game = new NeutronGame(snapshot.grid.length, snapshot.grid[0].length);
        for (let x = 0; x < snapshot.grid.length; x++) {
            for (let y = 0; y < snapshot.grid[0].length; y++) {
                game.grid[x][y].state = snapshot.grid[x][y];
                game.grid[x][y].highlight = false;
            }
        }
        game.turn = snapshot.turn;
        game.turnStage = snapshot.turnStage;
        game.difficulty = snapshot.difficulty;
        game.debug = !!snapshot.debug;
        return game;
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
            return false;
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

        // A sliding piece comes to rest on the farthest empty cell along
        // each of the eight compass directions, or not at all.
        const directions = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1],
        ];

        for (const [dx, dy] of directions) {
            let lastEmpty = null;
            let cx = x + dx;
            let cy = y + dy;
            while (cx >= 0 && cx < this.gridXsize && cy >= 0 && cy < this.gridYsize) {
                if (this.grid[cx][cy].state !== kEmpty) break;
                lastEmpty = this.grid[cx][cy];
                cx += dx;
                cy += dy;
            }
            if (lastEmpty) lastEmpty.highlight = true;
        }
    }
    alphaBeta(state, turn, depth, alpha, beta) {
        const validMoves = this.getMovesForGrid(state, turn);

        // Game over or max depth
        if (depth === 0 || validMoves.length === 0) {
            return state.evaluateStateTurn(turn);
        }

        const maximizing = (turn === kBlackPiece);
        const nTurn = maximizing ? kWhitePiece : kBlackPiece;
        let bestScore = maximizing ? -1001 : 1001;

        for (let i = 0; i < validMoves.length; i++) {
            const newState = this.applyMoves(state, validMoves[i]);
            const terminal = newState.getTerminalResult(nTurn);
            const score = terminal
                ? terminal.score
                : this.alphaBeta(newState, nTurn, depth - 1, alpha, beta);

            if (maximizing) {
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
        const startedAt = this.debug ? Date.now() : 0;
        const scoredMoves = this.debug ? [] : null;
        const validMoves = this.getMovesForGrid(state, turn);

        // Always returns an array. Empty when there is nothing to play.
        if (depth === 0 || validMoves.length === 0) {
            return [];
        }

        const maximizing = (turn === kBlackPiece);
        const nTurn = maximizing ? kWhitePiece : kBlackPiece;
        let bestRank = maximizing ? -1001 : 1001;
        let bestMoves = [];
        const immediateWins = [];

        for (let i = 0; i < validMoves.length; i++) {
            const newState = this.applyMoves(state, validMoves[i]);
            const terminal = newState.getTerminalResult(nTurn);
            // Full window per candidate. Sharing alpha across siblings lets a
            // pruned child return an artifact bound (e.g. 1000 when it was cut
            // early), which then ties with genuine wins and corrupts the
            // best-move set. Each root child must be exact.
            const score = terminal
                ? terminal.score
                : this.alphaBeta(newState, nTurn, depth - 1, -1001, 1001);
            if (scoredMoves) {
                scoredMoves.push({ move: validMoves[i], score, terminal: !!terminal });
            }

            // A move that ends the game on this ply beats any searched line.
            if (terminal && ((maximizing && terminal.score > 0) || (!maximizing && terminal.score < 0))) {
                immediateWins.push(validMoves[i]);
            }

            if ((maximizing && score > bestRank) || (!maximizing && score < bestRank)) {
                bestRank = score;
                bestMoves = [validMoves[i]];
            } else if (score === bestRank) {
                bestMoves.push(validMoves[i]);
            }

        }

        // Among tied best moves, prefer not to end the game or hand the side
        // to move a one-ply edge slide. hasImmediateWin asks only for a slide,
        // so a terminal position (neutron already on an edge row) can look
        // quiet to it. Exclude terminal candidates first; failing that, at
        // least never self-finalize when any tied non-terminal exists.
        if (immediateWins.length === 0 && bestMoves.length > 1) {
            const scored = bestMoves.map((candidate) => {
                const ns = this.applyMoves(state, candidate);
                return { candidate, terminal: ns.getTerminalResult(nTurn), opponentWin: ns.hasImmediateWin() };
            });
            let narrowed = scored.filter((entry) => entry.terminal === null && !entry.opponentWin)
                .map((entry) => entry.candidate);
            let stage = 'one-ply-proof';
            if (narrowed.length === 0) {
                narrowed = scored.filter((entry) => entry.terminal === null)
                    .map((entry) => entry.candidate);
                stage = 'never-self-final';
            }
            if (narrowed.length > 0 && this.debug && narrowed.length !== bestMoves.length) {
                console.log('[neutron] tie-break: ' + bestMoves.length + ' -> ' + narrowed.length + ' (' + stage + ')');
            }
            if (narrowed.length > 0) {
                bestMoves = narrowed;
            }
        }

        if (this.debug) {
            const ranked = scoredMoves.slice().sort((a, b) => (
                maximizing ? b.score - a.score : a.score - b.score
            ));
            console.log('[neutron] search depth=' + depth +
                ' moves=' + validMoves.length +
                ' immediateWins=' + immediateWins.length +
                ' bestSet=' + (immediateWins.length || bestMoves.length) +
                ' t=' + (Date.now() - startedAt) + 'ms');
            ranked.slice(0, 6).forEach((entry, index) => {
                console.log('[neutron]   cand[' + index + '] score=' + entry.score +
                    (entry.terminal ? ' terminal' : '') +
                    ' ' + this.formatMove(entry.move));
            });
        }

        return immediateWins.length > 0 ? immediateWins : bestMoves;
    }

    // Debug helper: one-line summary of a move pair.
    formatMove(move) {
        const [nMove, pieceMove] = move;
        return 'neutron(' + nMove[0][0] + ',' + nMove[0][1] + ')->(' + nMove[1][0] + ',' + nMove[1][1] +
            ') piece(' + pieceMove[0][0] + ',' + pieceMove[0][1] + ')->(' + pieceMove[1][0] + ',' + pieceMove[1][1] + ')';
    }
    
    // Apply best-move evaluation
    getBestMoveForState(state, turn) {
        const possibleMoves = this.evaluateMoves(state, turn, this.difficulty);
        if (possibleMoves.length > 0) {
            const randomIndex = Math.floor(this.random() * possibleMoves.length);
            const chosen = possibleMoves[randomIndex];
            if (this.debug) {
                console.log('[neutron] chose ' + this.formatMove(chosen));
            }
            return chosen;
        }
        if (this.debug) {
            console.log('[neutron] no legal move');
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
    

    // Terminal result for the side to move, or null while the game runs.
    // Absolute score convention: Black positive, White negative.
    getTerminalResult(turn) {
        const neutron = this.getPiecesForColour(kNeutralPiece)[0];
        if (!neutron) {
            return null;
        }
        const y = neutron[1];
        if (y === 0) {
            return { score: 1000, winner: kBlackPiece };
        }
        if (y === this.gridYsize - 1) {
            return { score: -1000, winner: kWhitePiece };
        }
        if (!this.neutronHasMoves()) {
            return {
                score: turn === kBlackPiece ? -1000 : 1000,
                winner: turn === kBlackPiece ? kWhitePiece : kBlackPiece,
            };
        }
        return null;
    }

    // Sole place the real game's finished flag is set. Search nodes use
    // getTerminalResult instead and stay mutation-free.
    getWinnerStatus() {
        const neutron = this.getPiecesForColour(kNeutralPiece)[0];
        if (!neutron) {
            return { finished: false, winner: null };
        }
        const terminal = this.getTerminalResult(this.turn);
        if (terminal) {
            this.finished = true;
            return { finished: true, winner: terminal.winner };
        }
        return { finished: false, winner: null };
    }

    // True when the neutron can slide onto an edge row in one move.
    hasImmediateWin() {
        const neutron = this.getPiecesForColour(kNeutralPiece)[0];
        if (!neutron) {
            return false;
        }
        this.highlightMovesForX(neutron[0], neutron[1]);
        const edgeRow = this.gridYsize - 1;
        const wins = this.getHighlightedCells()
            .some(([, cy]) => cy === 0 || cy === edgeRow);
        this.zeroGridHighlights();
        return wins;
    }

    evaluateStateTurn(turn) {
        let score = 0;

        const neutronPos = this.getPiecesForColour(kNeutralPiece)[0];
        const black = this.getPiecesForColour(kBlackPiece);
        const white = this.getPiecesForColour(kWhitePiece);

        const x = neutronPos[0];
        const y = neutronPos[1];

        let tmpCell;

        const terminal = this.getTerminalResult(turn);
        if (terminal) {
            return terminal.score;
        }

        // The side to move wins if the neutron can slide onto an edge row now.
        if (this.hasImmediateWin()) {
            return turn === kBlackPiece ? 1000 : -1000;
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

        // The neutron is the prize. Closer to Black's edge favours Black.
        score += (Math.floor(this.gridYsize / 2) - y) * 60;
    
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
        const newState = new NeutronGame(state.gridXsize, state.gridYsize);
        newState.difficulty = state.difficulty;
        newState.aiEnabled = state.aiEnabled;
        for (let x = 0; x < state.gridXsize; x++) {
            for (let y = 0; y < state.gridYsize; y++) {
                newState.grid[x][y].state = state.grid[x][y].state;
                newState.grid[x][y].highlight = false;
            }
        }
        return newState;
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
    
    zeroGridHighlights() {
        for (let x = 0; x < this.gridXsize; x++) {
            for (let y = 0; y < this.gridYsize; y++) {
                this.grid[x][y].highlight = false; 
            }
        }
    }

     printBoardState(grid) {
        let boardString = '';
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
        return boardString;
    }

}


export default NeutronGame;
