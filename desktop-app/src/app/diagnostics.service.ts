import { Injectable } from '@angular/core';

const OCULUS_VID = 10291;
const Q2_DEV_OFF_FILES_OFF_PID = 311;
const Q2_DEV_OFF_FILES_ON_PID = 386;
const Q2_DEV_ON_FILES_ON_PID = 387;
const Q2_DEV_ON_FILES_OFF_PID = 390;
declare let process;
export interface UsbDeviceInfo {
    locationId: number;
    vendorId: number;
    productId: number;
    deviceName: string;
    manufacturer: string;
    serialNumber: string;
    deviceAddress: number;
}
export enum UsbDiagResultStatus {
    Bad = 'diag-bad',
    Maybe = 'diag-maybe',
    Good = 'diag-good',
}

export interface DeviceUsbStatus {
    is_connected: boolean;
    is_mtp_enabled: boolean;
    is_adb_enabled: boolean;
    is_dev_mode_enabled: boolean;
    all_oculus_devices: UsbDeviceInfo[];
    adb_device: UsbDeviceInfo | null;
    log: string;
    success: boolean;
    result: string;
    result_status: UsbDiagResultStatus;
    recommendation: string;
}

@Injectable({
    providedIn: 'root',
})
export class DiagnosticatorService {
    public usbDetect;
    constructor() {}

