# Copy Kanban board settings

With TFS and VSTS, we see more and more teams switching to a single team project approach with teams being split based on a combination of iterations and areas. This can result in dozens of teams set up within the system. Once a team goes in and configures their Kanban board with their settings: card rules, swimlanes, column definitions, etc. they may want to share that setup with other teams. This extension allows teams to either grab settings from another team and apply them to their boards or to allow a team to copy their settings to another team.

# Getting started

1) From the Work hub, navigate to a backlog level such as *Epics*, *Features*, or *Backlog items*.
1) From the backlog level, switch to the Kanban board view.
1) Click the icon to launch the import / export Kanban wizard.
1) Follow the wizard to copy settings either to or from another team.

In this release, the following configurations will be copied for each backlog level within the process template:
* Board card rules
* Board card settings
* Columns within the board
* Swimlanes

# Known issues

In this current version of the extension there are a few known limitiations and issues.
* **Work item histories may be modified** - If you have work items on your target board you may notice that work items may have additional history states added to them after copying indicating column or swimlane changes.
* **Work items may move to a new swimlane** - If you have work items spread across multiple swimlanes on your target board, those work items may be moved back to the "default" swimlane after settings are copied to that board.
* **Additional backlog levels may be created** - When copying settings from one team to a second team, if the team copying settings from has more backlog levels visible than the destination team, additional backlog levels will be created on the target team.
* **Task level settings are not copied** - The settings are only copied from any portfolio backlog levels as well as requirement backlogs. Backlogs at the task level are not supported at this time.

# Learn more
The source to this extension is available. Feel free to take, fork, and extend.

> Microsoft DevLabs is an outlet for experiments from Microsoft, experiments that represent some of the latest ideas around developer tools. Solutions in this category are designed for broad usage, and you are encouraged to use and provide feedback on them; however, these extensions are not supported nor are any commitments made as to their longevity.

# Contributors

We thank the following contributor(s) for this extension: Edward Fry, Jesse Houwing, Chris Mason, Gregory Ott, Tiago Pascoal, Prasanna Ramkumar, Kees Verhaar.

# Feedback

We need your feedback! Here are some ways to connect with us:

* Add a review below.
* Send us an [email](mailto:mktdevlabs@microsoft.com/).

Review the [list of features and resolved issues of latest tools and extensions](https://aka.ms/vsarreleases) for information on the latest releases.