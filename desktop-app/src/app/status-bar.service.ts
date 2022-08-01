import { Injectable } from '@angular/core';
import { AppService } from './app.service';
import { Notification, StatusBarComponent, StatusType } from './status-bar/status-bar.component';

@Injectable({
    providedIn: 'root',
})
export class StatusBarService {
    status: StatusBarComponent;
    constructor() {}
    setStatusComponent(status: StatusBarComponent) {
        this.status = status;
    }
    showStatus(message: string, isError?: boolean, isInfo?: boolean) {
        console.warn('here');
        this.status.showStatus(message, isError, isInfo);
    }
    hideStatus() {
        this.status.isActive = false;
    }
    copyStatus() {
        // this.appService.electron.clipboard.writeText(this.status.statusMessage);
        // // this.status.showDiscord = true;
        // this.showStatus(
        //     'Copied to your clipboard! Please post this in our discord server in the #general channel: https://discord.gg/r38T5rR'
        // );
    }
}
