import { Component, computed, signal } from '@angular/core';

type Measurement = 'build' | 'component';
type Samples = { angular: number[]; oxc: number[] };
interface Report {
  measuredAt: string;
  environment: { runner: string; platform: string; arch: string; cpu: string; node: string; angular: string; oxc: string; vite: string };
  build: Samples;
  component: Samples;
}

function median(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

@Component({
  selector: 'lab-speed-chart',
  templateUrl: './speed-chart.html',
  styleUrl: './speed-chart.css',
})
export class SpeedChart {
  readonly report = signal<Report | null>(null);
  readonly failed = signal(false);
  readonly metric = signal<Measurement>('build');
  readonly options = [{ id: 'build', label: '本番ビルド' }, { id: 'component', label: '単一コンポーネント' }] as const;
  readonly chart = computed(() => {
    const report = this.report();
    if (!report) return null;
    const isBuild = this.metric() === 'build';
    const samples = report[this.metric()];
    const unit = isBuild ? '秒' : 'ms';
    const divisor = isBuild ? 1000 : 1;
    const format = (ms: number) => (ms / divisor).toLocaleString('ja-JP', { maximumFractionDigits: 2 });
    const rows = (['angular', 'oxc'] as const).map(engine => ({
      engine, name: engine === 'angular' ? (isBuild ? 'Angular CLI' : 'Angular ngc') : (isBuild ? 'Oxc + Vite' : 'Oxc API'),
      median: median(samples[engine]),
    }));
    const maximum = Math.max(...rows.map(row => row.median)) / divisor;
    const step = 10 ** Math.floor(Math.log10(maximum / 4));
    const tick = Math.ceil(maximum / (4 * step)) * step;
    const delta = rows[0].median - rows[1].median;
    return {
      rows: rows.map(row => ({ ...row, width: 100 * row.median / (4 * tick * divisor), value: format(row.median) })),
      ticks: Array.from({ length: 5 }, (_, i) => (i * tick).toLocaleString('ja-JP', { maximumSignificantDigits: 3 })),
      unit, percent: Math.abs(delta / rows[0].median * 100).toFixed(1),
      change: delta >= 0 ? '短縮' : '増加',
      date: new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeZone: 'Asia/Tokyo' }).format(new Date(report.measuredAt)),
      samples: samples.angular.map((ms, i) => ({ angular: format(ms), oxc: format(samples.oxc[i]) })),
    };
  });

  async ngOnInit() {
    try {
      const response = await fetch(new URL('benchmark.json', document.baseURI), { cache: 'no-cache' });
      if (!response.ok) throw new Error('Benchmark unavailable');
      this.report.set(await response.json() as Report);
    } catch {
      this.failed.set(true);
    }
  }
}
