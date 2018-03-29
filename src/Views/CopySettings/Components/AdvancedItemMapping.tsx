import * as React from "react";

import { css } from "office-ui-fabric-react/lib/Utilities";
import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";
import { IBoardColumnDifferences, IColumnMapping } from "src/Views/CopySettings/Models/CopySettingsInterfaces";
import { Pivot, PivotItem } from "office-ui-fabric-react/lib/Pivot";
import { List } from "office-ui-fabric-react/lib/List";
import * as Constants from "src/Shared/Constants";

import "./AdvancedItemMapping.scss";

export interface IAdvancedItemMappingProps {
    show: boolean;
    headerText: string;
    onClosed: () => void;
    onMappingChanged: (selectedId: string, sourceId) => void;
    mappings: IBoardColumnDifferences[];
    selectedLevels: string[];
}

export class AdvancedItemMapping extends React.Component<IAdvancedItemMappingProps, {}> {
    private _itemsCount: number;

    constructor(props: IAdvancedItemMappingProps) {
        super(props);
        this._itemsCount = 0;
    }

    public render() {
        let mappingItems: IColumnMapping[] = [];
        let startIndex = 0;
        if (!this.props.mappings || !this.props.show) {
            return null;
        }

        let mappingsOfInterest: IBoardColumnDifferences[] = [];

        this.props.mappings.forEach(mapping => {
            if (this.props.selectedLevels.indexOf(mapping.backlog) >= 0) {
                mappingsOfInterest.push(mapping);
            }
        });
        this._itemsCount = mappingItems.length;
        return (
            <div>
                <div className={css("ms-font-m")}>
                    {Constants.MappingsDescription}
                </div>
                <div className="formContent">
                    <Pivot>
                        {mappingsOfInterest.map((mapping, mapIndex, allMappings) => {
                            return (
                                <PivotItem linkText={mapping.backlog}>
                                    {this._renderPivotContent(mapping)}
                                </PivotItem>
                            );
                        })}
                    </Pivot>
                </div>
            </div>
        );
    }

    private _renderPivotContent(mapping: IBoardColumnDifferences): JSX.Element {
        let content: JSX.Element;

        let multipleMappings = mapping.mappings.filter(m => m.potentialMatches.length > 1);
        if (multipleMappings.length === 0) {
            content =
                <div className={css("pivotContent", "ms-font-m")}>
                    {Constants.NoMappingsAvailable}
                </div>;
        } else {
            content =
                <List
                    items={multipleMappings}
                    onRenderCell={this._onRenderCell} />;
        }
        return content;
    }

    private _onRenderCell = (item: IColumnMapping, itemIndex: number) => {
        let dropdownOptions: IDropdownOption[] = [];
        item.potentialMatches.forEach(match => {
            dropdownOptions.push({
                key: match.id,
                text: match.name,
                data: item.targetColumn.id
            });
        });
        let className = css("listItem");
        if (itemIndex === this._itemsCount - 1) {
            className = css("lastItem");
        }
        return (
            <div className={className}>
                <Dropdown
                    options={dropdownOptions}
                    selectedKey={item.sourceColumn.id}
                    label={item.targetColumn.name}
                    onChanged={this._onMappingChanged} />
            </div>
        );
    }

    private _onMappingChanged = (item: IDropdownOption) => {
        this.props.onMappingChanged(item.key.toString(), item.data.toString());
    }
}