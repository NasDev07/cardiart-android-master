import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit
} from '@angular/core';

@Component({
  selector: 'secs-grid',
  template: ``
})
export class SecsGrid implements OnInit, AfterViewInit, OnChanges {
  @Input()
  gridSize: number = 0;
  // @HostListener("window:resize")
  // onWindowResize() {
  //   if (this.resizeTimeout) {
  //     clearTimeout(this.resizeTimeout);
  //   }
  //   this.resizeTimeout = setTimeout(
  //     (() => {
  //       this.setSize();
  //     }).bind(this),
  //     500
  //   );
  // }
  resizeTimeout;
  private element: HTMLElement;
  private parentElement: HTMLElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  private LINE_COLOR: string = '#808080';

  constructor(private myElement: ElementRef) {}

  ngOnInit() {
    this.element = this.myElement.nativeElement;
    this.parentElement = this.element.parentElement;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.myElement.nativeElement.appendChild(this.canvas);
  }

  ngAfterViewInit() {
    // this.setSize();
    setTimeout(() => {
      this.setSize();
    }, 100);
  }

  setSize() {
    this.canvasWidth = this.parentElement.clientWidth;
    this.canvasHeight = this.parentElement.clientHeight;
    // console.log('[SecsGrid]clientWidth: ' + this.parentElement.clientWidth);
    // console.log('[SecsGrid]clientHeight: ' + this.parentElement.clientHeight);

    this.canvas.setAttribute('width', '' + this.canvasWidth);
    this.canvas.setAttribute('height', '' + this.canvasHeight);
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.gridSize && this.canvas) {
      this.redraw();
    }
  }

  redraw() {
    if (this.context) {
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.drawGrid();
    }
  }

  drawGrid() {
    if (this.gridSize <= 0) return;

    const ctx = this.context;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    const dx = this.gridSize;
    const dy = this.gridSize;

    let x = 0;
    let y = 0;

    ctx.lineWidth = 0.3;
    ctx.strokeStyle = this.LINE_COLOR;
    ctx.fillStyle = this.LINE_COLOR;

    // 画横线
    while (y < h) {
      ctx.moveTo(x, y);
      ctx.lineTo(w, y);

      y = y + dy;
    }

    // 画竖线
    y = 0;
    while (x < w) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, h);
      x = x + dx;
    }
    ctx.stroke();
  }
}
