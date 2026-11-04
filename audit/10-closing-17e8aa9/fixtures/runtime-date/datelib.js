// JavaScript implementation, loaded as globals before the dart2js output.
globalThis.now = () => new Date(Date.UTC(2024, 0, 2));
globalThis.yearOf = (d) => (d instanceof Date ? d.getUTCFullYear() : `not a Date: ${typeof d}`);
