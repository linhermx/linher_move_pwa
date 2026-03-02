import React from 'react';

const DataTable = ({ caption, columns, children, empty, colSpan }) => (
    <div className="card card--flush table-shell">
        <div className="table-scroll">
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
        </div>
    </div>
);

export default DataTable;
