/* global jest */

const mockMmkvStores = new Map();

jest.mock('react-native-mmkv', () => ({
  createMMKV: ({ id = 'default' } = {}) => {
    if (!mockMmkvStores.has(id)) {
      mockMmkvStores.set(id, new Map());
    }
    const values = mockMmkvStores.get(id);

    return {
      set: (key, value) => values.set(key, value),
      getString: key => {
        const value = values.get(key);
        return typeof value === 'string' ? value : undefined;
      },
      getNumber: key => {
        const value = values.get(key);
        return typeof value === 'number' ? value : undefined;
      },
      getBoolean: key => {
        const value = values.get(key);
        return typeof value === 'boolean' ? value : undefined;
      },
      remove: key => values.delete(key),
      clearAll: () => values.clear(),
      contains: key => values.has(key),
      getAllKeys: () => Array.from(values.keys()),
    };
  },
}));
