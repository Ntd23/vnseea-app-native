import { apiBridge } from '../../api/apiBridge';
import { getLocalFileSize, uploadToBunnyStream } from '../bunnyTusUpload';
import {
  fetchVideoPublishStatuses,
  readVideoPublishStatus,
  uploadVideoWithTicket,
} from '../bunnyVideoUpload';

jest.mock('../../api/apiBridge', () => ({ apiBridge: { post: jest.fn() } }));
jest.mock('../bunnyTusUpload', () => ({
  getLocalFileSize: jest.fn(),
  uploadToBunnyStream: jest.fn(),
}));

const post = apiBridge.post as jest.Mock;
const fileSize = getLocalFileSize as jest.Mock;
const tusUpload = uploadToBunnyStream as jest.Mock;

const file = { uri: 'file:///tmp/reel.mp4', name: 'reel.mp4', type: 'video/mp4' };

describe('uploadVideoWithTicket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fileSize.mockResolvedValue(2048);
    tusUpload.mockResolvedValue(undefined);
  });

  it('asks for a ticket for the given purpose and uploads through TUS', async () => {
    post.mockResolvedValue({
      provider: 'bunny_stream',
      upload_id: 81,
      tus: { endpoint: '', library_id: 123, video_id: 'guid', expires: '1790000000', signature: 'sig' },
    });
    const onProgress = jest.fn();

    await expect(uploadVideoWithTicket(file, 'reel', onProgress)).resolves.toBe('81');

    expect(post).toHaveBeenCalledWith('media-upload-ticket', {
      purpose: 'reel',
      file_type: 'video/mp4',
      file_size: 2048,
      file_name: 'reel.mp4',
    });
    expect(tusUpload).toHaveBeenCalledWith(
      file,
      {
        endpoint: 'https://video.bunnycdn.com/tusupload',
        libraryId: '123',
        videoId: 'guid',
        expires: 1790000000,
        signature: 'sig',
      },
      { onProgress },
    );
  });

  it('leaves remote files and local-only servers to the regular upload', async () => {
    await expect(uploadVideoWithTicket({ ...file, uri: 'https://x/a.mp4' }, 'post')).resolves.toBeNull();
    post.mockResolvedValueOnce({ provider: 'local' });
    await expect(uploadVideoWithTicket(file, 'post')).resolves.toBeNull();
    post.mockRejectedValueOnce(new Error('Error: 404 API Type Not Found'));
    await expect(uploadVideoWithTicket(file, 'story')).resolves.toBeNull();
    expect(tusUpload).not.toHaveBeenCalled();
  });
});

describe('video publish statuses', () => {
  it('reads the server blocks and drops malformed rows', async () => {
    expect(
      readVideoPublishStatus({
        upload_id: '77',
        status: 'ready',
        publish_state: 'published',
        needs_review: true,
        post_id: '501',
        story_id: '',
      }),
    ).toEqual({
      uploadId: '77',
      status: 'ready',
      publishState: 'published',
      needsReview: true,
      postId: '501',
      storyId: undefined,
    });
    expect(readVideoPublishStatus({ status: 'ready' })).toBeNull();
    expect(readVideoPublishStatus({ upload_id: 3, status: 'weird' })?.status).toBe('processing');

    post.mockResolvedValueOnce({ uploads: [{ upload_id: '1', status: 'processing' }, 'junk'] });
    await expect(fetchVideoPublishStatuses(['1', '2'])).resolves.toEqual([
      expect.objectContaining({ uploadId: '1', status: 'processing' }),
    ]);
    expect(post).toHaveBeenLastCalledWith('media-upload-status', { upload_ids: '1,2' });
  });
});
