/// <reference types="web-bluetooth" />

// A generic Web Bluetooth implementation for smart kitchen scales
// Uses the standard GATT Weight Scale service (0x181D)

export type WeightUnit = 'g' | 'oz' | 'lb';

export interface WeightMeasurement {
  weight: number;
  unit: WeightUnit;
}

export class BluetoothScale {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onWeightChangeCallback: ((measurement: WeightMeasurement) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available in this browser.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['weight_scale'] }],
        optionalServices: ['battery_service']
      });

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server');

      const service = await server.getPrimaryService('weight_scale');
      // 0x2A9D is the standard Weight Measurement characteristic
      this.characteristic = await service.getCharacteristic(0x2a9d);

      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));
      await this.characteristic.startNotifications();

      return true;
    } catch (error) {
      console.error('Bluetooth connection failed', error);
      throw error;
    }
  }

  disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }

  onWeightChange(callback: (measurement: WeightMeasurement) => void) {
    this.onWeightChangeCallback = callback;
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  private handleDisconnect() {
    this.device = null;
    this.characteristic = null;
    if (this.onDisconnectCallback) this.onDisconnectCallback();
  }

  private handleCharacteristicValueChanged(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    // Weight Measurement (0x2A9D) flags and parsing
    // Flags (8 bits) - Bit 0: 0 = SI (kg/g), 1 = Imperial (lb/oz)
    const flags = value.getUint8(0);
    const isImperial = (flags & 0x01) !== 0;
    
    // Weight value (16-bit uint, multiplier depends on resolution)
    // For a generic kitchen scale, we'll assume a standard 16-bit payload at byte 1
    // A robust implementation would read the resolution from the characteristic descriptors.
    let rawWeight = value.getUint16(1, true); // Little endian
    
    // Simplified scaling (kitchen scales often send grams directly, or x10)
    // We will pass the raw parsed weight out and let the app adjust if needed
    
    if (this.onWeightChangeCallback) {
      this.onWeightChangeCallback({
        weight: rawWeight,
        unit: isImperial ? 'oz' : 'g' // Simplify to oz/g for baking
      });
    }
  }
}

// Global singleton instance
export const scaleService = new BluetoothScale();
