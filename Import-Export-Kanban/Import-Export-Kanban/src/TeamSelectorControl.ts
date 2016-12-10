/// <reference path="../typings/index.d.ts" />

import UIControls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import CoreRestClient = require("TFS/Core/RestClient");
import Contracts = require("TFS/Core/Contracts");


export enum TeamSelectionMode {
    SingleSelection,
    MultiSelection
}

interface TeamsMap {
    [teamId: string]: Contracts.WebApiTeam
}

export interface TeamSelectorOptions {
    selectionType?: TeamSelectionMode;
    selectionChanged?: (numberSelectedTeams: number) => void;
    dataLoaded?: () => void;
}

/**
 * Team selector control.
 *
 * Adds a filter text box and the list of a team project teams (order by alphabeticall order).
 *
 * Supports to modes of operation. Single team selection or multiple team selection (the mode can be changed at runtime)
 *
 * The team list is loaded asynchronously
 *
 * @param {TeamSelectorOptions} options - The 
 */
export class TeamSelectorControl extends UIControls.BaseControl {

    // List of teams, indexed by team id
    private _teamsList: TeamsMap = {};
    private _selectionMode: TeamSelectionMode;
    private _isInitialized: boolean;

    constructor(options: TeamSelectorOptions) {
        super(options);

        this._selectionMode = options.selectionType || TeamSelectionMode.SingleSelection;
    }

    initialize() {
        super.initialize();
        this._createControl();
        this._fetchTeams();
    }

    _createControl(): void {
        this._createFilterBoxElement();
    }

    /**
     * Fetches teams for the current team project.
     *
     * The data is fetched asynchronously
     *
     * After the data is fetched the list of missing controls ared added to the UI and the list of teams is painted and the onDataLoaded client
     * callback is called (if setup)
     */
    private _fetchTeams(): void {
        let webContext = VSS.getWebContext();

        let client = CoreRestClient.getClient();

        client.getTeams(webContext.project.id).then((teams) => {

            this._createNumberSelectedTeamsCounterElement();
            this._createTeamListElement(teams);

            this._setNumberSelectedTeamsCounter(0);

            this._isInitialized = true;

            if (this._options.dataLoaded) {
                this._options.dataLoaded();
            }
        });
    }

    /**
     * Adds the filter input box to the control.
     *
     * Adds the HTML input and adds the event to filter teams when user types into the input box
     */
    private _createFilterBoxElement(): void {
        let $searchBox = $("<div/>");

        $('<input type="text" class="text-filter-input" title= "Filter" tabindex= "0" placeholder= "Filter" ></div>')
            .on('input', (e) => {
                this._onChangeFilter($(e.target).val());
            })
            .appendTo($searchBox);

        $searchBox.appendTo(this._element);
    }

    /**
     * adds the container for the number of selected teams counter
     */
    private _createNumberSelectedTeamsCounterElement(): void {
        $("<div id='" + this._getNumberSelectedTeamCounterId() + "' />").appendTo(this._element);
    }

    /**
     * Adds the teams to the UI
     *
     * The teams are added by alphabetical order
     *
     * @param {Contracts.WebApiTeam[]} teams - the list of teams
     * @returns
     */
    private _createTeamListElement(teams: Contracts.WebApiTeam[]): void {

        let $teamsContainer = $("<div class='teamSelectorContainer'/>").appendTo(this._element);

        teams.sort((t1, t2) => {
            return t1.name.localeCompare(t2.name);
        }).forEach((team) => {
            this._teamsList[team.id] = team;
            this._createTeamElement($teamsContainer, team);
        });
    }

    /**
     * Add adds a team to the UI
     *
     * The team is appended with an input selector (radio box or checkbox) and the team name.
     *
     * @param {any} container - The container where the team element will be appended to
     * @param {any} team - The team to add
     */
    private _createTeamElement(container: any, team: Contracts.WebApiTeam): void {
        let $div = $("<div class='TeamItem' id='" + this._getTeamId(team) + "'/>")
            .append(this._getTeamInputElement(team))
            .append(this._getLabelElement(team));

        $div.appendTo(container);
    }

    /**
     * Gets the team ID to be used on HTML elements
     *
     * @param team - the team
     * @returns a string with the unique team identifier
     */
    private _getTeamId(team): string {
        return "Team-" + this._getUniqueId() + team.id;
    }

    /**
     * Gets the identifier of the container that has the number of selected projects counter
     * 
     */
    private _getNumberSelectedTeamCounterId(): string {
        return "ctr" + this._getUniqueId();
    }

    /**
     * Gets the input identifier for a given team to be used in HTML input element.
     *
     * @param team - the team
     * @returns a string with the unique team input identifier
     */
    private _getInputId(team): string {
        return "i" + this._getUniqueId() + team.id;
    }

