import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IHostPageLayoutService,
  IPanelOptions,
  PanelSize,
  IProjectPageService,
} from "azure-devops-extension-api";
import * as Constants from "./Shared/Constants";

export class KanbanBoardToolsAction {
  async getProjectInfo() {
    const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();
    return project;
  }
  public async execute(context: any) {
    const project = await this.getProjectInfo();
    SDK.getService<IHostPageLayoutService>(
      CommonServiceIds.HostPageLayoutService,
    ).then((hostDialogService) => {
      const extensionContext = SDK.getExtensionContext();

      const dialogControlContributionId: string =
        extensionContext.publisherId +
        "." +
        extensionContext.extensionId +
        ".kanban-wizard";

      const hostDialogOptions: IPanelOptions<{}> = {
        title: Constants.DefaultDialogTitle,
        onClose: this._closeDialog,
        size: PanelSize.Medium,
        configuration: {
          project: {
            id: project.id,
            name: project.name,
          },
          team: {
            id: context.team.id,
            name: context.team.name,
          },
        },
      };

      hostDialogService.openPanel(dialogControlContributionId, hostDialogOptions);
    });
  }

  private _closeDialog() {
    console.log("trying to close");
  }
}
const kanbanMenuHandler = {
  execute: (actionContext: any) => {
    const action = new KanbanBoardToolsAction();
    action.execute(actionContext);
  },
};

SDK.register("kanban-board-tools-menu", kanbanMenuHandler);
SDK.init();
