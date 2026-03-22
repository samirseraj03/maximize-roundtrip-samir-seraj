export function createLogger(uuid) {
    return message => {
        console.log(`[${uuid}] ${message}`);
    };
}
