const os = require('os');
const path = require('path');
const __fs = require('fs');
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
if (!__fs.existsSync(outputPath)) {
    __fs.mkdir(outputPath, { recursive: true }, err => {
        if (err) console.log(err);
    });
    console.log('Downloading platform tools...');
    download(downloadUrl, path.join(__dirname, 'platform-tools.zip'), stats => {
        // console.log(stats);
    })
        .then(() => {
            console.log('Downloaded platform tools.');
            console.log('Extracting platform tools...');
            extract(
                path.join(__dirname, 'platform-tools.zip'),
                {
                    dir: __dirname,
                    onEntry: entry => {
                        let stats = entry.fileName;
                        // console.log(stats);
                    },
                },
                err => {
                    if (err) console.log(err);
                    console.log('Extracted platform tools.');
                    __fs.readdir(path.join(__dirname, 'platform-tools'), (err, files) => {
                        files.forEach(file => {
                            let curPath = path.join(__dirname, 'platform-tools', file);
                            if (!__fs.lstatSync(curPath).isDirectory()) {
                                __fs.rename(curPath, path.join(outputPath, file), function(err) {
                                    if (err) console.log(err);
                                });
                            }
                        });
                    });
                }
            );
        })
        .catch(e => {
            console.log(e);
        });
}
