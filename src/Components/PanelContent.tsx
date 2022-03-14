import * as React from "react";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { WebApiTeam } from "azure-devops-extension-api/Core";

import { ViewState } from "../Models/DialogInterfaces";
import * as Constants from "../Shared/Constants";

import { CopySettingsView } from "../Components/CopySettingsView";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { css } from "azure-devops-ui/Util";
import { ProgressView } from "../Components/ProgressView";
import { DialogButtons } from "../Components/DialogButtons";
import { ServicesClient } from "../Shared/ServiceClients";

import "../Components/PanelContent.scss";

export interface IPanelContentProps {
  boardId: string;
  ready?: boolean;
  closeDialog: (close: boolean) => void;
}

interface IPanelContentState {
  selectedAction: ViewState;
  allProjectTeams: WebApiTeam[];
  selectedTeam: string;
  panelState: ViewState;
  selectedBacklogLevels: string[];
}

export class PanelContent extends React.Component<
  IPanelContentProps,
  IPanelContentState
> {
  private initialSelectedAction = new DropdownSelection();
  private servicesClient: ServicesClient;

  constructor(props: IPanelContentProps) {
    super(props);
    this.state = {
      selectedAction: ViewState.CopySettingsToTeam,
      allProjectTeams: [],
      selectedTeam: undefined,
      panelState: ViewState.CopySettingsToTeam,
      selectedBacklogLevels: [],
    };
    this.initialSelectedAction.select(this.state.selectedAction);
    this.servicesClient = new ServicesClient(this.props.boardId);
  }
  public render(): JSX.Element {
    return (
      <div className="dialog-container fullHeight">
        <div className={css("dialog-body")}>
          {this._renderActions()}
          {this.props.ready && this._renderDialogContent()}
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
    if (
      this.state.panelState !== ViewState.IsPerformingAction &&
      this.state.panelState !== ViewState.ActionComplete
    ) {
      return null;
    } else if (this.state.panelState === ViewState.IsPerformingAction) {
      message = Constants.CopySettingsMessage;
      submessage = Constants.CopySettingsSubtitle;
      showSpinner = true;
    } else if (this.state.panelState === ViewState.ActionComplete) {
      message = Constants.AllDoneMessage;
    }
    return (
      <ProgressView
        message={message}
        showSpinner={showSpinner}
        submessage={submessage}
      />
    );
  }

  private _renderActions() {
    if (
      this.state.panelState === ViewState.IsPerformingAction ||
      this.state.panelState === ViewState.ActionComplete
    ) {
      return null;
    }

    return (
      <>
        <div>
          <div className="formContent">
            <span>{Constants.KanbanActionLabel}</span>
            <Dropdown
              ariaLabel={Constants.KanbanActionLabel}
              items={[
                {
                  id: ViewState.CopySettingsFromTeam.toString(),
                  text: Constants.CopySettingsFromTeamLabel,
                },
                {
                  id: ViewState.CopySettingsToTeam.toString(),
                  text: Constants.CopySettingsToTeamLabel,
                },
              ]}
              selection={this.initialSelectedAction}
              onSelect={this._onSelect}
            />
          </div>
        </div>
      </>
    );
  }

  private _renderDialogContent() {
    if (
      this.state.panelState === ViewState.CopySettingsFromTeam ||
      this.state.panelState === ViewState.CopySettingsToTeam
    ) {
      return (
        <CopySettingsView
          boardId={this.props.boardId}
          selectedCopyAction={this.state.selectedAction}
          panelState={this.state.panelState}
          setPanelState={this._setPanelState}
          setCopySettingsLevels={this._setCopySettingsLevels}
          servicesClient={this.servicesClient}
        />
      );
    }
  }

  private _renderDialogButtons() {
    let showCancel = true;
    let buttonText = Constants.DefaultOkButton;
    let enabled = false;
    switch (this.state.panelState) {
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
        enabled = true;
        break;
    }
    if (
      this.state.panelState === ViewState.IsPerformingAction ||
      this.state.panelState === ViewState.ActionComplete
    ) {
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
          cancelButtonClicked={this._onDialogCancelClicked}
        />
      </div>
    );
  }

  private _setPanelState = (panelState: string) => {
    switch (panelState) {
      case ViewState.CopySettingsToTeam.toString(): {
        this.setState({ panelState: ViewState.CopySettingsToTeam });
        break;
      }
      case ViewState.CopySettingsFromTeam.toString(): {
        this.setState({ panelState: ViewState.CopySettingsFromTeam });
        break;
      }
      case ViewState.IsPerformingAction.toString(): {
        this.setState({ panelState: ViewState.IsPerformingAction });
        break;
      }
      case ViewState.ActionComplete.toString(): {
        this.setState({ panelState: ViewState.ActionComplete });
        break;
      }
    }
  };
  private _onSelect = (
    event: React.SyntheticEvent<HTMLElement>,
    item: IListBoxItem<{}>
  ) => {
    this._setPanelState(item.text);
    this.setState({ selectedAction: ViewState[item.id] || "" });
  };

  public _setCopySettingsLevels(levels: string[]) {
    this.setState({ selectedBacklogLevels: levels });
  }

  public _copySettings() {
    this._setPanelState(ViewState.IsPerformingAction.toString());
    this.servicesClient
      .applyTeamSettingsAsync(this.state.selectedBacklogLevels)
      .then((result) => {
        this._setPanelState(ViewState.ActionComplete.toString());
      });
  }

  private _onDialogOkClicked = () => {
    switch (this.state.panelState) {
      case ViewState.ActionComplete:
        this.props.closeDialog(true);
        break;
      case ViewState.CopySettingsFromTeam:
        this._copySettings();
        break;
      case ViewState.CopySettingsToTeam:
        this._copySettings();
        break;
    }
  };

  private _onDialogCancelClicked = () => {
    this.props.closeDialog(true);
  };
}
