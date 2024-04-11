const fs = require('node:fs');
let cfg = ""

if (process.argv[2]) {
  cfg = process.argv[2];
}

// Output should be in the build-electron folder
fs.writeFileSync(__dirname + "/../build-electron/config.js", `global.SQ_ENV_CFG = "${cfg}";`)
