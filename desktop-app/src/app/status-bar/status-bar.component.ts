import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { StatusBarService } from '../status-bar.service';
import { animate, sequence, style, transition, trigger } from '@angular/animations';

export enum StatusType {
    INFO,
    ERROR,
    SUCCESS,
}
export class Notification {
    type: StatusType;
    message: string;
    get isError() {
        return this.type === StatusType.ERROR;
    }
    get isSuccess() {
        return this.type === StatusType.SUCCESS;
    }
    get isInfo() {
        return this.type === StatusType.INFO;
    }
}

@Component({
    selector: 'app-status-bar',
    templateUrl: './status-bar.component.html',
    styleUrls: ['./status-bar.component.scss'],
    animations: [
        trigger('anim', [
            transition(':leave', [
                style({
                    height: '*',
                    opacity: '1',
                    transform: 'translateX(0)',
                }),
                sequence([
                    animate(
                        '.1s ease',
                        style({
                            height: '*',
                            opacity: '.2',
                            transform: 'translateX(20px)',
                        })
                    ),
                    animate('.1s ease', style({ height: '0', opacity: 0, transform: 'translateX(20px)' })),
                ]),
            ]),
            transition(':enter', [
                style({ height: '0', opacity: '0', transform: 'translateX(20px)' }),
                sequence([
                    animate(
                        '.35s ease',
                        style({
                            height: '*',
                            opacity: 1,
                            transform: 'translateX(0)',
                        })
                    ),
                ]),
            ]),
        ]),
    ],
})
export class StatusBarComponent implements OnInit {
    isActive = false;
    private timeout;
    notification: Notification = new Notification();
    constructor(public statusService: StatusBarService) {
        statusService.setStatusComponent(this);
    }

    ngOnInit() {}

    showStatus(message: string, isError?: boolean, isInfo?: boolean) {
        clearTimeout(this.timeout);
        this.notification.message = message;
        this.notification.type = isError ? StatusType.ERROR : isInfo ? StatusType.INFO : StatusType.SUCCESS;
        this.isActive = true;
        this.timeout = setTimeout(
            () => {
                this.isActive = false;
            },
            this.notification.isError ? 7500 : 3500
        );
    }
}
