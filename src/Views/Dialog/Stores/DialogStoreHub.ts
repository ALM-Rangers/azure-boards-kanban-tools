import { DialogActionsHub } from "src/Views/Dialog/Actions/DialogActions";
import { DialogStore } from "src/Views/Dialog/Stores/DialogStore";
import { DialogState } from "src/Views/Dialog/Models/DialogInterfaces";

export interface CommonDialogState {
    dialogState: DialogState;
}

export class DialogStoreHub implements IDisposable {
    public dialogStore: DialogStore;

    constructor(
        private _dialogActionsHub: DialogActionsHub,
        private _initialBoard: string
    ) {
        this.dialogStore = this._createDialogStore();
    }

    private _createDialogStore() {
        const dialogStore = new DialogStore(this._initialBoard);
        this._dialogActionsHub.selectViewState.addListener(dialogStore.onSetViewState);
        this._dialogActionsHub.setDialogValidState.addListener(dialogStore.onSetDialogValid);
        return dialogStore;
    }

    private _disposeDialogStore() {
        if (!this.dialogStore) {
            return;
        }
        this._dialogActionsHub.selectViewState.removeListener(this.dialogStore.onSetViewState);
        this._dialogActionsHub.setDialogValidState.removeListener(this.dialogStore.onSetDialogValid);
    }

    public get state(): CommonDialogState {
        return {
            dialogState: this.dialogStore.state
        };
    }

    public dispose() {
        this._disposeDialogStore();
    }
}