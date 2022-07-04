import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';

@Component({
    selector: 'app-content',
    templateUrl: './content.component.html',
    styleUrls: ['./content.component.css'],
})
export class ContentComponent implements OnInit {
    constructor(public appService: AppService) {}

    ngOnInit() {}
}
