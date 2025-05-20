import { Table, Thead, Tbody, Tr, Th, Td, Box, Tooltip, IconButton } from '@chakra-ui/react';
import { memo, useState, useMemo } from 'react';
import { ArrowUpDownIcon } from '@chakra-ui/icons';

export interface ExcelData {
  headers: string[];
  rows: { row: (string | number | boolean | null)[] }[];
}

export interface ColumnMapping {
  style: number | null;
  brand: number | null;
  imageAdd: number | null;
  readImage: number | null;
  category: number | null;
  colorName: number | null;
}

export interface ExcelDataTableProps {
  excelData: ExcelData;
  columnMapping?: ColumnMapping;
  onColumnClick?: (index: number) => void;
  isManualBrand?: boolean;
}

const ExcelDataTable = ({ excelData, columnMapping, onColumnClick, isManualBrand = false }: ExcelDataTableProps) => {
  const [sortConfig, setSortConfig] = useState<{ key: number; direction: 'asc' | 'desc' | null }>({ key: -1, direction: null });

  const getDisplayValue = (cell: string | number | boolean | null): string => {
    if (cell == null) return '';
    return String(cell);
  };

  const sortedRows = useMemo(() => {
    if (sortConfig.key === -1 || sortConfig.direction === null) return excelData.rows;
    const sorted = [...excelData.rows].sort((a, b) => {
      const aValue = getDisplayValue(a.row[sortConfig.key]);
      const bValue = getDisplayValue(b.row[sortConfig.key]);
      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
    return sorted;
  }, [excelData.rows, sortConfig]);

  const handleSort = (columnIndex: number) => {
    setSortConfig((prev) => ({
      key: columnIndex,
      direction: prev.key === columnIndex && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (!excelData.headers.length || !excelData.rows.length) {
    return <Box>No data to display</Box>;
  }

  return (
    <Box overflowX="auto">
      <Table variant="simple" size="sm" aria-label="Excel data table">
        <caption style={{ captionSide: 'top', padding: '8px', color: 'gray.600' }}>
          Excel Data Preview
        </caption>
        <Thead>
          <Tr>
            {excelData.headers.map((header, index) => (
              <Th
                key={index}
                onClick={onColumnClick ? () => onColumnClick(index) : undefined}
                cursor={onColumnClick ? 'pointer' : 'default'}
                bg={isManualBrand && columnMapping?.brand != null && columnMapping.brand === index ? 'blue.100' : undefined}
                _hover={onColumnClick ? { bg: 'gray.200' } : undefined}
                role={onColumnClick ? 'button' : undefined}
                aria-label={onColumnClick ? `Map column ${header || index + 1}` : undefined}
              >
                <Tooltip label={onColumnClick ? `Click to map ${header || `Column ${index + 1}`}` : undefined}>
                  <Box display="flex" alignItems="center">
                    {header || `Column ${index + 1}`}
                    <IconButton
                      aria-label={`Sort by ${header || `Column ${index + 1}`}`}
                      icon={<ArrowUpDownIcon />}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleSort(index)}
                      ml={2}
                    />
                  </Box>
                </Tooltip>
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {sortedRows.map((row, rowIndex) => (
            <Tr key={rowIndex}>
              {row.row.map((cell, cellIndex) => (
                <Td key={cellIndex}>{getDisplayValue(cell)}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default memo(ExcelDataTable);