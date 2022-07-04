import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'app-package-item',
    templateUrl: './package-item.component.html',
    styleUrls: ['./package-item.component.css'],
})
export class PackageItemComponent implements OnInit {
    @Input() package: any;
    @Output() settings = new EventEmitter();
    constructor() {}

    ngOnInit() {}

    openSettings() {
        this.settings.emit({ package: this.package });
    }
}
