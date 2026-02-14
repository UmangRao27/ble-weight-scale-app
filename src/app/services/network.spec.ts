import { TestBed } from '@angular/core/testing';
import { Network } from '@capacitor/network';

import { NetworkService } from './network';

describe('NetworkService', () => {
  let service: NetworkService;

  beforeEach(() => {
    spyOn(Network, 'getStatus').and.resolveTo({ connected: true, connectionType: 'wifi' });
    spyOn(Network, 'addListener').and.resolveTo({ remove: async () => {} } as any);

    TestBed.configureTestingModule({});
    service = TestBed.inject(NetworkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
