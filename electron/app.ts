import { app, protocol, ipcMain, Menu, MenuItemConstructorOptions, BrowserWindow, shell } from 'electron';
import { StateStorage, EnvironmentConfig } from './state-storage';
import { AppWindow } from './window';
import { getEnvCfg } from './env-config';

const path = require('path');
const { autoUpdater } = require('electron-updater');
const download = require('./download');
const extract = require('extract-zip');

const Readable = require('stream').Readable;
const adb = require('adbkit');
const fs = require('fs');
const exec = require('child_process').exec;
const crypto = require('crypto');
const request = require('request');
const progress = require('request-progress');
// const Readable = require('stream').Readable;
import { SetPropertiesCommand } from './setproperties';
let has_port = process.argv.indexOf('--port');
let valid_port = has_port > -1 && process.argv[has_port + 1] && Number.isInteger(Number(process.argv[has_port + 1]));
class ADB {
    client;
    _logcat;
    adbPath;
    setupAdb(adbPath, cb, ecb) {
        if (this.client) return;
        this.adbPath = adbPath;
        let port = valid_port ? Number(process.argv[has_port + 1]) : process.env.ANDROID_ADB_SERVER_PORT || 5037;
        this.client = adb.createClient({
            bin: adbPath,
        });
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
            request(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    try {
                        const found = JSON.parse(body).found;
                        if (!found) {
                            updateStatus('APK is not in the blacklist. Installing...');
                        }
                        resolve(found);
                    } catch (e) {
                        reject(e);
                    }
                }
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
        let options = {
            url: `${getEnvCfg().http_url || 'https://api.sidequestvr.com'}/install-from-key`,
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Origin: getEnvCfg().web_url || 'https://sidequestvr.com',
            },
            rejectUnauthorized: process.env.NODE_ENV !== 'dev',
            json: { token: token },
        };
        request(options, (error, response, body) => {
            if (!error && body.data && body.data.apps && body.data.apps.length) {
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
            } else {
                ecb(error || 'Nothing to install.');
            }
        });
    }
    endLogcat() {
        if (this._logcat) {
            this._logcat.end();
            this._logcat = null;
        }
    }
    logcat(serial, tag, priority, cb, scb, ecb) {
        if (!this.client) return ecb('Not connected.');
        if (!this._logcat) this.endLogcat();
        this.client
            .openLogcat(serial, { clear: true })
            .then(logcat => {
                this._logcat = logcat;
                logcat.include(tag, priority).on('entry', entry => scb(entry));
            })
            .catch(e => ecb(e));
    }
    installRemote(serial, path, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .installRemote(serial, path)
            .then(cb)
            .catch(e => ecb(e));
    }
    async install(serial, apkpath, isLocal, cb, scb, ecb) {
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
            stream = isLocal
                ? fs.createReadStream(apkpath)
                : new Readable().wrap(
                      progress(request(apkpath), {
                          throttle: 60,
                      })
                          .on('progress', state => {
                              scb(state);
                          })
                          .on('end', () => {
                              scb({
                                  percent: 1,
                              });
                          })
                  );
        } catch (e) {
            const isInvalidURI = e && typeof e.message === 'string' && e.message.startsWith('Invalid URI "');
            if (isInvalidURI) {
                return ecb("Can't download file. Invalid URL:");
            } else {
                return ecb(e);
            }
        }
        this.client
            .install(serial, stream)
            .then(cb)
            .catch(e => ecb(e));

        // let outpath = isLocal ? apkpath : path.join(app.getPath('appData'), 'SideQuest', new Date().getTime() + '.apk');
        // let promise;
        // if (isLocal) {
        //     let found;
        //     try {
        //         found = await this.checkAPK(scb, apkpath);
        //     } catch (e) {
        //         return ecb(e);
        //     }
        //     if (found) {
        //         return ecb('SAFESIDE');
        //     }
        // }
        // promise = isLocal
        //     ? Promise.resolve()
        //     : new Promise(resolve => {
        //           progress(request(apkpath), {
        //               throttle: 60,
        //           })
        //               .on('progress', state => {
        //                   scb(state);
        //               })
        //               .on('end', () => {
        //                   scb({
        //                       percent: 1,
        //                       size: 1,
        //                       time: 1,
        //                   });
        //                   resolve();
        //               })
        //               .on('error', () => {
        //                   ecb('Download error! Please try again!');
        //               })
        //               .pipe(fs.createWriteStream(outpath));
        //       });
        // promise
        //     .then(
        //         () =>
        //             new Promise((resolve, reject) => {
        //                 console.log('"' + this.adbPath + '" -s ' + serial + ' install -r -d "' + outpath + '"');
        //                 exec(
        //                     '"' + this.adbPath + '" -s ' + serial + ' install -r -d "' + outpath + '"',
        //                     {},
        //                     (error, stdout, stderr) => {
        //                         if (error) {
        //                             reject(error.message ? error.message : error.toString());
        //                         } else {
        //                             resolve();
        //                         }
        //                     }
        //                 );
        //             })
        //     )
        //     .then(() => (isLocal ? null : fs.unlinkSync(outpath)))
        //     .then(cb)
        //     .catch(e => {
        //         if (!isLocal) fs.unlinkSync(outpath);
        //         ecb(e);
        //     });
    }
    uninstall(serial, packageName, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .uninstall(serial, packageName)
            .then(cb)
            .catch(e => ecb(e));
    }
    clear(serial, packageName, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .clear(serial, packageName)
            .then(cb)
            .catch(e => ecb(e));
    }
    disconnect(cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .disconnect()
            .then(cb)
            .then(() => this.client.kill())
            .catch(e => ecb(e));
    }
    connect(deviceIp, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .connect(deviceIp + ':5555')
            .then(cb)
            .catch(e => ecb(e));
    }
    tcpip(serial, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .tcpip(serial, 5555)
            .then(r => {
                console.log(r);
                cb(r);
            })
            .catch(e => {
                console.log(serial, e);
                ecb(e);
            });
    }
    usb(serial, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .usb(serial)
            .then(cb)
            .catch(e => ecb(e));
    }
    listDevices(cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .listDevices()
            .then(d => cb(d))
            .catch(e => ecb(e));
    }
    setProperties(serial, command, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .transport(serial)
            .then(function(transport) {
                return new SetPropertiesCommand(transport).execute(command);
            })
            // this.client
            //     .setProperties(serial, command)
            .then(res => cb(res))
            .catch(e => ecb(e));
    }
    getPackages(serial, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .getPackages(serial)
            .then(res => cb(res))
            .catch(e => ecb(e));
    }
    shell(serial, command, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .shell(serial, command)
            .then(adb.util.readAll)
            .then(res => cb(res.toString()))
            .catch(e => ecb(e));
    }
    readdir(serial, path, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .readdir(serial, path)
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
    }
    push(serial, path, savePath, cb, scb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .push(serial, fs.createReadStream(path), savePath)
            .then(transfer => {
                let _stats, autocancel;
                const interval = setInterval(() => {
                    scb(_stats);
                }, 1000);
                transfer.on('progress', stats => {
                    clearTimeout(autocancel);
                    _stats = stats;
                    autocancel = setTimeout(() => {
                        clearInterval(interval);
                        cb();
                    }, 90000);
                });
                transfer.on('end', () => {
                    clearTimeout(autocancel);
                    clearInterval(interval);
                    cb();
                });
                transfer.on('error', e => {
                    ecb(e);
                });
            })
            .catch(e => {
                ecb(e);
            });
    }
    pull(serial, path, savePath, cb, scb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .pull(serial, path)
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
    }
    stat(serial, path, cb, ecb) {
        if (!this.client) return ecb('Not connected.');
        this.client
            .stat(serial, path)
            .then(res => cb(res))
            .catch(e => ecb(e));
    }
}

