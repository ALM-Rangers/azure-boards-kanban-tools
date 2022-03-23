import * as React from "react";

import * as Constants from "../Shared/Constants";
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { Observer } from "azure-devops-ui/Observer";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { SettingsToCopy } from "../Components/SettingsToCopy";

export interface ISelectBacklogLevelsProps {
  availableLevels: string[];
  selectedLevels: string[];
  label: string;
  selectedSettings: string[];
  isLoading: boolean;
  onBacklogLevelSelected: (team: string, isSelected?: boolean) => void;
}

export class SelectBacklogLevels extends React.Component<
  ISelectBacklogLevelsProps,
  {}
> {
  private selection = new DropdownMultiSelection();
  private options: any[];
  constructor(props: ISelectBacklogLevelsProps) {
    super(props);
  }

  public render() {
    this.options = [];
    let content: JSX.Element;
    if (this.props.availableLevels) {
      this.props.availableLevels.forEach((item) => {
        this.options.push({
          id: item,
          text: item,
        });
        if (
          this.props.selectedLevels &&
          this.props.selectedLevels.indexOf(item) > -1
        ) {
          let index = this.props.availableLevels.indexOf(item);
          this.selection.select(index);
        }
      });
    }
    if (this.props.isLoading) {
      content = (
        <div>
          <div>
            <span>{this.props.label}</span>
          </div>
          <div>
            <Spinner
              size={SpinnerSize.medium}
              label={Constants.LoadingBacklogsLabel}
              ariaLabel={Constants.LoadingBacklogsLabel}
            />
          </div>
        </div>
      );
    } else {
      content = (
        <>
          <Observer selection={this.selection}>
            {() => {
              return (
                <>
                  <div>
                    <span>{this.props.label}</span>
                  </div>
                  <Dropdown
                    ariaLabel={this.props.label}
                    actions={[
                      {
                        className: "bolt-dropdown-action-right-button",
                        disabled: this.selection.selectedCount === 0,
                        iconProps: { iconName: "Clear" },
                        text: "Clear",
                        onClick: () => {
                          this.selection.clear();
                        },
                      },
                    ]}
                    className="example-dropdown"
                    items={this.options}
                    selection={this.selection}
                    placeholder="Select levels"
                    showFilterBox={true}
                    onSelect={this._onSelectedBacklogLevelChanged}
                    disabled={this.options.length === 0}
                  />
                </>
              );
            }}
          </Observer>
        </>
      );
    }
    return (
      <div>
        <div>{content}</div>
        <div>
          <SettingsToCopy selectedSettings={this.props.selectedSettings} />
        </div>
      </div>
    );
  }

  private _onSelectedBacklogLevelChanged = (
    event: React.SyntheticEvent<HTMLElement>,
    item: IListBoxItem<{}>
  ) => {
    let index = this.options.indexOf(item);
    this.props.onBacklogLevelSelected(
      item.id.toString(),
      this.selection.selected(index)
    );
  };
}
