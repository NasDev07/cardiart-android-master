import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild
} from '@angular/core';
import { EcgConfig, EcgLead } from '../../models/ecg';

@Component({
  selector: 'ecg-v2',
  template: `
    <canvas #myCanvas></canvas>
  `
})
export class EcgV2Component implements AfterViewInit, OnChanges, OnInit {
  @Input()
  ecgLeads: EcgLead[];
  /**
   *  If type is 1, it means draw 1*12 ECG diagram
   *  If type is 2, it means draw 4*3 + 1 channel II ECG diagram
   */
  @Input()
  type = 0;
  @Input()
  sampleRate = 400;
  @Input()
  totalSeconds = 10;
  @Input()
  scaleX = 2;
  @Input()
  scaleY = 2;
  @Input()
  pxPerMm = 5;
  @Input()
  config: EcgConfig;
  /**
   * Canvas's scale
   */
  @Input()
  scale: number = 1;

  @Output() onRendered = new EventEmitter<boolean>();

  @ViewChild('myCanvas') myCanvas: ElementRef;

  element: HTMLElement;
  parentElement: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;

  parentHeight = 0;
  parentWidth = 0;
  canvasWidth = 0;
  canvasHeight = 0;
  channelHeight = 0;
  samples = 4000;
  sampleOffset = 0;
  drawSamplesCount = 0;
  drawSamples = 0;
  drawOffset = 1;
  drawSum = 0;
  drawSampleOffset = 0;
  gridSize = 0;
  // Total pixels of 1mV
  pxPerMillivolt = 0;
  // Total pixels of 1s
  pxPerSec = 0;
  schematicPurseWidth = 0;
  xAxisChannels = 0;
  isDraw = false;

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
    this.drawEcg();
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

    if (this.type === 1) {
      this.xAxisChannels = 12;
    } else if (this.type === 2) {
      this.xAxisChannels = 4;
    }
    this.channelHeight = this.config.maxMillivolt * 2 * this.pxPerMillivolt;
    this.canvasHeight = this.channelHeight * this.xAxisChannels;

    if (this.canvas.width !== this.canvasWidth * this.scale) this.canvas.width = this.canvasWidth * this.scale;
    if (this.canvas.height !== this.canvasHeight * this.scale) this.canvas.height = this.canvasHeight * this.scale;
    this.context.scale(this.scale, this.scale);

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
    if ((changes.type || changes.scaleX || changes.scaleY || changes.pxPerMm || changes.totalSeconds) && this.canvas) {
      this.initDrawer();
    }

