"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: {
    header: string | React.ReactNode;
    accessorKey?: keyof TData | string;
    cell?: (item: TData) => React.ReactNode;
    className?: string;
  }[];
  data: TData[];
  onRowClick?: (item: TData) => void;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  onRowClick,
  className,
}: DataTableProps<TData>) {
  return (
    <div className={cn("rounded-xl border bg-white overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50">
            {columns.map((column, index) => (
              <TableHead 
                key={index} 
                className={cn("py-4 px-4 font-semibold text-neutral-900", column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-neutral-500"
              >
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, rowIndex) => (
              <TableRow
                key={rowIndex}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "group transition-colors",
                  onRowClick && "cursor-pointer hover:bg-neutral-50"
                )}
              >
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex} className={cn("py-4 px-4", column.className)}>
                    {column.cell
                      ? column.cell(item)
                      : column.accessorKey
                      ? (item[column.accessorKey as keyof TData] as React.ReactNode)
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
