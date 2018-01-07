import * as React from "react";
import * as ReactDOM from "react-dom";

import { initializeIcons } from "@uifabric/icons";

import { DialogView } from "src/Views/Dialog/Components/DialogView";

export interface KanbanDialogOptions {
    onClose?: () => void;
}

export class KanbanDialog {
    private _onValidationUpdated: (isValid: boolean) => void;
    private kanbanDialogNode: HTMLElement;

    public show(options?: KanbanDialogOptions) {
        this.kanbanDialogNode = document.getElementById("dialogContent");
        ReactDOM.render(<DialogView {...options} />, this.kanbanDialogNode);
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
}

initializeIcons();

VSS.register("kanban-wizard", function (context) {
    return new KanbanDialog();
});