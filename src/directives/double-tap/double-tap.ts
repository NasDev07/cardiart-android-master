import { Directive, OnInit, OnDestroy, Output, EventEmitter, ElementRef } from '@angular/core';
import { Gesture } from 'ionic-angular/gestures/gesture';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { debounceTime } from 'rxjs/operators';

declare var Hammer;

@Directive({
  selector: '[doubleTap]' // Attribute selector
})
export class DoubleTapDirective implements OnInit, OnDestroy {
  @Output() onOnePointerDoubleTap: EventEmitter<any> = new EventEmitter();
  @Output() onTwoPointersDoubleTap: EventEmitter<any> = new EventEmitter();

  private el: HTMLElement;
  private tapGesture: Gesture;
  private taps = new Subject();
  private tapSubscription: Subscription;

  constructor(el: ElementRef) {
    this.el = el.nativeElement;
  }

  ngOnInit() {
    this.tapGesture = new Gesture(this.el, {
      recognizers: [
        [Hammer.Tap, { event: 'onePointerDoubleTap', taps: 2, posThreshold: 100 }],
        [
          Hammer.Tap,
          {
            event: 'twoPointersDoubleTap',
            pointers: 2,
            taps: 2,
            posThreshold: 100
          }
        ]
      ]
    });

    this.tapGesture.listen();
    this.tapGesture.on('onePointerDoubleTap', (e: Event) => {
      this.taps.next(e);
    });
    this.tapGesture.on('twoPointersDoubleTap', (e: Event) => {
      this.taps.next(e);
    });

    this.tapSubscription = this.taps.pipe(debounceTime(500)).subscribe((e: Event) => {
      switch (e.type) {
        case 'onePointerDoubleTap':
          this.onOnePointerDoubleTap.emit(e);
          break;
        case 'twoPointersDoubleTap':
          this.onTwoPointersDoubleTap.emit(e);
          break;
      }
    });
  }

  ngOnDestroy() {
    this.tapSubscription.unsubscribe();
    this.tapGesture.destroy();
  }
}
