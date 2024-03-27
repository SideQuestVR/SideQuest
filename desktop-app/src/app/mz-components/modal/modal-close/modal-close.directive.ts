import { Directive, HostListener } from '@angular/core';

import { MzModalComponent } from '../modal.component';

@Directive({
  selector: 'a[mzModalClose], button[mzModalClose], a[mz-modal-close], button[mz-modal-close]',
})
export class MzModalCloseDirective {

  @HostListener('click') onclick() {
    this.modalComponent.closeModal();
  }

  constructor(
    private modalComponent: MzModalComponent,
  ) { }
}
