import { Octokit } from "@octokit/rest";
import { context } from "@actions/github";

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

    console.log("Processing issue body:", body.substring(0, 200) + "...");

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

    // Count consecutive completed items
    let consecutiveCount = 0;
    
    for (let i = 0; i < checklistItems.length; i++) {
      const item = checklistItems[i];
      const regex = new RegExp(`- *\\[[xX]\\] *${escapeRegExp(item)}`, "i");
      
      if (regex.test(body)) {
        console.log(`Found completed item: ${item}`);
        consecutiveCount++;
      } else {
        // Break at first unchecked box
        console.log(`Breaking at unchecked item: ${item}`);
        break;
      }
    }

    console.log(`Total consecutive completed items: ${consecutiveCount}`);
    
    let stageLabel;
    if (consecutiveCount >= 9) {
      stageLabel = "stage: ready to publish";
    } else if (consecutiveCount >= 8) {
      stageLabel = "stage: preview approval";
    } else if (consecutiveCount >= 7) {
      stageLabel = "stage: ready for staging";
    } else if (consecutiveCount >= 6) {
      stageLabel = "stage: copyedit";
    } else if (consecutiveCount >= 5) {
      stageLabel = "stage: comms review";
    } else if (consecutiveCount >= 4) {
      stageLabel = "stage: ready for calendar";
    } else if (consecutiveCount >= 3) {
      stageLabel = "stage: team and stakeholder reviews";
    } else if (consecutiveCount >= 2) {
      stageLabel = "stage: content team reviews";
    } else if (consecutiveCount >= 1) {
      stageLabel = "stage: draft submitted";
    } else {
      stageLabel = "stage: backlog";
    }

    const currentLabels = issue.data.labels
      .map(label => label.name)
      .filter(name => !name.startsWith("stage:"));

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

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
