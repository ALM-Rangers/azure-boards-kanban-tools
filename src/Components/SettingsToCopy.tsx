import * as React from "react";
import { css } from "azure-devops-ui/Util";

export interface ISettingsToCopyProps {
  selectedSettings: string[];
}

export class SettingsToCopy extends React.Component<ISettingsToCopyProps, {}> {
  public render() {
    return (
      <div>
        The following styles will be copied:{" "}
        {this.props.selectedSettings.map((value, index, values) => {
          let content =
            index < values.length - 1 ? (
              <span key={value}>
                <span key={value} className={css("boldFont")}>
                  {value}
                </span>
                ,{" "}
              </span>
            ) : (
              <span key={value}>
                <span key={value} className={css("boldFont")}>
                  {value}
                </span>
                .
              </span>
            );
          return content;
        })}
      </div>
    );
  }
}
