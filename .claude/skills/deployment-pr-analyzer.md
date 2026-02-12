# Deployment PR Analyzer

**Description:** Extracts all pull request URLs from a k8s-template deployment pull request.

**Usage:** When the user provides a k8s-template PR URL (e.g., `https://github.com/Credify/k8s-template/pull/208945`), analyze the deployment and output a list of all GitHub pull request URLs that are included in that deployment.

---

## Instructions

When invoked with a k8s-template PR URL, follow these steps:

### Step 1: Extract PR Number and Fetch Diff

```bash
# Extract PR number from URL (e.g., 208945)
PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')

# Fetch the PR diff
gh pr view $PR_NUMBER --repo Credify/k8s-template --json files,title
```

### Step 2: Parse Application Directory and Commit SHAs

Look for changes in the PR diff that follow this pattern:
- Path: `v2/applications/{directory-name}/kustomization.yaml`
- Look for lines like: `newTag: 20260212185301-f5cee7b8`

Extract:
- **Directory name** (e.g., `ccp-portal-ui`)
- **New commit SHA** (e.g., `20260212185301-f5cee7b8`)
- **Old commit SHA** (from the previous line being replaced)

### Step 3: Map Directory to Repository

Use this mapping (based on k8s-template structure):

| Directory Name | Repository Name |
|----------------|-----------------|
| `ccp-portal-ui` | `app-by-phone-ui` |
| `borrower-dashboard` | `borrower-dashboard-ui` |
| `auth-ui` | `auth-ui` |
| `creditline-servicing-ui` | `creditline-servicing-ui` |
| `merchant-dashboard-ui` | `merchant-dashboard-ui` |
| `public-site-cms-ui` | `public-site-cms-ui` |
| `sierra-agents` | `sierra-agents` |

### Step 4: Navigate to Repository and Find Commits

```bash
# Navigate to the local repository directory
cd ~/dev/{repository-name}

# Fetch latest tags and commits
git fetch origin

# Find all commits between the two SHAs
git log --oneline {old-sha}..{new-sha}
```

### Step 5: Extract PR Numbers from Commit Messages

Parse commit messages to extract PR numbers using patterns like:
- `(#3480)`
- `PR #3480`
- `pull/3480`

### Step 6: Fetch PR Titles and Extract JIRA Tickets

For each PR number found, fetch the PR title to extract JIRA ticket IDs:

```bash
# Fetch PR title for each PR number
gh pr view {pr_number} --repo Credify/{repository-name} --json title,body

# Extract JIRA ticket IDs from titles using pattern matching:
# Common patterns: ALF-1234, SI-1234, BFR-1234, DP-1234, etc.
# Pattern: [A-Z]+-[0-9]+
```

### Step 7: Build Output

Format output in two sections with each item on its own line:

**Section 1: JIRA Tickets (Markdown Links)**

IMPORTANT: Each JIRA ticket MUST be formatted as a markdown link, NOT a plain URL.

Format: `[TICKET-ID](https://credify.atlassian.net/browse/TICKET-ID)`

Example output (each on its own line):
```
[ALF-3504](https://credify.atlassian.net/browse/ALF-3504)
[SI-11239](https://credify.atlassian.net/browse/SI-11239)
```

DO NOT output plain URLs like:
```
https://credify.atlassian.net/browse/ALF-3504
```

**Section 2: Pull Request URLs**

Each PR URL must be on its own line:
```
https://github.com/Credify/{repository-name}/pull/3480
https://github.com/Credify/{repository-name}/pull/3486
https://github.com/Credify/{repository-name}/pull/3479
https://github.com/Credify/{repository-name}/pull/3306
```

### Step 8: Update Deployment PR Description

Add JIRA tickets to the TOP of the deployment PR description as comma-separated markdown links.

**IMPORTANT:**
- Only ADD the JIRA links at the top
- Do NOT remove or edit any existing content in the PR description
- Format as comma-separated list on a single line

**Process:**
1. Fetch current PR description:
```bash
gh pr view {pr_number} --repo Credify/k8s-template --json body --jq '.body'
```

2. Format JIRA tickets as comma-separated markdown links:
```
[ALF-3504](https://credify.atlassian.net/browse/ALF-3504), [SI-11201](https://credify.atlassian.net/browse/SI-11201), [SI-11239](https://credify.atlassian.net/browse/SI-11239)
```

3. Prepend to existing description and update PR:
```bash
NEW_BODY="[ALF-3504](https://credify.atlassian.net/browse/ALF-3504), [SI-11201](https://credify.atlassian.net/browse/SI-11201), [SI-11239](https://credify.atlassian.net/browse/SI-11239)

${EXISTING_BODY}"

gh pr edit {pr_number} --repo Credify/k8s-template --body "$NEW_BODY"
```

