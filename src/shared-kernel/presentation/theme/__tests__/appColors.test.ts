import { APP_COLORS } from '../appColors';

describe('VNSEEA app colors', () => {
  it('defines the approved red brand palette in one TypeScript source', () => {
    expect(APP_COLORS.brand).toEqual({
      primary: '#B91C1C',
      pressed: '#991B1B',
      onPrimary: '#FFFFFF',
      onPrimaryMuted: '#FEE2E2',
      borderOnPrimary: 'rgba(255, 255, 255, 0.25)',
      soft: 'rgba(185, 28, 28, 0.08)',
      softPressed: 'rgba(185, 28, 28, 0.14)',
      border: 'rgba(185, 28, 28, 0.18)',
      shadow: 'rgba(153, 27, 27, 0.24)',
    });
  });

  it('keeps semantic status colors separate from the brand palette', () => {
    expect(APP_COLORS.status).toEqual({
      success: '#16A34A',
      warning: '#F59E0B',
      error: '#EF4444',
      destructive: '#DC2626',
      info: '#3B82F6',
    });
  });
});
