This shows how potential automation could be used to help with visibility into blog issues.

When an issue is edited, the `editorial-workflow/.github/workflows/update-issue-status.yml` runs `editorial-workflow/.github/scripts/update-issue-status.js` to parse the issue and determine how many consecutive checkboxes have been checked. It then uses that number to set the label accordingly. This would allow for us to see the stage of the issue without having to click through. 

Here is a [project board](https://github.com/orgs/github/projects/21285) showing this.

Currently, this uses labels, because it is easier to do using Octokit. Ideally, statuses could be used for better filtering, but that requires using GraphQL and is more complicated.

To try it out, [create an issue using this issue form](https://github.com/mikethemelanson/editorial-workflow/issues/new?template=1-new-blog.yml). 

If you leave all boxes unchecked, it sets the label to indicate a draft is needed.

If the draft was submitted with the issue and you checked off that box, it would indicate that it's ready for review by the blog team.

You can also go into an existing issue and check something off to see how it changes. It does take time for the action to run.
