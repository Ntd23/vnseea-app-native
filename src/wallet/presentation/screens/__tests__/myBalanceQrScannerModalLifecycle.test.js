const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../MyBalanceScreen.tsx'),
  'utf8',
);

describe('MyBalance iOS QR scanner modal lifecycle', () => {
  it('dismisses the send sheet before presenting the scanner', () => {
    expect(source).toContain('pendingScannerOpenRef');
    expect(source).toContain("if (Platform.OS === 'ios')");
    expect(source).toContain('pendingScannerOpenRef.current = true');
    expect(source).toContain('setIsSendModalVisible(false)');
    expect(source).toContain('const handleSendModalDismiss = useCallback');
    expect(source).toContain('setIsScannerVisible(true)');
    expect(source).toContain('onDismiss={handleSendModalDismiss}');
  });

  it('returns to the send sheet only after the scanner is dismissed', () => {
    expect(source).toContain('returnToSendAfterScannerRef');
    expect(source).toContain('pendingScannedCodeRef');
    expect(source).toContain('const handleScannerDismiss = useCallback');
    expect(source).toContain('setIsSendModalVisible(true)');
    expect(source).toContain('onDismiss={handleScannerDismiss}');
    expect(source).not.toContain('setTimeout(() => setIsScannerVisible');
    expect(source).not.toContain('setTimeout(() => setIsSendModalVisible');
  });

  it('keeps Android on the direct scanner presentation path', () => {
    const openScannerStart = source.indexOf(
      'const handleOpenScanner = useCallback',
    );
    const openScannerEnd = source.indexOf(
      '// Handle scanned QR code result.',
      openScannerStart,
    );
    const openScannerBlock = source.slice(openScannerStart, openScannerEnd);

    expect(openScannerBlock).toContain("if (Platform.OS === 'ios')");
    expect(openScannerBlock).toContain('setIsScannerVisible(true)');
  });
});
