import * as React from "react";

import * as Constants from "../Shared/Constants";
import { Button } from "azure-devops-ui/Button";
import { css } from "azure-devops-ui/Util";
import "node_modules/azure-devops-ui/Core/_platformCommon.scss";
import "../Components/PanelContent.scss";

export interface IDialogButtonsProps {
  enabled: boolean;
  okButtonText?: string;
  showCancelButton: boolean;
  okButtonClicked: () => void;
  cancelButtonClicked: () => void;
}

export class DialogButtons extends React.Component<IDialogButtonsProps, {}> {
  public render() {
    const label = this.props.okButtonText
      ? this.props.okButtonText
      : Constants.DefaultOkButton;
    const primaryButtonCss = this.props.showCancelButton ? "last-action" : "";
    const cancelButtonContent = this.props.showCancelButton ? (
      <div className={css("dialog-action", "last-action")}>
        <Button onClick={this._onCancelButtonClicked}>
          {Constants.DefaultCancelButton}
        </Button>
      </div>
    ) : null;
    return (
      <div className={css("button-pane", primaryButtonCss)}>
        <div className={css("dialog-action")}>
          <Button
            primary={true}
            disabled={!this.props.enabled}
            onClick={this._onPrimaryButtonClicked}
          >
            {label}
          </Button>
        </div>
        {cancelButtonContent}
      </div>
    );
  }

  private _onPrimaryButtonClicked = () => {
    // Telemetry.Client().trackEvent(Constants.TelemetryCopyCompleted);
    this.props.okButtonClicked();
  };

  private _onCancelButtonClicked = () => {
    // Telemetry.Client().trackEvent(Constants.TelemetryDialogCancelled);
    this.props.cancelButtonClicked();
  };
}
