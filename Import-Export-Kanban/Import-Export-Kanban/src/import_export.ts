/// <reference types="vss-web-extension-sdk" />

import Service = require("VSS/Service");
import CoreRestClient = require("TFS/Core/RestClient");
import Board = require("./board_configuration");
import CopySettingsWizard = require("./copySettingsWizard");

import Telemetry = require("./telemetryclient");

export class ImportExportKanbanAction {
    private _dialogControlInstance: CopySettingsWizard.CopySettingsWizard;

    private _dialog: IExternalDialog;

    public execute(context) {
        let webContext = VSS.getWebContext();

        VSS.getService<IHostDialogService>("ms.vss-web.dialog-service").then((hostDialogService) => {
            let extensionContext: IExtensionContext = VSS.getExtensionContext();
            let dialogControlContributionId: string = extensionContext.publisherId + "." + extensionContext.extensionId + ".copy-settings-wizard";

            let hostDialogOptions: IHostDialogOptions = {
                title: "Copy Kanban board settings",
                width: 500,
                height: 500,
                // We have our own navigation controls, since built in buttons are not flexible enough for our needs, so we disable all buttons
                buttons: null
            };

            hostDialogService.openDialog(dialogControlContributionId, hostDialogOptions).then((dialog) => {

                this._dialog = dialog;
                Telemetry.TelemetryClient.getClient().trackEvent("Main dialog opened");
                dialog.getContributionInstance("copySettingsWizard").then((dialogControlInstance) => {

                    this._dialogControlInstance = <CopySettingsWizard.CopySettingsWizard>dialogControlInstance;

                    this._dialogControlInstance.onCancel(() => {
                        this._dialog.close();
                    });

                    this._dialogControlInstance.onTitleChange((title) => {
                        this._dialog.setTitle(title);
                    });

                    this._dialogControlInstance.onCopy((copySettings: CopySettingsWizard.CopySettings) => {

                        // TODO: inline for now. should be move to it's own function later on to perform the copy and drive the UI

                        this._dialog.close();

                        let board = new Board.BoardConfiguration();
                        board.getCurrentConfiguration(copySettings.source.team.name).then((settings) => {
                            board.applySettings(webContext.team.name, settings).then((result) => {
                                console.log("settings applied");
                            }).catch((reason) => {
                                console.log("apply failed - " + reason);
                            });
                        });

                        // TODO: do work and show progress bar
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