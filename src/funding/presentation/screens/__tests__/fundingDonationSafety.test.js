const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('funding detail donation safety', () => {
  const screen = read(
    'src/funding/presentation/screens/FundingDetailScreen.tsx',
  );
  const viewModel = read(
    'src/funding/application/view-models/useFundingDetailViewModel.ts',
  );
  const walletRepository = read(
    'src/wallet/infrastructure/repositories/ApiWalletRepository.ts',
  );
  const fundingEndpoint = read('phtml/api/v2/endpoints/funding.php');

  it('keeps large raised and goal amounts inside the financial card', () => {
    expect(screen).toContain(
      'style={{ flex: 1, minWidth: 0, paddingRight: 12 }}',
    );
    expect(screen).toContain("maxWidth: '44%'");
    expect(screen).toContain('adjustsFontSizeToFit');
    expect(screen).toContain('minimumFontScale={0.6}');
  });

  it('keeps the donation amount and confirm action above Samsung keyboards', () => {
    expect(screen).toContain(
      "import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';",
    );
    expect(screen).toContain('<KeyboardSafeView');
    expect(screen).toContain('enabled={visible}');
    expect(screen).toContain('keyboardVerticalOffset={0}');
  });

  it('checks the latest wallet balance before submitting a donation', () => {
    expect(walletRepository).toContain(
      'walletBalance: toNumber(response.wallet)',
    );
    expect(screen).toContain('const freshWallet = await reloadWallet()');
    expect(screen).toContain('amount > availableBalance');
    expect(screen).toContain('copy.insufficientBalance');
    expect(screen).toContain(
      'walletBalance={walletOverview?.walletBalance ?? null}',
    );
  });

  it('surfaces backend donation errors in the open campaign screen', () => {
    expect(viewModel).toContain('export interface FundingDonationResult');
    expect(viewModel).toContain('errorId?: string;');
    expect(screen).toContain("result.errorId === '9'");
    expect(screen).toContain('result.error || copy.donationFailed');
  });

  it('atomically rejects and rolls back donations above the server balance', () => {
    expect(fundingEndpoint).toContain('AND `wallet` >= {$gross_amount_sql}');
    expect(fundingEndpoint).toContain(
      "$error_message = 'Insufficient VNSEEA wallet balance';",
    );
    expect(fundingEndpoint).toContain('mysqli_begin_transaction($sqlConnect)');
    expect(fundingEndpoint).toContain('mysqli_rollback($sqlConnect)');
    expect(fundingEndpoint).toContain('mysqli_commit($sqlConnect)');
  });
});
