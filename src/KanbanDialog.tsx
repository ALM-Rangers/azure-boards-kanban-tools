import * as React from "react";
import * as ReactDOM from "react-dom";
import * as tc from "TelemetryClient";

import { initializeIcons } from "@uifabric/icons";

import { DialogView } from "src/Views/Dialog/Components/DialogView";
import "./KanbanDialog.scss";

import { Telemetry } from "src/TelemetryClientSettings";
import * as Constants from "src/Shared/Constants";

export class KanbanDialog {
    private _onValidationUpdated: (isValid: boolean) => void;
    private _onCancel: (refresh?: boolean) => void;
    private kanbanDialogNode: HTMLElement;

    public show() {
        const configuration = VSS.getConfiguration();
        const boardId = configuration.id;
        Telemetry.Client().trackEvent(Constants.TelemetryDialogOpened);
        this.kanbanDialogNode = document.getElementById("dialogContent");
        ReactDOM.render(<DialogView id={boardId} onCanceled={this._onDialogCanceled} />, this.kanbanDialogNode);
    }

    public close() {
        ReactDOM.unmountComponentAtNode(this.kanbanDialogNode);
        if (this.kanbanDialogNode.remove) {
            this.kanbanDialogNode.remove();
        }
    }

    public dispose() {
        ReactDOM.unmountComponentAtNode(this.kanbanDialogNode);
        if (this.kanbanDialogNode.remove) {
            this.kanbanDialogNode.remove();
        }
    }

    public onValidationUpdated(callback: (isValid: boolean) => void) {
        this._onValidationUpdated = callback;
    }

    public onCancel(callback: (refresh?: boolean) => void) {
        this._onCancel = callback;
    }

    private _onDialogCanceled = (refreshPage?: boolean) => {
        if (this._onCancel) {
            this._onCancel(refreshPage);
        }
    }
}

initializeIcons();

VSS.register("kanban-wizard", function (context) {
    return new KanbanDialog();
});