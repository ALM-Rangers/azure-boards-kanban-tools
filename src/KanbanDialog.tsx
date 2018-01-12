import * as React from "react";
import * as ReactDOM from "react-dom";

import { initializeIcons } from "@uifabric/icons";

import { DialogView } from "src/Views/Dialog/Components/DialogView";
import "./KanbanDialog.scss";

export class KanbanDialog {
    private _onValidationUpdated: (isValid: boolean) => void;
    private _onCancel: () => void;
    private kanbanDialogNode: HTMLElement;

    public show() {
        const configuration = VSS.getConfiguration();
        const boardId = configuration.id;
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

    public onCancel(callback: () => void) {
        this._onCancel = callback;
    }

    // private _onIsValidUpdate = (isValid: boolean) => {
    //     if (this._onValidationUpdated) {
    //         this._onValidationUpdated(isValid);
    //     }
    // }

    private _onDialogCanceled = () => {
        if (this._onCancel) {
            this._onCancel();
        }
    }
}

initializeIcons();

VSS.register("kanban-wizard", function (context) {
    return new KanbanDialog();
});