import { TestBed } from '@angular/core/testing';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

import { PermissionService } from './permission';

describe('PermissionService', () => {
  let service: PermissionService;
  const androidPermissionsMock = {
    PERMISSION: {
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT'
    },
    checkPermission: jasmine.createSpy('checkPermission').and.resolveTo({ hasPermission: true }),
    requestPermissions: jasmine.createSpy('requestPermissions').and.resolveTo({})
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AndroidPermissions, useValue: androidPermissionsMock }
      ]
    });
    service = TestBed.inject(PermissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