### Step 9: Add Involved QA as Reviewers

Add QA members who approved any of the related PRs as reviewers to the deployment PR.

**How to identify involved QA:**
- They approved one of the related pull requests
- They are part of the GitHub team: `Credify/review-qa`

**Process:**

1. Get list of QA team members (use --paginate to get all members):
```bash
gh api --paginate /orgs/Credify/teams/review-qa/members --jq '.[].login'
```

2. For each related PR, get reviewers who approved:
```bash
gh pr view {pr_number} --repo Credify/{repository-name} --json reviews --jq '.reviews[] | select(.state == "APPROVED") | .author.login'
```

3. Filter to only QA team members:
- Cross-reference approved reviewers with QA team members list
- Collect unique QA usernames

4. Add QA members as reviewers to the deployment PR:
```bash
gh pr edit {pr_number} --repo Credify/k8s-template --add-reviewer {qa_username1} --add-reviewer {qa_username2}
```

**Example:**
```bash
# If @jdoe and @jsmith from review-qa team approved related PRs
gh pr edit 208945 --repo Credify/k8s-template --add-reviewer jdoe --add-reviewer jsmith
```

### Step 10: Generate Copy-Paste Summary

Generate a formatted summary for easy copy-pasting into Slack or other tools.

**Format:**
```
Prod deploy <deployment_pr_url>
Diff: <comparison_url>

@slack_author @slack_qa_approver - @slack_author @slack_qa_approver - @slack_author @slack_qa_approver
```

**GitHub to Slack Username Mapping:**

Use this mapping to convert GitHub usernames to Slack usernames. If a username is not in the mapping, use the GitHub username with the "upgrade" suffix removed.

```
scaldeiraupgrade → scaldeira
bschwartzupgrade → bschwartz
cgondimupgrade → cg
ychauhanupgrade → ychauhan
haverionupgrade → Hera
naltynbekovupgrade → Nur
dlafreniereupgrade → dlafreniere
obilosorochkaupgrade → obilosorochka
```

**Process:**

1. Get PR author for each related PR:
```bash
gh pr view {pr_number} --repo Credify/{repository-name} --json author --jq '.author.login'
```

2. Get QA approver for each related PR:
- From Step 9, match each PR to its QA approver(s)
- If multiple QA approvers, pick the first one
- If no QA approver, omit the second @mention

3. Convert GitHub usernames to Slack usernames:
- Check the mapping table above
- If found in mapping, use the Slack username
- If not found, remove "upgrade" suffix from GitHub username (e.g., `ttranupgrade` → `ttran`)

4. Format output as a single line with author/QA pairs separated by " - ":
```bash
echo "Prod deploy https://github.com/Credify/k8s-template/pull/{pr_number}"
echo "Diff: https://github.com/Credify/{repo}/compare/{old-sha}...{new-sha}"
echo ""
echo "@{slack_author1} @{slack_qa1} - @{slack_author2} @{slack_qa2} - @{slack_author3} @{slack_qa3}"
```

**Example Output:**
```
Prod deploy https://github.com/Credify/k8s-template/pull/208945
Diff: https://github.com/Credify/app-by-phone-ui/compare/20260211192032-d598ea05...20260212185301-f5cee7b8

@scaldeira @bschwartz - @cg @ychauhan - @Hera @Nur - @dlafreniere @obilosorochka
```

---

## Example Workflow

**Input:** `https://github.com/Credify/k8s-template/pull/208945`

**Process:**
1. Fetch PR diff for #208945
2. Find change in `v2/applications/ccp-portal-ui/kustomization.yaml`
3. Extract: `ccp-portal-ui` → maps to `app-by-phone-ui`
4. Extract commit range: `20260211192032-d598ea05...20260212185301-f5cee7b8`
5. Run: `cd ~/dev/app-by-phone-ui && git log --oneline 20260211192032-d598ea05..20260212185301-f5cee7b8`
6. Parse PR numbers from commit messages
7. Output full PR URLs

**Output:**
```
https://github.com/Credify/app-by-phone-ui/pull/3480
https://github.com/Credify/app-by-phone-ui/pull/3486
https://github.com/Credify/app-by-phone-ui/pull/3479
https://github.com/Credify/app-by-phone-ui/pull/3306
```

---

## Error Handling

- If repository directory doesn't exist locally, inform user and suggest they clone it
- If commit SHAs don't exist locally, run `git fetch origin` to get latest commits
- If no PR numbers found in commits, output "No pull requests found in this deployment"
- If multiple applications are updated in the deployment, process each one and group output by repository

---

## Notes

- This skill assumes local repository access in `~/dev/` directory
- Requires `gh` CLI to be authenticated with GitHub
- Requires `git` access to Credify repositories
- PR numbers are extracted from commit messages in the format `(#NUMBER)` or similar patterns
