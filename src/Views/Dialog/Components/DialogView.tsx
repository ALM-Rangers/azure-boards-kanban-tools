import * as React from "react";
import { autobind } from "office-ui-fabric-react/lib/Utilities";
import { DialogState } from "src/Views/Dialog/Models/DialogInterfaces";
import { DialogStoreHub, CommonDialogState } from "src/Views/Dialog/Stores/DialogStoreHub";
import { DialogActionsCreator } from "src/Views/Dialog/Actions/DialogActionsCreator";
import { DialogActionsHub } from "src/Views/Dialog/Actions/DialogActions";
import { DialogContent } from "src/Views/Dialog/Components/DialogContent";

import "./DialogView.scss";

export interface IDialogViewProps { }

export class DialogView extends React.Component<IDialogViewProps, CommonDialogState> {
    private _dialogActionsCreator: DialogActionsCreator;
    private _dialogStoreHub: DialogStoreHub;

    constructor(props: IDialogViewProps) {
        super(props);

        const dialogActionsHub = new DialogActionsHub();
        this._dialogStoreHub = new DialogStoreHub(dialogActionsHub);
        this._dialogActionsCreator = new DialogActionsCreator(dialogActionsHub);

        this.state = this._dialogStoreHub.state;
    }

    public componentDidMount() {
        this._dialogStoreHub.dialogStore.addChangedListener(this._updateDialogState);
    }

    public componentWillUnmount() {
        this._dialogStoreHub.dialogStore.removeChangedListener(this._updateDialogState);
    }

    public render() {
        return (
            <DialogContent dialogActionsCreator={this._dialogActionsCreator} state={this._dialogStoreHub.state} />
        );
    }

    private _updateDialogState = () => {
        this.setState(this._dialogStoreHub.state);
    }
}