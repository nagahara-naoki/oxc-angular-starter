import { Component } from '@angular/core';

@Component({
  selector: 'lab-animation',
  template: '<div (@fade)="done()"></div>',
})
export class AnimationExample {
  done() {}
}
