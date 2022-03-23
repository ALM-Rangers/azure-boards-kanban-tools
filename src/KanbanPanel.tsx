import * as React from "react";
import { showRootComponent } from "./Common";
import * as SDK from "azure-devops-extension-sdk";
import { PanelContent } from "./Components/PanelContent";

import "./KanbanPanel.scss";

interface IKanbanPanelState {
  boardId: string;
  ready?: boolean;
}

export class KanbanPanel extends React.Component<{}, IKanbanPanelState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      boardId: "",
      ready: false,
    };
  }

  public componentDidMount() {
    SDK.init();

    SDK.ready().then(() => {
      this.setState({ ready: true });
    });
  }

  public render(): JSX.Element {
    return (
      <PanelContent
        boardId={this.state.boardId}
        ready={this.state.ready}
        closeDialog={this.closeDialog}
      />
    );
  }

  private closeDialog(close: boolean) {
    const config = SDK.getConfiguration();
    if (config.panel) {
      config.panel.close(close);
    }
  }
}

showRootComponent(<KanbanPanel />);
