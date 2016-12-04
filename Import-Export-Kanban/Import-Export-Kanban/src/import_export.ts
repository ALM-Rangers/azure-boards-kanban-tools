/// <reference path="../typings/index.d.ts" />

import Service = require("VSS/Service");
import CoreRestClient = require("TFS/Core/RestClient");
import Board = require("./board_configuration");

export class ImportExportKanbanAction {
    private _dialogControlInstance: any;

    public execute(context) {
        let webContext = VSS.getWebContext();

        VSS.getService<IHostDialogService>("ms.vss-web.dialog-service").then((hostDialogService) => {
            let extensionContext: IExtensionContext = VSS.getExtensionContext();
            let dialogControlContributionId: string = extensionContext.publisherId + "." + extensionContext.extensionId + ".select-team-dialog";

            let hostDialogOptions: IHostDialogOptions = {
                title: "Select Team",
                width: 500,
                height: 300,
                okText: "Export",
                getDialogResult: () => {
                    return this._dialogControlInstance.getSelectedTeam();
                },
                okCallback: (result) => {
                    let board = new Board.BoardConfiguration();
                    board.getCurrentConfiguration(result).then((settings) => {
                        board.applySettings(webContext.team.name, settings).then((result) => {
                            console.log("settings applied");
                        }).catch((reason) => {
                            console.log("apply failed - " + reason);
                        });
                    });
                }
            };

            hostDialogService.openDialog(dialogControlContributionId, hostDialogOptions).then((dialog) => {
                dialog.updateOkButton(true);
                dialog.getContributionInstance("selectTeamDialog").then((dialogControlInstance) => {
                    this._dialogControlInstance = dialogControlInstance;
                    let client = CoreRestClient.getClient();
                    let teamlist: string[] = new Array();
                    client.getTeams(webContext.project.id).then((teams) => {
                        teams.forEach((team) => {
                            teamlist.push(team.name);
                        });
                        this._dialogControlInstance.setTeams(teamlist);
                    });
                });
            });
        });
    }
}

VSS.register("import-export-kanban-menu", (context) => {
    let action = new ImportExportKanbanAction();
    return action;
});