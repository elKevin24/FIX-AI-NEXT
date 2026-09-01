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
import { useMediaQuery } from '@/hooks/useMediaQuery';
import styles from './DataTable.module.css';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onRowClick?: (row: TData) => void;
    isLoading?: boolean;
    caption?: string;
    /** Breakpoint below which non-essential columns are hidden.
     *  Mark optional columns with `meta.hideBelow` (e.g. '640px').
     *  Set this to the smallest breakpoint you want the full table at. */
    mobileBreakpoint?: string;
    /** Render function to render a custom card layout on mobile viewports instead of table */
    renderMobileCard?: (row: TData) => React.ReactNode;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
    isLoading = false,
    caption,
    mobileBreakpoint = '640px',
    renderMobileCard,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const isMobile = useMediaQuery(`(max-width: ${mobileBreakpoint})`);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility: isMobile
                ? Object.fromEntries(
                      columns
                          .map((col) => (col as { id?: string; accessorKey?: string }).id ?? (col as any).accessorKey)
                          .filter((id): id is string => !!id)
                          .map((id) => [
                              id,
                              !(columns.find((c) =>
                                  ((c as { id?: string }).id ?? (c as any).accessorKey) === id
                              ) as any)?.meta?.hideBelow,
                          ]),
                  )
                : {},
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (isMobile && renderMobileCard) {
        return (
            <div className={styles['wrapper']}>
                {isLoading ? (
                    <div className={styles['emptyCell']}>Cargando datos...</div>
                ) : data.length > 0 ? (
                    <div className={styles['cardList']}>
                        {data.map((item, index) => (
                            <div
                                key={index}
                                className={`${styles['mobileCardItem']} ${onRowClick ? styles['clickableRow'] : ''}`}
                                onClick={() => onRowClick?.(item)}
                            >
                                {renderMobileCard(item)}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles['emptyCell']}>No hay resultados disponibles.</div>
                )}
            </div>
        );
    }

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
                                    return (
                                        <th scope="col" 
                                            key={header.id} 
                                            className={`${styles['headerCell']} ${meta?.className || ''}`}
                                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                            style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                                        >
                                            <div className={styles['headerContent']}>
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {header.column.getIsSorted() === 'asc' && ' 🔼'}
                                                {header.column.getIsSorted() === 'desc' && ' 🔽'}
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
