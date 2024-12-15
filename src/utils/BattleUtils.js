export function parseHP(condition) {
    if (!condition) return null;
    const parts = condition.split(' ')[0].split('/');
    if (parts.length === 2) {
        return {
            current: parseInt(parts[0]),
            max: parseInt(parts[1]),
            percentage: Math.floor((parseInt(parts[0]) / parseInt(parts[1])) * 100)
        };
    }
    return null;
}

export function getStatus(condition) {
    if (!condition) return null;
    const parts = condition.split(' ');
    return parts.length > 1 ? parts[1] : null;
}