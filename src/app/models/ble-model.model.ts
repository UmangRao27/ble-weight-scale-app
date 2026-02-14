export interface BleModel {
    name?: string;
    id?: string;
    rssi?: number;
    status: 'SCANNING' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
    data?: any;
}
