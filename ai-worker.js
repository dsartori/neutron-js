import NeutronGame from './neutron.js';
import { kBlackPiece } from './constants.js';

// Search runs off the main thread so the board stays responsive at
// depth 5. Receives a getSearchState() snapshot, replies with the move.
self.onmessage = (event) => {
    const game = NeutronGame.fromSearchState(event.data);
    const move = game.getBestMoveForState(game, kBlackPiece);
    self.postMessage(move);
};
