export const meta = {
  name: 'debug-comment-profile-nav',
  description: 'Truy nguyên vì sao bấm vào comment không navigate sang profile',
  phases: [
    { title: 'Reproduce & isolate', detail: 'Tìm bug bằng nhiều lens' },
    { title: 'Verify & fix', detail: 'Verify hypothesis và đề xuất fix' },
  ],
};

const POST_DETAIL = 'E:\\vnseea-app-native\\src\\feed\\presentation\\screens\\PostDetailScreen.tsx';
const ROUTES_FILE = 'E:\\vnseea-app-native\\src\\navigation\\constants\\routes.ts';
const TYPES = 'E:\\vnseea-app-native\\src\\navigation\\types.ts';
const REPO = 'E:\\vnseea-app-native\\src\\feed\\domain\\repositories\\FeedRepository.ts';

phase('Reproduce & isolate');
const findings = await parallel([
  () => agent(
    'Đọc file ' + POST_DETAIL + ' từ đầu đến cuối. Cụ thể chú ý: ' +
    '(1) CommentRow component có TouchableOpacity wrap avatar + tên không, có onPress được truyền vào không. ' +
    '(2) handleCommentProfilePress callback đã được định nghĩa chưa, navigate sang route nào, params gì. ' +
    '(3) Render comments truyền onOpenProfile vào CommentRow chưa. ' +
    '(4) Có bị TouchableOpacity bị ScrollView/Pressable cha nuốt event không. ' +
    '(5) Có bị TouchableOpacity trùng lặp / nesting khiến onPress không fire không. ' +
    'Trả về JSON với keys: commentRowDefined (boolean), hasAvatarTouchable (boolean), hasNameTouchable (boolean), handleCommentProfilePressDefined (boolean), callbackWiredToRow (boolean), likelyIssues (array of strings). ' +
    'Đọc kỹ từng dòng, đừng đoán.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          commentRowDefined: { type: 'boolean' },
          hasAvatarTouchable: { type: 'boolean' },
          hasNameTouchable: { type: 'boolean' },
          handleCommentProfilePressDefined: { type: 'boolean' },
          callbackWiredToRow: { type: 'boolean' },
          likelyIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
  () => agent(
    'Đọc 3 file: ' + ROUTES_FILE + ', ' + TYPES + ', và tìm ProfileScreen registration trong AppNavigator hoặc routeRegistry.tsx. ' +
    'Mục đích: xác định (1) Route key cho Profile là gì (PROFILE hay gì khác). ' +
    '(2) Param shape của route Profile - userId hay username, có bắt buộc không. ' +
    '(3) ProfileScreen lấy userId từ params như thế nào. ' +
    'Trả về JSON với keys: profileRouteKey (string), expectedParamKey (string), paramRequired (boolean), profileScreenReadsParamFrom (string). ' +
    'Đọc thật kỹ.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          profileRouteKey: { type: 'string' },
          expectedParamKey: { type: 'string' },
          paramRequired: { type: 'boolean' },
          profileScreenReadsParamFrom: { type: 'string' },
        },
      },
    }
  ),
  () => agent(
    'Đọc file ' + REPO + ' để xem PostComment.publisher.id có thật sự là userId (numeric/string) hay chỉ là display id. ' +
    'Đồng thời tìm trong codebase (grep src/feed/infrastructure, src/feed/application/view-models) xem PostComment được map từ API response như thế nào. ' +
    'Cụ thể: trường publisher.id trong comment được set từ field nào của backend response (user_id, id, ...)? ' +
    'Trả về JSON với keys: publisherIdType (string), mappedFromApiField (string), possibleIssue (string). ' +
    'Đọc thật kỹ.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          publisherIdType: { type: 'string' },
          mappedFromApiField: { type: 'string' },
          possibleIssue: { type: 'string' },
        },
      },
    }
  ),
]);

phase('Verify & fix');
const verdict = await agent(
  'Dựa trên 3 kết quả trên, đưa ra verdict cuối cùng. ' +
  'Nguyên nhân gốc (root cause) khiến bấm comment trong PostDetailScreen KHÔNG navigate sang profile là gì? ' +
  'Đề xuất fix cụ thể: file cần sửa, đoạn code cần thay đổi, lý do tại sao fix này giải quyết vấn đề. ' +
  'Nếu có nhiều nguyên nhân, liệt kê theo thứ tự khả năng. ' +
  'Findings: ' + JSON.stringify(findings),
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
