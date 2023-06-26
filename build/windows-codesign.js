'use strict';

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const chalk = require('chalk');

const OwnerName = process.env.CERT_OWNERNAME || `"SideQuest LTD"`;
const TimeStampServer = process.env.CERT_TIMESTAMPSERVER || 'http://time.certum.pl/';
const Verbose = (process.env.CERT_VERBOSE && process.env.CERT_VERBOSE === 'true') || false;
const Debug = (process.env.CERT_DEBUG && process.env.CERT_DEBUG === 'true') || false;
const Skip = (process.env.CERT_SKIP && process.env.CERT_SKIP === 'true') || false;

async function doSign(file, hash, owner) {
    const sha256 = hash === 'sha256';
    const appendCert = sha256 ? '/as' : null;
    const timestamp = sha256 ? '/tr' : '/t';
    const appendTd = sha256 ? '/td sha256' : null;
    const debug = Debug ? '/debug' : null;

    let args = [
        'cd',
        '%LOCALAPPDATA%\\electron-builder\\cache\\winCodeSign\\winCodeSign-2.6.0\\windows-10\\x64\\',
        '&&',
        'signtool',
        'sign',
        debug,
        '/n',
        owner,
        '/a',
        appendCert,
        '/fd',
        hash,
        timestamp,
        TimeStampServer,
        appendTd,
        '/v',
        `"${file}"`,
    ];

    try {
        const { stdout } = await exec(args.join(' '));
        if (Verbose) {
            console.log(stdout);
        }
    } catch (error) {
        throw error;
    }
}

exports.default = async function(config) {
    if (!Skip) {
        console.info(
            `Signing ${chalk.green.bold(config.path)} with ${chalk.magenta(config.hash)} to ${chalk.cyan.bold(OwnerName)}`
        );
        await doSign(config.path, config.hash, OwnerName);
    }
};
