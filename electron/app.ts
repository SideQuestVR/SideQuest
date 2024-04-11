import { app, protocol, ipcMain, Menu, MenuItemConstructorOptions, BrowserWindow, shell, HandlerDetails } from 'electron';
import { StateStorage, EnvironmentConfig } from './state-storage';
import { AppWindow } from './window';
import { getEnvCfg } from './env-config';

const path = require('path');
const { autoUpdater } = require('electron-updater');
const download = require('./download');
const upload = require('./upload');
const extract = require('extract-zip');

const Readable = require('stream').Readable;
const Adb = require('@devicefarmer/adbkit').Adb;
const fs = require('fs');
const crypto = require('crypto');

//without this, there's a bug in electron that makes facebook pages ruin everything, see https://github.com/electron/electron/issues/25469
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

import { SetPropertiesCommand } from './setproperties';
import { OPEN_IN_SYSTEM_BROWSER_DOMAINS } from './external-urls';

let installErrorCallback;

process.on('uncaughtException', function(error) {
    if (error.toString().includes('Error: This socket has been ended by the other party') && installErrorCallback) {
        installErrorCallback("Couldn't communicate with the headset, try another USB port or cable...");
        installErrorCallback = null;
        console.log(error);
    }
});


const makeDeferred = () => {
    const deferred = {promise: null, resolve:  () => {} , reject:  () => {}};
    // @ts-ignore
    deferred.promise = new Promise((resolve: Function, reject: Function): void => {
        // @ts-ignore
        deferred.resolve = resolve;
        // @ts-ignore
        deferred.reject = reject;
    });
    return deferred;
}

export class ReadableStreamClone extends Readable {
    constructor(readableStream, options?) {
        super(options);
        readableStream.on('data', chunk => {
            this.push(chunk);
        });

        readableStream.on('end', () => {
            this.push(null);
        });

        readableStream.on('error', err => {
            this.emit('error', err);
        });
    }
    public _read() {}
}


class ADB {
    client = null;
    _logcat;
    adbPath;
    _clientSetup = makeDeferred();

    setupAdb(adbPath, cb, ecb) {
        if (this.client) return;
        this.adbPath = adbPath;
        this.client = Adb.createClient({
            bin: adbPath,
        });
        this._clientSetup.resolve();
        cb();
    }

