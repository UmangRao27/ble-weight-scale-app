import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

import { AppComponent } from './app.component';
import { BluetoothService } from './services/bluetooth';
import { BleService } from './services/ble';
import { NetworkService } from './services/network';

describe('AppComponent', () => {

  beforeEach(async () => {
    const bluetoothMock = {
      isBluetoothOn$: new BehaviorSubject<boolean>(false),
      initStateNotifications: jasmine.createSpy('initStateNotifications').and.resolveTo(),
      enableBluetooth: jasmine.createSpy('enableBluetooth').and.resolveTo(true)
    };

    const bleMock = {
      safeStart: jasmine.createSpy('safeStart'),
      disconnect: jasmine.createSpy('disconnect').and.resolveTo(),
      stopScan: jasmine.createSpy('stopScan'),
      isConnected$: new BehaviorSubject<boolean>(false),
      isScanning$: new BehaviorSubject<boolean>(false),
      scanCompleted$: new BehaviorSubject<boolean>(false)
    };

    const networkMock = {
      isOnline$: new BehaviorSubject<boolean>(true)
    };

    const alertMock = {
      create: jasmine.createSpy('create').and.resolveTo({
        present: jasmine.createSpy('present').and.resolveTo(),
        dismiss: jasmine.createSpy('dismiss').and.resolveTo()
      })
    };

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: BluetoothService, useValue: bluetoothMock },
        { provide: BleService, useValue: bleMock },
        { provide: NetworkService, useValue: networkMock },
        { provide: AlertController, useValue: alertMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
