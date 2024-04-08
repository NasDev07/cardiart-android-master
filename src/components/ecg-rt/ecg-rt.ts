import {
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnInit,
  AfterViewInit,
  OnChanges
} from '@angular/core';
import { EcgConfig } from '../../models/ecg';

@Component({
  selector: 'ecg-rt',
  template: `
    <secs-grid [gridSize]="gridSize"></secs-grid>
  `
})
export class EcgRTCompoment implements OnInit, AfterViewInit, OnChanges, DoCheck {
  @Input()
  data: number[];
  @Input()
  sampleRate = 669;
  @Input()
  scaleX = 2;
  @Input()
  scaleY = 2;
  @Input()
  config: EcgConfig;
  @Output()
  onPeaks = new EventEmitter<boolean>();
  // @HostListener('window:resize')
  // onWindowResize() {
  //   if (this.resizeTimeout) {
  //     clearTimeout(this.resizeTimeout);
  //   }
  //   this.resizeTimeout = setTimeout(
  //     (() => {
  //       this.setSize();
  //       // this.initDrawer();
  //       this.initialized = false;
  //       this.resetDrawer();
  //     }).bind(this),
  //     500
  //   );
  // }

  element: HTMLElement;
  parentElement: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;

  newData: number[];
  oldLength: number = 0;
  canvasHeight: number;
  canvasWidth: number;
  offset: number = 0;
  diffOffset: number = 0;
  totalSeconds: number = 2;
  gridSize: number = 0;
  samples: number = 0;
  drawSamplesCount: number = 0;
  drawSamples: number = 0;
  sampleOffset: number = 0;
  drawOffset: number = 0;
  drawSum: number = 0;
  drawSampleOffset: number = 0;
  drawValues: number[] = [];
  clearWidth: number = 0;
  lastDrawPoint: any;
  initialized: boolean = false;
  isViewInitialized: boolean = false;
  // resizeTimeout: NodeJS.Timeout;

  LINE_COLOR: string = '#00FF7F';

  constructor(private myElement: ElementRef) {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.element = this.myElement.nativeElement;
    this.parentElement = this.element.parentElement;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    const firstChild = this.element.firstChild;
    this.element.insertBefore(this.canvas, firstChild);

    setTimeout(() => {
      this.setSize();
      this.initDrawer();
    }, 100);
  }

  setSize() {
    const width = this.element.clientWidth;
    const height = this.element.clientHeight;
    // console.log('[EcgRT]clientWidth: ' + this.parentElement.clientWidth);
    // console.log('[EcgRT]clientHeight: ' + this.parentElement.clientHeight);
    // console.log('[EcgRT]element clientWidth: ' + this.element.clientWidth);
    // console.log('[EcgRT]element clientHeight: ' + this.element.clientHeight);

    this.canvasWidth = width;
    this.canvasHeight = height;

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.isViewInitialized = true;
  }

