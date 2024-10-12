import NeutronGame from '../neutron.js';
import { kWhite1, kWhite2, kBlack1, kBlack2, kNeutralPiece, kWhitePiece, kBlackPiece, kEmpty } from '../constants.js';

// Create a new instance of the Neutron game
let game;

beforeEach(() => {
  game = new NeutronGame(5, 5);  
});

// Test the initial game setup
test('Initial game setup creates the correct grid', () => {
  const grid = game.grid;

  // Check if the white pieces are in the correct position
  for (let p = 0; p < 5; p++) {
    expect(grid[p][4].state).toBe(kWhitePiece);
  }

  // Check if the black pieces are in the correct position
  for (let p = 0; p < 5; p++) {
    expect(grid[p][0].state).toBe(kBlackPiece);
  }

  // Check if the neutron is in the center
  expect(grid[2][2].state).toBe(kNeutralPiece);
});

// Test movePiece method
test('movePiece moves a piece correctly', () => {
  // Move a black piece from the top row
  const success = game.movePiece(0, 0, 1, 1);
  expect(success).toBe(true);
  expect(game.grid[1][1].state).toBe(kBlackPiece);
  expect(game.grid[0][0].state).toBe(kEmpty);
});

// Test invalid move
test('movePiece does not allow invalid moves', () => {
  // Try to move a piece to an occupied square
  const success = game.movePiece(0, 0, 2, 2);  // Neutron is in the center
  expect(success).toBe(false);
});

// Test isValidMove method
test('isValidMove returns correct validity of moves', () => {
  // Move black piece to an empty spot
  const isValid = game.isValidMove(0, 0, 1, 1);
  expect(isValid).toBe(true);
});

// Test getPiecesForColour method
test('getPiecesForColour returns correct piece positions', () => {
  const blackPieces = game.getPiecesForColour(kBlackPiece);
  expect(blackPieces.length).toBe(5);  // 5 black pieces
  const whitePieces = game.getPiecesForColour(kWhitePiece);
  expect(whitePieces.length).toBe(5);  // 5 white pieces
});

// Test switchTurn logic
test('switchTurn switches turns correctly', () => {
  // Initial turn is white's first piece move
  expect(game.turn).toBe(kWhitePiece);
  expect(game.turnStage).toBe(kWhite2);

  game.switchTurn();
  expect(game.turn).toBe(kBlackPiece);
  expect(game.turnStage).toBe(kBlack1);

  game.switchTurn();
  expect(game.turn).toBe(kBlackPiece);
  expect(game.turnStage).toBe(kBlack2);
});

// Test evaluating game state (endgame)
test('evaluateStateTurn detects endgame correctly', () => {
  // Move neutron to black home row
  game.grid[2][0].state = kNeutralPiece;
  const score = game.evaluateStateTurn(kBlackPiece);
  expect(score).toBe(1000);  // Black wins
  expect(game.finished).toBe(true);
});

// Test getMovesForGrid method
test('getMovesForGrid returns valid moves for current state and turn', () => {
  const moves = game.getMovesForGrid(game, kWhitePiece);
  expect(moves.length).toBeGreaterThan(0);  // Should return valid moves
});

    describe('Game state evaluation with complete board setup for Black win', () => {
        let game;
    
        beforeEach(() => {
            game = new NeutronGame(5, 5);  // Initialize a new game with a 5x5 grid
    
            // Set up board state for both Black and White
            for (let x = 0; x < game.gridXsize; x++) {
                for (let y = 0; y < game.gridYsize; y++) {
                    game.grid[x][y].state = kEmpty;  // Clear all cells
                }
            }
    
            // Place Black pieces on the first row
            for (let x = 0; x < game.gridXsize; x++) {
                game.grid[x][0].state = kBlackPiece;
            }
    
            // Place White pieces on the last row
            for (let x = 0; x < game.gridXsize; x++) {
                game.grid[x][game.gridYsize - 1].state = kWhitePiece;
            }
    
            // Place the neutron in the center
            game.grid[2][2].state = kNeutralPiece;
        });
    
        test('should give a score of 1000 if Black wins (neutron reaches the first row)', () => {
            game.turn = kBlackPiece;  // Ensure it's Black1's turn so the neutron can move
    
            game.grid[2][0].state = kEmpty;
            // Move the neutron to the first row
            game.movePiece(2, 2, 2, 0);  // Moving neutron from (2,2) to (2,0)
    
            // Evaluate game state
            const score = game.evaluateStateTurn(kBlackPiece);
            expect(score).toBe(1000);  // Expect Black to win
        });

    test('AI should make the winning move when possible for Black', () => {
        // Set up a winning board state for Black
        game.grid[2][0].state = kEmpty;
        game.grid[1][1].state = kBlackPiece;
        game.turn = kBlack1;  // Black's turn with the neutron

        const bestMove = game.getBestMoveForState(game, kBlackPiece);
        const [neutronMove, pieceMove] = bestMove;

        expect(neutronMove[1][1]).toBe(0);  // Ensure AI moves neutron to row 0 for victory
    });

    test('AI should avoid a losing move for Black', () => {
        // Set up a losing board state for Black
        game.grid[2][2].state = kNeutralPiece;
        game.grid[2][0].state = kBlackPiece;
        game.grid[3][4].state = kWhitePiece;

        game.turn = kBlack1;

        const bestMove = game.getBestMoveForState(game, kBlackPiece);
        const [neutronMove, pieceMove] = bestMove;

        // Check that AI avoids a move where White would win on next turn
        expect(neutronMove[1][1]).not.toBe(4);  // Ensure AI doesn't push neutral into White's path
    });

test('should generate and reverse valid moves for White pieces', () => {
    const initialState = JSON.stringify(game.grid); // Store the initial state
    const moves = game.getMovesForGrid(game, kWhitePiece);

    // Print moves generated for verification
    console.log("Generated moves for White pieces:");
    game.printBoardState(moves);  

    let mvTest;
    
    // Apply the first generated move (neutron move + piece move)
    const [neutronMove, pieceMove] = moves[0];

    // Print the board before applying the move
    console.log("Board before applying the move:");
    game.printBoardState(game.grid);

    // Make the move
    mvTest = game.movePiece(neutronMove[0][0], neutronMove[0][1], neutronMove[1][0], neutronMove[1][1]);
    expect(mvTest).toBe(true);

    game.printBoardState(game.grid);
    mvTest = game.movePiece(pieceMove[0][0], pieceMove[0][1], pieceMove[1][0], pieceMove[1][1]);
    expect(mvTest).toBe(true);

    game.printBoardState(game.grid);
    // Print the board after applying the move
    console.log("Board after applying the move:");
    game.printBoardState(game.grid);

    // Reverse the moves
    
    mvTest = game.movePiece(pieceMove[1][0], pieceMove[1][1], pieceMove[0][0], pieceMove[0][1],true);
    expect(mvTest).toBe(true);
    
    game.printBoardState(game.grid);
    mvTest = game.movePiece(neutronMove[1][0], neutronMove[1][1], neutronMove[0][0], neutronMove[0][1],true);
    expect(mvTest).toBe(true);
    game.printBoardState(game.grid);


    // Print the board after reversing the move
    console.log("Board after reversing the move:");
    game.printBoardState(game.grid);

    // Ensure game state is restored to the initial state
    expect(JSON.stringify(game.grid)).toEqual(initialState);
    });


});