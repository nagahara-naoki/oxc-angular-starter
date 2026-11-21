import { Component, signal } from '@angular/core';

@Component({
  selector: 'lab-counter',
  template: `<output aria-live="polite">{{ count() }}</output>
<button type="button" (click)="increment()">1 増やす</button>`,
})
export class Counter {
  readonly count = signal(0);

  increment() {
    this.count.update(value => value + 1);
  }
}
