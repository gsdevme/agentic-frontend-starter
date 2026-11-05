# Angular v22 rules models get wrong

Condensed from angular.dev/ai best-practices (v22). All are lint-enforced where possible; the rest
are checked by the `spec-reviewer` agent. Pretrained models frequently emit the "do not" column.

| Do                                                                          | Do not                                                                      |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Standalone components (the default; omit `standalone: true`)                | `standalone: true`, NgModules, `declarations`                               |
| `input()`, `input.required()`, `output()`, `model()`                        | `@Input()`, `@Output()`, `EventEmitter`                                     |
| `inject(Service)` as a field initialiser                                    | constructor injection                                                       |
| `signal()`, `computed()`, `linkedSignal()`, `effect()` sparingly            | `BehaviorSubject` for component state                                       |
| `resource()` / `httpResource()` for async reads                             | manual `subscribe` in components                                            |
| `@if`, `@for (… track …)`, `@switch`, `@defer`                              | `*ngIf`, `*ngFor`, `ngSwitch`, `NgClass`, `NgStyle`                         |
| `[class.foo]="cond"`, `[style.width.px]="w"`                                | `ngClass`, `ngStyle`                                                        |
| OnPush is the v22 default — set nothing                                     | `ChangeDetectionStrategy.Default`                                           |
| Zoneless (`provideZonelessChangeDetection` is wired by the generator)       | `zone.js`, `NgZone.run`                                                     |
| `@Service()` for injectables (v22) or `@Injectable({ providedIn: 'root' })` | `@Injectable()` without `providedIn`                                        |
| Signal Forms (`form()`, `FormField`)                                        | `FormGroup`/`FormControl` for new forms unless the spec says reactive forms |
| `host: { … }` metadata                                                      | `@HostBinding`, `@HostListener`                                             |
| `viewChild()`, `contentChildren()` signal queries                           | `@ViewChild`, `@ContentChildren`                                            |
| `NgOptimizedImage` with `ngSrc`                                             | `<img src>` for static images                                               |
| Lazy routes via `loadChildren`/`loadComponent`                              | eager imports of feature components                                         |
| `isPlatformBrowser(inject(PLATFORM_ID))` guard before `window`/`document`   | bare globals (breaks SSR)                                                   |
| `TestBed` + Angular's Vitest runner; `await fixture.whenStable()`           | Karma/Jasmine, `fixture.detectChanges()` loops                              |

Per-route render mode lives in `apps/shell/src/app/app.routes.server.ts`; the feature generator adds
an entry. `RenderMode.Client` needs a justification in the spec.
