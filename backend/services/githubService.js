const axios = require('axios');

/**
 * GitHub Service
 * Fetches repository data from the GitHub API and prepares it
 * for AI-powered architecture analysis.
 */

/**
 * Parses a GitHub URL to extract owner and repo name.
 * Supports formats: https://github.com/owner/repo, github.com/owner/repo
 */
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL. Expected format: https://github.com/owner/repo');
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Fetches repository information from the GitHub API.
 * Retrieves: repo metadata, languages, file tree, and README.
 */
async function fetchRepoData(repoUrl) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    // Fetch repo info, languages, and tree in parallel
    const [repoInfo, languages, tree] = await Promise.all([
      axios.get(baseUrl).then(r => r.data),
      axios.get(`${baseUrl}/languages`).then(r => r.data),
      axios.get(`${baseUrl}/git/trees/HEAD?recursive=1`).then(r => r.data).catch(() => ({ tree: [] }))
    ]);

    // Get README content (optional, may not exist)
    let readme = '';
    try {
      const readmeRes = await axios.get(`${baseUrl}/readme`, {
        headers: { Accept: 'application/vnd.github.v3.raw' }
      });
      readme = readmeRes.data.substring(0, 2000); // Limit README size
    } catch {
      readme = 'No README available';
    }

    // Build a concise file tree (top 50 files)
    const fileTree = (tree.tree || [])
      .filter(f => f.type === 'blob')
      .slice(0, 50)
      .map(f => f.path);

    return {
      name: repoInfo.full_name,
      description: repoInfo.description || 'No description',
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      mainLanguage: repoInfo.language,
      languages: Object.keys(languages),
      languageBreakdown: languages,
      fileTree,
      readme,
      defaultBranch: repoInfo.default_branch,
      createdAt: repoInfo.created_at,
      updatedAt: repoInfo.updated_at
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Repository not found. Make sure the URL is correct and the repo is public.');
    }
    if (error.response?.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    throw new Error(`Failed to fetch repository data: ${error.message}`);
  }
}

/**
 * Generates a mock architecture analysis for when Ollama is unavailable.
 */
function generateMockGitHubAnalysis(repoData) {
  const languageList = repoData.languages.join(', ') || 'Not detected';

  // Detect project type from file tree
  let projectType = 'General Purpose Application';
  let architecture = 'Modular';
  const fileTreeStr = repoData.fileTree.join(' ');

  if (fileTreeStr.includes('package.json') && fileTreeStr.includes('src/')) {
    if (fileTreeStr.includes('next.config')) {
      projectType = 'Next.js Application';
      architecture = 'Pages Router / App Router';
    } else if (fileTreeStr.includes('vite.config')) {
      projectType = 'Vite + React Application';
      architecture = 'Component-Based SPA';
    } else {
      projectType = 'Node.js Application';
      architecture = 'MVC / Modular';
    }
  }
  if (fileTreeStr.includes('requirements.txt') || fileTreeStr.includes('setup.py')) {
    projectType = 'Python Application';
    architecture = 'Package-Based';
  }
  if (fileTreeStr.includes('pom.xml') || fileTreeStr.includes('build.gradle')) {
    projectType = 'Java Application';
    architecture = 'Layered Architecture';
  }

  return {
    projectType,
    architecture,
    languages: languageList,
    stars: repoData.stars,
    forks: repoData.forks,
    analysis: `## Repository Analysis: ${repoData.name}\n\n**Project Type:** ${projectType}\n**Architecture Pattern:** ${architecture}\n**Primary Language:** ${repoData.mainLanguage || 'Unknown'}\n**Languages Used:** ${languageList}\n**Stars:** ${repoData.stars} ⭐ | **Forks:** ${repoData.forks} 🍴\n\n### Project Structure\nThe repository contains ${repoData.fileTree.length}+ files organized in a ${architecture.toLowerCase()} structure.\n\n### Suggestions for Improvement\n1. **Documentation**: Ensure comprehensive README and inline comments\n2. **Testing**: Add unit and integration tests for critical paths\n3. **CI/CD**: Set up automated pipelines for consistent deployments\n4. **Code Quality**: Implement linting and formatting standards\n5. **Security**: Review dependencies for known vulnerabilities`,
    suggestions: [
      'Add comprehensive documentation and API references',
      'Implement automated testing with good coverage',
      'Set up CI/CD pipeline for continuous deployment',
      'Use consistent code formatting (Prettier, ESLint)',
      'Review and update dependencies regularly'
    ]
  };
}

module.exports = { fetchRepoData, generateMockGitHubAnalysis, parseGitHubUrl };
