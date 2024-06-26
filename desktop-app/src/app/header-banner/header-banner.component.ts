import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import { AdbClientService } from '../adb-client.service';
import { environment } from '../../environments/environment';

declare const process;

const ADBErrors = {
    INSTALL_FAILED_INSUFFICIENT_STORAGE: `Your headset does not have enough storage to install this app. Try removing some apps and trying again.`,
    INSTALL_FAILED_USER_RESTRICTED: `The install was cancelled, please try again.`,
    INSTALL_FAILED_NO_MATCHING_ABIS: `The install failed because the app is not compatible with this device, is this a supported VR headset?`,
    INSTALL_FAILED_VERSION_DOWNGRADE: `The installed failed because the app is already installed and the installed version is newer than this version.`,
    INSTALL_FAILED_VERIFICATION_FAILURE: `The installed failed because the app is possibly corrupt. Try restarting your headset just in-case.`,
    INSTALL_FAILED_UPDATE_INCOMPATIBLE: `The installed failed because the new version is signed differently. Try uninstalling first.`,
    INSTALL_FAILED_OLDER_SDK: `The installed failed because the app is intended for a newer version of Android than is on the headset.`,
    INSTALL_FAILED_TEST_ONLY: `The installed failed because I'm a teapot.`,
    INSTALL_FAILED_CONFLICTING_PROVIDER: `The installed failed for an unknown reason: CONFLICTING_PROVIDER`,
};
@Component({
    selector: 'app-header-banner',
    templateUrl: './header-banner.component.html',
    styleUrls: ['./header-banner.component.scss'],
})
export class HeaderBannerComponent implements OnInit {
    apkDownloadPath: string;
    isLoading: boolean;
    isOutOfDate: boolean;
    // the latest available version of the in-headset app
    private latestAppVersion: string | null = null;
    private appId: string | null = null;
    private addedPerms = false;
    constructor(public appService: AppService, public adb: AdbClientService) {}

    ngOnInit() {
        setInterval(() => {
            this.getLatestApk();
        }, 120000);
        this.getLatestApk();
    }

    setOutOfDate() {
        // any time we don't know the currently installed app version, or we don't know the latest available version, treat it as up to date
        if (this.latestAppVersion !== null && this.adb.appVersionCode !== null && this.adb.appVersionCode !== undefined) {
            if (Number(this.adb.appVersionCode) < Number(this.latestAppVersion)) {
                this.isOutOfDate = true;
                return;
            }
            if (!this.addedPerms) {
              this.adb.runAdbCommand('shell "pm grant quest.side.vr android.permission.WRITE_SECURE_SETTINGS"', true).then(() => {
                this.adb.runAdbCommand('shell "pm grant quest.side.vr android.permission.READ_LOGS"', true);
              });
              this.addedPerms = true;
            }
        }
        this.isOutOfDate = false;
    }

    async getLatestApk() {

        const request = await fetch(environment.configuration.http_url + '/v2/apps/get-sidequest-apk', {
          body: JSON.stringify({ package_name: 'quest.side.vr' }), method: 'POST',
          headers: { "Content-Type": "application/json" }
        });

        let json = await request.json();
        this.appId = json.app_id;
        this.latestAppVersion = json.version_code;
        this.apkDownloadPath = json.url;
        this.setOutOfDate();
    }


    async downloadAPK() {
        if (!this.apkDownloadPath) {
            return Promise.reject('Could not download latest apk, please try again!');
        }

        console.log('downloadAPK', this.appId);
        const requestOptions = {
                timeout: 60000,
                'User-Agent': this.appService.getUserAgent(),
        };
        const fileName = this.appService.path.join(this.appService.appData, 'experimental.apk');
        return this.appService.downloadFileAPI(this.apkDownloadPath, null, fileName, requestOptions, null);
    }

    useBundledAPK() {
        const sourcesPath = this.appService.getPlatformToolsSeedPath().replace('platform-tools', 'experimental.apk');
        console.log(sourcesPath);
        if (sourcesPath == null) {
            console.error('Unable to locate experimental apk!  Try reinstalling sidequest.');
            throw new Error(`Unable to locate experimental apk!  Try reinstalling sidequest.`);
        }
        this.appService.fs.copyFileSync(
            this.appService.path.join(sourcesPath),
            this.appService.path.join(this.appService.appData, 'experimental.apk')
        );
    }

