const fabric = require('fabric');
console.log(Object.keys(fabric).filter(k => k.includes('Image') || k.includes('Canvas')));
