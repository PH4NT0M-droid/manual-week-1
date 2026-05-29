export const gameState = {
    currentRound: 0,
    timerActive: false,
    timerSeconds: 30,
    currentImage: '',
    currentPrice: 1000,
    correctDirection: '',
    gameActive: false
};
export function startRoundState(input) {
    gameState.currentRound = input.round;
    gameState.currentImage = input.imageUrl;
    gameState.correctDirection = input.correctDirection;
    gameState.currentPrice = input.newPrice;
    gameState.timerActive = true;
    gameState.timerSeconds = 30;
    gameState.gameActive = true;
    return gameState;
}
export function closeRoundTimer() {
    gameState.timerActive = false;
}
export function endRoundState(newPrice) {
    gameState.currentPrice = newPrice;
    gameState.timerActive = false;
}
