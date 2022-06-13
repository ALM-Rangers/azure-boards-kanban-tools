import * as React from "react";

import { Dropdown } from "azure-devops-ui/Dropdown";
import {
  IBoardColumnDifferences,
  IColumnMapping,
} from "../Models/CopySettingsInterfaces";
import * as Constants from "../Shared/Constants";

import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Observer } from "azure-devops-ui/Observer";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";

import "../Components/AdvancedItemMapping.scss";
import { css } from "azure-devops-ui/Util";
import { IListItemDetails } from "azure-devops-ui/List";

import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";

export interface IAdvancedItemMappingProps {
  show: boolean;
  headerText: string;
  onClosed: () => void;
  onMappingChanged: (selectedId: string, sourceId) => void;
  mappings: IBoardColumnDifferences[];
  selectedLevels: string[];
}

export class AdvancedItemMapping extends React.Component<
  IAdvancedItemMappingProps,
  {}
> {
  private selectedTabId: ObservableValue<string>;
  private selectedLevelItem: ObservableValue<string>;

  private _itemsCount: number;

  constructor(props: IAdvancedItemMappingProps) {
    super(props);
    this._itemsCount = 0;
  }

  public render() {
    let initialSelectedTabId = this.props.selectedLevels[0];
    this.selectedTabId = new ObservableValue(initialSelectedTabId);
    this.selectedLevelItem = new ObservableValue<string>("");
    let mappingItems: IColumnMapping[] = [];
    let startIndex = 0;

    if (!this.props.mappings || !this.props.show) {
      return null;
    }

    let mappingsOfInterest: IBoardColumnDifferences[] = [];
    this.props.mappings.forEach((mapping) => {
      if (this.props.selectedLevels.indexOf(mapping.backlog) >= 0) {
        mappingsOfInterest.push(mapping);
      }
    });
    this._itemsCount = mappingItems.length;
    return (
      <div>
        <div className={css("ms-font-m")}>{Constants.MappingsDescription}</div>
        <div className="flex-column">
          <TabBar
            onSelectedTabChanged={this.onSelectedTabChanged}
            selectedTabId={this.selectedTabId}
            tabSize={TabSize.Tall}
          >
            {mappingsOfInterest.map((mapping, mapIndex, allMappings) => {
              return (
                <Tab
                  key={mapping.backlog}
                  name={mapping.backlog}
                  id={mapping.backlog}
                />
              );
            })}
          </TabBar>
          <Observer selectedTabId={this.selectedTabId}>
            {(props: { selectedTabId: string }) => {
              if (this.selectedTabId.value) {
                let mapping = mappingsOfInterest.find(
                  (m) => m.backlog === this.selectedTabId.value
                );
                return <>{this._renderPivotContent(mapping)}</>;
              } else {
                return <></>;
              }
            }}
          </Observer>
        </div>
      </div>
    );
  }

  private onSelectedTabChanged = (newTabId: string) => {
    this.selectedTabId.value = newTabId;
  };

  private _renderPivotContent(mapping: IBoardColumnDifferences): JSX.Element {
    let content: JSX.Element;
    let multipleMappings = mapping.mappings.filter(
      (m) => m.potentialMatches.length > 1
    );
    if (multipleMappings.length === 0) {
      content = (
        <div className={css("pivotContent", "ms-font-m")}>
          {Constants.NoMappingsAvailable}
        </div>
      );
    } else {
      for (let index = 0; index < multipleMappings.length; index++) {
        let item = multipleMappings[index];

        let dropdownOptions: any[] = [];
        item.potentialMatches.forEach((match) => {
          dropdownOptions.push({
            id: match.id,
            text: match.name,
            data: item.targetColumn.id,
          });
        });
        let className = css("listItem");
        console.log("itemsCount,", this._itemsCount)
        if (index === this._itemsCount - 1) {
          className = css("lastItem");
        }
        content = (
          <div className={className}>
            <Dropdown
              items={dropdownOptions}
              ariaLabel={item.targetColumn.name}
              onSelect={this._onMappingChanged}
            />
            <Observer selectedItem={this.selectedLevelItem}>
              {(props: { selectedItem: string }) => {
                return <></>;
              }}

            </Observer>
          </div>
        );
      };
    }
    return content;
  }

  private _onRenderRow = (
    rowIndex: number,
    item: IColumnMapping,
    details: IListItemDetails<IColumnMapping>
  ) => {
    let dropdownOptions: any[] = [];
    item.potentialMatches.forEach((match) => {
      dropdownOptions.push({
        id: match.id,
        text: match.name,
        data: item.targetColumn.id,
      });
    });
    let className = css("listItem");
    if (rowIndex === this._itemsCount - 1) {
      className = css("lastItem");
    }
    return (
      <div className={className}>
        <Dropdown
          items={dropdownOptions}
          ariaLabel={item.targetColumn.name}
          onSelect={this._onMappingChanged}
        />
      </div>
    );
  };


  private _onMappingChanged = (e: any, item: any) => {
    this.selectedLevelItem.value = item.text || "";
    this.props.onMappingChanged(item.id.toString(), item.data.toString());
  };
}
