import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { StatusBarService } from '../status-bar.service';

@Component({
    selector: 'app-status-bar',
    templateUrl: './status-bar.component.html',
    styleUrls: ['./status-bar.component.css'],
})
export class StatusBarComponent implements OnInit {
    isWarning: boolean;
    isActive: boolean;
    showDiscord: boolean;
    statusMessage: string;
    @Output() getHelp = new EventEmitter();
    constructor(public statusService: StatusBarService) {}

    ngOnInit() {}
}
