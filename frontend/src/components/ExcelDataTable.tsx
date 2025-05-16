// components/ExcelDataTable.tsx
import { Table, Thead, Tbody, Tr, Th, Td, Box } from "@chakra-ui/react";

interface ExcelData {
  headers: string[];
  rows: { row: any[] }[];
}

const ExcelDataTable = ({ data }: { data: ExcelData }) => {
  return (
    <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            {data.headers.map((header, index) => (
              <Th key={index}>{header}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.rows.map((row, rowIndex) => (
            <Tr key={rowIndex}>
              {row.row.map((cell, cellIndex) => (
                <Td key={cellIndex}>{cell ?? ""}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ExcelDataTable;