    if (
      changes.ecgData ||
      changes.type ||
      changes.scaleX ||
      changes.scaleY ||
      changes.pxPerMm ||
      changes.totalSeconds
    ) {
      this.resetDrawer();
      this.drawEcg();
    }
  }

  resetDrawer() {
    this.drawSamplesCount = 0;
    this.drawSum = 0;

    if (this.context && this.isDraw) {
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.isDraw = false;
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

  drawEcg() {
    if (!this.ecgLeads || this.ecgLeads.length !== 12 || !this.context) return;

    if (this.type === 1) {
      this.drawEcgTypeOne();
    } else if (this.type === 2) {
      this.drawEcgTypeTwo();
    }
  }

  /**
   * Draw 1*12 waveform
   */
  drawEcgTypeOne() {
    this.context.fillStyle = this.LINE_COLOR;
    this.context.strokeStyle = this.LINE_COLOR;
    this.context.lineWidth = 2;

    this.drawWaveform(this.ecgLeads);
    this.isDraw = true;

    this.onRendered.emit();
  }

  /**
   * Draw 4*3 + 1 channel II waveform
   */
  drawEcgTypeTwo() {
    this.context.fillStyle = this.LINE_COLOR;
    this.context.strokeStyle = this.LINE_COLOR;
    this.context.lineWidth = 2;

    const subInterval = this.totalSeconds / 4;
    const rowData1 = []
      .concat(this.ecgLeads[0].data.slice(0, Math.floor(this.sampleRate * subInterval)))
      .concat(
        this.ecgLeads[3].data.slice(
          Math.floor(this.sampleRate * subInterval),
          Math.floor(this.sampleRate * (subInterval * 2))
        )
      )
      .concat(
        this.ecgLeads[6].data.slice(
          Math.floor(this.sampleRate * (subInterval * 2)),
          Math.floor(this.sampleRate * (subInterval * 3))
        )
      )
      .concat(
        this.ecgLeads[9].data.slice(
          Math.floor(this.sampleRate * (subInterval * 3)),
          Math.floor(this.sampleRate * (subInterval * 4))
        )
      );
    const rowData2 = []
      .concat(this.ecgLeads[1].data.slice(0, Math.floor(this.sampleRate * subInterval)))
      .concat(
        this.ecgLeads[4].data.slice(
          Math.floor(this.sampleRate * subInterval),
          Math.floor(this.sampleRate * (subInterval * 2))
        )
      )
      .concat(
        this.ecgLeads[7].data.slice(
          Math.floor(this.sampleRate * (subInterval * 2)),
          Math.floor(this.sampleRate * (subInterval * 3))
        )
      )
      .concat(
        this.ecgLeads[10].data.slice(
          Math.floor(this.sampleRate * (subInterval * 3)),
          Math.floor(this.sampleRate * (subInterval * 4))
        )
      );
    const rowData3 = []
      .concat(this.ecgLeads[2].data.slice(0, Math.floor(this.sampleRate * subInterval)))
      .concat(
        this.ecgLeads[5].data.slice(
          Math.floor(this.sampleRate * subInterval),
          Math.floor(this.sampleRate * (subInterval * 2))
        )
      )
      .concat(
        this.ecgLeads[8].data.slice(
          Math.floor(this.sampleRate * (subInterval * 2)),
          Math.floor(this.sampleRate * (subInterval * 3))
        )
      )
      .concat(
        this.ecgLeads[11].data.slice(
          Math.floor(this.sampleRate * (subInterval * 3)),
          Math.floor(this.sampleRate * (subInterval * 4))
        )
      );
    let newEcgData = [];
    newEcgData.push({
      pointName: ['I', 'aVR', 'V1', 'V4'],
      data: rowData1
    });
    newEcgData.push({
      pointName: ['II', 'aVL', 'V2', 'V5'],
      data: rowData2
    });
    newEcgData.push({
      pointName: ['III', 'aVF', 'V3', 'V6'],
      data: rowData3
    });
    newEcgData.push({
      pointName: ['II'],
      data: this.ecgLeads[1].data
    });

    this.drawWaveform(newEcgData);
    this.isDraw = true;

    this.onRendered.emit();
  }

  drawWaveform(ecgData: any[]) {
    this.context.beginPath();
    for (let index = 0; index < ecgData.length; index++) {
      let offset = 0;
      const baseLine = this.channelHeight / 2 + this.channelHeight * index;

      // Draw schematic purse
      const step = this.schematicPurseWidth / 3;
      this.context.moveTo(0, baseLine);
      this.context.lineTo(offset, baseLine);
      offset += step;
      this.context.lineTo(offset, baseLine);
      this.context.lineTo(offset, baseLine - this.pxPerMillivolt);
      offset += step;
      this.context.lineTo(offset, baseLine - this.pxPerMillivolt);
      this.context.lineTo(offset, baseLine);
      offset += step;
      this.context.lineTo(offset, baseLine);

      // Draw ecg data
      const int16 = ecgData[index].data;
      int16.forEach((value: number, index: number) => {
        this.drawSum += value;
        if (++this.drawSamplesCount === this.drawSamples) {
          /**
           * data => 1000 = 1mV
           */
          const drawData = Math.floor((this.drawSum / this.drawSamples / 1000) * this.pxPerMillivolt);
          // console.log(this.drawSum);
          const point = baseLine - drawData;
          this.context.lineTo(offset++, point);

          if (this.sampleOffset !== this.drawSamples) {
            this.drawSampleOffset += this.drawOffset;
            // Draw remaining width pixel
            while (this.drawSampleOffset >= this.sampleOffset) {
              if (index < int16.length - 1) {
                const drawOffetData = Math.floor((int16[index + 1] / 1000) * this.pxPerMillivolt);
                const offsetPoint = baseLine - drawOffetData;
                this.context.lineTo(offset++, offsetPoint);
              } else {
                this.context.lineTo(offset++, point);
              }

              this.drawSampleOffset -= this.sampleOffset;
            }
          }

          this.drawSamplesCount = 0;
          this.drawSum = 0;
        }
      });

      // Fill ecg's point name
      const fontArgs = this.context.font.split(' ');
      const newSize = '35px';
      this.context.font = newSize + ' ' + fontArgs[fontArgs.length - 1];
      const pointName = ecgData[index].pointName;
      for (let i = 0; i < pointName.length; i++) {
        const x = (this.canvasWidth / pointName.length) * i + this.gridSize;
        this.context.fillText(pointName[i], x, this.channelHeight * index + 40);
      }
    }
    this.context.stroke();
  }
}
