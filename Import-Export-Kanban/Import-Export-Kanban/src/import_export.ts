/// <reference path="../typings/index.d.ts" />

import Service = require("VSS/Service");
import CoreRestClient = require("TFS/Core/RestClient");
import Board = require("./board_configuration");

export class ImportExportKanbanAction {
    private _dialogControlInstance: any;

    private _dialog: IExternalDialog;

    public execute(context) {
        let webContext = VSS.getWebContext();

        VSS.getService<IHostDialogService>("ms.vss-web.dialog-service").then((hostDialogService) => {
            let extensionContext: IExtensionContext = VSS.getExtensionContext();
            let dialogControlContributionId: string = extensionContext.publisherId + '.' + extensionContext.extensionId + '.copy-settings-wizard';

            let hostDialogOptions: IHostDialogOptions = {
                title: "Copy Kanban board settings",
                width: 500,
                height: 500,
                // We have our own navigation controls, since built in buttons are not flexible enough for our needs, so we disable all buttons
                buttons: null
            };

            hostDialogService.openDialog(dialogControlContributionId, hostDialogOptions).then((dialog) => {

                this._dialog = dialog;

                dialog.getContributionInstance("copySettingsWizard").then((dialogControlInstance) => {
                    this._dialogControlInstance = dialogControlInstance;

                    this._dialogControlInstance.onCancel(() => {
                        this._dialog.close();
                    });

                    this._dialogControlInstance.onTitleChange((title) => {
                        this._dialog.setTitle(title);
                    });

                    //TODO: in the future this will receive the user settings
                    this._dialogControlInstance.onCopy(() => {

                        //TODO: inline for now. should be move to it's own function later on
                        this._dialog.close();

                        let board = new Board.BoardConfiguration();
                        board.getCurrentConfiguration().then((settings) => {
                            alert("Got board");
                        });

                        //TODO: do work and show progress bar
                    });
                });
            });
        })
    }
}

VSS.register("import-export-kanban-menu", (context) => {
    let action = new ImportExportKanbanAction();
    return action;
});