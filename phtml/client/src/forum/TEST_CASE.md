English description: Manual QA checklist for the backend-backed forum context.

# TEST CASE - Forum

## FORUM-001 - Hard reload `/forum`
- Open `/forum` with a browser reload.
- Expect `/_api/forum` to load real PHP sections and forums.

## FORUM-002 - Open a forum
- Click a forum in the sidebar.
- Expect the URL to become `/forum?tab=browse&fid=<id>` and `/_api/forum/threads` to load that forum's threads.

## FORUM-003 - Open a thread
- Click a thread from the list.
- Expect the URL to include `tab=browse`, `fid`, and `tid`; the detail panel shows the thread body and replies.

## FORUM-004 - Search
- Enter a keyword and submit.
- Expect `q` to sync to the URL and both catalog/thread requests to use the keyword.

## FORUM-005 - Create thread
- With a user allowed to use forum, open create modal, pick a forum, enter a title and message.
- Expect a backend thread to be created and opened in the UI.

## FORUM-006 - My threads tab
- Open the "My threads" tab.
- Expect `/_api/forum/my-threads` to load the current user's threads and allow opening a thread detail.

## FORUM-007 - Reply
- Open a thread, write a reply, submit.
- Expect the reply to be posted through the backend bridge and the detail panel to refresh.

## FORUM-008 - Responsive
- Check mobile and desktop.
- Expect the forum sidebar, thread list, and detail panel to stack without overlap on mobile and use three columns on wide desktop.
