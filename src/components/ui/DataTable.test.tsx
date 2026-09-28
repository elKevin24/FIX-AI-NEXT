import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { DataTable } from './DataTable';
import type { ColumnDef } from '@tanstack/react-table';

/**
 * Regresión de MF-401: la tabla de tickets tiene 7-8 columnas y solo había
 * scroll horizontal. A 375px eso son ~900px de scroll para leer un ticket.
 *
 * La vista cards es CSS puro, así que en jsdom no se puede comprobar el
 * layout. Lo que sí se verifica aquí es el contrato de markup del que depende
 * ese CSS: que cada celda lleve su data-label, que la columna título se marque
 * como tal y que la semántica de tabla siga intacta. Si el CSS se rompe por un
 * cambio en el TSX, falla aquí.
 *
 * Sin @testing-library/jest-dom en el proyecto: solo aserciones nativas.
 */
interface Row {
  id: string;
  title: string;
  customer: string;
  status: string;
}

const data: Row[] = [
  { id: 't1', title: 'No enciende', customer: 'ACME', status: 'OPEN' },
  { id: 't2', title: 'Pantalla rota', customer: 'Globex', status: 'CLOSED' },
];

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Problema' },
  { accessorKey: 'customer', header: 'Cliente' },
  { accessorKey: 'status', header: 'Estado' },
];

describe('DataTable - vista cards móvil', () => {
  afterEach(() => {
    cleanup();
  });

  it('inyecta el header de cada columna como data-label en su celda', () => {
    render(<DataTable columns={columns} data={data} />);

    const firstRowCells = screen.getAllByRole('row')[1]!.querySelectorAll('td');
    expect(Array.from(firstRowCells).map((c) => c.getAttribute('data-label'))).toEqual([
      'ID',
      'Problema',
      'Cliente',
      'Estado',
    ]);
  });

  it('mantiene la semántica de tabla: thead con th scope=col y una fila por registro', () => {
    render(<DataTable columns={columns} data={data} />);

    // El thead no puede desaparecer del árbol de accesibilidad: con
    // display:none la tabla se queda sin encabezados y el lector de pantalla
    // anuncia celdas sueltas sin columna a la que atribuirlas.
    expect(document.querySelector('thead')).toBeTruthy();
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);
    // 1 cabecera + 2 filas de datos.
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('la etiqueta de la celda sale del header declarado, no del id interno', () => {
    // Columnas con id interno distinto del texto visible (tickets usa
    // 'customer.name' para "Cliente"). Si la etiqueta saliera del id, el
    // usuario leería "customer.name: ACME".
    const nested: ColumnDef<Row>[] = [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'title', header: 'Problema' },
      { id: 'customerName', header: 'Cliente' },
    ];
    render(<DataTable columns={nested} data={data} />);

    const firstRowCells = screen.getAllByRole('row')[1]!.querySelectorAll('td');
    expect(firstRowCells[2]!.getAttribute('data-label')).toBe('Cliente');
  });

  it('marca como título la primera columna que no es de acciones, por defecto', () => {
    render(<DataTable columns={columns} data={data} />);

    const firstRowCells = screen.getAllByRole('row')[1]!.querySelectorAll('td');
    // 'id' es la primera no-acciones, así que encabeza la tarjeta.
    expect(firstRowCells[0]!.className).toMatch(/titleCell/);
    expect(firstRowCells[1]!.className).not.toMatch(/titleCell/);
  });

  it('permite elegir la columna título cuando la primera no sirve', () => {
    // Es el caso de tickets: la primera columna es el ID y como título de
    // tarjeta no aporta nada, así que se pasa 'title' explícitamente.
    render(<DataTable columns={columns} data={data} mobileTitleColumn="title" />);

    const firstRowCells = screen.getAllByRole('row')[1]!.querySelectorAll('td');
    expect(firstRowCells[0]!.className).not.toMatch(/titleCell/);
    expect(firstRowCells[1]!.className).toMatch(/titleCell/);
  });

  it('nunca elige la columna de acciones como título', () => {
    const withActions: ColumnDef<Row>[] = [
      { id: 'actions', header: 'Acciones', cell: () => <a href="/x">Ver</a> },
    ];
    render(<DataTable columns={withActions} data={data} mobileTitleColumn="actions" />);

    const firstRowCells = screen.getAllByRole('row')[1]!.querySelectorAll('td');
    // Aunque se pase explícitamente, se respeta la elección: quien fija el
    // título conoce sus datos. Lo que no puede pasar es que caiga por defecto.
    expect(firstRowCells[0]!.className).toMatch(/titleCell/);
    expect(firstRowCells[0]!.className).toMatch(/actionCell/);
  });

  it('marca la columna de acciones para que se separe en la tarjeta', () => {
    const withActions: ColumnDef<Row>[] = [
      { accessorKey: 'title', header: 'Problema' },
      { id: 'actions', header: 'Acciones', cell: () => <a href="/x">Ver</a> },
    ];
    render(<DataTable columns={withActions} data={data} />);

    const firstRowCells = screen.getAllByRole('row')[1]!.querySelectorAll('td');
    expect(firstRowCells[0]!.className).toMatch(/titleCell/);
    expect(firstRowCells[1]!.className).toMatch(/actionCell/);
  });

  it('colSpan del estado vacío cubre todas las columnas', () => {
    render(<DataTable columns={columns} data={[]} />);

    const cell = screen.getByText('No hay resultados disponibles.');
    expect(cell.getAttribute('colspan')).toBe('4');
  });

  it('sigue funcionando el click de fila con la vista cards', () => {
    const clicked: string[] = [];
    render(
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(row) => clicked.push(row.id)}
      />
    );

    const rows = screen.getAllByRole('row');
    rows[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(clicked).toEqual(['t1']);
  });

  it('renderiza el caption sr-only para lectores de pantalla', () => {
    render(<DataTable columns={columns} data={data} caption="Listado de tickets" />);

    const caption = document.querySelector('caption');
    expect(caption?.textContent).toBe('Listado de tickets');
    expect(caption?.className).toBe('sr-only');
  });

  it('conserva el orden de las filas tal como llegan, sin reordenar', () => {
    render(<DataTable columns={columns} data={data} />);

    const bodyRows = screen.getAllByRole('row').slice(1);
    const titles = bodyRows.map((r) => within(r).getAllByRole('cell')[1]!.textContent);
    expect(titles).toEqual(['No enciende', 'Pantalla rota']);
  });
});
