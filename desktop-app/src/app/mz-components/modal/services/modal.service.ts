import {
  ComponentRef,
  Injectable,
  Type,
} from '@angular/core';
import { first } from 'rxjs/operators';

import { MzInjectionService } from '../../shared/injection';
import { MzBaseModal } from '../modal-base/modal-base';

@Injectable()
export class MzModalService {

  constructor(
    private injectionService: MzInjectionService,
  ) { }

  /**
   * Open modal component.
   */
  open(componentClass: Type<MzBaseModal>, options: any = {}): ComponentRef<MzBaseModal> {
    const componentRef = this.injectionService.appendComponent(componentClass, options);
    componentRef.instance.modalComponent.close
      .pipe(first())
      .subscribe(() => {
        componentRef.destroy();
      });
    return componentRef;
  }
}
