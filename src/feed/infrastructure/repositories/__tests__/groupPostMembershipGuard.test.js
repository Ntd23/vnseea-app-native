const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('group post membership guard', () => {
  it('rejects non-members before v2 post content or uploads are processed', () => {
    const endpoint = read('phtml/api/v2/endpoints/new_post.php');
    const membershipGuard = endpoint.indexOf(
      "Wo_IsGroupJoined($requested_group_id) === true",
    );
    const postProcessing = endpoint.indexOf("if (!empty($_POST['postText']))");
    const uploadProcessing = endpoint.indexOf(
      "if (isset($_FILES['postFile']['name']))",
    );

    expect(membershipGuard).toBeGreaterThan(-1);
    expect(membershipGuard).toBeLessThan(postProcessing);
    expect(membershipGuard).toBeLessThan(uploadProcessing);
    expect(endpoint).toContain("$error_code = 16;");
    expect(endpoint).toContain('You must join this group before posting.');
  });

  it('applies the same membership rule to the legacy phone endpoint', () => {
    const endpoint = read('phtml/api/phone/new_post.php');
    const membershipGuard = endpoint.indexOf(
      'Wo_IsGroupJoined($requested_group_id) !== true',
    );
    const postProcessing = endpoint.indexOf(
      "if (!empty($_POST['postText']) && Wo_IsUrl($_POST['postText']))",
    );

    expect(membershipGuard).toBeGreaterThan(-1);
    expect(membershipGuard).toBeLessThan(postProcessing);
    expect(endpoint).toContain("'error_id' => '16'");
  });

  it('surfaces the backend error instead of replacing it with a generic failure', () => {
    const repository = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );

    expect(repository).toContain('response.errors?.error_text ??');
  });
});
