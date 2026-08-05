const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../CreateJobScreen.tsx'),
  'utf8',
);

describe('Create Job personal owner contract', () => {
  it('does not require or silently auto-select a Page', () => {
    expect(source).not.toContain('Vui lòng chọn Trang để đăng việc làm');
    expect(source).not.toContain('Please select a Page to post this job');
    expect(source).not.toContain('setSelectedPageId(String(myPages[0].page_id))');
  });
});
