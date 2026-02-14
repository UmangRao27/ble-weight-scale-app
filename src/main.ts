import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

console.log('🚀 main.ts started');

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => console.log('✅ AppModule bootstrapped'))
  .catch(err => console.error('❌ Bootstrap error', err));

