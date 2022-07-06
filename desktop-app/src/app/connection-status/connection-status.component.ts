import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';

@Component({
    selector: 'app-connection-status',
    templateUrl: './connection-status.component.html',
    styleUrls: ['./connection-status.component.scss'],
})
export class ConnectionStatusComponent implements OnInit {
    ConnectionStatus = ConnectionStatus;
    helpOpen: boolean;
    @Output() backHome = new EventEmitter();
    constructor(public adb: AdbClientService) {}

    ngOnInit(): void {}
}
