// Use dynamic import for ESM modules
import { Octokit } from '@octokit/rest';
import { context } from '@actions/github';

// Main function to allow async/await at the top level
async function main() {
  // Initialize Octokit REST client
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  const issueNumber = context.payload.issue.number;
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  try {
    // Get issue content
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

    // Find the furthest completed checklist item
    let furthestCheckedIndex = -1;
    checklistItems.forEach((item, index) => {
      const regex = new RegExp(`- \\[x\\] ${item}`, "i");
      if (regex.test(body)) {
        furthestCheckedIndex = Math.max(furthestCheckedIndex, index);
      }
    });

    // Get current labels
    const currentLabels = issue.data.labels.map(label => label.name);
    
    // Remove any existing checklist labels
    const nonChecklistLabels = currentLabels.filter(label => !checklistItems.includes(label));
    
    // Add the furthest completed item
    if (furthestCheckedIndex >= 0) {
      const furthestItem = checklistItems[furthestCheckedIndex];
      const newLabels = [...nonChecklistLabels, furthestItem];
      
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        labels: newLabels,
      });

      console.log(`Issue #${issueNumber} labels updated. Added: ${furthestItem}`);
      console.log(`Final labels: ${newLabels.join(', ')}`);
    } else {
      // If no items are checked, just keep non-checklist labels
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        labels: nonChecklistLabels,
      });
      console.log(`No checklist items completed for issue #${issueNumber}`);
      console.log(`Removed any checklist labels, kept: ${nonChecklistLabels.join(', ')}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
