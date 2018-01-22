/// <reference types="vss-web-extension-sdk" />

import { Dialog, ModalDialogO } from "VSS/Controls/Dialogs";
import { KanbanDialog } from "src/KanbanDialog";
import * as Constants from "src/Shared/Constants";

import * as tc from "TelemetryClient";
import { telemetrySettings } from "src/TelemetryClientSettings";

export class KanbanBoardToolsAction {
    private _dialogControlInstance: KanbanDialog;
    private _dialog: IExternalDialog;

    public execute(context) {
        let webContext = VSS.getWebContext();
        VSS.getService<IHostDialogService>(VSS.ServiceIds.Dialog).then(hostDialogService => {
            let extensionContext: IExtensionContext = VSS.getExtensionContext();
            let dialogControlContributionId: string = extensionContext.publisherId + "." + extensionContext.extensionId + ".kanban-wizard";

            let hostDialogOptions: IHostDialogOptions = {
                title: Constants.DefaultDialogTitle,
                width: 700,
                height: 500,
                close: this._closeDialog,
                resizable: true,
                modal: true,
                buttons: null
            };

            hostDialogService.openDialog(dialogControlContributionId, hostDialogOptions, context).then(dialog => {

                this._dialog = dialog;
                tc.TelemetryClient.getClient(telemetrySettings).trackEvent("Dialog opened");
                dialog.getContributionInstance("kanban-wizard").then(dialogControlInstance => {

                    this._dialogControlInstance = <KanbanDialog>dialogControlInstance;
                    this._dialogControlInstance.onValidationUpdated(isValid => {
                        this._dialog.updateOkButton(isValid);
                    });
                    this._dialogControlInstance.show();

                    this._dialogControlInstance.onCancel((refresh?: boolean) => {
                        if (this._dialog) {
                            this._dialog.close();
                        }
                        if (refresh !== null && refresh === true) {
                            VSS.getService<IHostNavigationService>(VSS.ServiceIds.Navigation).then(navigationService => {
                                navigationService.reload();
                            });
                        }
                    });
                });
            });
        });
    }

    private _closeDialog() {
        if (this._dialogControlInstance) {
            this._dialogControlInstance.close();
            this._dialogControlInstance = null;
        }
    }
}

const kanbanMenuHandler = {
    execute: (actionContext) => {
        let action = new KanbanBoardToolsAction();
        action.execute(actionContext);
    }
};

VSS.register("kanban-board-tools-menu", kanbanMenuHandler);