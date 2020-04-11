import { app, protocol, ipcMain, Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron';
import { ADB } from './adbkit';
import { StateStorage, EnvironmentConfig } from './state-storage';
import { AppWindow } from './window';
const path = require('path');
const { autoUpdater } = require('electron-updater');
const download = require('./download');
const extract = require('extract-zip');

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

    mainWindow.webContents.session.on('will-download', (_evt, item, _webContents) => {
        let url = item.getURL();
        let etx = path.extname(url.split('?')[0]).toLowerCase();
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
        } else if (etx === '.apk') {
            // any file ending with apk.
            mainWindow.webContents.send('pre-open-url', url);
        } else if (~url.indexOf('ssl.hwcdn.net/') || ~url.indexOf('patreonusercontent.com/')) {
            //itch.io & patreon
            let name = item.getFilename();
            mainWindow.webContents.send('pre-open-url', { url, name });
            BrowserWindow.getAllWindows()
                .filter(b => b !== mainWindow)
                .forEach(b => b.close());
        }
        item.cancel();
    });
}

function setupMenu() {
    // const template: MenuItemConstructorOptions[] = [
    //     {
    //         label: 'SideQuest',
    //         submenu: [
    //             {
    //                 label: 'Quit',
    //                 accelerator: 'Command+Q',
    //                 click: function() {
    //                     app.quit();
    //                 },
    //             },
    //         ],
    //     },
    //     {
    //         label: 'Edit',
    //         submenu: [
    //             {
    //                 label: 'Undo',
    //                 accelerator: 'CmdOrCtrl+Z',
    //                 // selector: 'undo:',
    //             },
    //             {
    //                 label: 'Redo',
    //                 accelerator: 'Shift+CmdOrCtrl+Z',
    //                 // selector: 'redo:',
    //             },
    //             { type: 'separator' },
    //             {
    //                 label: 'Cut',
    //                 accelerator: 'CmdOrCtrl+X',
    //                 // selector: 'cut:'
    //             },
    //             {
    //                 label: 'Copy',
    //                 accelerator: 'CmdOrCtrl+C',
    //                 // selector: 'copy:',
    //             },
    //             {
    //                 label: 'Paste',
    //                 accelerator: 'CmdOrCtrl+V',
    //                 // selector: 'paste:',
    //             },
    //             {
    //                 label: 'Select All',
    //                 accelerator: 'CmdOrCtrl+A',
    //                 // selector: 'selectAll:',
    //             },
    //         ],
    //     },
    // ];
    //
    // Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    Menu.setApplicationMenu(null);
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
