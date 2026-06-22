export const meta = {
  name: 'debug-deep-comment-nav',
  description: 'Đào sâu hơn: tại sao bấm comment KHÔNG navigate vào Profile của người comment',
  phases: [
    { title: 'Reproduce & isolate', detail: 'Tìm root cause thật sự' },
    { title: 'Verify & fix', detail: 'Verify và đề xuất fix chính xác' },
  ],
};

const POST_DETAIL = 'E:\\vnseea-app-native\\src\\feed\\presentation\\screens\\PostDetailScreen.tsx';
const PROFILE = 'E:\\vnseea-app-native\\src\\profile\\presentation\\screens\\ProfileScreen.tsx';
const NAV = 'E:\\vnseea-app-native\\src\\navigation';
const APP_NAV = 'E:\\vnseea-app-native\\src\\navigation\\AppNavigator.tsx';
const ROUTE_REG = 'E:\\vnseea-app-native\\src\\navigation\\routeRegistry.tsx';
const TYPES = 'E:\\vnseea-app-native\\src\\navigation\\types.ts';

phase('Reproduce & isolate');
const findings = await parallel([
  () => agent(
    'Đọc kỹ 2 file: ' + APP_NAV + ' và ' + ROUTE_REG + '. Mục đích xác định:\n' +
    '1. Stack nào chứa PROFILE và PostDetail cùng nhau? Có phải cùng NativeStack không?\n' +
    '2. PROFILE có được khai báo như một Stack.Screen trong cùng stack với PostDetail không?\n' +
    '3. Có wrapping nào (Modal stack, Drawer, ...) khiến navigation.navigate không hoạt động bình thường không?\n' +
    '4. Có tab navigator nào chứa cả PostDetail và Profile không, và behavior navigate giữa các tab thế nào?\n\n' +
    'Trả về JSON: stackStructure (string), profileRouteKey (string), profileInSameStackAsPostDetail (bool), wrappingAffectingNav (string), likelyIssues (array). Đọc kỹ từng dòng.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          stackStructure: { type: 'string' },
          profileRouteKey: { type: 'string' },
          profileInSameStackAsPostDetail: { type: 'boolean' },
          wrappingAffectingNav: { type: 'string' },
          likelyIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
  () => agent(
    'Đọc kỹ file ' + POST_DETAIL + '. Tìm chính xác:\n' +
    '1. Function CommentRow (khoảng line 660-740) — TouchableOpacity wrap avatar và tên\n' +
    '2. handleOpenProfile trong CommentRow — onPress có được gọi khi tap không\n' +
    '3. onOpenProfile được truyền vào từ đâu (parent component)\n' +
    '4. handleCommentProfilePress được định nghĩa ở đâu trong screen chính, navigation.navigate gọi thế nào\n' +
    '5. Có Pressable, TouchableWithoutFeedback, hoặc onStartShouldSetResponder nào ở component cha (ScrollView, comment list container) đang nuốt tap event không\n\n' +
    'Trả về JSON: touchablePath (string), handleChain (string), navigationCall (string), possibleBlockingParent (string), likelyIssues (array). Đọc thật kỹ.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          touchablePath: { type: 'string' },
          handleChain: { type: 'string' },
          navigationCall: { type: 'string' },
          possibleBlockingParent: { type: 'string' },
          likelyIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
  () => agent(
    'Đọc kỹ file ' + PROFILE + '. Tìm chính xác:\n' +
    '1. useEffect mới em vừa thêm (reset state khi route.params?.userId đổi) — đã được thêm vào chưa, có lỗi gì không\n' +
    '2. route.params?.userId được đọc như thế nào — có memoization không\n' +
    '3. Có guard sớm nào trong component return sớm khi !profile mà không có loading state không (ví dụ return null khi !profile?.id, làm UI không hiển thị gì)\n' +
    '4. Có logic nào redirect về home/back khi navigation params invalid không\n' +
    '5. Profile data được hiển thị qua state nào (profileData, profile, user) — đã đúng user mới chưa\n\n' +
    'Trả về JSON: myFixApplied (bool), paramsReadPattern (string), earlyReturnLogic (string), redirectLogic (string), profileDataDisplayState (string), likelyIssues (array). Đọc kỹ.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          myFixApplied: { type: 'boolean' },
          paramsReadPattern: { type: 'string' },
          earlyReturnLogic: { type: 'string' },
          redirectLogic: { type: 'string' },
          profileDataDisplayState: { type: 'string' },
          likelyIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
  () => agent(
    'Đọc file ' + TYPES + '. Tìm chính xác:\n' +
    '1. PROFILE route được khai báo thế nào trong RootStackParamList — userId có phải string không, có optional không\n' +
    '2. Có route nào trùng tên "Profile" không (ví dụ tab Profile vs stack Profile)\n' +
    '3. Có wrapper typing nào ảnh hưởng đến type của route.params không\n\n' +
    'Trả về JSON: profileTypeDecl (string), duplicateRouteNames (array), typingIssues (array). Đọc kỹ.',
    {
      phase: 'Reproduce & isolate',
      schema: {
        type: 'object',
        properties: {
          profileTypeDecl: { type: 'string' },
          duplicateRouteNames: { type: 'array', items: { type: 'string' } },
          typingIssues: { type: 'array', items: { type: 'string' } },
        },
      },
    }
  ),
]);

phase('Verify & fix');
const verdict = await agent(
  'Tổng hợp 4 findings trên. Đại ka báo: bấm comment trong PostDetail vẫn KHÔNG vào được profile của người comment. Có thể có nhiều bug chồng chập. Tìm root cause THẬT SỰ và đề xuất fix cụ thể (file, dòng, đoạn code, lý do). Findings: ' + JSON.stringify(findings),
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
        alternativeFix: {
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
