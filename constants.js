export const kEmpty = 0;
export const kWhitePiece = 1;
export const kBlackPiece = 2;
export const kNeutralPiece = 3;

// Turn stages are distinct from piece states. Values 1-3 alias the piece
// states, so stages use 10+ to keep the two enums disjoint.
export const kWhite1 = 10;
export const kWhite2 = 11;
export const kBlack1 = 12;
export const kBlack2 = 13;
