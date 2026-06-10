& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat *:S ReactNativeJS:V
--------- beginning of main
06-09 15:23:49.574 17969  4590 W ReactNativeJS: setLayoutAnimationEnabledExperimental is currently a no-op in the New Architecture.
06-09 15:23:50.267 17969  4590 I ReactNativeJS: Running "VnseeaRn" with {"rootTag":1,"initialProps":{},"fabric":true}
06-09 15:23:51.462 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:52.761 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'fetch=count_new_messages&android_n_device_id=2945bfdc-7f02-4092-afeb-4536c4574e37&android_m_device_id=2945bfdc-7f02-4092-afeb-4536c4574e37&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:52.784 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:23:52.785 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:52.787 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-general-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:52.788 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:52.788 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:52.788 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:52.982 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Loading user from sessionStorage
06-09 15:23:52.999 17969  4590 I ReactNativeJS: '[useCurrentUserViewModel] Cached profile:', { name: 'Quản trị viên',
06-09 15:23:52.999 17969  4590 I ReactNativeJS:   username: 'admin',
06-09 15:23:52.999 17969  4590 I ReactNativeJS:   avatarUrl: 'https://v2.vnseea.vn/upload/photos/2026/06/VDNz9ZUDptE5kxBU6Q5k_03_32b36bb465f80abdbf2d6f0e06a17d5f_avatar.jpg?cache=0' }
06-09 15:23:53.000 17969  4590 I ReactNativeJS: '[useCurrentUserViewModel] Session:', { accessToken: '0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3',
06-09 15:23:53.000 17969  4590 I ReactNativeJS:   userId: '1',
06-09 15:23:53.000 17969  4590 I ReactNativeJS:   userPlatform: 'phone' }
06-09 15:23:53.002 17969  4590 I ReactNativeJS: '[useCurrentUserViewModel] Loaded user:', { userId: '1',
06-09 15:23:53.002 17969  4590 I ReactNativeJS:   name: 'Quản trị viên',
06-09 15:23:53.002 17969  4590 I ReactNativeJS:   username: 'admin',
06-09 15:23:53.002 17969  4590 I ReactNativeJS:   avatar: 'https://v2.vnseea.vn/upload/photos/2026/06/VDNz9ZUDptE5kxBU6Q5k_03_32b36bb465f80abdbf2d6f0e06a17d5f_avatar.jpg?cache=0' }
06-09 15:23:53.168 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.168 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:53.168 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.168 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.169 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:53.169 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.170 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'user_id=1&fetch=user_data&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.170 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:23:53.170 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.170 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'fetch=notifications%2Ccount_new_messages%2Cgroup_chat_requests&include_all_notifications=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.171 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:53.171 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.171 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.172 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:53.172 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.172 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-stories?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.172 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.173 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.173 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.173 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-user-stories?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.174 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.174 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.174 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.174 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-user-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.175 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.175 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.175 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.176 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-general-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.176 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.176 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.176 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.177 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.177 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.177 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.177 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.227 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:53.483 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_news_feed&limit=23&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.483 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:53.483 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.487 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1&limit=5&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.487 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:23:53.487 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.488 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.488 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.488 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.488 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.489 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.489 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.489 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.490 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.492 17969  4590 I ReactNativeJS: '[StoriesRepo] getStories - received', 0, 'rows'
06-09 15:23:53.493 17969  4590 I ReactNativeJS: '[StoriesRepo] getStories - final grouped count:', 0, 'stories'
06-09 15:23:53.513 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:53.664 17969  4590 I ReactNativeJS: '[StoriesRepo] getUserStories - received', 5, 'users'
06-09 15:23:53.664 17969  4590 I ReactNativeJS: [StoriesRepo] getUserStories - user 1680 has 1 story rows
06-09 15:23:53.674 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '85', 'posted:', 1780304665, 'expire:', 1780391065, 'current time:', 1780993433
06-09 15:23:53.681 17969  4590 I ReactNativeJS: [StoriesRepo] getUserStories - user 1679 has 1 story rows
06-09 15:23:53.681 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '84', 'posted:', 1780303908, 'expire:', 1780390308, 'current time:', 1780993433
06-09 15:23:53.682 17969  4590 I ReactNativeJS: [StoriesRepo] getUserStories - user 1629 has 2 story rows
06-09 15:23:53.682 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '66', 'posted:', 1774340170, 'expire:', 1774426569, 'current time:', 1780993433
06-09 15:23:53.683 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '65', 'posted:', 1774339740, 'expire:', 1774426139, 'current time:', 1780993433
06-09 15:23:53.683 17969  4590 I ReactNativeJS: [StoriesRepo] getUserStories - user 5 has 2 story rows
06-09 15:23:53.683 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '79', 'posted:', 1778148708, 'expire:', 1778235108, 'current time:', 1780993433
06-09 15:23:53.684 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '74', 'posted:', 1778084970, 'expire:', 1778171370, 'current time:', 1780993433
06-09 15:23:53.684 17969  4590 I ReactNativeJS: [StoriesRepo] getUserStories - user 1 has 17 story rows
06-09 15:23:53.685 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '88', 'posted:', 1780991978, 'expire:', 1781078378, 'current time:', 1780993433
06-09 15:23:53.685 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '87', 'posted:', 1780655844, 'expire:', 1780742244, 'current time:', 1780993433
06-09 15:23:53.686 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '86', 'posted:', 1780390703, 'expire:', 1780477103, 'current time:', 1780993433
06-09 15:23:53.686 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '83', 'posted:', 1780303883, 'expire:', 1780390283, 'current time:', 1780993433
06-09 15:23:53.686 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '82', 'posted:', 1780303816, 'expire:', 1780390216, 'current time:', 1780993433
06-09 15:23:53.687 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '81', 'posted:', 1780282718, 'expire:', 1780369118, 'current time:', 1780993433
06-09 15:23:53.687 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '80', 'posted:', 1778148776, 'expire:', 1778235176, 'current time:', 1780993433
06-09 15:23:53.688 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '78', 'posted:', 1778148518, 'expire:', 1778234918, 'current time:', 1780993433
06-09 15:23:53.688 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '77', 'posted:', 1778148406, 'expire:', 1778234806, 'current time:', 1780993433
06-09 15:23:53.688 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '76', 'posted:', 1778148330, 'expire:', 1778234730, 'current time:', 1780993433
06-09 15:23:53.689 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '75', 'posted:', 1778148240, 'expire:', 1778234640, 'current time:', 1780993433
06-09 15:23:53.689 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '73', 'posted:', 1777961646, 'expire:', 1778048046, 'current time:', 1780993433
06-09 15:23:53.690 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '72', 'posted:', 1777958724, 'expire:', 1778045124, 'current time:', 1780993433
06-09 15:23:53.690 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '71', 'posted:', 1777953932, 'expire:', 1778040332, 'current time:', 1780993433
06-09 15:23:53.691 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '70', 'posted:', 1777891029, 'expire:', 1777977429, 'current time:', 1780993433
06-09 15:23:53.691 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '69', 'posted:', 1777890325, 'expire:', 1777976725, 'current time:', 1780993433
06-09 15:23:53.692 17969  4590 I ReactNativeJS: '[ApiStoriesRepository] mapStory - ID:', '68', 'posted:', 1775830722, 'expire:', 1775917121, 'current time:', 1780993433
06-09 15:23:53.692 17969  4590 I ReactNativeJS: '[StoriesRepo] getUserStories - final grouped count:', 23, 'stories'
06-09 15:23:53.840 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.840 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:53.840 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:53.841 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:53.841 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:53.841 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:53.842 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:53.848 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:54.076 17969  4590 W ReactNativeJS: InteractionManager has been deprecated and will be removed in a future release. Please refactor long tasks into smaller ones, and  use 'requestIdleCallback' instead.
06-09 15:23:54.090 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:55.250 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'limit=10&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.250 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:55.251 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:55.252 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-products?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.252 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:55.252 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:55.253 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:55.256 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:55.552 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'limit=10&offset=13&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.552 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:55.553 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:55.553 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-products?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.554 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:55.554 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:55.555 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:55.558 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:55.755 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_news_feed&limit=30&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.755 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:55.756 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:55.757 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1&limit=30&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.758 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:23:55.758 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:55.759 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.759 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:55.759 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:55.760 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:55.760 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.761 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:55.761 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:55.761 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:55.762 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get_live_friends?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:55.762 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'GET'
06-09 15:23:55.763 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:55.763 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:55.768 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:56.169 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:56.171 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:56.172 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:56.175 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:56.176 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:56.176 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:56.177 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:56.835 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:56.836 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:56.836 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:56.837 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:56.837 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:56.837 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:56.837 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:56.972 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:23:59.178 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:59.179 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:59.179 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:59.180 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:59.181 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:59.181 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:59.182 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:23:59.392 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:59.392 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:23:59.393 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:23:59.394 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:23:59.394 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:23:59.395 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:23:59.395 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:02.185 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:02.186 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:02.187 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:02.188 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:02.189 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:02.189 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:02.189 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:02.352 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:02.353 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:02.353 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:02.354 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:02.355 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:02.355 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:02.357 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:05.193 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:05.193 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:05.194 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:05.195 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:05.195 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:05.196 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:05.196 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:05.299 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:05.300 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:05.300 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:05.301 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:05.302 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:05.302 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:05.302 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:08.206 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:08.208 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:08.209 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:08.214 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:08.215 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:08.216 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:08.217 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:08.398 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:08.398 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:08.400 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:08.401 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:08.401 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:08.402 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:08.402 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:11.219 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:11.222 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:11.224 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:11.228 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:11.229 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:11.231 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:11.232 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:11.371 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:11.373 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:11.375 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:11.376 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:11.376 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:11.377 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:11.378 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:14.225 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:14.227 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:14.228 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:14.231 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:14.232 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:14.234 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:14.235 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:14.341 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:14.341 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:14.342 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:14.343 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:14.343 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:14.344 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:14.344 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:17.225 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:17.226 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:17.227 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:17.228 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:17.229 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:17.229 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:17.230 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:17.364 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:17.365 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:17.366 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:17.368 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:17.369 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:17.369 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:17.370 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:20.231 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:20.232 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:20.233 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:20.235 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:20.236 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:20.237 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:20.237 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:20.383 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:20.384 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:20.386 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:20.389 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:20.389 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:20.390 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:20.390 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:23.082 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'fetch=notifications%2Ccount_new_messages%2Cgroup_chat_requests&include_all_notifications=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:23.083 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:23.084 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:23.084 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-general-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:23.085 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:23.085 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:23.086 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:23.244 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:23.244 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:23.245 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:23.247 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:23.247 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:23.248 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:23.249 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:23.354 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:23.355 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:23.356 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:23.357 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:23.357 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:23.358 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:23.358 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:24.817 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_news_feed&limit=45&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:24.817 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:24.818 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:24.819 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1&limit=4&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:24.819 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:24.819 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:24.820 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:24.820 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:24.821 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:24.821 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:24.821 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:24.822 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:24.822 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:24.823 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:24.828 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:25.026 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:25.078 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'limit=10&offset=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.079 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:25.079 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:25.080 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'limit=10&offset=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.080 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:25.081 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:25.081 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-products?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.082 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:25.082 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:25.082 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:25.083 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-products?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.083 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:25.084 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:25.084 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:25.086 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'limit=10&offset=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.087 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:25.087 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:25.088 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-products?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.088 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:25.088 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:25.089 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:25.789 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:25.847 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:25.886 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'limit=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.886 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:25.887 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:25.887 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'user_id=1&type=following%2Cfollowers&limit=20&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.888 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:25.888 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:25.888 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'limit=10&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.889 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:25.889 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:25.890 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-user-suggestions?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.890 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:25.890 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:25.891 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:25.891 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-friends?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.892 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:25.892 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:25.892 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:25.893 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-nearby-users?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:25.893 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:25.893 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:25.894 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.241 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1673&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.241 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.242 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.242 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1639&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.243 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.243 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.244 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1630&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.244 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.244 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.245 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1648&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.245 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.246 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.246 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1661&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.246 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.247 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.247 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1681&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.248 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.248 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.249 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1674&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.249 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.249 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.250 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1651&limit=3&after_post_id=3893&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.250 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.251 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.252 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.252 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.252 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.253 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.253 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.254 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.254 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.254 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.255 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.255 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.256 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.256 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.257 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.257 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.257 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.258 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.258 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.259 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.259 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.259 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.260 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.260 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.261 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.261 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.262 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.262 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.263 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.263 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.264 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.264 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.264 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.265 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.271 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.272 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:26.272 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.273 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.274 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.274 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.274 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.618 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:26.680 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_news_feed&limit=45&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.681 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.681 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.682 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1&limit=4&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.682 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:26.682 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.683 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.683 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.684 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.684 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.685 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.685 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.685 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.686 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:26.692 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.692 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:26.692 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:26.693 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:26.693 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:26.694 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:26.694 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.024 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1673&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.024 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.025 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.026 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1639&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.026 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.027 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.028 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1630&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.028 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.028 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.029 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1648&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.029 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.030 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.030 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1661&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.031 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.031 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.032 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1681&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.032 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.032 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.033 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1674&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.033 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.034 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.034 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1651&limit=3&after_post_id=3789&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.035 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:27.036 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:27.038 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.038 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.039 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.039 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.040 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.041 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.042 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.042 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.043 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.044 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.045 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.045 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.046 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.047 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.047 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.048 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.048 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.049 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.049 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.050 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.051 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.051 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.052 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.052 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.053 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.054 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.054 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.055 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:27.056 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:27.056 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:27.056 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:27.057 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:29.251 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:29.252 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:29.252 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:29.253 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:29.254 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:29.254 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:29.255 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:29.381 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:29.382 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:29.382 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:29.383 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:29.383 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:29.383 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:29.384 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:32.256 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:32.257 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:32.257 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:32.258 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:32.259 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:32.259 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:32.260 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:32.460 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:32.460 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:32.461 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:32.461 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:32.462 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:32.463 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:32.463 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:35.265 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:35.265 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:35.266 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:35.267 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:35.267 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:35.268 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:35.268 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:35.403 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:35.404 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:35.404 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:35.405 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:35.405 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:35.405 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:35.406 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:37.697 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:37.751 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_news_feed&limit=45&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:37.752 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:37.752 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:37.753 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1&limit=4&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:37.753 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:37.753 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:37.754 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:37.754 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:37.755 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:37.755 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:37.756 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:37.756 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:37.756 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:37.757 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:37.995 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1673&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:37.996 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:37.996 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:37.997 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1639&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:37.998 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:37.998 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:37.999 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1630&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:37.999 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:38.000 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.000 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1648&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.001 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:38.001 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.002 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1661&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.002 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:38.003 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.004 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1681&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.004 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:38.004 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.005 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1674&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.006 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:38.006 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.007 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1651&limit=3&after_post_id=31&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.007 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:38.007 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.008 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.009 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.009 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.010 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.010 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.011 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.012 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.012 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.013 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.013 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.013 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.014 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.014 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.015 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.015 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.015 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.016 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.016 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.016 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.017 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.017 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.018 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.018 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.018 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.019 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.019 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.020 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.020 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.020 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.021 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.021 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.021 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.377 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.377 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:38.378 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.378 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.379 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.379 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.379 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:38.466 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.467 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:38.467 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:38.468 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:38.470 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:38.470 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:38.471 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:41.285 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:41.285 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:41.286 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:41.286 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:41.287 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:41.287 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:41.287 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:41.465 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:41.466 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:41.466 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:41.467 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:41.467 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:41.468 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:41.468 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:44.298 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:44.303 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:44.305 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:44.307 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:44.308 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:44.308 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:44.309 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:44.442 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:44.443 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:44.443 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:44.444 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:44.444 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:44.444 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:44.445 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:47.297 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:47.298 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:47.298 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:47.299 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:47.300 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:47.300 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:47.301 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:47.513 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:47.514 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:47.514 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:47.515 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:47.516 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:47.516 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:47.516 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:50.305 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:50.305 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:50.306 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:50.307 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:50.307 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:50.308 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:50.308 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:50.486 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:50.486 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:50.487 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:50.488 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:50.488 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:50.489 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:50.489 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:51.960 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:52.012 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_news_feed&limit=45&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.012 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.013 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.013 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1&limit=4&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.013 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.014 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.014 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.015 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.015 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.015 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.016 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.016 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.017 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.017 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.188 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1673&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.188 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.189 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.189 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1639&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.190 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.190 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.191 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1630&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.191 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.191 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.192 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1648&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.192 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.192 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.193 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1661&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.193 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.194 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.194 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1681&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.194 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.195 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.195 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1674&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.196 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.196 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.196 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=get_user_posts&id=1651&limit=3&after_post_id=12&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.197 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', true
06-09 15:24:52.197 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:52.198 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.198 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.198 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.199 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.199 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.199 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.200 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.200 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.201 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.201 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.201 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.202 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.202 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.202 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.203 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.203 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.204 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.204 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.204 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.205 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.205 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.205 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.206 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.206 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.207 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.207 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.207 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.208 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.208 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/posts?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:52.208 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:52.209 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:52.209 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:52.931 17969  4590 I ReactNativeJS: [useCurrentUserViewModel] Hook called
06-09 15:24:53.090 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'fetch=notifications%2Ccount_new_messages%2Cgroup_chat_requests&include_all_notifications=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:53.090 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:53.091 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:53.091 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-general-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:53.092 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:53.092 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:53.093 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:53.311 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:53.312 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:53.312 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:53.313 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:53.314 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:53.314 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:53.315 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:53.419 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:53.420 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:53.420 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:53.421 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:53.421 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:53.422 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:53.422 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:56.311 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:56.312 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:56.313 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:56.313 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:56.314 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:56.314 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:56.315 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:56.717 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:56.717 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:56.718 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:56.718 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:56.718 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:56.719 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:56.719 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:59.322 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:59.322 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:59.322 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:59.323 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:59.324 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:59.324 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:59.324 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:24:59.463 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:59.464 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:24:59.465 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:24:59.466 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:24:59.466 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:24:59.466 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:24:59.467 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:02.325 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:02.326 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:02.327 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:02.328 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:02.329 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:02.331 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:02.332 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:02.467 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:02.467 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:02.468 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:02.468 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:02.469 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:02.469 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:02.469 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:05.332 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:05.333 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:05.333 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:05.334 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:05.335 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:05.335 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:05.336 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:05.534 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:05.535 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:05.535 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:05.536 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:05.538 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:05.539 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:05.539 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:08.339 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:08.339 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:08.340 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:08.341 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:08.341 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:08.342 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:08.342 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:08.498 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:08.498 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:08.498 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:08.499 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:08.500 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:08.500 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:08.500 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:11.362 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:11.362 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:11.363 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:11.364 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:11.364 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:11.364 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:11.364 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:11.573 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:11.574 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:11.574 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:11.575 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:11.575 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:11.575 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:11.576 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:14.439 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:14.440 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:14.440 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:14.441 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:14.442 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:14.442 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:14.443 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:14.647 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:14.648 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:14.648 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:14.649 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:14.649 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:14.649 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:14.649 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:17.362 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:17.363 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:17.364 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:17.365 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:17.365 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:17.366 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:17.366 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:17.463 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:17.463 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:17.464 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:17.465 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:17.465 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:17.466 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:17.467 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:20.370 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:20.370 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:20.371 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:20.372 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:20.373 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:20.373 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:20.374 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:20.567 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:20.568 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:20.568 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:20.569 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:20.570 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:20.570 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:20.571 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:23.096 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'fetch=notifications%2Ccount_new_messages%2Cgroup_chat_requests&include_all_notifications=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:23.097 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:23.097 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:23.098 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-general-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:23.099 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:23.100 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:23.100 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:23.375 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:23.376 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:23.376 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:23.377 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:23.378 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:23.379 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:23.379 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:23.473 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:23.473 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:23.474 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:23.475 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:23.476 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:23.476 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:23.477 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:26.383 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:26.384 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:26.384 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:26.385 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:26.386 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:26.386 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:26.387 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:26.528 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:26.529 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:26.529 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:26.530 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:26.530 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:26.530 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:26.531 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:29.384 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:29.385 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:29.386 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:29.387 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:29.387 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:29.388 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:29.388 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:29.596 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:29.598 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:29.598 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:29.600 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:29.600 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:29.601 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:29.601 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:32.393 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:32.395 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:32.396 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:32.399 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:32.400 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:32.401 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:32.401 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:32.515 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:32.516 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:32.516 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:32.517 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:32.518 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:32.518 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:32.519 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:35.397 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:35.399 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:35.400 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:35.403 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:35.404 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:35.405 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:35.406 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:35.532 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:35.533 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:35.533 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:35.534 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:35.537 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:35.538 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:35.539 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:38.412 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:38.415 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:38.418 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:38.422 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:38.423 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:38.426 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:38.427 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:38.613 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:38.614 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:38.615 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:38.619 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:38.620 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:38.620 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:38.621 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:41.419 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:41.421 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:41.423 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:41.427 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:41.429 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:41.430 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:41.431 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:41.582 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:41.583 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:41.584 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:41.585 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:41.585 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:41.586 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:41.587 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:44.428 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:44.430 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:44.432 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:44.436 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:44.437 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:44.438 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:44.439 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:44.587 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:44.588 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:44.588 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:44.589 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:44.590 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:44.590 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:44.591 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:47.427 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:47.430 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:47.432 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:47.436 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:47.437 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:47.438 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:47.440 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:47.630 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:47.631 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:47.632 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:47.633 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:47.633 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:47.634 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:47.634 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:50.428 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:50.430 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:50.431 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:50.435 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:50.436 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:50.437 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:50.438 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:50.562 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:50.563 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:50.564 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:50.565 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:50.565 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:50.566 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:50.566 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:53.102 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'fetch=notifications%2Ccount_new_messages%2Cgroup_chat_requests&include_all_notifications=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:53.103 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:53.104 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:53.106 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-general-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:53.107 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:53.108 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:53.108 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:53.425 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:53.426 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:53.427 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:53.429 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:53.429 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:53.430 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:53.431 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:53.540 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:53.541 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:53.542 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:53.543 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:53.544 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:53.544 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:53.545 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:56.441 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:56.443 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:56.444 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:56.448 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:56.450 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:56.452 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:56.454 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:56.637 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:56.638 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:56.638 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:56.640 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:56.640 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:56.641 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:56.641 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:59.447 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:59.448 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:59.449 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:59.452 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:59.453 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:59.454 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:59.455 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:25:59.584 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:59.585 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:25:59.586 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:25:59.588 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:25:59.589 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:25:59.590 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:25:59.590 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:02.444 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:02.445 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:02.446 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:02.449 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:02.451 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:02.452 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:02.453 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:02.585 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:02.586 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:02.586 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:02.587 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:02.588 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:02.588 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:02.589 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:05.460 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:05.462 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:05.463 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:05.466 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:05.468 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:05.469 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:05.470 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:05.597 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:05.598 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:05.598 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:05.599 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:05.600 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:05.600 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:05.601 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:08.466 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:08.467 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:08.469 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:08.472 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:08.473 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:08.473 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:08.474 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:08.579 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:08.580 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:08.580 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:08.581 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:08.584 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:08.585 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:08.586 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:11.471 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:11.473 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:11.474 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:11.476 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:11.477 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:11.478 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:11.479 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:11.681 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:11.682 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:11.683 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:11.684 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:11.685 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:11.685 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:11.686 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:14.482 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:14.485 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:14.486 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:14.494 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:14.496 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:14.497 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:14.498 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:14.622 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:14.623 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:14.624 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:14.625 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:14.626 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:14.626 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:14.627 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:17.485 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:17.487 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:17.489 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:17.492 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:17.492 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:17.493 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:17.493 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:17.567 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:17.567 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:17.568 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:17.569 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:17.569 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:17.570 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:17.572 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:20.486 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:20.487 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:20.488 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:20.489 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:20.490 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:20.490 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:20.491 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:20.580 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:20.581 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:20.581 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:20.582 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:20.582 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:20.583 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:20.583 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:23.113 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'fetch=notifications%2Ccount_new_messages%2Cgroup_chat_requests&include_all_notifications=1&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:23.115 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:23.116 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:23.120 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/get-general-data?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:23.121 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:23.122 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:23.124 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:23.501 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:23.502 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:23.503 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:23.504 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:23.505 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:23.506 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:23.506 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:23.602 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:23.603 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:23.604 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:23.605 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:23.605 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:23.606 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:23.606 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:26.509 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:26.512 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:26.513 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:26.516 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:26.517 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:26.518 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:26.520 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:26.675 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:26.676 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:26.677 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:26.678 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:26.678 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:26.679 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:26.680 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:29.516 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:29.518 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:29.519 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:29.522 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:29.523 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:29.524 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:29.525 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:29.672 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:29.673 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:29.673 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:29.674 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:29.675 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:29.676 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:29.676 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:32.529 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:32.531 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:32.532 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:32.535 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:32.536 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:32.537 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:32.540 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:32.677 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:32.677 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:32.678 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:32.679 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:32.679 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:32.680 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:32.680 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:35.539 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:35.542 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:35.544 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:35.545 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:35.546 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:35.546 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:35.547 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:35.749 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:35.750 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:35.750 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:35.751 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:35.751 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:35.752 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:35.752 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:38.547 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:38.549 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:38.550 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:38.553 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:38.555 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:38.557 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:38.558 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:38.714 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:38.715 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:38.715 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:38.716 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:38.717 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:38.717 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:38.718 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:41.554 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:41.556 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:41.557 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:41.561 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/livekit?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:41.562 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:41.564 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:41.565 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'
06-09 15:26:41.682 17969  4590 I ReactNativeJS: '[apiClient] POST body after transform:', 'type=incoming&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:41.683 17969  4590 I ReactNativeJS: '[apiClient] Body contains id?', false
06-09 15:26:41.683 17969  4590 I ReactNativeJS: '[apiClient] Body contains reaction?', false
06-09 15:26:41.684 17969  4590 I ReactNativeJS: '[apiClient] Full URL:', 'https://v2.vnseea.vn/api/group_call?access_token=0366061a1958c4f52ef54aefc0dbcce3aec64c4f536c22041bcb60e8510472412e234bd947844203220787ad7829c9cbc7e9953cb1c36fb3&server_key=9c03123383d80bb136cb432d14141ba1'
06-09 15:26:41.685 17969  4590 I ReactNativeJS: '[apiClient] Request method:', 'POST'
06-09 15:26:41.685 17969  4590 I ReactNativeJS: '[apiClient] access_token in params:', 'YES (len=112)'
06-09 15:26:41.686 17969  4590 I ReactNativeJS: '[apiClient] server_key in params:', 'YES (len=32)'