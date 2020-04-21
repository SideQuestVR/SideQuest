const https = require('https');
const http = require('http');
const _fs = require('fs');
const { basename } = require('path');
const Url = require('url');

const TIMEOUT = 60000;

module.exports = function(url, path, progress) {
    const uri = Url.parse(url);
    if (!path) {
        path = basename(uri.path);
    }
    const file = _fs.createWriteStream(path);

    function get(url, callback) {
        let request = (uri.protocol === 'https:' ? https : http).get(url, function(response) {
            if (response.headers.location) {
                get(response.headers.location, callback);
            } else {
                callback(null, response);
            }
        });
        request.on('error', function(err) {
            callback(err);
        });
        request.setTimeout(TIMEOUT, function() {
            request.abort();
            callback(new Error(`request timeout after ${TIMEOUT / 1000.0}s`));
        });
    }

    return new Promise(function(resolve, reject) {
        get(uri.href, (err, res) => {
            if (err) {
                return reject(err);
            }
            const len = parseInt(res.headers['content-length'], 10);
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
                    resolve();
                })
                .on('error', function(err) {
                    reject(err);
                });
        });
    });
};
