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
    if (!body) {
      console.log(`Issue #${issueNumber} has no body`);
      return;
    }

    console.log("Processing issue body:", body.substring(0, 200) + "..."); // Log first 200 chars for debugging

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

    // Count completed items to determine stage
    let completedCount = 0;
    checklistItems.forEach((item) => {
      // More flexible regex that handles both [x] and [X] with varying spaces
      const regex = new RegExp(`- *\\[[xX]\\] *${escapeRegExp(item)}`, "i");
      if (regex.test(body)) {
        console.log(`Found completed item: ${item}`);
        completedCount++;
      }
    });

    console.log(`Total completed items: ${completedCount}`);
    
    // Determine appropriate stage label
    let stageLabel;
    if (completedCount >= 9) {
      stageLabel = "stage: ready to publish";
    } else if (completedCount >= 8) {
      stageLabel = "stage: preview approval";
    } else if (completedCount >= 7) {
      stageLabel = "stage: ready for staging";
    } else if (completedCount >= 6) {
      stageLabel = "stage: copyedit";
    } else if (completedCount >= 5) {
      stageLabel = "stage: comms review";
    } else if (completedCount >= 4) {
      stageLabel = "stage: stage: comms review";
    } else if (completedCount >= 3) {
      stageLabel = "stage: team and stakeholder reviews";
    } else if (completedCount >= 2) {
      stageLabel = "stage: content team reviews";
    } else if (completedCount >= 1) {
      stageLabel = "stage: draft submitted";
    } else {
      stageLabel = "stage: backlog";
    }

    // Get current labels to preserve them
    const currentLabels = issue.data.labels
      .map(label => label.name)
      .filter(name => !name.startsWith("stage:")); // Remove any existing stage labels

    // Add the new stage label
    currentLabels.push(stageLabel);
    
    console.log(`Updating issue #${issueNumber} with labels:`, currentLabels);

    await octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      labels: currentLabels,
    });

    console.log(`Issue #${issueNumber} status updated to: ${stageLabel}`);
  } catch (error) {
    console.error(`Error updating issue status: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
})();

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
