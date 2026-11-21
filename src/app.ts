import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import { Counter } from '../fixtures/counter';
import { SpeedChart } from './speed-chart';
import comparisons from './generated/comparison.json';

declare const APP_COMPILER: string;

@Component({
  selector: 'app-root',
  imports: [Counter, SpeedChart],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  readonly compiler = APP_COMPILER;
  readonly cases = [...comparisons].reverse();
  readonly selected = signal(this.cases[0]);
  readonly previewCounter = computed(() => this.selected().file === 'counter.ts');
}