    /**
     * Gets the name to be used in the teams input.
     *
     * The name is the same regardless of the team (but is unique for the instance of the control)
     *
     * @returns an unique name to be used in the inputs
     */
    private _getInputName(): string {
        return "n" + this._getUniqueId();
    }

    /**
     * Gets the HTML label element for a team.
     *
     * The element that represents how the team name is visible for the user.
     *
     * Besides the team name, it also has the team description as a tooltip
     *
     * @param team - the team
     * @returns the jquery element for the label
     */
    private _getLabelElement(team: Contracts.WebApiTeam): JQuery {
        return $("<label/>")
            .attr("for", this._getInputId(team))
            .attr("title", team.description)
            .text(team.name);
    }

    /**
     * Gets the HTML with the input used to select a team
     *
     * @param {any} team - the team
     * @returns
     */
    private _getTeamInputElement(team: Contracts.WebApiTeam): JQuery {

        return $("<input />")
            .attr("type", this._selectionMode === TeamSelectionMode.SingleSelection ? "radio" : "checkbox")
            .attr("id", this._getInputId(team))
            .attr("data-team-id", team.id)
            .attr("name", this._getInputName())
            .attr("value", team.id)
            .click(() => { this._onChanged(); });
    }

    /**
     * Sets the the visibility of a team.
     *
     * Shows or hides a team (along with the input selector)
     *  
     * @param team - the team 
     * @param {boolean} isVisible - predicate that indicates if the team is visible
     */
    private _setTeamVisibility(team: Contracts.WebApiTeam, isVisible: boolean): void {
        if (isVisible) {
            this._element.find("#" + this._getTeamId(team)).show();
        } else {
            this._element.find("#" + this._getTeamId(team)).hide();
        }
    }

    /**
     * Updates the number of selected teams counter
     *
     * @param {number} numberSelectedTeams - The number of selected teams
     */
    private _setNumberSelectedTeamsCounter(numberSelectedTeams: number): void {
        let teamPlural = numberSelectedTeams > 1 ? "s" : "";
        this._element.find("#" + this._getNumberSelectedTeamCounterId()).text(numberSelectedTeams + " Selected Team" + teamPlural);
    }
    
    /**
     * Event that is called everytime a team selection changes (either a selection or unselection).
     *
     * Calls the client callback if it set up
     */
    private _onChanged() {
        let numberSelectedTeams = this.getNumberSelectedTeams();

        this._setNumberSelectedTeamsCounter(numberSelectedTeams);

        if (this._options.selectionChanged) {
            this._options.selectionChanged(numberSelectedTeams);
        }
    }

    /**
     * Event that is called everytime the user changes the value in the filter box
     *
     * Makes sure the teams (by name) that fullfills the user filter are visible and the
     * others that are not are hidden.
     *
     * The filter is case insensitive
     * 
     * @param {string} searchValue - the value entered into the filter box
     */
    private _onChangeFilter(searchValue: string) {

        searchValue = searchValue.toLowerCase();

        for (let teamId of Object.keys(this._teamsList)) {
            let team = this._teamsList[teamId];

            this._setTeamVisibility(team, searchValue === "" || team.name.toLowerCase().indexOf(searchValue) !== -1);
        }
    }

    /**
     * Returns the number of currently selected teams
     *
     * @returns The number of currently selected teams
     */
    public getNumberSelectedTeams(): number {

        if (this._isInitialized === false) return 0;

        if (this._selectionMode === TeamSelectionMode.SingleSelection) {
            if ($('input[name="' + this._getInputName() + '"]').is(':checked'))
                return 1;
        } else {
            let numberSelected = 0;
            this._element.find('input[name="' + this._getInputName() + '"]').each((idx, element) => {
                if (element.checked)
                    numberSelected++;
            });

            return numberSelected;
        }

        return 0;
    }

    /**
     * Gets the list of currently selected teams.
     *
     * @returns - The list of teams
     */
    public getSelectedTeams(): Contracts.WebApiTeam[] {

        let selectedTeams: Contracts.WebApiTeam[] = [];

        this._element.find('input[name="' + this._getInputName() + '"]').each((idx, element) => {
            if (element.checked) {
                let teamId = $(element).attr("data-team-id");

                selectedTeams.push(this._teamsList[teamId]);
            }
        });

        return selectedTeams;
    }

    /**
     * Change the selection type.
     *
     * When switching from single to multiple selections, if there is a selected team then it will be kept
     * When switching from multiple to single selection, if there is more than one selected team then only one will be kept
     *
     * @param {TeamSelectionType} mode
     */
    public changeSelectionType(mode: TeamSelectionMode) {
        if (mode === this._selectionMode || this._isInitialized === false) return;

        // toggles check fox to radio or vice verse dependingon the current mode.
        $('input[name="' + this._getInputName() + '"]').attr("type", this._selectionMode === TeamSelectionMode.SingleSelection ? "checkbox" : "radio");

        this._selectionMode = mode;
    }
}