    async getDeviceStatus(): Promise<DeviceUsbStatus> {
        if (!this.usbDetect) {
            this.usbDetect = (window as any).require('usb-detection2');
        }
        const ret: DeviceUsbStatus = {
            is_adb_enabled: false,
            is_connected: false,
            is_mtp_enabled: false,
            is_dev_mode_enabled: false,
            all_oculus_devices: [],
            adb_device: null,
            success: false,
            result: 'Error',
            recommendation: `Something went wrong, you can try again, but the diagnostics may not support your device`,
            result_status: UsbDiagResultStatus.Bad,
            log: 'Starting USB diagnostics...\n',
        };

        return new Promise<DeviceUsbStatus>(async (resolve, reject) => {
            try {
                const devices = await this.usbDetect.find(OCULUS_VID);
                // console.log('Devices: ' + JSON.stringify(devices, null, 3));
                ret.log += 'Detected Oculus devices: ' + JSON.stringify(devices, null, 3) + '\n';

                try {
                    ret.success = true;
                    if (!devices || !devices.length) {
                        ret.log += 'No Oculus USB devices seem to be connected.\n';
                        ret.result = `Computer doesn't see Quest plugged in at all`;
                        ret.recommendation = `- Try a different USB cable or a different USB port on your computer.
  - There are a lot of bad USB-C cables out there, maybe try several.
- Make sure the quest is powered on.
- Sometimes rebooting the Quest may resolve the problem.
- Try rebooting your computer.`;
                        ret.result_status = UsbDiagResultStatus.Bad;
                        resolve(ret);
                        return;
                    } else {
                        ret.all_oculus_devices.push(...devices);
                        let devMode = false;
                        let adb = false;
                        let mtpMode = false;
                        let foundAny = false;
                        let devs = devices.filter(x => x.productId === Q2_DEV_ON_FILES_OFF_PID);
                        if (devs.length) {
                            ret.log += 'Found some oculus devices in dev mode without MTP: ';
                            ret.log += devs.map(x => `(PID ${x.productId}) ${x.deviceName}`).join(', ') + '\n';
                            devMode = true;
                            foundAny = true;
                            if (process.platform == 'win32') {
                                const adbdev = devs.find(x => x.deviceName.toLowerCase().includes('adb'));
                                if (adbdev) {
                                    ret.adb_device = ret.adb_device || adbdev;
                                    ret.log += 'Seemed to find an adb device: ' + adbdev.deviceName + '\n';
                                    adb = true;
                                }
                            } else {
                                adb = true;
                            }
                        }
                        devs = devices.filter(x => x.productId === Q2_DEV_ON_FILES_ON_PID);
                        if (devs.length) {
                            ret.log += 'Found some oculus devices in dev mode with MTP: ';
                            ret.log += devs.map(x => `(PID ${x.productId}) ${x.deviceName}`).join(', ') + '\n';
                            mtpMode = true;
                            devMode = true;
                            foundAny = true;
                            if (process.platform == 'win32') {
                                const adbdev = devs.find(x => x.deviceName.toLowerCase().includes('adb'));
                                if (adbdev) {
                                    ret.adb_device = ret.adb_device || adbdev;
                                    ret.log += 'Seemed to find an adb device: ' + adbdev.deviceName + '\n';
                                    adb = true;
                                }
                            } else {
                                adb = true;
                            }
                        }
                        devs = devices.filter(x => x.productId === Q2_DEV_OFF_FILES_ON_PID);
                        if (devs.length) {
                            ret.log += 'Found some oculus devices NO dev mode with MTP: ';
                            ret.log += devs.map(x => `(PID ${x.productId}) ${x.deviceName}`).join(', ') + '\n';
                            mtpMode = true;
                            foundAny = true;
                            const adbdev = devs.find(x => x.deviceName.toLowerCase().includes('adb'));
                            if (adbdev) {
                                ret.adb_device = ret.adb_device || adbdev;
                                ret.log +=
                                    'Unexpected... seemed to find an adb device but no dev mode PID: ' + adbdev.deviceName + '\n';
                                adb = true;
                            }
                        }
                        devs = devices.filter(x => x.productId === Q2_DEV_OFF_FILES_OFF_PID);
                        if (devs.length) {
                            ret.log += 'Found some oculus devices NO dev mode without MTP: ';
                            ret.log += devs.map(x => `(PID ${x.productId}) ${x.deviceName}`).join(', ') + '\n';
                            foundAny = true;
                            const adbdev = devs.find(x => x.deviceName.toLowerCase().includes('adb'));
                            if (adbdev) {
                                ret.adb_device = ret.adb_device || adbdev;
                                ret.log +=
                                    'Unexpected... seemed to find an adb device but no dev mode PID: ' + adbdev.deviceName + '\n';
                                adb = true;
                            }
                        }
                        if (!foundAny) {
                            ret.log = "Didn't find any of the expected PIDs.  Not sure what's going on.  Here's the list: ";
                            ret.log += JSON.stringify(devices, null, 3) + '\n';

                            ret.result = `Unknown Oculus device detected`;
                            ret.recommendation = `Some sort of USB device from Oculus is detected, but it's none of the ones SideQuest knows about. \
                              Sidequest MAY still work if Oculus has changed things in a firmware update, but it may not. \
                              You can try rebooting your Quest. Make sure you've installed any available SideQuest updates.`;
                            ret.result_status = UsbDiagResultStatus.Maybe;

                            resolve(ret);
                            return;
                        } else {
                            ret.is_connected = true;
                            ret.is_mtp_enabled = mtpMode;
                            ret.is_adb_enabled = adb;
                            ret.is_dev_mode_enabled = devMode;
                            ret.log += 'MTP (drive mode): ' + (mtpMode ? 'ON' : 'OFF') + '\n';
                            ret.log += 'Developer Mode: ' + (devMode ? 'ON' : 'OFF') + '\n';
                            ret.log += 'ADB Device Found: ' + (adb ? 'YES' : 'NO') + '\n';
                            if (devMode && adb) {
                                ret.result = `The Quest is connected, developer mode is on and ADB device is present`;
                                ret.recommendation = `Your computer sees the Quest and it looks like developer mode is on. An ADB device is also connected. If SideQuest isn't working, you can try the following things:

- Make sure your antivirus isn't blocking anything related to sidequest or 'adb'.
- Uninstall and reinstall SideQuest
- Try rebooting the Quest and your computer
- if you've done all these things and are still having issues, you can reach out to SideQuest support.`;
                                ret.result_status = UsbDiagResultStatus.Good;
                            } else if (devMode) {
                                ret.result = `The Quest is connected, developer mode is on, but can't find an ADB device`;
                                ret.recommendation = `SideQuest MAY still work. Your computer sees the Quest and it looks like developer mode is on, but it isn't clear if the ADB device or driver is present. If SideQuest isn't working, you can try:

- Reboot the Quest
- Reboot your computer
- If you're on windows, try installing the Oculus software (which is currently the only way to manually install the
USB drivers for the quest).`;
                                ret.result_status = UsbDiagResultStatus.Maybe;
                            } else if (adb) {
                                ret.result = `The Quest 2 is connected, developer mode is off, but there's an ADB device showing up?`;
                                ret.recommendation = `Not sure how this has happened to you, but SideQuest MAY still work. \
                                    This is likely an unhandled device identifier in SideQuest. Contact us \
                                    and provide the log below so that we can add your scenario.`;
                                ret.result_status = UsbDiagResultStatus.Maybe;
                            } else {
                                ret.result = `The Quest 2 is connected, but developer mode is OFF`;
                                ret.recommendation = `- You need to enable developer mode in your in the OCULUS MOBILE app. Even if you already did it, it sometimes turns off on its own.

- If you don't have access to the mobile app or haven't created a developer account, there's no other way around, you have to do this.
- Follow the various instructions and tutorials in the GET SIDEQUEST section.
- You can try turning developer mode off and back on again or rebooting your headset
- If developer mode is definitely on in the MOBILE APP, you may need to contact Oculus Support.`;
                                ret.result_status = UsbDiagResultStatus.Bad;
                            }
                        }
                        resolve(ret);
                    }
                } catch (e) {
                    ret.success = false;
                    ret.log += 'Error looking for devices: ' + e + '\n';
                    resolve(ret);
                }
            } catch (e) {
                ret.success = false;
                ret.log += 'Error trying to find USB devices: ' + e + '\n';
                resolve(ret);
            }
        });
    }
}