    async install() {
        try {
            const oldVersion = this.adb.appVersionCode || null;
            let telemEvent;
            if (this.isOutOfDate) {
                telemEvent = 'upgrade';
            } else if (this.adb.notInstalled) {
                telemEvent = 'new';
            } else {
                telemEvent = 'reinstall';
            }
            // this.telemetry.telemetry({ event: 'install-sidequest-apk', installType: telemEvent, oldVersion });
            this.isLoading = true;
            try {
                await this.getLatestApk();
                await this.downloadAPK();
            } catch (e) {
                // this.toast.show('Failed to download updated SQ apk, falling back to bundled apk. Are you online?', true);
                console.warn(e);
                this.useBundledAPK();
            }
            await this.adb.runAdbCommand('push "' + this.appService.apkPath + '" /data/local/tmp/sq.apk', true);
            await this.adb.runAdbCommand('shell pm install -r /data/local/tmp/sq.apk', true);
            // this.toast.show('SideQuest installed to headset!');
            // this.showConfetti = true;
            this.adb.appVersionCode = await this.adb.getAppVersion(true);

            await this.adb.runAdbCommand('shell "pm grant quest.side.vr android.permission.WRITE_SECURE_SETTINGS"', true);
            await this.adb.runAdbCommand('shell "pm grant quest.side.vr android.permission.READ_LOGS"', true);
            try {
                const homedir = process.env.USERPROFILE || process.env.HOME;
                if (this.appService.fs.existsSync(homedir + '/.android/adbkey')) {
                    let rawCertificate = this.appService.fs.readFileSync(homedir + '/.android/adbkey', 'utf8').toString();
                    rawCertificate = rawCertificate
                        .replace('-----BEGIN RSA PRIVATE KEY-----', '')
                        .replace('-----END RSA PRIVATE KEY-----', '');
                    rawCertificate = rawCertificate
                        .replace('-----BEGIN PRIVATE KEY-----', '')
                        .replace('-----END PRIVATE KEY-----', '');
                    rawCertificate = rawCertificate.replace(/\n|\r|\n\r|\r\n/g, '');

                    if (rawCertificate && rawCertificate.length) {
                        await this.adb.runAdbCommand(
                            [
                                'shell',
                                'am',
                                'start',
                                '-a',
                                'android.intent.action.MAIN',
                                '-n',
                                'quest.side.vr/.SignInActivity',
                                '--es',
                                'CERTIFICATE',
                                rawCertificate,
                            ].join(' '), true
                        );
                    }
                }
            } catch (e) {
                console.error('Error sending certificate to SideQuestVR', e);
            }

            this.adb.skipStatusUpdates = true;
            await this.adb.runAdbCommand('tcpip 5555');
            setTimeout(() => { this.adb.skipStatusUpdates = false; }, 3000);

            // this.telemetry.telemetry({ event: 'install-sidequest-apk-success',
            //   installType: telemEvent, oldVersion, newVersion: this.adb.appVersionCode || null});
            // setTimeout(() => {
            //   this.showConfetti = false;
            // }, 8000);
        } catch (e) {
            console.log(e);
            await this.handleInstallError(e);
        } finally {
            this.isLoading = false;
        }
    }

    async handleInstallError(e) {
        let err;
        for (const error of Object.keys(ADBErrors)) {
            if (e.toString().includes(error)) {
                err = error;
            }
        }
        if (err) {
            if (err === 'INSTALL_FAILED_VERSION_DOWNGRADE') {
                await this.uninstall();
                await this.install();
            } else if (err === 'INSTALL_FAILED_UPDATE_INCOMPATIBLE') {
                // TODO need to show a better error here and confirm with the user to uninstall first.
                await this.uninstall();
                await this.install();
            } else {
                // this.telemetry.telemetry({event: 'install-error-adb', errorMessage: ADBErrors[err]});
                // this.toast.show(ADBErrors[err], true);
            }
        } else {
            // this.telemetry.telemetry({event: 'install-error-unhandled', errorMessage: e.toString()});
            // this.toast.show(e, true);
        }
    }

    async uninstall() {
        await this.adb.runAdbCommand('uninstall ' + this.adb.VR_APP_PACKAGE, true);
    }

    async userUninstall() {
        try {
            // await this.telemetry.telemetry({event: 'user-uninstall'});
            await this.uninstall();
            // await this.telemetry.telemetry({event: 'user-uninstall-success'});
        } catch (e) {
            // await this.telemetry.telemetry({event: 'user-uninstall-failed', error: e.toString()});
            // this.toast.show(e, true);
        }
    }
}
