import * as React from "react";

import { DialogActionsCreator } from "src/Views/Dialog/Actions/DialogActionsCreator";
import { ViewState, DialogState } from "src/Views/Dialog/Models/DialogInterfaces";
import { SelectAction, IActionOption } from "src/Views/Dialog/Components/SelectAction";
import { CommonDialogState } from "src/Views/Dialog/Stores/DialogStoreHub";
import { CopySettingsView } from "src/Views/CopySettings/Components/CopySettingsView";
import { DialogButtons } from "src/Views/Dialog/Components/DialogButtons";
import { css } from "office-ui-fabric-react/lib/Utilities";
import * as Constants from "src/Shared/Constants";

export interface IDialogContentProps {
    dialogActionsCreator: DialogActionsCreator;
    state: CommonDialogState;
    onDialogCanceled: () => void;
}

export class DialogContent extends React.Component<IDialogContentProps, {}> {
    constructor(props: IDialogContentProps) {
        super(props);
    }

    public render() {
        return (
            <div className="dialog-container fullHeight">
                <div className={css("dialog-body")}>
                    {this._renderActions()}
                    {this._renderDialogContent()}
                </div>
                {this._renderDialogButtons()}
            </div>
        );
    }

    private _renderDialogButtons() {
        return (
            <div className={css("dialog-button-pane")}>
                <DialogButtons
                    enabled={this.props.state.dialogState.isDialogValid}
                    okButtonClicked={this._onDialogOkClicked}
                    cancelButtonClicked={this._onDialogCancelClicked}/>
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

    private _onDialogOkClicked = () => {

    }

    private _onDialogCancelClicked = () => {
        this.props.onDialogCanceled();
    }
}