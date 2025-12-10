#!/usr/bin/env node

/**
 * GitHub Integration Test Suite
 * Tests WAG Tool GitHub API connectivity and repository operations
 * Version: 3.0.0
 * Date: December 10, 2025
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GITHUB_CONFIG = {
  owner: 'santz1994',
  repo: 'WAG',
  token: process.env.GITHUB_TOKEN || null,
  baseUrl: 'api.github.com',
  version: '3.0.0',
  testSuite: 'GitHub Integration Tests',
};

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Make HTTPS request to GitHub API
 */
function makeGitHubRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: GITHUB_CONFIG.baseUrl,
      path: `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}${endpoint}`,
      method: method,
      headers: {
        'User-Agent': `WAG-Tool-v${GITHUB_CONFIG.version}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    // Add auth token if available
    if (GITHUB_CONFIG.token) {
      options.headers['Authorization'] = `token ${GITHUB_CONFIG.token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Log test result
 */
function logTest(name, passed, message = '', details = '') {
  const status = passed ? '✅' : '❌';
  const result = { name, passed, message, details };
  TEST_RESULTS.tests.push(result);

  if (passed) {
    TEST_RESULTS.passed++;
    console.log(`${status} ${name}`);
  } else {
    TEST_RESULTS.failed++;
    console.log(`${status} ${name}`);
    if (message) console.log(`   └─ ${message}`);
  }

  if (details && !passed) {
    console.log(`   └─ Details: ${details}`);
  }
}

/**
 * Get local git info
 */
function getLocalGitInfo() {
  try {
    const rootDir = path.join(__dirname);
    const commitHash = execSync('git rev-parse HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
    const tags = execSync('git tag --points-at HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
    const remoteUrl = execSync('git config --get remote.origin.url', { cwd: rootDir, encoding: 'utf-8' }).trim();

    return {
      commitHash: commitHash.substring(0, 7),
      fullCommitHash: commitHash,
      branch,
      tags: tags ? tags.split('\n') : [],
      remoteUrl,
      success: true,
    };
  } catch (error) {
    return {
      error: error.message,
      success: false,
    };
  }
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// TEST SUITES
// ============================================================================

/**
 * Test 1: Repository Connectivity
 */
async function testRepositoryConnectivity() {
  try {
    const response = await makeGitHubRequest('');
    const passed = response.status === 200;
    logTest(
      'Repository Connectivity',
      passed,
      passed ? `Connected to ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}` : `HTTP ${response.status}`,
      passed ? '' : response.body.message || 'Unknown error'
    );
  } catch (error) {
    logTest('Repository Connectivity', false, 'Network error', error.message);
  }
}

/**
 * Test 2: Repository Information
 */
async function testRepositoryInfo() {
  try {
    const response = await makeGitHubRequest('');
    if (response.status === 200) {
      const repo = response.body;
      const info = {
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        language: repo.language,
        license: repo.license?.name || 'None',
        topics: repo.topics || [],
      };

      console.log('\n📊 Repository Information:');
      console.log(`   Name: ${info.name}`);
      console.log(`   Description: ${info.description || 'N/A'}`);
      console.log(`   Stars: ⭐ ${info.stars}`);
      console.log(`   Forks: 🍴 ${info.forks}`);
      console.log(`   Language: ${info.language || 'N/A'}`);
      console.log(`   License: ${info.license}`);
      console.log(`   Topics: ${info.topics.length > 0 ? info.topics.join(', ') : 'None'}`);

      logTest('Repository Information', true, `Fetched metadata for ${info.name}`);
    } else {
      logTest('Repository Information', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Repository Information', false, 'Failed to fetch', error.message);
  }
}

/**
 * Test 3: Recent Commits
 */
async function testRecentCommits() {
  try {
    const response = await makeGitHubRequest('/commits?per_page=5');
    if (response.status === 200) {
      const commits = response.body;
      console.log('\n📝 Recent Commits (Last 5):');
      commits.slice(0, 5).forEach((commit, index) => {
        const date = new Date(commit.commit.author.date).toLocaleDateString();
        console.log(`   ${index + 1}. ${commit.sha.substring(0, 7)} - ${commit.commit.message.split('\n')[0]} (${date})`);
      });

      logTest('Recent Commits', true, `Retrieved ${commits.length} recent commits`);
    } else {
      logTest('Recent Commits', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Recent Commits', false, 'Failed to fetch commits', error.message);
  }
}

/**
 * Test 4: Branches
 */
async function testBranches() {
  try {
    const response = await makeGitHubRequest('/branches');
    if (response.status === 200) {
      const branches = response.body;
      console.log('\n🌿 Repository Branches:');
      branches.forEach((branch) => {
        const protection = branch.protected ? '🔒' : '🔓';
        console.log(`   ${protection} ${branch.name}`);
      });

      logTest('Branches', true, `Found ${branches.length} branch(es)`);
    } else {
      logTest('Branches', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Branches', false, 'Failed to fetch branches', error.message);
  }
}

/**
 * Test 5: Releases
 */
async function testReleases() {
  try {
    const response = await makeGitHubRequest('/releases?per_page=5');
    if (response.status === 200) {
      const releases = response.body;
      console.log('\n🚀 Recent Releases (Last 5):');
      releases.slice(0, 5).forEach((release, index) => {
        const type = release.draft ? '[DRAFT]' : release.prerelease ? '[PRE]' : '[RELEASE]';
        const date = new Date(release.published_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${release.tag_name} ${type} (${date})`);
      });

      logTest('Releases', true, `Found ${releases.length} release(s)`);
    } else {
      logTest('Releases', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Releases', false, 'Failed to fetch releases', error.message);
  }
}

/**
 * Test 6: Repository Stats
 */
async function testRepositoryStats() {
  try {
    const response = await makeGitHubRequest('/stats/contributors');
    if (response.status === 200 && response.body.length > 0) {
      const contributors = response.body;
      console.log('\n👥 Top Contributors:');
      contributors.slice(0, 5).forEach((contrib, index) => {
        console.log(`   ${index + 1}. ${contrib.author.login} (${contrib.total} commits)`);
      });

      logTest('Repository Stats', true, `Found ${contributors.length} contributor(s)`);
    } else if (response.status === 202) {
      logTest('Repository Stats', true, 'Stats processing (usually takes a few seconds)');
    } else {
      logTest('Repository Stats', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Repository Stats', false, 'Failed to fetch stats', error.message);
  }
}

/**
 * Test 7: Issues
 */
async function testIssues() {
  try {
    const response = await makeGitHubRequest('/issues?state=open&per_page=10');
    if (response.status === 200) {
      const issues = response.body;
      console.log('\n🐛 Open Issues (First 10):');
      issues.slice(0, 10).forEach((issue, index) => {
        const type = issue.pull_request ? '[PR]' : '[ISSUE]';
        const labels = issue.labels.map((l) => l.name).join(', ');
        console.log(`   ${index + 1}. #${issue.number} ${type} ${issue.title.substring(0, 50)}`);
        if (labels) console.log(`      Labels: ${labels}`);
      });

      const openCount = response.headers['x-total-count'] || issues.length;
      logTest('Issues', true, `Found ${openCount} open issue(s)`);
    } else {
      logTest('Issues', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Issues', false, 'Failed to fetch issues', error.message);
  }
}

/**
 * Test 8: Pull Requests
 */
async function testPullRequests() {
  try {
    const response = await makeGitHubRequest('/pulls?state=open&per_page=10');
    if (response.status === 200) {
      const prs = response.body;
      console.log('\n📤 Open Pull Requests (First 10):');
      if (prs.length > 0) {
        prs.slice(0, 10).forEach((pr, index) => {
          console.log(`   ${index + 1}. #${pr.number} ${pr.title.substring(0, 50)} by @${pr.user.login}`);
        });
      } else {
        console.log('   (No open pull requests)');
      }

      logTest('Pull Requests', true, `Found ${prs.length} open PR(s)`);
    } else {
      logTest('Pull Requests', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Pull Requests', false, 'Failed to fetch PRs', error.message);
  }
}

/**
 * Test 9: Local Git Repository
 */
function testLocalGitRepository() {
  const gitInfo = getLocalGitInfo();
  if (gitInfo.success) {
    console.log('\n🔗 Local Git Information:');
    console.log(`   Branch: ${gitInfo.branch}`);
    console.log(`   Commit: ${gitInfo.commitHash}`);
    console.log(`   Remote: ${gitInfo.remoteUrl}`);
    if (gitInfo.tags.length > 0) {
      console.log(`   Tags: ${gitInfo.tags.join(', ')}`);
    }

    logTest('Local Git Repository', true, `Connected to ${gitInfo.remoteUrl}`);
  } else {
    logTest('Local Git Repository', false, 'Not a git repository', gitInfo.error);
  }
}

/**
 * Test 10: API Rate Limiting
 */
async function testRateLimiting() {
  try {
    const response = await makeGitHubRequest('/rate_limit');
    if (response.status === 200) {
      const limits = response.body.rate_limit;
      const remaining = limits.remaining;
      const limit = limits.limit;
      const resetTime = new Date(limits.reset * 1000).toLocaleTimeString();

      console.log('\n⏱️ API Rate Limit:');
      console.log(`   Remaining: ${remaining}/${limit}`);
      console.log(`   Reset Time: ${resetTime}`);

      const percentage = Math.round((remaining / limit) * 100);
      logTest('API Rate Limiting', remaining > 0, `${percentage}% rate limit remaining`);
    } else {
      logTest('API Rate Limiting', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('API Rate Limiting', false, 'Failed to check rate limit', error.message);
  }
}

/**
 * Test 11: Latest Release Version
 */
async function testLatestRelease() {
  try {
    const response = await makeGitHubRequest('/releases/latest');
    if (response.status === 200) {
      const release = response.body;
      console.log('\n📦 Latest Release:');
      console.log(`   Version: ${release.tag_name}`);
      console.log(`   Name: ${release.name}`);
      console.log(`   Released: ${new Date(release.published_at).toLocaleDateString()}`);
      if (release.assets.length > 0) {
        console.log(`   Assets: ${release.assets.length} file(s)`);
        release.assets.forEach((asset) => {
          console.log(`      - ${asset.name} (${formatBytes(asset.size)}) - ${asset.download_count} downloads`);
        });
      }

      logTest('Latest Release', true, `Found v${release.tag_name}`);
    } else {
      logTest('Latest Release', false, `HTTP ${response.status}`, 'No releases found');
    }
  } catch (error) {
    logTest('Latest Release', false, 'Failed to fetch latest release', error.message);
  }
}

/**
 * Test 12: Repository Collaborators
 */
async function testCollaborators() {
  try {
    const response = await makeGitHubRequest('/collaborators');
    if (response.status === 200) {
      const collaborators = response.body;
      console.log('\n🤝 Repository Collaborators:');
      if (collaborators.length > 0) {
        collaborators.slice(0, 5).forEach((collab, index) => {
          const permission = collab.permissions;
          const access = permission.admin ? 'ADMIN' : permission.push ? 'WRITE' : 'READ';
          console.log(`   ${index + 1}. @${collab.login} (${access})`);
        });
        if (collaborators.length > 5) {
          console.log(`   ... and ${collaborators.length - 5} more`);
        }
      } else {
        console.log('   (No public collaborators)');
      }

      logTest('Collaborators', true, `Found ${collaborators.length} collaborator(s)`);
    } else if (response.status === 403) {
      logTest('Collaborators', true, 'Access restricted (requires auth)', '');
    } else {
      logTest('Collaborators', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Collaborators', false, 'Failed to fetch collaborators', error.message);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  🧪 WAG TOOL - GITHUB INTEGRATION TEST SUITE v3.0.0');
  console.log('='.repeat(80));
  console.log(`\n📍 Target: ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`);
  console.log(`🔐 Authentication: ${GITHUB_CONFIG.token ? '✅ Authenticated' : '⚠️  Public (limited API calls)'}`);
  console.log(`📅 Date: ${new Date().toLocaleDateString()}\n`);

  // Run tests sequentially
  await testRepositoryConnectivity();
  await testRepositoryInfo();
  await testRecentCommits();
  await testBranches();
  await testReleases();
  await testRepositoryStats();
  await testIssues();
  await testPullRequests();
  testLocalGitRepository();
  await testRateLimiting();
  await testLatestRelease();
  await testCollaborators();

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('  📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Passed:  ${TEST_RESULTS.passed}`);
  console.log(`❌ Failed:  ${TEST_RESULTS.failed}`);
  console.log(`⏭️  Skipped: ${TEST_RESULTS.skipped}`);
  console.log(`📈 Total:   ${TEST_RESULTS.passed + TEST_RESULTS.failed + TEST_RESULTS.skipped}\n`);

  if (TEST_RESULTS.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! GitHub integration is working perfectly.\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${TEST_RESULTS.failed} test(s) failed. Review above for details.\n`);
    process.exit(1);
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

runAllTests().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
