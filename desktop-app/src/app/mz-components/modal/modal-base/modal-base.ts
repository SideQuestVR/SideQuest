import {
  AfterViewInit, Injectable,
  ViewChild,
} from '@angular/core';

import { MzModalComponent } from '../modal.component';

@Injectable()
export abstract class MzBaseModal implements AfterViewInit {
  @ViewChild(MzModalComponent) modalComponent: MzModalComponent;

  ngAfterViewInit() {
    this.modalComponent.openModal();
  }
}
