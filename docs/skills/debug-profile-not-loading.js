export const meta = {
  name: 'debug-profile-not-loading',
  description: 'Tìm hiểu tại sao navigate từ comment sang Profile không hiển thị đúng user',
  phases: [
    { title: 'Reproduce & isolate', detail: 'Tìm bug bằng nhiều lens' },
    { title: 'Verify & fix', detail: 'Verify hypothesis và đề xuất fix' },
  ],
};

const PROFILE = 'E:\\vnseea-app-native\\src\\profile\\presentation\\screens\\ProfileScreen.tsx';
const PROFILE_VM = 'E:\\vnseea-app-native\\src\\profile\\application\\view-models\\useProfileViewModel.ts';
const PROFILE_TYPES = 'E:\\vnseea-app-native\\src\\profile\\domain\\types\\profile.types.ts';
const NAV = 'E:\\vnseea-app-native\\src\\navigation';
const POST_DETAIL = 'E:\\vnseea-app-native\\src\\feed\\presentation\\screens\\PostDetailScreen.tsx';

phase('Reproduce & isolate');
const findings = await parallel([
  () => agent(
    'Đọc file ' + POST_DETAIL + '. Cụ thể chú ý:\n' +
    '1. handleCommentProfilePress được định nghĩa ở đâu, có được truyền vào CommentRow không?\n' +
    '2. Có guard if (!userId) return nào trong handleCommentProfilePress không?\n' +
    '3. navigation.navigate được gọi với params gì chính xác (ROUTES.PROFILE và object params)?\n' +
    '4. Có dùng useFocusEffect hoặc useEffect nào liên quan đến route.params không?\n\n' +
    'Trả về JSON với keys: callbackLocation (string), hasGuard (bool), navigationParams (object), useEffectsRelated (array of strings). Đọc kỹ từng dòng.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          callbackLocation: { type: 'string' },
          hasGuard: { type: 'boolean' },
          navigationParams: { type: 'object' },
          useEffectsRelated: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
  () => agent(
    'Đọc kỹ file ' + PROFILE + ' (file có thể rất dài ~2500 dòng, hãy đọc từng phần). Cụ thể chú ý:\n' +
    '1. Hàm chính của component — đọc 100 dòng đầu\n' +
    '2. Cách lấy userId từ route.params (targetUserId được tính thế nào)\n' +
    '3. useEffect nào gọi loadProfile? Có phụ thuộc vào route.params.userId không?\n' +
    '4. Có guard gì ngăn loadProfile không?\n' +
    '5. So sánh với cách ProfileScreen xử lý khi KHÔNG có userId (own profile) — nó dùng currentUserId từ session\n\n' +
    'Trả về JSON với keys: targetUserIdLogic (string), loadProfileTrigger (string), guardsOnLoad (array), ownProfileFallback (string), likelyIssues (array). Đọc kỹ từng dòng.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          targetUserIdLogic: { type: 'string' },
          loadProfileTrigger: { type: 'string' },
          guardsOnLoad: { type: 'array', items: { type: 'string' } },
          ownProfileFallback: { type: 'string' },
          likelyIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
  () => agent(
    'Tìm trong codebase xem có những cách nào navigate tới ROUTES.PROFILE trong src/. Grep "navigation.navigate(ROUTES.PROFILE" và "navigate(ROUTES.PROFILE" trong toàn bộ src/. Mục đích xác định:\n' +
    '1. Có bao nhiêu chỗ navigate tới Profile và chúng truyền param gì (userId hay userName)?\n' +
    '2. Có file nào đang truyền { username } thay vì { userId } không?\n' +
    '3. Comment trong FeedScreen/PostDetailScreen đang truyền param shape nào?\n\n' +
    'Trả về JSON với keys: allCallSites (array of {file, params}), commentCallSite (string), likelyIssues (array). Đọc kỹ.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          allCallSites: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file: { type: 'string' },
                params: { type: 'object' },
              },
            },
          },
          commentCallSite: { type: 'string' },
          likelyIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
  () => agent(
    'Đọc file ' + PROFILE_VM + ' để hiểu:\n' +
    '1. loadProfile(input?) — nó truyền input gì xuống repository?\n' +
    '2. Repository gọi endpoint API nào (/api/get-user-data, /api/get-user-data-username, ...)?\n' +
    '3. Endpoint trả về user object có user_id, có thành công load không?\n' +
    '4. Có validation/guard nào block việc load không?\n\n' +
    'Trả về JSON với keys: repositoryEndpoint (string), inputShape (object), guardsInRepo (array), likelyIssues (array). Đọc kỹ.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          repositoryEndpoint: { type: 'string' },
          inputShape: { type: 'object' },
          guardsInRepo: { type: 'array', items: { type: 'string' } },
          likelyIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
]);

phase('Verify & fix');
const verdict = await agent(
  'Tổng hợp 4 findings trên để xác định root cause. Đại ka báo: bấm comment trong PostDetail KHÔNG vào được profile, console.warn KHÔNG xuất hiện (tức publisherKey có giá trị và onPress chạy). Nguyên nhân gốc là gì? Đề xuất fix cụ thể: file, dòng, đoạn code cần đổi, lý do. Findings: ' + JSON.stringify(findings),
  {
    phase: 'Verify & fix',
    schema: {
      type: 'object',
      properties: {
        rootCause: { type: 'string' },
        orderedHypotheses: { type: 'array', items: { type: 'string' } },
        fix: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            change: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
  }
);

return { findings, verdict };
