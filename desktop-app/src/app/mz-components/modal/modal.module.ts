import { NgModule } from '@angular/core';

import { MzInjectionModule } from '../shared/injection';
import { MzModalCloseDirective } from './modal-close/modal-close.directive';
import {
  MzModalComponent,
  MzModalContentDirective,
  MzModalFooterDirective,
  MzModalHeaderDirective,
} from './modal.component';
import { MzModalService } from './services/modal.service';

@NgModule({
  imports: [MzInjectionModule],
  declarations: [
    MzModalCloseDirective,
    MzModalComponent,
    MzModalContentDirective,
    MzModalFooterDirective,
    MzModalHeaderDirective,
  ],
  exports: [
    MzModalCloseDirective,
    MzModalComponent,
    MzModalContentDirective,
    MzModalFooterDirective,
    MzModalHeaderDirective,
  ],
  providers: [MzModalService],
})
export class MzModalModule { }
