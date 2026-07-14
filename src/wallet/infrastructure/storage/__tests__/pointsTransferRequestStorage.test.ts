jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: () => undefined,
    set: () => undefined,
    remove: () => undefined,
  }),
}));

import {createPendingPointsTransferManager} from '../pointsTransferRequestStorage';

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getString: (key: string) => values.get(key),
    set: (key: string, value: string) => values.set(key, value),
    remove: (key: string) => values.delete(key),
  };
}

describe('pending points transfer request storage', () => {
  test('reuses request id for the same sender and payload across manager instances', () => {
    const storage = createMemoryStorage();
    const first = createPendingPointsTransferManager(storage, () => 'pt_first_request_0001');
    const second = createPendingPointsTransferManager(storage, () => 'pt_second_request_0002');
    const input = {senderId: 7, recipientUserId: 9, points: 10, note: 'hello'};

    expect(first.getOrCreate(input)).toBe('pt_first_request_0001');
    expect(second.getOrCreate(input)).toBe('pt_first_request_0001');
  });

  test('creates a new request id when recipient, points, or note changes', () => {
    const ids = ['pt_request_number_0001', 'pt_request_number_0002', 'pt_request_number_0003'];
    const manager = createPendingPointsTransferManager(createMemoryStorage(), () => ids.shift()!);

    expect(manager.getOrCreate({senderId: 7, recipientUserId: 9, points: 10, note: ''})).toBe('pt_request_number_0001');
    expect(manager.getOrCreate({senderId: 7, recipientUserId: 9, points: 11, note: ''})).toBe('pt_request_number_0002');
    expect(manager.getOrCreate({senderId: 7, recipientUserId: 9, points: 11, note: 'changed'})).toBe('pt_request_number_0003');
  });

  test('clears only the confirmed pending request', () => {
    const storage = createMemoryStorage();
    const manager = createPendingPointsTransferManager(storage, () => 'pt_request_number_0001');
    const input = {senderId: 7, recipientUserId: 9, points: 10, note: ''};

    const requestId = manager.getOrCreate(input);
    manager.clear('another_request_id_0000');
    expect(manager.getOrCreate(input)).toBe(requestId);
    manager.clear(requestId);
    expect(manager.peek()).toBeNull();
  });
});