    async checkAPK(updateStatus: (string) => void, filePath: string): Promise<boolean> {
        const hash = await this.computeFileHash(updateStatus, filePath);
        const url = `${getEnvCfg().shortenerUrl || 'https://sdq.st'}/check-app-hash/${hash}`;
        updateStatus('Checking APK against blacklist...');
        return new Promise((resolve, reject) => {
            let options = {
                url,
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Origin: getEnvCfg().web_url,
                },
                rejectUnauthorized: process.env.NODE_ENV !== 'dev',
            };
            fetch(url, options).then((response) => {
                if (!response.ok || response.body == null) {
                    console.log(response.statusText, response.status, response.headers);
                    return reject(response.statusText);
                }
                response.json().then(body => {
                    let found = body.found;
                    if (!found) {
                        updateStatus('APK is not in the blacklist. Installing...');
                    }
                    resolve(found);

                }).catch(reject);
            });
        });
    }
    async computeFileHash(updateStatus: (string) => void, filePath: string): Promise<string> {
        const fileSize = await this.computeFileSize(filePath);
        return new Promise((resolve, reject) => {
            let bytesRead: number = 0;
            const fd = fs.createReadStream(filePath);
            const hash = crypto.createHash('md5');
            hash.setEncoding('hex');
            fd.on('data', chunk => {
                bytesRead += chunk.length;
                const percentage = this.formattedPercentageComplete(bytesRead, fileSize);
                updateStatus(`Computing APK hash (${percentage})...`);
            });
            fd.on('end', () => {
                updateStatus(`Computing APK hash (100%)...`);
                hash.end();
                resolve(hash.read());
            });
            fd.on('error', error => {
                reject(error);
            });
            fd.pipe(hash);
        });
    }
    async computeFileSize(filePath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats.size);
                }
            });
        });
    }
    formattedPercentageComplete(amount: number, total: number): string {
        const percentage = Math.round(Math.min(amount / total, 1) * 100);
        return `${percentage}%`;
    }
    installFromToken(token, cb, ecb) {
        let url = `${getEnvCfg().http_url || 'https://api.sidequestvr.com'}/install-from-key`;
        let options = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Origin: getEnvCfg().web_url || 'https://sidequestvr.com',
            },
           // rejectUnauthorized: process.env.NODE_ENV !== 'dev',
            body: JSON.stringify({ token: token }),
        };
        fetch(url, options).then(response => {
            if (!response.ok || response.body == null) {
                console.log(response.statusText, response.status, response.headers);
                return ecb('Unable to fetch package');
            }
            response.json().then(body => {
                let tasks = [];
                for (let i = 0; i < body.data.apps.length; i++) {
                    let app = body.data.apps[i];
                    if (Number(app.app_categories_id) === 1) {
                        let urls = app.urls.filter(l => l && ~['Github Release', 'APK', 'OBB', 'Mod'].indexOf(l.provider));
                        for (let i = 0; i < urls.length; i++) {
                            if (urls[i].provider === 'Mod') {
                                tasks.push({ type: 'Mod', url: urls[i].link_url, name: app.name });
                            } else {
                                const etx = urls[i].link_url
                                    .split('?')[0]
                                    .split('.')
                                    .pop()
                                    .toLowerCase();
                                switch (etx) {
                                    case 'obb':
                                        tasks.push({ type: 'OBB', url: urls[i].link_url, name: app.name });
                                        break;
                                    default:
                                        tasks.push({ type: 'APK', url: urls[i].link_url, name: app.name });
                                        break;
                                }
                            }
                        }
                    }
                }
                cb(tasks);
            }).catch(ecb);
        });
    }
    endLogcat() {
        if (this._logcat) {
            this._logcat.end();
            this._logcat = null;
        }
    }
    logcat(serial, tag, priority, cb, scb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            if (!this._logcat) this.endLogcat();
            const device = this.client.getDevice(serial);
            device
                .openLogcat({ clear: true })
                .then(logcat => {
                    this._logcat = logcat;
                    logcat.include(tag, priority).on('entry', entry => scb(entry));
                })
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    installRemote(serial, path, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device.installRemote(path)
                .then(cb)
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    async install(serial, apkpath, isLocal, cb, scb, ecb) {
        await this._clientSetup.promise;

        // console.log('installapk', apkpath, isLocal);
        let stopUpdate;

        installErrorCallback = e => {
            stopUpdate = true;
            ecb(e);
            console.error(e, stopUpdate);
        };

        if (!this.client) return ecb('Not connected.');
        if (isLocal) {
            let found;
            try {
                found = await this.checkAPK(scb, apkpath);
            } catch (e) {
                return ecb(e);
            }
            if (found) {
                return ecb('SAFESIDE');
            }
        }
        scb('Transferring APK to device...');
        let stream;
        try {
            if (isLocal) {
                stream = fs.createReadStream(apkpath);
            } else {
                const response = await fetch(apkpath + '?t=' + Date.now());
                if (!response.ok || response.body == null) {
                    console.log(response.statusText, response.status, response.headers);
                    return ecb('Unable to fetch package');
                }

                let size = parseInt(response.headers.get('Content-Length') || '0', 10);
                if (size <= 0) {
                    // Approximate app size in case we cannot get the size from the server
                    size = 30_000_000;
                }
                let bytesRead = 0;
                let webStream = Readable.fromWeb(response.body);
                stream = new ReadableStreamClone(webStream);
                let progress = new ReadableStreamClone(webStream);

                progress.on('data', chunk => {
                    bytesRead += chunk.length;
                    const percentage =  Math.round(Math.min(bytesRead / size, 1) * 100);
                    if (!stopUpdate) {
                        scb({percent: percentage});
                    }
                });
                progress.on('end', () => {
                    if (!stopUpdate) {
                        scb({
                            percent: 1,
                        });
                    }
                });


                /*
                stream = new Readable().wrap(
                    progress(request(apkpath, undefined, undefined), {
                        throttle: 60,
                    })
                        .on('progress', state => {
                            if (!stopUpdate) {
                                scb(state);
                            }
                        })
                        .on('end', () => {
                            console.log("Downloaded")
                            if (!stopUpdate) {
                                scb({
                                    percent: 1,
                                });
                            }
                        })
                ); */
            }
        } catch (e) {
            console.error("Error", e);
            const isInvalidURI = e && typeof e.message === 'string' && e.message.startsWith('Invalid URI "');
            if (isInvalidURI) {
                return ecb("Can't download file. Invalid URL:");
            } else {
                return ecb(e);
            }
        }

        const device = this.client.getDevice(serial);
        device
            .install(stream)
            .then(cb)
            .catch(e => { console.error("error installing", e); ecb(e) });
    }

     uninstall(serial, packageName, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device
                .uninstall(packageName)
                .then(cb)
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    clear(serial, packageName, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');

            const device = this.client.getDevice(serial);
            device
                .clear(packageName)
                .then(cb)
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    disconnect(cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            this.client
                .disconnect()
                .then(cb)
                .then(() => this.client.kill())
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    connect(deviceIp, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            this.client
                .connect(deviceIp + ':5555')
                .then(cb)
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    tcpip(serial, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device
                .tcpip(5555)
                .then(r => {
                    console.log(r);
                    cb(r);
                })
                .catch(e => {
                    console.log(serial, e);
                    ecb(e);
                });
        }).catch(e => ecb(e));
    }
    usb(serial, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device
                .usb()
                .then(cb)
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    listDevices(cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            this.client
                .listDevices()
                .then(d => cb(d))
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    setProperties(serial, command, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');

            const device = this.client.getDevice(serial);
            device
                .transport(serial)
                .then(function(transport) {
                    return new SetPropertiesCommand(transport).execute(command);
                })
                // this.client
                //     .setProperties(serial, command)
                .then(res => cb(res))
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    getPackages(serial, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device
                .getPackages()
                .then(res => cb(res))
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    shell(serial, command, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device
                .shell(command)
                .then(Adb.util.readAll)
                .then(res => cb(res.toString()))
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    readdir(serial, path, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.'); 
            const device = this.client.getDevice(serial);
            device
                .readdir(path)
                .then(res =>
                    res
                        .map(r => {
                            r.__isFile = r.isFile();
                            return r;
                        })
                        .filter(r => !(r.__isFile && r.name.lastIndexOf('\\') > -1))
                )
                .then(res => cb(res))
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
    push(serial, path, savePath, cb, scb, ecb) {
        this._clientSetup.promise.then(() => {

            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            // TODO: See if we can pipe this thru a stream to get progress
            device
                .push(fs.createReadStream(path), savePath)
                .then(transfer => {
                    let _stats = {bytesTransferred: 0}, counter=0;
                    let lastNumber = 0;
                    const interval = setInterval(() => {
                        // We are cheating here, frequently the progress event will just stop firing but still will be transferring
                        // We are faking it at a slower pace so that the user still sees something is happening
                        if (lastNumber === _stats.bytesTransferred) {
                            counter += 1024;
                            scb({bytesTransferred: _stats.bytesTransferred + counter * 10240})
                        } else {
                            counter = 0;
                            scb(_stats);
                            lastNumber = _stats.bytesTransferred;
                        }
                    }, 1000);
                    transfer.on('progress', stats => {
                        _stats = stats;
                    });
                    transfer.on('end', () => {
                        clearInterval(interval);
                        cb();
                    });
                    transfer.on('error', e => {
                        clearInterval(interval);
                        ecb(e);
                    });
                })
                .catch(e => {
                    ecb(e);
                });
        }).catch(e => ecb(e));
    }
    pull(serial, path, savePath, cb, scb, ecb) {
        this._clientSetup.promise.then(() => {

            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device
                .pull(path)
                .then(transfer => {
                    transfer.on('progress', stats => {
                        scb(stats);
                    });
                    transfer.on('end', () => {
                        cb();
                    });
                    transfer.on('error', e => {
                        ecb(e);
                    });
                    transfer.pipe(fs.createWriteStream(savePath));
                })
                .catch(e => {
                    ecb(e);
                });
        }).catch(e => ecb(e));
    }
    stat(serial, path, cb, ecb) {
        this._clientSetup.promise.then(() => {
            if (!this.client) return ecb('Not connected.');
            const device = this.client.getDevice(serial);
            device
                .stat(serial, path)
                .then(res => cb(res))
                .catch(e => ecb(e));
        }).catch(e => ecb(e));
    }
}

let config: StateStorage;
let appWindow: AppWindow;
let mainWindow: BrowserWindow;
let popupWindow: BrowserWindow;
let hasUpdate = false;
let app_id=0;

if (app.requestSingleInstanceLock()) {
    const environment: EnvironmentConfig = { userDataPath: app.getPath('userData') };
    config = new StateStorage(environment, console);
    setupApp();
} else {
    app.quit();
}

function parseOpenUrl(argv: string[]) {
    //fs.writeFileSync(path.join(app.getPath('appData'), 'SideQuest', 'test_output_loaded.txt'), JSON.stringify(argv));
    for (let arg of argv) {
        if (arg && arg.length && arg.substr(0, 12) === 'sidequest://') {
            console.log('opening url ' + arg.toString());
            setTimeout(() => mainWindow.webContents.send('open-url', arg.toString()), 5000);
            break;
        }
    }
}
function addWindowDownloadHandler(window) {
    window.webContents.session.on('will-download', (_evt, item, _webContents) => {
        let url = item.getURL();
        let urls = item.getURLChain();
        let name = item.getFilename();
        let etx = path.extname(url.split('?')[0]).toLowerCase();
        let etx2 = urls.length ? path.extname(urls[0].split('?')[0]).toLowerCase() : etx;
        console.log(url);
        if (~url.indexOf('https://beatsaver.com/cdn')) {
            // beat saber mods /songs
            mainWindow.webContents.send('open-url', 'sidequest://bsaber/#' + url);
        } else if (~url.indexOf('http://songbeater.com/')) {
            // songbeater mods /songs
            mainWindow.webContents.send('open-url', 'sidequest://songbeater/#' + url);
        } else if (~url.indexOf('https://synthriderz.com/')) {
            // synthriderz mods /songs
            mainWindow.webContents.send('open-url', 'sidequest://synthriders/#' + url);
        } else if (etx === '.audica') {
            // audica custom song format
            mainWindow.webContents.send('open-url', 'sidequest://audica/#' + url);
        } else if (etx === '.apk' || etx2 === '.apk') {
            // any file ending with apk.
            mainWindow.webContents.send('pre-open-url', { url, name });
            BrowserWindow.getAllWindows()
                .filter(b => b !== mainWindow)
                .forEach(b => b.close());
        } else if (
            ~url.indexOf('ssl.hwcdn.net/') ||
            ~url.indexOf('patreonusercontent.com/') ||
            (~url.indexOf('https://itchio-mirror.') && ~url.indexOf('cloudflarestorage.com'))
        ) {
            //itch.io & patreon
            mainWindow.webContents.send('pre-open-url', { url, name });
            BrowserWindow.getAllWindows()
                .filter(b => b !== mainWindow)
                .forEach(b => b.close());
        } else {
            shell.openExternal(url);
        }
        item.cancel();
    });
}

function getSideQuestPackage(): Promise<number> {
    return new Promise((resolve, reject) => {
        const api = getEnvCfg().http_url + "/v2/apps/get-sidequest-apk"
        let options = {
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ package_name: 'quest.side.vr' }),
            method: 'POST',
        }
        fetch(api, options).then(res => res.json()).then(json => {
            app_id = json.apps_id;
            resolve( json.apps_id);
        }).catch(reject);
    });
}

function createWindow() {
    appWindow = new AppWindow(config);
    mainWindow = appWindow.window;
    require('@electron/remote/main').enable(mainWindow.webContents);
    if (process.env.NODE_ENV === 'dev') {
        mainWindow.loadURL('http://localhost:4205');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile('build/app/index.html');
    }
    mainWindow.on('closed', function() {
        mainWindow = undefined;
    });

    setupMenu();
    mainWindow.webContents.once('dom-ready', async _e => {
        parseOpenUrl(process.argv);
        autoUpdater.autoDownload = false;
        if (process.platform !== 'linux') autoUpdater.checkForUpdates();
    });

    protocol.registerBufferProtocol('beatsaver', (request, _callback) => {
        mainWindow.webContents.send(
            'open-url',
            'sidequest://bsaber/#https://beatsaver.com/api/download/key/' + request.url.replace('beatsaver://', '')
        );
    });

    protocol.registerStringProtocol('sidequest', (request, _callback) => {
        mainWindow.webContents.send('open-url', request.url);
    });
    mainWindow.webContents.on('did-fail-load', () => mainWindow.loadURL(mainWindow.webContents.getURL()));
    addWindowDownloadHandler(mainWindow);
    const handleOpenWindow: (details: HandlerDetails) => { action: 'allow' } | { action: 'deny' } = e => {
        if (!e.postBody) {
            try {
                const extUrl = new URL(e.url).host.toLowerCase();
                if (OPEN_IN_SYSTEM_BROWSER_DOMAINS.includes(extUrl)) {
                    shell.openExternal(e.url);
                    return { action: 'deny' };
                }
            } catch (e) {
                console.log('could not open url', e);
                return { action: 'allow' };
            }
        }
        return { action: 'allow' };
    };
    let handleWindow;
    handleWindow = (child: BrowserWindow) => {
        child.webContents.on('did-attach-webview', (z, wc) => {
            wc.setWindowOpenHandler(handleOpenWindow);
            wc.on('did-create-window', child => {
                handleWindow(child);
            });
        });

        child.webContents.setWindowOpenHandler(handleOpenWindow);
        child.webContents.on('did-create-window', child => {
            console.log('did create window fired');
            handleWindow(child);
        });

        child.webContents.session.on('select-usb-device', (event, details, callback) => {
            // Redirect Code
            if (app_id == 0) {
                getSideQuestPackage().then(url => {
                    console.log('redirecting to app', url);
                    mainWindow.webContents.send('open-url', "sidequest://app/#" + url);
                });
            } else {
                mainWindow.webContents.send('open-url', "sidequest://app/#" + app_id);
            }

            return;
            // Add events to handle devices being added or removed before the callback on
            // `select-usb-device` is called.

            //event.preventDefault();
            if (details.deviceList && details.deviceList.length > 0) {
                // Meta Quest Device
                if (details.deviceList[0].vendorId === 10291) {
                    callback(details.deviceList[0].deviceId);
                    return;
                }
                //  if (deviceToReturn) {
                //      callback(deviceToReturn.deviceId)
                //  } else {
                //      callback()
                //  }
            }
            callback();
        });

/*
        child.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
            console.log("SET PERMISSION CHECK HANDLER", permission, requestingOrigin, details)
            if (permission === 'usb') {
                return true
            }
        }) */

        child.webContents.session.setDevicePermissionHandler((details) => {
            if (details.deviceType === 'usb') {
                if (details.device.vendorId === 10291) {
                    // Meta Oculus
                    return true;
                }
                // TODO: Pico
                console.log("SET DEVICE PERMISSION HANDLER FALSE", details)
                return false;
            }
        });

    };
    handleWindow(mainWindow);
    mainWindow.webContents.session.setUserAgent(mainWindow.webContents.session.getUserAgent() + ' SQ/' + app.getVersion());
    // This can run in the background
    getSideQuestPackage();
}

function setupMenu() {
    const template: MenuItemConstructorOptions[] = [
        {
            label: 'SideQuest',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: function() {
                        // Mac users expect an application to quit immediately with Command+Q. However, app.quit() is
                        // being interrupted by the main window while it's closing. So instead, let's asynchronously
                        // trigger the quit once the main window is done closing.
                        mainWindow.once('closed', app.quit);
                        mainWindow.close();
                    },
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo',
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo',
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut',
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy',
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste',
                },
                {
                    label: 'Select All',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectAll',
                },
            ],
        },
    ];
    if (process.platform === 'darwin') {
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    } else {
        Menu.setApplicationMenu(null);
    }
}

function setupApp() {
    require('@electron/remote/main').initialize();
    app.on('second-instance', (_event, commandLine, _workingDirectory) => {
        parseOpenUrl(commandLine);
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
    app.on('web-contents-created', (e, webContents) => {
        webContents.on('will-redirect', (e, url) => {
            if (/^file:/.test(url)) {
                console.warn('Prevented redirect to ' + url);
                e.preventDefault();
            }
        });
    });
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        if (process.env.NODE_ENV === 'dev') {
            // Verification logic.
            event.preventDefault();
            callback(true);
        } else {
            callback(false);
        }
    });
    app.on('ready', createWindow);
    // Quit when all windows are closed.
   /*  app.on('window-all-closed', function() {
        if (process.platform !== 'darwin') app.quit();
    }); */

    // Kill the adb client when the app is definitely quitting, regardless of how it quit.
    app.on('will-quit', () => {
        if (adb.client) adb.client.kill();
    });

    app.on('activate', function() {
        if (mainWindow === null) createWindow();
    });
    // remove so we can register each time as we run the app.
    app.removeAsDefaultProtocolClient('sidequest');

    // If we are running a non-packaged version of the app && on windows
    if (process.env.NODE_ENV === 'dev' && process.platform === 'win32') {
        console.log('Running in dev mode');
        // Set the path of electron.exe and your app.
        // These two additional parameters are only available on windows.
        app.setAsDefaultProtocolClient('sidequest', process.execPath, [path.resolve(process.argv[1])]);
    } else {
        console.log('Running in production');
        app.setAsDefaultProtocolClient('sidequest');
    }
    app.on('open-url', function(event, url) {
        event.preventDefault();
    });

    app.on('browser-window-blur', () => {
        if (appWindow) {
            appWindow.saveWindowState();
        }
    });

    autoUpdater.on('checking-for-update', () => {
        if (mainWindow) {
            mainWindow.webContents.send('update-status', { status: 'checking-for-update' });
        }
    });
    autoUpdater.on('update-available', info => {
        if (mainWindow) {
            mainWindow.webContents.send('update-status', { status: 'update-available', info });
            hasUpdate = true;
        }
    });
    autoUpdater.on('update-not-available', info => {
        if (mainWindow) {
            mainWindow.webContents.send('update-status', { status: 'no-update', info });
        }
    });
    autoUpdater.on('error', err => {
        if (mainWindow) {
            mainWindow.webContents.send('update-status', { status: 'error', err });
        } else {
            console.log(err);
        }
    });
    autoUpdater.on('download-progress', progressObj => {
        if (mainWindow) {
            mainWindow.webContents.send('update-status', { status: 'downloading', progressObj });
        }
    });
    autoUpdater.on('update-downloaded', info => {
        if (mainWindow) {
            mainWindow.webContents.send('update-status', { status: 'update-downloaded', info });
        }
    });
    (global as any).receiveMessage = function(text) {
        mainWindow.webContents.send('info', text);
    };



    const adb = new ADB();

    ipcMain.on('download-url', async (event, { url, token, directory, filename, options }) => {
        download(url, directory ? path.join(directory, filename) : filename, stats => {
            return event.sender.send('download-progress', { stats, token });
        }, options)
            .then((fileName) => event.sender.send('download-url', { token, fileName }))
            .catch(e => event.sender.send('download-url-fail', { e, token }));
    });

    ipcMain.on('upload-url', async (event, { url, token, filename, options }) => {
        upload(url,  filename, stats => {
            return event.sender.send('download-progress', { stats, token });
        }, options)
            .then((fileName) => event.sender.send('download-url', { token, fileName }))
            .catch(e => event.sender.send('download-url-fail', { e, token }));

    });

    ipcMain.on('extract-file', async (event, { token, directory, filename }) => {
        extract(
            filename,
            {
                dir: directory,
                onEntry: entry => {
                    let stats = entry.fileName;
                    event.sender.send('extract-progress', { stats, token });
                },
            },
        ).catch(err => {
            event.sender.send('extract-file', { token });
        });
    });

    ipcMain.on('automatic-update', (event, arg) => {
        if (process.platform !== 'darwin' && hasUpdate) {
            setTimeout(() => {
                autoUpdater.downloadUpdate().then(() => autoUpdater.quitAndInstall(false, false));
            }, 5000);
        }
    });

    ipcMain.on('adb-command', (event, arg) => {
        const success = d => {
            //console.log("  ", arg.command, "Success", d)
            if (!event.sender.isDestroyed()) {
                event.sender.send('adb-command', { command: arg.command, resp: d, uuid: arg.uuid });
            }
        };
        const reject = e => {
            //console.log("  ", arg.command, "reject", e)
            if (!event.sender.isDestroyed()) {
                event.sender.send('adb-command', { command: arg.command, error: e, uuid: arg.uuid });
            }
        };
        const status = d => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('adb-command', { command: arg.command, status: d, uuid: arg.uuid });
            }
        };
        // console.log("Running:", arg.command);
        try {
            switch (arg.command) {
                case 'installFromToken':
                    adb.installFromToken(arg.settings.token, success, reject);
                    break;
                case 'setupAdb':
                    adb.setupAdb(arg.settings.adbPath, success, reject);
                    break;
                case 'endLogcat':
                    adb.endLogcat();
                    success('Done.');
                    break;
                case 'logcat':
                    adb.logcat(arg.settings.serial, arg.settings.tag, arg.settings.priority, success, status, reject);
                    break;
                case 'listDevices':
                    adb.listDevices(success, reject);
                    break;
                case 'getPackages':
                    adb.getPackages(arg.settings.serial, success, reject);
                    break;
                case 'shell':
                    adb.shell(arg.settings.serial, arg.settings.command, success, reject);
                    break;
                case 'readdir':
                    adb.readdir(arg.settings.serial, arg.settings.path, success, reject);
                    break;
                case 'push':
                    adb.push(arg.settings.serial, arg.settings.path, arg.settings.savePath, success, status, reject);
                    break;
                case 'pull':
                    adb.pull(arg.settings.serial, arg.settings.path, arg.settings.savePath, success, status, reject);
                    break;
                case 'stat':
                    adb.stat(arg.settings.serial, arg.settings.path, success, reject);
                    break;
                case 'install':
                    adb.install(arg.settings.serial, arg.settings.path, arg.settings.isLocal, success, status, reject);
                    break;
                case 'uninstall':
                    adb.uninstall(arg.settings.serial, arg.settings.packageName, success, reject);
                    break;
                case 'installRemote':
                    adb.installRemote(arg.settings.serial, arg.settings.path, success, reject);
                    break;
                case 'clear':
                    adb.clear(arg.settings.serial, arg.settings.packageName, success, reject);
                    break;
                case 'connect':
                    adb.connect(arg.settings.deviceIp, success, reject);
                    break;
                case 'disconnect':
                    adb.disconnect(success, reject);
                    break;
                case 'usb':
                    adb.usb(arg.settings.serial, success, reject);
                    break;
                case 'tcpip':
                    adb.tcpip(arg.settings.serial, success, reject);
                    break;
                case 'setProperties':
                    adb.setProperties(arg.settings.serial, arg.settings.command, success, reject);
                    break;
            }
        }
        catch (e) {
            reject(e)
        }
    });
}
