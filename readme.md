This shows how potential automation could be used to help with visibility into blog issues.

When an issue is edited, the `editorial-workflow/.github/workflows/update-issue-status.yml` runs `editorial-workflow/.github/scripts/update-issue-status.js` to parse the issue and determine how many consecutive checkboxes have been checked. It then uses that number to set the label accordingly. This would allow for us to see the stage of the issue without having to click through. 

Here is a [project board](https://github.com/orgs/github/projects/21285) showing this.

Currently, this uses labels, because it is easier to do using Octokit. Ideally, statuses could be used for better filtering, but that requires using GraphQL and is more complicated.
