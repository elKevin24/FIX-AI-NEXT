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
    /**
     * Columna que encabeza la tarjeta en la vista móvil. Por defecto es la
     * primera que no sea de acciones, que en todas las tablas de la app
     * coincide con la columna identificativa (nombre, nº de factura, título).
     * En tickets hay que fijarla a 'title' a mano: la primera columna es el
     * ID, que como título de tarjeta no dice nada.
     */
    mobileTitleColumn?: string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
    isLoading = false,
    caption,
    mobileTitleColumn,
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

    // El id que TanStack asigna a una columna es su `id` explícito o, si no
    // existe, su accessorKey. Resolvemos el título con la misma regla para que
    // el accessorKey que pasan los consumidores coincida con column.id.
    const titleColumnId =
        mobileTitleColumn ??
        (() => {
            const first = columns.find(
                (c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) !== 'actions'
            );
            return first ? (first.id ?? (first as { accessorKey?: string }).accessorKey) : undefined;
        })();

    /**
     * Etiqueta que la celda muestra a la izquierda en móvil. Sale del header
     * declarado por el consumidor, de modo que "Cliente: ACME" en la tarjeta es
     * literalmente el mismo texto que la columna "Cliente" del escritorio. Si
     * el header es una función (no un string) cae al id de la columna.
     */
    const labelFor = (column: { columnDef: { header?: unknown }; id: string }): string => {
        const { header } = column.columnDef;
        if (typeof header === 'string') return header;
        if (typeof header === 'number') return String(header);
        return column.id;
    };

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
                                        const isTitle = cell.column.id === titleColumnId;
                                        const isActions = cell.column.id === 'actions';
                                        return (
                                            <td
                                                key={cell.id}
                                                data-label={labelFor(cell.column)}
                                                className={[
                                                    styles['cell'],
                                                    isTitle ? styles['titleCell'] : '',
                                                    isActions ? styles['actionCell'] : '',
                                                    meta?.className || '',
                                                ].filter(Boolean).join(' ')}
                                            >
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
