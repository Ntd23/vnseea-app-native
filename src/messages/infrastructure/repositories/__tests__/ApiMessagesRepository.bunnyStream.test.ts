import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import {
  getLocalFileSize,
  uploadToBunnyStream,
} from '../../../../shared-kernel/infrastructure/upload/bunnyTusUpload';
import type { MessageAttachment } from '../../../domain/types/messages.types';
import { createMessagesRepository } from '../ApiMessagesRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: { post: jest.fn(), multipart: jest.fn() },
}));

jest.mock('../../../../shared-kernel/infrastructure/upload/bunnyTusUpload', () => ({
  getLocalFileSize: jest.fn(),
  uploadToBunnyStream: jest.fn(),
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://vnseea.vn',
    mediaBaseUrl: 'https://media.vnseea.vn',
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getSession: () => ({ userId: '1' }) },
  }),
);

const post = apiBridge.post as jest.Mock;
const multipart = apiBridge.multipart as jest.Mock;
const fileSize = getLocalFileSize as jest.Mock;
const tusUpload = uploadToBunnyStream as jest.Mock;

const video: MessageAttachment = {
  uri: 'file:///tmp/clip.mov',
  name: 'clip.mov',
  type: 'video/quicktime',
  mediaType: 'video',
  thumbnailUri: 'file:///tmp/clip-poster.jpg',
  thumbnailName: 'clip-poster.jpg',
  thumbnailType: 'image/jpeg',
  uploadReady: true,
};

const bunnyTicket = {
  api_status: 200,
  provider: 'bunny_stream',
  upload_id: '77',
  tus: {
    endpoint: 'https://video.bunnycdn.com/tusupload',
    library_id: '456',
    video_id: 'guid-1',
    expires: 1790000000,
    signature: 'sig',
  },
};

const sentVideo = {
  message_data: [
    {
      id: '501',
      from_id: '1',
      to_id: '2',
      media: 'https://vz-chat.b-cdn.net/bcdn_token=HS256-x&token_path=%2Fguid-1%2F&expires=1/guid-1/playlist.m3u8',
      media_status: 'processing',
      type_two: 'video',
      or_text: '',
      time: 100,
      seen: 0,
    },
  ],
};

function routeTicket(ticket: unknown) {
  post.mockImplementation(async (route: string) => {
    if (route === 'media-upload-ticket') {
      if (ticket instanceof Error) throw ticket;
      return ticket;
    }
    return sentVideo;
  });
}

describe('ApiMessagesRepository Bunny Stream videos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fileSize.mockResolvedValue(4096);
    tusUpload.mockResolvedValue(undefined);
    multipart.mockResolvedValue(sentVideo);
  });

  it('uploads through TUS and sends the ticket with the poster instead of the file', async () => {
    routeTicket(bunnyTicket);
    const progress = jest.fn();

    const result = await createMessagesRepository().sendMessage('2', '', video, {
      onUploadProgress: progress,
    });

    expect(post).toHaveBeenCalledWith('media-upload-ticket', {
      purpose: 'chat',
      file_type: 'video/quicktime',
      file_size: 4096,
      file_name: 'clip.mov',
    });
    expect(tusUpload).toHaveBeenCalledWith(
      video,
      {
        endpoint: 'https://video.bunnycdn.com/tusupload',
        libraryId: '456',
        videoId: 'guid-1',
        expires: 1790000000,
        signature: 'sig',
      },
      { onProgress: progress },
    );
    const payload = multipart.mock.calls[0]![1];
    expect(payload).toEqual(
      expect.objectContaining({
        bunny_upload_id: '77',
        message_type: 'video',
        video_thumb: expect.objectContaining({ uri: 'file:///tmp/clip-poster.jpg' }),
      }),
    );
    expect(payload).not.toHaveProperty('file');
    expect(multipart.mock.calls[0]).toHaveLength(2);
    expect(result.sentMessages?.[0]?.mediaStatus).toBe('processing');
  });

  it('sends a ticket without a poster as a plain form post', async () => {
    routeTicket(bunnyTicket);

    await createMessagesRepository().sendMessage('2', '', {
      ...video,
      thumbnailUri: undefined,
    });

    expect(multipart).not.toHaveBeenCalled();
    expect(post).toHaveBeenLastCalledWith(
      'send-message',
      expect.objectContaining({ bunny_upload_id: '77', type_two: 'video' }),
    );
  });

  it.each([
    { name: 'the server keeps uploads local', ticket: { api_status: 200, provider: 'local' } },
    { name: 'the server has no ticket endpoint', ticket: new Error('Error: 404 API Type Not Found') },
  ])('falls back to the multipart upload when $name', async ({ ticket }) => {
    routeTicket(ticket);

    await createMessagesRepository().sendMessage('2', '', video);

    expect(tusUpload).not.toHaveBeenCalled();
    expect(multipart.mock.calls[0]![1]).toEqual(expect.objectContaining({ file: video }));
    expect(multipart.mock.calls[0]![1]).not.toHaveProperty('bunny_upload_id');
  });

  it('never asks for a ticket for photos or unreadable files', async () => {
    routeTicket(bunnyTicket);
    await createMessagesRepository().sendMessage('2', '', {
      uri: 'file:///tmp/a.jpg',
      name: 'a.jpg',
      type: 'image/jpeg',
      mediaType: 'image',
      uploadReady: true,
    });
    fileSize.mockResolvedValueOnce(0);
    await createMessagesRepository().sendMessage('2', '', video);

    expect(post).not.toHaveBeenCalledWith('media-upload-ticket', expect.anything());
    expect(tusUpload).not.toHaveBeenCalled();
  });
});
