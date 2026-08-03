import {
  buildSharedPageMessage,
  buildSharedPageUrl,
  parseSharedPageMessage,
} from '../sharedPageMessage';

describe('shared page messages', () => {
  it('recognizes legacy VNSEEA page links so old messages get the rich card', () => {
    expect(
      parseSharedPageMessage(
        'VNSHOP VIETNAM\nhttps://vnseea.vn/doanh_nghiep_vn_shop',
      ),
    ).toMatchObject({
      pageName: 'doanh_nghiep_vn_shop',
      pageTitle: 'VNSHOP VIETNAM',
      explicit: false,
      host: 'vnseea.vn',
    });
  });

  it('marks new page shares and keeps the optional note separate', () => {
    const message = buildSharedPageMessage({
      url: 'https://vnseea.vn/doanh_nghiep_vn_shop',
      pageTitle: 'VNSHOP VIETNAM',
      note: 'Bạn xem trang này nhé',
    });

    expect(message).toContain('#vnseea-page');
    expect(parseSharedPageMessage(message)).toMatchObject({
      pageName: 'doanh_nghiep_vn_shop',
      pageTitle: 'VNSHOP VIETNAM',
      note: 'Bạn xem trang này nhé',
      explicit: true,
      publicUrl: 'https://vnseea.vn/doanh_nghiep_vn_shop',
    });
  });

  it('builds the same explicit internal marker for feed Page previews', () => {
    expect(buildSharedPageUrl('https://vnseea.vn/hoi_anh_em_chau_phi')).toBe(
      'https://vnseea.vn/hoi_anh_em_chau_phi#vnseea-page',
    );
  });

  it('does not classify external or known application routes as pages', () => {
    expect(
      parseSharedPageMessage('VNSEEA\nhttps://example.com/my-page'),
    ).toBeUndefined();
    expect(
      parseSharedPageMessage('Bài viết\nhttps://vnseea.vn/post/123'),
    ).toBeUndefined();
  });
});
