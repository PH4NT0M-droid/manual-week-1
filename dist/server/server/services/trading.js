export function validateUnits(units) {
    return Math.abs(units) <= 20;
}
export function calculateRoundPnl(direction, entryPrice, newPrice, units) {
    if (direction === 'BUY') {
        return (newPrice - entryPrice) * units;
    }
    if (direction === 'SELL') {
        return (entryPrice - newPrice) * units;
    }
    return 0;
}
export function buildOrderRow(participant, newCash, direction, units, currentPrice, currentRound) {
    return [
        participant[0],
        participant[1],
        newCash,
        direction,
        units,
        currentPrice,
        participant[6],
        currentRound,
        direction
    ];
}
export function buildLeaderboard(rows) {
    return rows.sort((a, b) => b.totalPnl - a.totalPnl);
}
export function buildRoundCloseRow(row, newPrice) {
    const units = Number(row[4]) || 0;
    const entryPrice = Number(row[5]) || 0;
    const direction = String(row[3] ?? 'FLAT');
    const totalPnl = Number(row[6]) || 0;
    if (units === 0 || direction === 'FLAT') {
        return row;
    }
    const roundPnl = calculateRoundPnl(direction, entryPrice, newPrice, units);
    const newTotalPnl = totalPnl + roundPnl;
    const newCash = Number(row[2]) + units * newPrice;
    return [
        row[0],
        row[1],
        newCash,
        'FLAT',
        0,
        0,
        newTotalPnl,
        row[7],
        row[8]
    ];
}
