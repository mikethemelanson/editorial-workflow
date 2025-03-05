const { Octokit } = require("@octokit/rest");
const { context } = require("@actions/github");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const issueNumber = context.payload.issue.number;
const owner = context.repo.owner;
const repo = context.repo.repo;

(async () => {
  try {
    const issue = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    const body = issue.data.body;
    const checklistItems = [
      "Submit draft (author/submitter)",
      "Review draft & triage (blog team)",
      "Content team reviews & edits (editors)",
      "Team stakeholders approval (sponsor/approver)",
      "Add to GitHub Blog calendar (blog team)",
      "Communications review (comms reviewer)",
      "Copy edit (blog team)",
      "Stage post in WordPress (blog team)",
      "Post preview approval (author/submitter)",
      "Schedule publication in WordPress (blog team)",
      "Open social media issue (blog team)",
    ];

    let furthestItem = null;
    checklistItems.forEach((item, index) => {
      const regex = new RegExp(`- \\[x\\] ${item}`, "i");
      if (regex.test(body)) {
        furthestItem = item;
      }
    });

    if (furthestItem) {
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [furthestItem],
      });

      console.log(`Issue #${issueNumber} status updated to: ${furthestItem}`);
    } else {
      console.log(`No checklist items completed for issue #${issueNumber}`);
    }
  } catch (error) {
    console.error(`Error updating issue status: ${error.message}`);
  }
})();
