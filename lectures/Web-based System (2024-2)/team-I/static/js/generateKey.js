export function generateKey(d) {
    const x = parseFloat(d.x).toFixed(6);
    const y = parseFloat(d.y).toFixed(6);
    return `${x}-${y}`;
}