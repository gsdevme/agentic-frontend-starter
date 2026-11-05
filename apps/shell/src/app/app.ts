import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root shell. Owns global layout only. Feature content is routed in via
 * lazy-loaded `type:feature` libraries (see docs/architecture/boundaries.md).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
