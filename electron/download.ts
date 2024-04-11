const https = require('node:https');
const http = require('node:http');
const nodeFS = require('node:fs');
const nodePath = require('node:path');
const Url = require('url');
const electron = require('electron');

const TIMEOUT = 60000;

module.exports = function(url, filePath, progress, options) {
    const uri = Url.parse(url);
    if (!filePath) {
        filePath = nodePath.basename(uri.path);
    }

    let file, fileName = filePath;
    function get(url, callback) {
        let request = (uri.protocol === 'https:' ? https : http).get(url, function(response) {
            if (response.headers.location) {
                get(response.headers.location, callback);
            } else {
                if (options && options.useContentDispositionFilename) {
                    const contentDisposition = response.headers['content-disposition'];
                    if (contentDisposition) {
                        const appData = nodePath.join(electron.app.getPath('appData'), 'SideQuest');
                        const match = contentDisposition.match(/filename="(.+)"/);
                        if (match && match.length > 1) {
                            fileName = nodePath.join(appData, match[1]);
                            file = nodeFS.createWriteStream(fileName);
                        }
                    }
                }
                if (!file) {
                   file = nodeFS.createWriteStream(filePath);
                }
                callback(null, response);
            }
        });
        request.on('error', function(err) {
            callback(err);
        });
        if (options && options.timeout !== undefined) {
            if (options.timeout > 0) {
                request.setTimeout(TIMEOUT, function() {
                    request.abort();
                    callback(new Error(`request timeout after ${options.timeout / 1000.0}s`));
                });
            }
        } else {
            request.setTimeout(TIMEOUT, function() {
                request.abort();
                callback(new Error(`request timeout after ${TIMEOUT / 1000.0}s`));
            });
        }
    }

    return new Promise(function(resolve, reject) {
        get(uri.href, (err, res) => {
            if (err) {
                return reject(err);
            }
            let len = parseInt(res.headers['content-length'], 10);
            if (isNaN(len) || len <= 0) { len = 1; }
            let downloaded = 0;
            let percent = 0;
            res.on('data', function(chunk) {
                file.write(chunk);
                downloaded += chunk.length;
                percent = Math.round((10000 * downloaded) / len) / 100;
                progress(percent);
            })
                .on('end', function() {
                    file.end();
                    resolve(fileName);
                })
                .on('error', function(err) {
                    reject(err);
                });
        });
    });
};
