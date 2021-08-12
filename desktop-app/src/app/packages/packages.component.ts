import { Component, OnInit, ViewChild } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';
import { AppService, FolderType } from '../app.service';
import { LoadingSpinnerService } from '../loading-spinner.service';
import { StatusBarService } from '../status-bar.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { RepoService } from '../repo.service';

@Component({
    selector: 'app-packages',
    templateUrl: './packages.component.html',
    styleUrls: ['./packages.component.css'],
})
export class PackagesComponent implements OnInit {
    @ViewChild('appSettingsModal', { static: false }) appSettingsModal;

    folder = FolderType;
    currentPackage: any = { package: { packageName: '', name: '', icon: '' }, versionCode: 0 };
    routerPackage: string;
    backups: string[];
    dataBackups: string[];
    myApps: any[];
    myBackups: any[];
    isBackingUp = true;
    isOpen: boolean;
    sub: Subscription;
    show_all: boolean;
    search: string;
    savePath: string;
    perms: any;
    constructor(
        public adbService: AdbClientService,
        public appService: AppService,
        public spinnerService: LoadingSpinnerService,
        public statusService: StatusBarService,
        private repoService: RepoService,
        router: Router,
        route: ActivatedRoute
    ) {
        appService.webService.isWebviewOpen = false;
        appService.resetTop();
        appService.isPackagesOpen = true;
        this.appService.setTitle('Installed Apps');
        this.sub = router.events.subscribe(val => {
            if (val instanceof NavigationEnd) {
                this.routerPackage = route.snapshot.paramMap.get('packageName');
            }
        });
        this.show_all = !!localStorage.getItem('packages_show_all');
    }

    setShowAll() {
        if (this.show_all) {
            localStorage.setItem('packages_show_all', 'true');
        } else {
            localStorage.removeItem('packages_show_all');
        }
        this.isOpen = false;
    }

    deSelectAll() {
        if (this.isBackingUp) {
            this.myApps.forEach(a => (a.backupAll = false));
        } else {
            this.myBackups.forEach(a => (a.isRestore = false));
        }
    }

    selectAll() {
        if (this.isBackingUp) {
            this.myApps.forEach(a => (a.backupAll = true));
        } else {
            this.myBackups.forEach(a => (a.isRestore = true));
        }
    }

    setPerm(perm) {
        this.adbService.setPermission(this.currentPackage.package.packageName, perm.permission, !perm.enabled);
    }

    async pickBackupLocation() {
        const res = await this.appService.electron.remote.dialog.showOpenDialog({
            properties: ['openDirectory'],
            defaultPath: this.appService.backupPath,
        });
        if (res && res.filePaths && res.filePaths.length === 1) {
            this.appService.backupPath = res.filePaths[0];
            localStorage.setItem('backup-path', this.appService.backupPath);
        }
    }

    backupAll() {
        this.myApps
            .filter(d => d.backupAll)
            .forEach(d => {
                this.backupApk(d.packageName).then(() => this.backupData(d.packageName));
            });
        this.statusService.showStatus('Backing up all the selected apps. Check the Tasks screen for more information.');
    }

    restoreAll() {
        this.myBackups
            .filter(d => d.isRestore)
            .forEach((d: any) => {
                if (d.dataBackups.length) {
                    this.adbService.restoreDataBackup(d.name, this.showBackupFileName(d.dataBackups[0]));
                }
                if (d.backups.length) {
                    this.adbService.installAPK(d.backups[0], true);
                }
            });
    }

    ngOnInit() {}
    isConnected() {
        let isConnected = this.adbService.deviceStatus === ConnectionStatus.CONNECTED;
        if (isConnected && !this.isOpen) {
            this.isOpen = true;
            this.adbService
                .getPackages(this.show_all)
                .then(() => {
                    this.myApps = this.adbService.devicePackages
                        .map(p => {
                            if (this.repoService.allApps[p]) {
                                return {
                                    name: this.repoService.allApps[p].name,
                                    icon: this.repoService.allApps[p].icon,
                                    packageName: p,
                                };
                            }
                            return {
                                packageName: p,
                            };
                        })
                        .sort((a, b) => {
                            const getGameName = (packageName: string) => {
                                const split = packageName.split('.');

                                return split[split.length - 1];
                            };
                            let textA = (a.name || getGameName(a.packageName)).toUpperCase();
                            let textB = (b.name || getGameName(b.packageName)).toUpperCase();
                            return textA < textB ? -1 : textA > textB ? 1 : 0;
                        });
                    this.myApps.forEach(p => {
                        if (this.routerPackage && p.packageName === this.routerPackage) {
                            this.currentPackage.package = p;
                        }
                    });

                    if (
                        this.currentPackage.package.packageName &&
                        ~this.adbService.devicePackages.indexOf(this.currentPackage.package.packageName)
                    ) {
                        this.appSettingsModal.openModal();
                    } else if (this.currentPackage.package.packageName) {
                        this.statusService.showStatus(
                            'App not installed...' + (this.currentPackage.package ? this.currentPackage.package.packageName : ''),
                            true
                        );
                    }
                })
                .catch(() => {
                    this.statusService.showStatus(
                        'Warning: Cannot retrieve information from the headset, try another USB cable or port. Try a USB2 port.',
                        true
                    );
                });
        }
        return isConnected;
    }
    ngAfterViewInit() {}

