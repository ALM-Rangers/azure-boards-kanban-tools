import * as React from "react";
import { ViewState } from "../Models/DialogInterfaces";
import * as Constants from "../Shared/Constants";
import { ServicesClient } from "../Shared/ServiceClients";
import { Dropdown } from "azure-devops-ui/Dropdown";

import { IBoardColumnDifferences } from "../Models/CopySettingsInterfaces";
import { SelectBacklogLevels } from "../Components/SelectedBacklogLevels";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { Toggle } from "azure-devops-ui/Toggle";
import { AdvancedItemMapping } from "../Components/AdvancedItemMapping";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";

export interface ICopySettingsViewProps {
  selectedCopyAction: ViewState;
  boardId: string;
  panelState: ViewState;
  setPanelState: (panelState: string) => void;
  setCopySettingsLevels: (levels: string[]) => void;
  servicesClient: ServicesClient;
}
interface ICopySettingsViewState {
  commonBacklogLevels: string[];
  selectedBacklogLevels: string[];
  canToggleMappings: boolean;
  showAdvancedMappings: boolean;
  currentMappings: IBoardColumnDifferences[];
  settingsToCopy: string[];
  allProjectTeams: any[];
  backlogsLoading: boolean;
  loadingTeams: boolean;
}

export class CopySettingsView extends React.Component<
  ICopySettingsViewProps,
  ICopySettingsViewState
