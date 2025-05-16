import { Table, Thead, Tbody, Tr, Th, Td, Box } from '@chakra-ui/react';

export interface ExcelData {
  headers: string[];
  rows: { row: any[] }[];
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
  excelData: ExcelData; // Change 'data' to 'excelData'
  columnMapping?: ColumnMapping;
  onColumnClick?: (index: number) => void;
  isManualBrand?: boolean;
}
const ExcelDataTable = ({ excelData, columnMapping, onColumnClick, isManualBrand }: ExcelDataTableProps) => {
  return (
    <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            {excelData.headers.map((header, index) => (
              <Th
                key={index}
                onClick={onColumnClick ? () => onColumnClick(index) : undefined}
                cursor={onColumnClick ? 'pointer' : 'default'}
                bg={isManualBrand && columnMapping?.brand === index ? 'blue.50' : undefined}
              >
                {header}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {excelData.rows.map((row, rowIndex) => (
            <Tr key={rowIndex}>
              {row.row.map((cell, cellIndex) => (
                <Td key={cellIndex}>{cell ?? ''}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
export default ExcelDataTable;