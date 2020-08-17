import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RepoService } from '../repo.service';

@Component({
    selector: 'app-package-item',
    templateUrl: './package-item.component.html',
    styleUrls: ['./package-item.component.css'],
})
export class PackageItemComponent implements OnInit {
    @Input('package') package: any;
    @Output('settings') settings = new EventEmitter();
    constructor(public repoService: RepoService) {}

    ngOnInit() {}

    openSettings() {
        this.settings.emit({ package: this.package });
    }
}
