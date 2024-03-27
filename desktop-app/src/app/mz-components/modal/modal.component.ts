import {
  AfterViewInit,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';


declare const M: any;

@Component({
  selector: 'mz-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class MzModalComponent implements OnInit, AfterViewInit {
  @Input() bottomSheet: boolean;
  @Input() fixedFooter: boolean;
  @Input() fullscreen: boolean;
  @Input() options: any; // Materialize.ModalOptions;
  @Output() close = new EventEmitter<void>();
  @ViewChild('modal') modalElementRef: ElementRef;
  instances: any;

  constructor() {
    //super();
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.setupInit();
  }

  setupInit() {
    if (this.modalElementRef?.nativeElement != null) {
      this.initModal();
    } else {
      console.log('modalElementRef is not ready yet')
      setTimeout(() => this.setupInit(), 250);
    }
  }




  initModal() {
    this.instances = M.Modal.init(this.modalElementRef.nativeElement, this.options);
    //(this.modalElementRef.nativeElement as any)['modal'].apply(this.modalElementRef.nativeElement, [this.options]);
//    this.renderer.invokeElementMethod(this.modalElement, 'modal', [this.options]);
  }



  openModal() {
    this.instances.open()
    // this.renderer.invokeElementMethod(this.modalElement, 'modal', ['open']);
  }

  closeModal() {
    this.instances.close();
  }
}

// Declare the tags to avoid error: '<mz-modal-x>' is not a known element
// https://github.com/angular/angular/issues/11251
// tslint:disable: directive-selector
@Directive({ selector: 'mz-modal-header' }) export class MzModalHeaderDirective { }
@Directive({ selector: 'mz-modal-content' }) export class MzModalContentDirective { }
@Directive({ selector: 'mz-modal-footer' }) export class MzModalFooterDirective { }
