// Use dynamic import for ESM modules
import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { context } from '@actions/github';

// Main function to allow async/await at the top level
async function main() {
  // Initialize Octokit REST and GraphQL clients
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${process.env.GITHUB_TOKEN}`
    }
  });

  const issueNumber = context.payload.issue.number;
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const projectNumber = 21285; // GitHub project number from the URL

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
        furthestCheckedIndex = index;
      }
    });

    // Update issue labels
    if (furthestCheckedIndex >= 0) {
      const furthestItem = checklistItems[furthestCheckedIndex];
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [furthestItem],
      });
      
      console.log(`Issue #${issueNumber} label updated to: ${furthestItem}`);
      
      // Update the project item status
      // First, get the node ID of the issue
      const issueData = await graphqlWithAuth(`
        query getIssueID($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $number) {
              id
            }
          }
        }
      `, {
        owner,
        repo,
        number: issueNumber
      });
      
      const issueId = issueData.repository.issue.id;
      
      // Get project data and find the item for this issue
      const projectData = await graphqlWithAuth(`
        query getProjectData($org: String!) {
          organization(login: $org) {
            projectV2(number: ${projectNumber}) {
              id
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        org: 'github'  // organization name from the project URL
      });
      
      const project = projectData.organization.projectV2;
      
      // Find the item in the project
      const projectItemData = await graphqlWithAuth(`
        query findProjectItem($projectId: ID!, $issueId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 1, filter: {contentId: $issueId}) {
                nodes {
                  id
                }
              }
            }
          }
        }
      `, {
        projectId: project.id,
        issueId: issueId
      });
      
      const projectItems = projectItemData.node.items.nodes;
      
      if (projectItems.length > 0) {
        const itemId = projectItems[0].id;
        
        // Find the Status field
        const statusField = project.fields.nodes.find(field => 
          field.name.toLowerCase() === 'status' || field.name.toLowerCase() === 'state'
        );
        
        if (statusField) {
          // Map the checklist items to status options
          // You'll need to update this mapping to match your project's actual status options
          const statusMappings = {
            0: "Submit draft (author/submitter)",
            1: "Review draft & triage (blog team)", 
            2: "Content team reviews & edits (editors)",
            3: "Team stakeholders approval (sponsor/approver)",
            4: "In Review",
            5: "In Review",
            6: "In Review",
            7: "In Review",
            8: "In Review",
            9: "Ready",
            10: "Done"
          };
          
          const targetStatus = statusMappings[furthestCheckedIndex] || "In Progress";
          const statusOption = statusField.options.find(option => option.name === targetStatus);
          
          if (statusOption) {
            // Update the project item status
            await graphqlWithAuth(`
              mutation updateProjectItemStatus($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
                updateProjectV2ItemFieldValue(
                  input: {
                    projectId: $projectId,
                    itemId: $itemId,
                    fieldId: $fieldId,
                    value: { singleSelectOptionId: $optionId }
                  }
                ) {
                  projectV2Item {
                    id
                  }
                }
              }
            `, {
              projectId: project.id,
              itemId: itemId,
              fieldId: statusField.id,
              optionId: statusOption.id
            });
            
            console.log(`Project item status updated to: ${targetStatus}`);
          } else {
            console.log(`Could not find status option: ${targetStatus}`);
          }
        } else {
          console.log("Status field not found in project");
        }
      } else {
        console.log(`Issue #${issueNumber} not found in project`);
      }
    } else {
      console.log(`No checklist items completed for issue #${issueNumber}`);
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