let config: StateStorage;
let appWindow: AppWindow;
let mainWindow: BrowserWindow;
let popupWindow: BrowserWindow;
let hasUpdate = false;

if (app.requestSingleInstanceLock()) {
    const environment: EnvironmentConfig = { userDataPath: app.getPath('userData') };
    config = new StateStorage(environment, console);
    setupApp();
} else {
    app.quit();
}

function parseOpenUrl(argv: string[]) {
    //fs.writeFileSync(path.join(app.getPath('appData'), 'SideQuest', 'test_output_loaded.txt'), JSON.stringify(argv));
    if (argv[1] && argv[1].length && argv[1].substr(0, 12) === 'sidequest://') {
        setTimeout(() => mainWindow.webContents.send('open-url', argv[1].toString()), 5000);
    }
}

function createWindow() {
    appWindow = new AppWindow(config);
    mainWindow = appWindow.window;

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

    protocol.registerBufferProtocol(
        'beatsaver',
        (request, _callback) => {
            mainWindow.webContents.send(
                'open-url',
                'sidequest://bsaber/#https://beatsaver.com/api/download/key/' + request.url.replace('beatsaver://', '')
            );
        },
        error => {
            if (error) console.error('Failed to register protocol');
        }
    );

    protocol.registerStringProtocol(
        'sidequest',
        (request, _callback) => {
            mainWindow.webContents.send('open-url', request.url);
        },
        error => {
            if (error) console.error('Failed to register protocol');
        }
    );
    mainWindow.webContents.on('did-fail-load', () => mainWindow.loadURL(mainWindow.webContents.getURL()));
    mainWindow.webContents.session.on('will-download', (_evt, item, _webContents) => {
        let url = item.getURL();
        let urls = item.getURLChain();
        let name = item.getFilename();
        let etx = path.extname(url.split('?')[0]).toLowerCase();
        let etx2 = urls.length ? path.extname(urls[0].split('?')[0]).toLowerCase() : etx;
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
        } else if (~url.indexOf('ssl.hwcdn.net/') || ~url.indexOf('patreonusercontent.com/')) {
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
    app.on('second-instance', (_event, commandLine, _workingDirectory) => {
        parseOpenUrl(commandLine);
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
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
    app.on('window-all-closed', function() {
        if (process.platform !== 'darwin') app.quit();
    });

    // Kill the adb client when the app is definitely quitting, regardless of how it quit.
    app.on('will-quit', () => {
        if (adb.client) adb.client.kill();
    });

    app.on('activate', function() {
        if (mainWindow === null) createWindow();
    });
    app.setAsDefaultProtocolClient('sidequest');
    app.on('open-url', function(event, url) {
        event.preventDefault();
    });

    app.on('web-contents-created', (e, contents) => {
        if (contents.getType() === 'webview') {
            // contents.on('new-window', (e : any, url) => {
            //        popupWindow = new BrowserWindow({show: false})
            //        popupWindow.once('ready-to-show', () => popupWindow.show())
            //        popupWindow.loadURL(url);
            //        e.newGuest = popupWindow;
            //        e.preventDefault();
            // });
        }
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

    ipcMain.on('download-url', async (event, { url, token, directory, filename }) => {
        download(url, path.join(directory, filename), stats => {
            return event.sender.send('download-progress', { stats, token });
        })
            .then(() => event.sender.send('download-url', { token }))
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
            err => {
                event.sender.send('extract-file', { token });
            }
        );
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
            if (!event.sender.isDestroyed()) {
                event.sender.send('adb-command', { command: arg.command, resp: d, uuid: arg.uuid });
            }
        };
        const reject = e => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('adb-command', { command: arg.command, error: e, uuid: arg.uuid });
            }
        };
        const status = d => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('adb-command', { command: arg.command, status: d, uuid: arg.uuid });
            }
        };
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
    });
}
