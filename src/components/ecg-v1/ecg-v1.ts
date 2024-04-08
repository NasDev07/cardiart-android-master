import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild
} from '@angular/core';
import { EcgConfig } from '../../models/ecg';

@Component({
  selector: 'ecg-v1',
  template: `
    <canvas #myCanvas></canvas>
  `
})
export class EcgV1Component implements AfterViewInit, DoCheck, OnChanges, OnInit {
  @Input()
  data: number[];
  @Input()
  sampleRate = 400;
  @Input()
  totalSeconds = 10;
  @Input()
  pointName;
  @Input()
  offset = 0;
  @Input()
  scaleX = 2;
  @Input()
  scaleY = 2;
  @Input()
  pxPerMm = 5;
  @Input()
  config: EcgConfig;

  @Output() onRendered = new EventEmitter<boolean>();

  @ViewChild('myCanvas') myCanvas: ElementRef;

  element: HTMLElement;
  parentElement: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;

  newData: number[];
  oldLength = 0;
  parentHeight = 0;
  parentWidth = 0;
  canvasWidth = 0;
  canvasHeight = 0;
  samples = 1650;
  samplesCount = 0;
  sampleOffset = 0;
  drawSamplesCount = 0;
  drawSamples = 0;
  drawOffset = 1;
  drawSum = 0;
  drawSampleOffset = 0;
  drawPoints: number[] = [];
  gridSize = 0;
  // Total pixels of 1mV
  pxPerMillivolt = 0;
  // Total pixels of 1s
  pxPerSec = 0;
  schematicPurseWidth = 0;

  // Constants
  LINE_COLOR = '#333';

  constructor(private myElement: ElementRef) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.element = this.myElement.nativeElement;
    this.parentElement = this.element.parentElement;
    this.canvas = this.myCanvas.nativeElement;
    this.context = this.canvas.getContext('2d');

