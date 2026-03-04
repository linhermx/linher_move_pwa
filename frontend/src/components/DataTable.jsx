import React from 'react';
import TableScrollFade from './TableScrollFade';

const DataTable = ({ caption, columns, children, empty, colSpan }) => (
    <div className="card card--flush table-shell">
        <TableScrollFade>
            <table className="table">
                {caption ? <caption>{caption}</caption> : null}
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                className={column.className}
                                align={column.align}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {empty ? (
                        <tr>
                            <td colSpan={colSpan || columns.length} className="table__empty">
                                {empty}
                            </td>
                        </tr>
                    ) : children}
                </tbody>
            </table>
        </TableScrollFade>
    </div>
);

export default DataTable;
