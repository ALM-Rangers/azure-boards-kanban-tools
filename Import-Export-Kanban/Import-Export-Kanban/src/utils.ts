/// <reference path="../typings/index.d.ts" />

import Service = require("VSS/Service");
import CoreRestClient = require("TFS/Core/RestClient");
import CoreContracts = require("TFS/Core/Contracts");

export function getTeams(): Q.Promise<CoreContracts.WebApiTeam[]> {
    let defer = Q.defer<CoreContracts.WebApiTeam[]>();
    let webContext = VSS.getWebContext();
    let client = CoreRestClient.getClient();
    client.getTeams(webContext.project.id).then((teams) => {
        defer.resolve(teams);
    });
    return defer.promise;
}

export function getTeam(teamName: string): Q.Promise<CoreContracts.WebApiTeam> {
    let defer = Q.defer<CoreContracts.WebApiTeam>();
    let webContext = VSS.getWebContext();
    let client = CoreRestClient.getClient();
    client.getTeams(webContext.project.id).then((teams) => {
        let matchedTeams = teams.filter(team => team.name === teamName);
        if (matchedTeams.length > 0) {
            defer.resolve(matchedTeams[0]);
        } else {
            defer.reject("No team found");
        }
    });
    return defer.promise;
}

export function getTeamContext(): CoreContracts.TeamContext {
    let webContext = VSS.getWebContext();
    let teamContext: CoreContracts.TeamContext = {
        project: webContext.project.name,
        projectId: webContext.project.id,
        team: webContext.team.name,
        teamId: webContext.team.id
    };
    return teamContext;
}

export function getContextForTeam(teamName: string): Q.Promise<CoreContracts.TeamContext> {
    let defer = Q.defer<CoreContracts.TeamContext>();
    let webContext = VSS.getWebContext();

    getTeam(teamName).then((team) => {
        let teamContext: CoreContracts.TeamContext = {
            project: webContext.project.name,
            projectId: webContext.project.id,
            team: team.name,
            teamId: team.id
        };
        defer.resolve(teamContext);
    }).catch((reason) => {
        defer.reject(reason);
    });

    return defer.promise;
}