const _fs = require('fs');
const _path = require('path');
const request = require('request');
const progress = require('request-progress');


module.exports = function(url, filePath, progressCallback, options?) {

    let contentType = 'application/zip';
    if (options && options.contentType) {
        contentType = options.contentType;
    }
    let fileName = _path.basename(filePath);
    if (options && options.fileName) {
        fileName = options.fileName;
    }

    const formData = {
        file: {
            value: _fs.createReadStream(filePath),
            options: {
                filename: fileName,
                contentType: contentType,
            },
        },
    };
    const requestOptions = {
        url: url,
        method: 'POST',
        formData: formData,
    };
    return new Promise(function(resolve, reject) {
            progress(request(url, requestOptions), { throttle: 1000 })
            .on('error', error => {
                reject(error);
            })
            .on('progress', state => {
                progressCallback(state.percent);
            })
            .on('end', () => {
                resolve(true);
        });
    });
};
