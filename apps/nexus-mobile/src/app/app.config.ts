
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), provideRouter(appRoutes),
    provideIonicAngular({}), // Initializes Ionic
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy } // Handles mobile view caching
  ],
};