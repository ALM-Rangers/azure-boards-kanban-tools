import * as React from "react";

import { DialogActionsCreator } from "src/Views/Dialog/Actions/DialogActionsCreator";
import { ViewState, DialogState } from "src/Views/Dialog/Models/DialogInterfaces";
import { SelectAction, IActionOption } from "src/Views/Dialog/Components/SelectAction";
import { CommonDialogState } from "src/Views/Dialog/Stores/DialogStoreHub";
import { CopySettingsView } from "src/Views/CopySettings/Components/CopySettingsView";
import { DialogButtons } from "src/Views/Dialog/Components/DialogButtons";
import { css } from "office-ui-fabric-react/lib/Utilities";
import * as Constants from "src/Shared/Constants";
import { ProgressView } from "src/Views/Progress/Components/ProgressView";

export interface IDialogContentProps {
    dialogActionsCreator: DialogActionsCreator;
    state: CommonDialogState;
    onDialogCanceled: (refresh?: boolean) => void;
}

export class DialogContent extends React.Component<IDialogContentProps, {}> {
    private _copySettingsRef: CopySettingsView;
    private _refreshView: boolean;

    constructor(props: IDialogContentProps) {
        super(props);
    }

    public render() {
        return (
            <div className="dialog-container fullHeight">
                <div className={css("dialog-body")}>
                    {this._renderActions()}
                    {this._renderDialogContent()}
                    {this._renderProgressView()}
                </div>
                {this._renderDialogButtons()}
            </div>
        );
    }

    private _renderProgressView() {
        let message = "";
        let submessage = "";
        let showSpinner = false;
        if (this.props.state.dialogState.view !== ViewState.IsPerformingAction && this.props.state.dialogState.view !== ViewState.ActionComplete) {
            return null;
        } else if (this.props.state.dialogState.view === ViewState.IsPerformingAction) {
            message = Constants.CopySettingsMessage;
            submessage = Constants.CopySettingsSubtitle;
            showSpinner = true;
        } else if (this.props.state.dialogState.view === ViewState.ActionComplete) {
            message = Constants.AllDoneMessage;
        }
        return (
            <ProgressView
                message={message}
                showSpinner={showSpinner}
                submessage={submessage} />
        );
    }

    private _renderDialogButtons() {
        let showCancel = true;
        let buttonText = Constants.DefaultOkButton;
        let enabled = false;
        switch (this.props.state.dialogState.view) {
            case ViewState.IsPerformingAction:
                enabled = false;
                showCancel = false;
                buttonText = Constants.DoneButton;
                break;
            case ViewState.ActionComplete:
                enabled = true;
                showCancel = false;
                buttonText = Constants.DoneButton;
                break;
            default:
                enabled = this.props.state.dialogState.isDialogValid;
                break;
        }
        if (this.props.state.dialogState.view === ViewState.IsPerformingAction || this.props.state.dialogState.view === ViewState.ActionComplete) {
            showCancel = false;
            buttonText = Constants.DoneButton;
        }
        return (
            <div className={css("dialog-button-pane")}>
                <DialogButtons
                    enabled={enabled}
                    showCancelButton={showCancel}
                    okButtonText={buttonText}
                    okButtonClicked={this._onDialogOkClicked}
                    cancelButtonClicked={this._onDialogCancelClicked} />
            </div>
        );
    }

    private _renderDialogContent() {
        if (this.props.state.dialogState.view === ViewState.CopySettingsFromTeam || this.props.state.dialogState.view === ViewState.CopySettingsToTeam) {
            return (
                <CopySettingsView
                    ref={(view) => { this._copySettingsRef = view; }}
                    sharedActions={this.props.dialogActionsCreator}
                    sharedState={this.props.state} />
            );
        }
    }

    private _renderActions() {
        if (this.props.state.dialogState.view === ViewState.IsPerformingAction || this.props.state.dialogState.view === ViewState.ActionComplete) {
            return null;
        }
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
        switch (this.props.state.dialogState.view) {
            case ViewState.ActionComplete:
                this.props.onDialogCanceled(this._refreshView);
                break;
            case ViewState.CopySettingsFromTeam:
                this._refreshView = true;
                this._copySettingsRef.startCopy();
                break;
            case ViewState.CopySettingsToTeam:
                this._copySettingsRef.startCopy();
                break;
        }
    }

    private _onDialogCancelClicked = () => {
        this.props.onDialogCanceled(false);
    }
}