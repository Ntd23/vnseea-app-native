const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../MyBalanceScreen.tsx'),
  'utf8',
);

describe('MyBalance Vietnamese copy encoding', () => {
  it('does not contain mojibake sequences', () => {
    expect(source).not.toMatch(/Ã|Â|Ä|â€/);
  });

  it('keeps system alert and transaction labels readable', () => {
    expect(source).toContain("'Thông báo'");
    expect(source).toContain("'Lỗi'");
    expect(source).toContain("'Thành công'");
    expect(source).toContain("'Đã gửi VNSEEA'");
    expect(source).toContain("'Đến: '");
    expect(source).toContain(
      "'Bạn không thể tự gửi VNSEEA cho chính mình!'",
    );
  });
});
