const fs = require('fs');
const path = require('path');

describe('blog comment notification target', () => {
  const projectRoot = path.resolve(__dirname, '../../../../..');
  const sources = [
    'phtml/xhr/add-blog-comm.php',
    'phtml/api/v2/endpoints/blogs.php',
  ];

  test.each(sources)('%s stores the article ID instead of the comment ID', file => {
    const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');

    expect(source).toContain("'blog_id' => Wo_Secure($get_blog['id'])");
    expect(source).not.toContain("'blog_id' => $lastId");
  });
});
