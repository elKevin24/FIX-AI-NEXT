'use client';

import React from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    getSortedRowModel,
    SortingState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import styles from './DataTable.module.css';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onRowClick?: (row: TData) => void;
    isLoading?: boolean;
    caption?: string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
    isLoading = false,
    caption,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className={styles['wrapper']}>
            <div className={styles['tableContainer']}>
                <table className={styles['table']}>
                    {caption && <caption className="sr-only">{caption}</caption>}
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className={styles['headerRow']}>
                                {headerGroup.headers.map((header) => {
                                    const meta = header.column.columnDef.meta as any;
                                    const isSorted = header.column.getIsSorted();
                                    const canSort = header.column.getCanSort();
                                    const ariaSortValue = isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : canSort ? 'none' : undefined;

                                    return (
                                        <th scope="col" 
                                            key={header.id} 
                                            className={`${styles['headerCell']} ${meta?.className || ''}`}
                                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                            style={{ cursor: canSort ? 'pointer' : 'default' }}
                                            aria-sort={ariaSortValue}
                                        >
                                            <div className={styles['headerContent']}>
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {isSorted === 'asc' && (
                                                    <ArrowUp size={14} className={styles['sortIcon'] || ''} aria-hidden="true" />
                                                )}
                                                {isSorted === 'desc' && (
                                                    <ArrowDown size={14} className={styles['sortIcon'] || ''} aria-hidden="true" />
                                                )}
                                                {!isSorted && canSort && (
                                                    <ArrowUpDown size={12} className={styles['sortPlaceholderIcon'] || ''} aria-hidden="true" />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr className={styles['loadingRow']}>
                                <td colSpan={columns.length} className={styles['emptyCell']}>
                                    Cargando datos...
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                                <tr 
                                    key={row.id} 
                                    className={`${styles['row']} ${onRowClick ? styles['clickableRow'] : ''}`}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        const meta = cell.column.columnDef.meta as any;
                                        return (
                                            <td key={cell.id} className={`${styles['cell']} ${meta?.className || ''}`}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className={styles['emptyCell']}>
                                    No hay resultados disponibles.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