> {
  constructor(props: ICopySettingsViewProps) {
    super(props);
    this.state = {
      commonBacklogLevels: [],
      selectedBacklogLevels: [],
      canToggleMappings: false,
      showAdvancedMappings: false,
      currentMappings: [],
      settingsToCopy: [
        "card fields",
        "card rules",
        "board columns",
        "swimlanes",
      ],
      allProjectTeams: [],
      backlogsLoading: false,
      loadingTeams: false,
    };
  }

  public componentDidMount() {
    this.props.servicesClient.setViewState(this.props.selectedCopyAction);
    this.setState({ loadingTeams: true });
    this.getTeams();
  }

  public render() {
    const availableTeams: any[] = this.state.allProjectTeams.map(
      (team, index) => {
        return {
          text: team.name,
          id: team.id,
        };
      }
    );

    let label = "";
    if (this.props.selectedCopyAction === ViewState.CopySettingsFromTeam) {
      label = Constants.CopyFromTeamLabel;
    } else if (this.props.selectedCopyAction === ViewState.CopySettingsToTeam) {
      label = Constants.CopyToTeamLabel;
    }

    let teamDropDownContent: JSX.Element;
    if (this.state.loadingTeams) {
      teamDropDownContent = (
        <Spinner
          size={SpinnerSize.medium}
          label={Constants.LoadingTeamsLabel}
        />
      );
    } else {
      if (availableTeams.length === 0) {
        teamDropDownContent = (
          <>
            <Dropdown
              placeholder="No teams to select"
              ariaLabel={label}
              items={availableTeams}
              loading={availableTeams.length === 0}
            />
          </>
        );
      } else {
        teamDropDownContent = (
          <>
            <Dropdown
              placeholder="Select an Team"
              ariaLabel={label}
              items={availableTeams}
              onSelect={this._onSelectTeam}
              loading={availableTeams.length === 0}
            />
          </>
        );
      }
    }

    return (
      <div>
        <div className="formContent">
          <div>
            <div>
              <span>{label}</span>
            </div>
            <div>{teamDropDownContent}</div>
          </div>
        </div>
        <div className="formContent">
          <SelectBacklogLevels
            availableLevels={this.state.commonBacklogLevels}
            selectedLevels={this.state.selectedBacklogLevels}
            isLoading={this.state.backlogsLoading}
            selectedSettings={this.state.settingsToCopy}
            label={Constants.ApplySettingsLevelsLabel}
            onBacklogLevelSelected={this._onSelectBacklogLevel}
          />
        </div>

        <div className="formContent">
          <div>
            <div>
              <span>{Constants.EnableAdvancedMappings}</span>
            </div>
            <Toggle
              checked={this.state.showAdvancedMappings}
              onChange={this._onOpenAdvancedMappings}
              ariaLabel={Constants.EnableAdvancedMappings}
              disabled={
                !this.state.canToggleMappings || this.state.backlogsLoading
              }
            />
          </div>
        </div>
        <div>
          <AdvancedItemMapping
            show={this.state.showAdvancedMappings}
            headerText={Constants.MappingsHeader}
            onClosed={this._onAdvancedMappingClosed}
            mappings={this.state.currentMappings}
            onMappingChanged={this._onMappingChanged}
            selectedLevels={this.state.selectedBacklogLevels}
          />
        </div>
      </div>
    );
  }

  public startCopy() {
    const levels = this.state.selectedBacklogLevels;
    this.props.setCopySettingsLevels(levels);
  }

  private getTeams = async () => {
    await this.props.servicesClient.loadCurrentTeam();
    let teams = await this.props.servicesClient.getTeamsAsync(true);
    this.setState({ allProjectTeams: teams, loadingTeams: false });
  };

  private _onSelectTeam = (event: React.SyntheticEvent<HTMLElement>, item: IListBoxItem<{}>) => {

    let selectedTeam = item.text;
    if (selectedTeam) {
      this.setState({ backlogsLoading: true });

      this.props.servicesClient
        .loadSelectedTeam(selectedTeam)
        .then(() => {
          let defaultBoardLevel = [];
          defaultBoardLevel.push(this.props.servicesClient.currentBacklogLevel);
          let canToggleMappings =
            this._canEnableAdvancedMapping() || defaultBoardLevel.length > 0;
          this.setState({
            commonBacklogLevels:
              this.props.servicesClient.commonBackgroundLevels,
            currentMappings: this.props.servicesClient.currentMappings,
            selectedBacklogLevels: defaultBoardLevel,
            backlogsLoading: false,
            canToggleMappings: canToggleMappings,
          });
        });
    }
  };

  private _onSelectBacklogLevel = (level: string, isSelected: boolean) => {
    this.selectBacklogLevel(level, isSelected);
  };

  private _onOpenAdvancedMappings = (event, value) => {
    // Telemetry.Client().trackEvent(Constants.TelemetryAdvancedMapping);
    let canToggleMappings = this._canEnableAdvancedMapping();
    this.setState({
      canToggleMappings: canToggleMappings,
      showAdvancedMappings: value,
    });
  };

  private _onAdvancedMappingClosed = () => {
    // this._copySettingsActionsCreator.enabledAdvancedMappings(false);
  };

  private _onMappingChanged = (selectedId: string, sourceId: string) => {
    let currentMapping = this.state.currentMappings;
    let found = false;
    for (
      let backlogIndex = 0;
      backlogIndex < currentMapping.length;
      backlogIndex++
    ) {
      let backlog = currentMapping[backlogIndex];
      for (
        let mappingIndex = 0;
        mappingIndex < backlog.mappings.length;
        mappingIndex++
      ) {
        let mapping = backlog.mappings[mappingIndex];
        if (mapping.targetColumn && mapping.targetColumn.id === sourceId) {
          const newMapping = mapping.potentialMatches.filter(
            (m) => m.id === selectedId
          )[0];
          mapping.sourceColumn = newMapping;
          found = true;
          break;
        }
      }
      if (found) {
        break;
      }
    }

    this.setState({ currentMappings: currentMapping });
  };

  private _canEnableAdvancedMapping(): boolean {
    return (
      this.state.selectedBacklogLevels &&
      this.state.selectedBacklogLevels.length > 0
    );
  }

  public selectBacklogLevel(backlogLevel: string, isSelected: boolean) {
    let currentLevels = this.state.selectedBacklogLevels;

    if (isSelected) {
      currentLevels.push(backlogLevel);
      this.setState({ selectedBacklogLevels: currentLevels });
    } else {
      const currentIndex = currentLevels.indexOf(backlogLevel);
      if (currentIndex > -1) {
        currentLevels.splice(currentIndex, 1);
      }
      this.setState({ selectedBacklogLevels: currentLevels });
    }
    this.props.setCopySettingsLevels(currentLevels);
    let canToggleMappings = this._canEnableAdvancedMapping();
    this.setState({ canToggleMappings: canToggleMappings });
  }
}