  initDrawer() {
    const tempPxPerMm =
      this.canvasHeight / this.scaleY / this.config.baseLengthPerMilliVolt / (this.config.maxMillivolt * 2);
    const pxPerMm = Math.round(tempPxPerMm * 10) / 10;
    this.gridSize = pxPerMm * 5;
    this.clearWidth = Math.floor(this.gridSize * 1.5);
    const totalSeconds = this.canvasWidth / this.scaleX / this.config.baseLengthPerSec / pxPerMm;
    this.totalSeconds = totalSeconds;
    console.log('[EcgRT]pxPerMm:' + pxPerMm);
    console.log('[EcgRT]total second:' + this.totalSeconds);
    // console.log('gridSize:' + this.gridSize);

    // this.canvas.style.backgroundImage = `url(./assets/imgs/grid.svg)`;
    // this.canvas.style.backgroundSize = `${this.gridSize}px`;

    this.samples = this.sampleRate * this.totalSeconds;
    this.sampleOffset = this.samples / this.canvasWidth;
    this.drawSamples = Math.ceil(this.sampleOffset);
    this.drawOffset = 1 - (this.sampleOffset % 1);
    if (Math.round(this.drawSamples) !== this.drawSamples) {
      this.drawSamples = Math.ceil(this.drawSamples);

      const drawWidth = this.samples / this.drawSamples;
      this.diffOffset = drawWidth / (this.canvasWidth - drawWidth);
    }

    // console.log('[EcgRT] canvasWidth', this.canvasWidth);
    // console.log('[EcgRT] samples', this.samples); // Total samples
    // console.log('[EcgRT] sampleOffset', this.sampleOffset); // Samples per pixel
    // console.log('[EcgRT] drawSamples', this.drawSamples);
    // console.log('[EcgRT] drawOffset', this.drawOffset);
    // console.log('[EcgRT] totalSeconds', this.totalSeconds);
    this.initialized = true;

    if (this.context) {
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes.data || changes.sampleRate) && this.canvas) {
      // console.log('update data', changes);
      this.initialized = false;
      this.resetDrawer();
    }
  }

  ngDoCheck(): void {
    if (this.data.length <= 0) return;

    if (this.context && this.initialized && this.oldLength > this.data.length) {
      this.oldLength = 0;
    }

    if (this.data.length !== this.oldLength) {
      this.newData = this.data.slice(this.oldLength);
      this.oldLength = this.data.length;

      this.handleNewData();
    }
  }

  resetDrawer() {
    this.lastDrawPoint = null;
    this.drawValues = [];
    this.offset = 0;

    if (this.context) {
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  handleNewData(): void {
    if (this.initialized) {
      this.drawECG(this.newData);
    } else if (this.isViewInitialized) {
      this.initDrawer();
      this.ngDoCheck();
    }
  }

  dataToInt16Array(data) {
    if (data instanceof Int16Array) return data;

    let ab: any = 0;

    if (data instanceof ArrayBuffer) {
      ab = data;
    } else if (data instanceof Uint8Array) {
      ab = data.buffer;
    } else {
      ab = new Uint8Array(data).buffer;
    }

    return new Int16Array(ab);
  }

  dataToInt24Array(data: number[]) {
    let int24Array = [];
    let int8Array = new Int8Array(data);

    for (let i = 0; i < int8Array.length; i += 3) {
      let value = (int8Array[i] << 16) + (int8Array[i + 1] << 8) + int8Array[i + 2];
      int24Array.push(value);
    }
    // console.log(int24Array);

    return int24Array;
  }

  drawECG(data: number[]) {
    // const radius = 2;
    let drawCount = 0;

    this.context.fillStyle = this.LINE_COLOR;
    this.context.strokeStyle = this.LINE_COLOR;
    this.context.lineWidth = 1;

    const height = this.canvasHeight;

    this.context.beginPath();

    if (this.lastDrawPoint) {
      // this.context.clearRect(
      //   this.offset,
      //   this.lastDrawPoint - radius,
      //   radius * 2,
      //   radius * 2
      // );
      this.context.moveTo(this.offset - 1, this.lastDrawPoint);
    }

    /**
     * data => 1000 = 1mV
     * Max: 1500mV, Min: -1500mV
     */
    const maxRawData = this.config.maxMillivolt * 1000;

    data.forEach((ecgData, index) => {
      this.drawSum += ecgData;
      if (++this.drawSamplesCount === this.drawSamples) {
        /**
         * data => 1000 = 1mV
         * Max: 1500mV, Min: -1500mV
         */
        const drawData = Math.floor(this.drawSum / this.drawSamples + maxRawData) / (maxRawData * 2);
        // console.log(this.drawSum);
        // console.log(drawData);

        const point = height * (1 - drawData);
        this.lastDrawPoint = point;
        // this.context.lineTo(this.offset++, point);
        // this.drawValues.push(point);
        this.drawLine(point);
        drawCount++;

        // Draw remaining width pixel
        if (this.sampleOffset !== this.drawSamples) {
          this.drawSampleOffset += this.drawOffset;
          while (this.drawSampleOffset >= this.sampleOffset) {
            if (index < data.length - 1) {
              const drawOffetData = Math.floor(data[index + 1] + maxRawData) / (maxRawData * 2);
              const offsetPoint = height * (1 - drawOffetData);
              this.drawLine(offsetPoint);
              drawCount++;
            } else {
              this.drawLine(point);
              drawCount++;
            }

            this.drawSampleOffset -= this.sampleOffset;
          }
        }

        this.drawSamplesCount = 0;
        this.drawSum = 0;
      }
    });
    this.context.stroke();
    // this.context.fillStyle = '#fff';
    // this.context.strokeStyle = '#fff';
    // this.context.arc(
    //   this.offset + radius,
    //   this.lastDrawPoint,
    //   radius,
    //   0,
    //   Math.PI * 2
    // );
    // this.context.fill();

    // if (drawCount > this.clearWidth) {
    //   console.log('drawCount: ' + drawCount);
    // }
    const clearStart = this.offset;
    if (clearStart + this.clearWidth <= this.canvasWidth) {
      this.context.clearRect(clearStart, 0, this.clearWidth, this.canvasHeight);
    } else {
      const remainWidth = this.canvasWidth - clearStart;
      this.context.clearRect(clearStart, 0, remainWidth, this.canvasHeight);
      this.context.clearRect(0, 0, this.clearWidth - remainWidth, this.canvasHeight);
    }
  }

  drawLine(point: number) {
    this.context.lineTo(this.offset++, point);
    this.drawValues.push(point);

    if (this.offset >= this.canvasWidth) {
      this.lastDrawPoint = null;
      this.drawValues = [];
      this.offset = 0;
      this.context.moveTo(this.offset, point);
    }
  }
}