    async getBackupFiles(file) {
        file.isDirectory = this.appService.fs.lstatSync(file.path).isDirectory();
        if (file.isDirectory) {
            file.backups = await this.adbService.getBackups(file.name);
            file.dataBackups = await this.adbService.getDataBackups(file.name);
        }
        return file;
    }

    getMyBackups() {
        if (this.isBackingUp) return;
        let backupPath = this.appService.path.join(this.appService.backupPath);
        let backups = this.appService.fs
            .readdirSync(backupPath)
            .map(file => ({ name: file, path: this.appService.path.join(backupPath, file), isRestore: false }));
        Promise.all(backups.map((file: any) => this.getBackupFiles(file))).then(files => {
            this.myBackups = files.filter((file: any) => {
                return file.isDirectory && (file.backups.length || file.dataBackups.length);
            });
        });
    }
    getCurrentInstalledInfo() {
        this.adbService
            .getBackups(this.currentPackage.package.packageName)
            .then(backups => (this.backups = backups))
            .then(() => this.adbService.getAppVersionCode(this.currentPackage.package.packageName))
            .then(version => (this.currentPackage.versionCode = version))
            .then(() => this.adbService.getPackagePermissions(this.currentPackage.package.packageName))
            .then(perms => {
                console.log(p);
                perms.forEach((p: any) => {
                    const perm_split = p.permission.split('.');
                    p.display_permission = perm_split[perm_split.length - 1];
                });
                this.perms = perms;
            })
            .then(() => this.adbService.getDataBackups(this.currentPackage.package.packageName))
            .then(dataBackups => (this.dataBackups = dataBackups));
    }
    async backupApk(packageName: string) {
        this.appSettingsModal.closeModal();
        let location = await this.adbService.getPackageLocation(packageName);
        this.adbService.backupPackage(location, packageName).then(savePath => {
            // if (
            //     packageName === this.bsaberService.beatSaberPackage &&
            //     !this.bsaberService.backupExists()
            // ) {
            //     this.appService.fs.copyFileSync(savePath, this.appService.path.join(this.appService.appData, 'bsaber-base.apk'));
            //     this.appService.fs.copyFileSync(
            //         savePath,
            //         this.appService.path.join(this.appService.appData, 'bsaber-base_patched.apk')
            //     );
            // }
        });
    }
    backupData(packageName) {
        this.appSettingsModal.closeModal();
        this.adbService.makeDataBackup(packageName);
    }
    showBackupFileName(file) {
        return this.appService.path.basename(file);
    }
    restoreBackup(backup: string) {
        this.appSettingsModal.closeModal();
        this.adbService
            .restoreDataBackup(this.currentPackage.package.packageName, backup)
            .then(() => this.statusService.showStatus('Backup restored ok!!'));
    }
    installBackupApk(filePath) {
        this.appSettingsModal.closeModal();
        this.adbService.installAPK(filePath, true);
    }
    uninstallApk() {
        this.appSettingsModal.closeModal();
        this.adbService.uninstallAPK(this.currentPackage.package.packageName);
    }
    launchApp() {
        this.adbService.launchApp(this.currentPackage.package.packageName);
    }
    forceClose() {
        this.adbService
            .adbCommand('shell', {
                serial: this.adbService.deviceSerial,
                command: 'am force-stop ' + this.currentPackage.package.packageName,
            })
            .then(r => {
                this.statusService.showStatus('Force Close Sent!!');
            });
    }
    clearData() {
        this.adbService
            .adbCommand('clear', {
                serial: this.adbService.deviceSerial,
                packageName: this.currentPackage.package.packageName,
            })
            .then(r => {
                this.statusService.showStatus('Clear Data Sent!!');
            });
    }
}
