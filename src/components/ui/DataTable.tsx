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
import styles from './DataTable.module.css';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onRowClick?: (row: TData) => void;
    isLoading?: boolean;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
    isLoading = false,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

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
        <div className={styles.wrapper}>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className={styles.headerRow}>
                                {headerGroup.headers.map((header) => (
                                    <th 
                                        key={header.id} 
                                        className={styles.headerCell}
                                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                        style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                                    >
                                        <div className={styles.headerContent}>
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {header.column.getIsSorted() === 'asc' && ' 🔼'}
                                            {header.column.getIsSorted() === 'desc' && ' 🔽'}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr className={styles.loadingRow}>
                                <td colSpan={columns.length} className={styles.emptyCell}>
                                    Cargando datos...
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                                <tr 
                                    key={row.id} 
                                    className={`${styles.row} ${onRowClick ? styles.clickableRow : ''}`}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className={styles.cell}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className={styles.emptyCell}>
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
