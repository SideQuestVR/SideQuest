import { Component, OnInit } from '@angular/core';
import { RepoService } from '../repo.service';
import { AppService } from '../app.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css']
})
export class ContentComponent implements OnInit {
  constructor(repoService:RepoService, public appService:AppService) { }

  ngOnInit() {
  }

}
