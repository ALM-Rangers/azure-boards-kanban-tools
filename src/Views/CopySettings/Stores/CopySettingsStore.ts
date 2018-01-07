import * as VSSStore from "VSS/Flux/Store";
import * as CoreContracts from "TFS/Core/Contracts";
import { CopySettingsState } from "src/Views/CopySettings/Models/CopySettingsInterfaces";
import { IBoardSettings } from "src/Views/CopySettings/Models/CopySettingsInterfaces";

export class CopySettingsStore extends VSSStore.Store {
    public state: CopySettingsState = {
        teamsLoading: false,
        backlogsLoading: false,
        availableTeams: [],
        commonBacklogLevels: null,
        selectedBacklogLevels: null,
        canToggleMappings: false,
        showAdvancedMappings: false
    };

    public onSetTeamsLoading = (loading: boolean) => {
        this.state.teamsLoading = loading;
        this.emitChanged();
    }

    public onSetBacklogsLoading = (loading: boolean) => {
        this.state.backlogsLoading = loading;
        this.emitChanged();
    }

    public onSetAvailableTeams = (teams: CoreContracts.WebApiTeam[]) => {
        this.state.availableTeams = teams;
        this.emitChanged();
    }

    public onSetAvailableBacklogLevels = (levels: string[]) => {
        this.state.commonBacklogLevels = levels;
        this.emitChanged();
    }

    public onSetSelectedBacklogLevels = (levels: string[]) => {
        this.state.selectedBacklogLevels = levels;
        this.emitChanged();
    }

    public onSetCanDoAdvancedMapping = (flag: boolean) => {
        this.state.canToggleMappings = flag;
        this.emitChanged();
    }

    public onSetShowAdvancedMapping = (flag: boolean) => {
        this.state.showAdvancedMappings = flag;
        this.emitChanged();
    }
}