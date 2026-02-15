import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string; // Applied to both header and cell
    headerClassName?: string;
    cellClassName?: string;
    sortKey?: string; // If provided, column is sortable
}

interface DataTableProps<T> {
    data: T[];
    columns: DataTableColumn<T>[];
    keyExtractor: (item: T) => string | number;

    // Pagination
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;

    // Sorting
    sortColumn?: string;
    onSort?: (field: string) => void;

    // Selection
    selectionMode?: boolean;
    selectedIds?: number[];
    onSelectionChange?: (ids: number[]) => void;
    isAllSelected?: boolean;
    onSelectAll?: (selected: boolean) => void;

    // Actions/Interaction
    onRowClick?: (item: T, e: React.MouseEvent) => void;
    onRowDoubleClick?: (item: T, e: React.MouseEvent) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    rowClassName?: (item: T) => string;
    hideSelectionColumn?: boolean;
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    currentPage,
    totalPages,
    totalItems,
    perPage,
    onPageChange,
    onPerPageChange,
    sortColumn,
    onSort,
    selectionMode = false,
    selectedIds = [],
    onSelectionChange,
    isAllSelected,
    onSelectAll,
    onRowClick,
    onRowDoubleClick,
    isLoading = false,
    emptyMessage = "No data found.",
    rowClassName,
    hideSelectionColumn = false,
}: DataTableProps<T>) {

    const handleSort = (key: string) => {
        if (onSort) {
            onSort(key);
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        if (!onSelectionChange) return;
        if (checked) {
            onSelectionChange([...selectedIds, id]);
        } else {
            onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
        }
    };

    const handleRowInteraction = (item: T, e: React.MouseEvent, key: string | number) => {
        // Prevent interaction if clicking interactive elements
        if (
            (e.target as HTMLElement).closest("button") ||
            (e.target as HTMLElement).closest("input") ||
            (e.target as HTMLElement).closest("a")
        )
            return;

        const id = Number(key);

        if (selectionMode && onSelectionChange) {
            if (e.ctrlKey || e.metaKey) {
                // Toggle selection
                const isSelected = selectedIds.includes(id);
                handleSelectRow(id, !isSelected);
            } else {
                // Exclusive selection (unless Shift is implemented, defaulting to exclusive)
                onSelectionChange([id]);
            }
        }

        onRowClick?.(item, e);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto scrollbar-thin">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                            {selectionMode && !hideSelectionColumn && (
                                <TableHead className="w-10">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300"
                                        checked={isAllSelected}
                                        ref={(input) => {
                                            if (input) {
                                                input.indeterminate =
                                                    !!selectedIds.length && !isAllSelected;
                                            }
                                        }}
                                        onChange={(e) => onSelectAll?.(e.target.checked)}
                                    />
                                </TableHead>
                            )}
                            {columns.map((col, index) => (
                                <TableHead
                                    key={index}
                                    className={cn(
                                        "font-serif", // Enforce serif for headers as per design system
                                        col.sortKey ? "cursor-pointer" : "",
                                        col.className,
                                        col.headerClassName
                                    )}
                                    onClick={() => col.sortKey && handleSort(col.sortKey)}
                                >
                                    {col.header}
                                    {col.sortKey && sortColumn && (
                                        <>
                                            {sortColumn === col.sortKey && (
                                                <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            )}
                                            {sortColumn === `-${col.sortKey}` && (
                                                <ArrowUpDown className="ml-2 h-4 w-4 inline rotate-180" />
                                            )}
                                        </>
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + (selectionMode && !hideSelectionColumn ? 1 : 0)}
                                    className="text-center h-24"
                                >
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : data.length > 0 ? (
                            data.map((item) => {
                                const key = keyExtractor(item);
                                const isSelected = selectionMode && selectedIds.includes(Number(key));
                                return (
                                    <TableRow
                                        key={key}
                                        data-state={isSelected ? "selected" : undefined}
                                        className={cn(
                                            "transition-colors duration-300",
                                            (onRowClick || onRowDoubleClick || selectionMode) ? "cursor-pointer hover:bg-muted/50" : "",
                                            isSelected ? "bg-primary/5 border-l-2 border-primary" : "",
                                            rowClassName?.(item)
                                        )}
                                        onClick={(e) => handleRowInteraction(item, e, key)}
                                        onDoubleClick={(e) => onRowDoubleClick?.(item, e)}
                                    >
                                        {selectionMode && !hideSelectionColumn && (
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300"
                                                    checked={isSelected}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) =>
                                                        handleSelectRow(Number(key), e.target.checked)
                                                    }
                                                />
                                            </TableCell>
                                        )}
                                        {columns.map((col, index) => (
                                            <TableCell
                                                key={index}
                                                className={cn(col.className, col.cellClassName)}
                                            >
                                                {col.cell
                                                    ? col.cell(item)
                                                    : col.accessorKey
                                                        ? (item[col.accessorKey] as React.ReactNode)
                                                        : null}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + (selectionMode && !hideSelectionColumn ? 1 : 0)}
                                    className="text-center text-muted-foreground h-24"
                                >
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="p-2 border-t bg-background">
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                    totalItems={totalItems}
                    perPage={perPage}
                    onPerPageChange={onPerPageChange}
                />
            </div>
        </div>
    );
}
