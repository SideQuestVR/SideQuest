'use strict';

const bytenode = require('bytenode');
const fs = require('fs');
const v8 = require('v8');

v8.setFlagsFromString('--no-lazy');

if (!fs.existsSync(__dirname + '/app.jsc') || process.env.NODE_ENV === 'dev') {
    bytenode.compileFile(__dirname + '/app.js', __dirname + '/app.jsc');
}
if (process.argv.indexOf('gen-code') > -1) {
    require('electron').app.quit();
} else {
    require('./app.jsc');
}
