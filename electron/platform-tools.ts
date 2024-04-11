const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const extract = require('extract-zip');
const download = require('./download');
const url = 'https://dl.google.com/android/repository/platform-tools-latest-';
let downloadUrl;
switch (os.platform()) {
    case 'win32':
        downloadUrl = url + 'windows.zip';
        break;
    case 'darwin':
        downloadUrl = url + 'darwin.zip';
        break;
    case 'linux':
        downloadUrl = url + 'linux.zip';
        break;
}
console.log('Platform: ' + os.platform());
let outputPath = path.join(__dirname, '..', 'build', 'platform-tools');
if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log('Downloading platform tools...');
    download(downloadUrl, path.join(__dirname, 'platform-tools.zip'), function(stats) {
        // console.log(stats);
    }, {})
        .then(function() {
            console.log('Downloaded platform tools.');
            console.log('Extracting platform tools...');
            extract(
                path.join(__dirname, 'platform-tools.zip'),
                <any>{
                    dir: __dirname,
                    onEntry: function(entry) {
                        // console.log(entry.fileName);
                    },
                }).then(() => {
                const skipFiles = [
                    // Linux & Mac
                    "etc1tool", "fastboot", "hprof-conv", "make_f2fs", "make_f2fs_casefold", "mke_f2fs", "mke2fs", "mke2fs.conf", "sqlite3",
                    // Windows
                    "etc1tool.exe", "fastboot.exe", "hprof-conv.exe", "make_f2fs.exe", "make_f2fs_casefold.exe", "mke_f2fs.exe", "mke2fs.exe", "mke2fs.conf", "sqlite3"];

                console.log('Extracted platform tools.');
                fs.readdir(path.join(__dirname, 'platform-tools'), function(err, files) {
                    files.forEach(function(file) {
                        const curPath = path.join(__dirname, 'platform-tools', file);
                        if (!fs.lstatSync(curPath).isDirectory() && skipFiles.indexOf(file) === -1) {
                            fs.rename(curPath, path.join(outputPath, file), function(err) {
                                if (err) console.log(err);
                            });
                        }
                    });
                });
            }).catch((err) => {
                return console.error(err);
            });
        })
        .catch((e) => {
            console.error(e);
        });
}
