import * as React from "react";

import { DialogActionsCreator } from "src/Views/Dialog/Actions/DialogActionsCreator";
import { ViewState, DialogState } from "src/Views/Dialog/Models/DialogInterfaces";
import { SelectAction, IActionOption } from "src/Views/Dialog/Components/SelectAction";
import { CommonDialogState } from "src/Views/Dialog/Stores/DialogStoreHub";
import { CopySettingsView } from "src/Views/CopySettings/Components/CopySettingsView";
import * as Constants from "src/Shared/Constants";

export interface IDialogContentProps {
    dialogActionsCreator: DialogActionsCreator;
    state: CommonDialogState;
}

export class DialogContent extends React.Component<IDialogContentProps, {}> {
    private test: string;

    constructor(props: IDialogContentProps) {
        super(props);
    }

    public render() {
        this.test = "test";
        return (
            <div className="dialogContent fullHeight">
                {this._renderActions()}
                {this._renderDialogContent()}
            </div>
        );
    }

    private _renderDialogContent() {
        if (this.props.state.dialogState.view === ViewState.CopySettingsFromTeam || this.props.state.dialogState.view === ViewState.CopySettingsToTeam) {
            return (
                <CopySettingsView sharedActions={this.props.dialogActionsCreator} sharedState={this.props.state} />
            );
        }
    }

    private _renderActions() {
        const options: IActionOption[] = [
            { key: ViewState.CopySettingsFromTeam.toString(), value: Constants.CopySettingsFromTeamLabel },
            { key: ViewState.CopySettingsToTeam.toString(), value: Constants.CopySettingsToTeamLabel }
        ];

        return (
            <SelectAction
                availableOptions={options}
                label={Constants.KanbanActionLabel}
                placeHolder={Constants.KanbanActionPlaceholder}
                onSelectAction={this._onSelectDialogAction} />
        );
    }

    private _onSelectDialogAction = (action: string) => {
        this.props.dialogActionsCreator.setCurrentView(action);
    }
}