    this.parentHeight = this.parentElement.clientHeight;
    this.parentWidth = this.parentElement.clientWidth;
    // console.log(this.parentWidth);
    // console.log(this.parentHeight);
    this.initDrawer();
  }

  initDrawer(): void {
    /**
     * 25mm/s 10mm/mV Size for scale 2
     * 1 grid = 5mm, gird image = 5 grids
     **/
    this.gridSize = this.pxPerMm * 5;
    this.pxPerMillivolt = this.scaleY * this.config.baseLengthPerMilliVolt * this.pxPerMm;
    this.pxPerSec = this.scaleX * this.config.baseLengthPerSec * this.pxPerMm;
    const schematicPurseSize = this.pxPerSec / 5; // 0.2s
    this.schematicPurseWidth = Math.ceil(schematicPurseSize / this.gridSize) * this.gridSize; // round up grid
    this.canvasWidth = this.schematicPurseWidth + this.pxPerSec * this.totalSeconds;
    this.canvasHeight = this.pxPerMillivolt * (this.config.maxMillivolt * 2);

    if (this.canvas.width !== this.canvasWidth) this.canvas.width = this.canvasWidth;
    if (this.canvas.height !== this.canvasHeight) this.canvas.height = this.canvasHeight;

    this.samples = this.sampleRate * this.totalSeconds;
    this.sampleOffset = this.samples / (this.canvasWidth - this.schematicPurseWidth);
    this.drawSamples = Math.ceil(this.sampleOffset);
    this.drawOffset = 1 - (this.sampleOffset % 1);

    // this.canvas.style.backgroundImage = `url(./assets/imgs/grid.svg)`;
    // this.canvas.style.backgroundSize = `${gridImageSize}px`;

    // console.log('pxPerMm', this.pxPerMm);
    // console.log('canvasWidth', this.canvas.width);
    // console.log('canvasHeight', this.canvas.height);
    // console.log('sampleOffset', this.sampleOffset);
    // console.log('drawSamples', this.drawSamples);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes.scaleX || changes.scaleY || changes.pxPerMm || changes.totalSeconds) && this.canvas) {
      this.initDrawer();
    }

    if (changes.data || changes.scaleX || changes.scaleY || changes.pxPerMm || changes.totalSeconds) {
      this.samplesCount = 0;
      this.oldLength = this.offset = 0;
      this.resetDrawer();
      this.ngDoCheck();
    }
  }

  ngDoCheck(): void {
    if (this.data && this.data.length !== this.oldLength) {
      this.newData = this.data.slice(this.oldLength);

      if (this.newData.length > 0 && this.context) {
        this.oldLength = this.data.length;

        this.onNewData();
      }
    }
  }

  resetDrawer() {
    this.drawPoints = [];
    this.drawSamplesCount = 0;
    this.drawSum = 0;

    if (this.context) {
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  dataToInt24Array(data: number[]) {
    let int24Array = [];
    let int8Array = new Int8Array(data);

    for (let i = 0; i < int8Array.length; i += 3) {
      // Big-Endian
      let value = (int8Array[i] << 16) + (int8Array[i + 1] << 8) + int8Array[i + 2];
      int24Array.push(value);
    }

    return int24Array;
  }

  onNewData() {
    this.context.fillStyle = this.LINE_COLOR;
    this.context.strokeStyle = this.LINE_COLOR;
    this.context.lineWidth = 2;

    this.drawWaveform(this.newData);

    if (this.samplesCount < this.samples) return;
    this.onRendered.emit();
  }

  drawWaveform(data: number[]) {
    const baseLine = this.canvasHeight / 2;

    this.context.beginPath();
    // Draw schematic purse
    if (this.offset === 0) {
      const step = this.schematicPurseWidth / 3;
      this.context.moveTo(0, baseLine);
      this.context.lineTo(this.offset, baseLine);
      this.offset += step;
      this.context.lineTo(this.offset, baseLine);
      this.context.lineTo(this.offset, baseLine - this.pxPerMillivolt);
      this.offset += step;
      this.context.lineTo(this.offset, baseLine - this.pxPerMillivolt);
      this.context.lineTo(this.offset, baseLine);
      this.offset += step;
      this.context.lineTo(this.offset, baseLine);
    }

    data.forEach((value: number, index: number) => {
      this.samplesCount++;

      this.drawSum += value;
      if (++this.drawSamplesCount === this.drawSamples) {
        /**
         * data => 1000 = 1mV
         */
        const drawData = Math.floor((this.drawSum / this.drawSamples / 1000) * this.pxPerMillivolt);
        // console.log(this.drawSum);
        const point = baseLine - drawData;
        this.context.lineTo(this.offset++, point);
        this.drawPoints.push(point);

        if (this.sampleOffset !== this.drawSamples) {
          this.drawSampleOffset += this.drawOffset;
          // Draw remaining width pixel
          while (this.drawSampleOffset >= this.sampleOffset) {
            if (index < data.length - 1) {
              const drawOffetData = Math.floor((data[index + 1] / 1000) * this.pxPerMillivolt);
              const offsetPoint = baseLine - drawOffetData;
              this.context.lineTo(this.offset++, offsetPoint);
              this.drawPoints.push(offsetPoint);
            } else {
              this.context.lineTo(this.offset++, point);
              this.drawPoints.push(point);
            }

            this.drawSampleOffset -= this.sampleOffset;
          }
        }

        this.drawSamplesCount = 0;
        this.drawSum = 0;
      }
    });
    this.context.stroke();

    const fontArgs = this.context.font.split(' ');
    const newSize = '35px';
    this.context.font = newSize + ' ' + fontArgs[fontArgs.length - 1];
    for (let i = 0; i < this.pointName.length; i++) {
      const x = (this.canvasWidth / this.pointName.length) * i + this.gridSize;
      this.context.fillText(this.pointName[i], x, 40);
    }
  }
}
