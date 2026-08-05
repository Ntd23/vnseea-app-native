const fs = require('fs');
const path = require('path');

const read = relativePath => fs.readFileSync(
  path.resolve(__dirname, relativePath),
  'utf8',
);

describe('job application screen contract', () => {
  const routes = read('../../../../navigation/constants/routes.ts');
  const registry = read('../../../../navigation/routeRegistry.tsx');
  const detail = read('../JobDetailScreen.tsx');
  const apply = read('../ApplyJobScreen.tsx');
  const applicants = read('../JobApplicantsScreen.tsx');

  it('registers dedicated apply and applicants stack screens', () => {
    expect(routes).toContain("JOB_APPLY: 'JobApply'");
    expect(routes).toContain("JOB_APPLICANTS: 'JobApplicants'");
    expect(registry).toContain('{ name: ROUTES.JOB_APPLY, component: ApplyJobScreen }');
    expect(registry).toContain('{ name: ROUTES.JOB_APPLICANTS, component: JobApplicantsScreen }');
  });

  it('routes applicants and owners to their respective flows', () => {
    expect(detail).toContain('navigation.navigate(ROUTES.JOB_APPLY, { job })');
    expect(detail).toContain('navigation.navigate(ROUTES.JOB_APPLICANTS, { job })');
    expect(detail).toContain("copy.applicantsCount.replace('{count}'");
  });

  it('submits canonical application data and exposes profile/chat actions', () => {
    expect(apply).toContain('validateJobApplication(draft, questions, language)');
    expect(apply).toContain('jobsRepository.applyToJob(job.id, validation.value)');
    expect(applicants).toContain('jobsRepository.getJobApplicants(job.id');
    expect(applicants).toContain('navigation.navigate(ROUTES.USER_PROFILE');
    expect(applicants).toContain('navigation.navigate(ROUTES.CHAT, { chat })');
  });
});
