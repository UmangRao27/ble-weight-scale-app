import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

import { HomePage } from './home.page';
import { BleService } from '../services/ble';
import { BluetoothService } from '../services/bluetooth';
import { NetworkService } from '../services/network';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    const bleMock = {
      isConnected$: new BehaviorSubject<boolean>(false),
      isScanning$: new BehaviorSubject<boolean>(false),
      deviceData$: new BehaviorSubject<any>({ status: 'DISCONNECTED' })
    };

    const bluetoothMock = {
      isBluetoothOn$: new BehaviorSubject<boolean>(false),
      enableBluetooth: jasmine.createSpy('enableBluetooth').and.resolveTo(true)
    };

    const networkMock = {
      isOnline$: new BehaviorSubject<boolean>(true)
    };

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: BleService, useValue: bleMock },
        { provide: BluetoothService, useValue: bluetoothMock },
        { provide: NetworkService, useValue: networkMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
