import React, { useState, useCallback } from 'react';
import {
  Container,
  Text,
  Button,
  VStack,
  HStack,
  Box,
  Input,
  FormControl,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  Tr,
  Td,
  Tbody,
  Select,
  Spinner,
} from '@chakra-ui/react';
import { createFileRoute } from '@tanstack/react-router';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import ExcelDataTable from '../components/ExcelDataTable';
import useCustomToast from '../hooks/useCustomToast';
// Interfaces
interface ColumnMapping {
  style: number | null;
  brand: number | null;
  imageAdd: number | null;
  readImage: number | null;
  category: number | null;
  colorName: number | null;
}

interface ExcelData {
  headers: string[];
  rows: { row: ExcelJS.CellValue[] }[];
}

// Constants
const REQUIRED_COLUMNS = ['style', 'brand'] as const;
const OPTIONAL_COLUMNS = ['category', 'colorName', 'readImage', 'imageAdd'] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;
const TARGET_HEADERS = ['BRAND', 'STYLE'] as const;
const SERVER_URL = 'https://backend-dev.iconluxury.group';
const MAX_ROWS = 1000;

// Helper Functions
const getDisplayValue = (cellValue: any): string => {
  if (cellValue == null) return '';
  if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    return String(cellValue);
  }
  if (cellValue instanceof Date) return cellValue.toLocaleString();
  if (typeof cellValue === 'object') {
    if (cellValue.error) return cellValue.error;
    if (cellValue.result !== undefined) return getDisplayValue(cellValue.result);
    if (cellValue.text) return cellValue.text;
    if (cellValue.hyperlink) return cellValue.text || cellValue.hyperlink;
    return JSON.stringify(cellValue);
  }
  return String(cellValue);
};

const indexToColumnLetter = (index: number): string => {
  let column = '';
  let temp = index;
  while (temp >= 0) {
    column = String.fromCharCode((temp % 26) + 65) + column;
    temp = Math.floor(temp / 26) - 1;
  }
  return column;
};

const ExcelDataTableMemo = React.memo(ExcelDataTable);

// Main Component
const CMSGoogleSerpForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData>({ headers: [], rows: [] });
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    style: null,
    brand: null,
    imageAdd: null,
    readImage: null,
    category: null,
    colorName: null,
  });
  const [manualBrand, setManualBrand] = useState<string>('');

  const showToast = useCustomToast();

  // File Handling
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type)) {
      showToast('File Error', 'Please upload an Excel file (.xlsx or .xls)', 'error');
      return;
    }

    setFile(selectedFile);
    setExcelData({ headers: [], rows: [] });
    setColumnMapping({ style: null, brand: null, imageAdd: null, readImage: null, category: null, colorName: null });
    setManualBrand('');
    setIsLoadingFile(true);

    try {
      const data = await readFile(selectedFile);
      const workbook = XLSX.read(data, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: '', raw: true });
      const preview = jsonData.slice(0, MAX_ROWS);
      setPreviewRows(preview);

      const autoHeaderIndex = detectHeaderRow(preview);
      if (autoHeaderIndex !== null) {
        processHeaderSelection(autoHeaderIndex, preview);
      } else {
        setIsHeaderModalOpen(true);
      }
    } catch (error) {
      showToast('File Processing Error', error instanceof Error ? error.message : 'Unknown error', 'error');
      setFile(null);
    } finally {
      setIsLoadingFile(false);
    }
  }, [showToast]);

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsBinaryString(file);
    });
  };

  const detectHeaderRow = (rows: any[]): number | null => {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const rowValues = (rows[i] as any[]).map(cell => String(cell || "").toUpperCase().trim());
      const matchedHeaders = rowValues.filter(value => TARGET_HEADERS.includes(value as 'BRAND' | 'STYLE'));
      if (matchedHeaders.length >= 2) return i;
    }
    return null;
  };

  const processHeaderSelection = (index: number, rows: any[]) => {
    const headers = rows[index] as string[];
    const newRows = rows.slice(index + 1).map(row => ({ row: row as ExcelJS.CellValue[] }));
    const newMapping = autoMapColumns(headers);
    setExcelData({ headers, rows: newRows });
    setColumnMapping(newMapping);
    setHeaderRowIndex(index);
  };

  const autoMapColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = { style: null, brand: null, imageAdd: null, readImage: null, category: null, colorName: null };
    headers.forEach((header, index) => {
      const upperHeader = String(header).toUpperCase().trim();
      if (upperHeader === 'STYLE') mapping.style = index;
      if (upperHeader === 'BRAND') mapping.brand = index;
    });
    return mapping;
  };

  // Header Selection
  const handleRowSelect = useCallback((rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    setIsConfirmModalOpen(true);
  }, []);

  const confirmHeaderSelect = useCallback(() => {
    if (selectedRowIndex === null) return;
    processHeaderSelection(selectedRowIndex, previewRows);
    setIsHeaderModalOpen(false);
    setIsConfirmModalOpen(false);
  }, [selectedRowIndex, previewRows]);

  // Manual Brand
  const applyManualBrand = useCallback(() => {
    if (!manualBrand || columnMapping.brand !== null) return;
    const newHeaders = [...excelData.headers, 'BRAND (Manual)'];
    const newRows = excelData.rows.map(row => ({ row: [...row.row, manualBrand] }));
    setExcelData({ headers: newHeaders, rows: newRows });
    setColumnMapping(prev => ({ ...prev, brand: newHeaders.length - 1 }));
  }, [manualBrand, columnMapping.brand, excelData]);

  // Form Submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoadingFile(true);
    try {
      const formData = prepareFormData();
      const response = await fetch(`${SERVER_URL}/submitImage`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status} - ${await response.text()}`);
      await response.json();
      setTimeout(() => {
        window.location.reload(); // CMS-specific behavior
      }, 1000);
    } catch (error) {
      showToast('Submission Error', error instanceof Error ? error.message : 'Unknown error', 'error');
    } finally {
      setIsLoadingFile(false);
    }
  }, [file, headerRowIndex, columnMapping, showToast]);

  const validateForm = (): boolean => {
    const missingRequired = REQUIRED_COLUMNS.filter(col => columnMapping[col] === null);
    if (missingRequired.length > 0) {
      showToast('Validation Error', `Missing required columns: ${missingRequired.join(', ')}`, 'warning');
      return false;
    }
    if (!file) {
      showToast('Validation Error', 'No file selected', 'error');
      return false;
    }
    if (headerRowIndex === null) {
      showToast('Validation Error', 'Header row not selected', 'error');
      return false;
    }
    return true;
  };

  const prepareFormData = (): FormData => {
    const formData = new FormData();
    formData.append('fileUploadImage', file!);

    const mappingToColumn = (key: keyof ColumnMapping, defaultVal: string) =>
      columnMapping[key] !== null ? indexToColumnLetter(columnMapping[key]!) : defaultVal;

    const styleCol = mappingToColumn('style', 'A');
    const brandCol = mappingToColumn('brand', 'B');
    const imageAddCol = mappingToColumn('imageAdd', '');
    const readImageCol = mappingToColumn('readImage', '');
    const colorCol = mappingToColumn('colorName', '');
    const categoryCol = mappingToColumn('category', '');

    const imageColumnImage = readImageCol || imageAddCol;
    if (imageColumnImage) formData.append('imageColumnImage', imageColumnImage);
    formData.append('searchColImage', styleCol);

    if (manualBrand && manualBrand.trim() !== '') {
      formData.append('brandColImage', 'MANUAL');
      formData.append('manualBrand', manualBrand);
    } else if (columnMapping.brand !== null) {
      formData.append('brandColImage', brandCol);
    } else {
      throw new Error('Brand column must be mapped or manual brand provided');
    }

    if (colorCol) formData.append('ColorColImage', colorCol);
    if (categoryCol) formData.append('CategoryColImage', categoryCol);
    if (headerRowIndex === null || headerRowIndex < 0) {
      throw new Error('Invalid header row index');
    }
    formData.append('header_index', String(headerRowIndex + 1));

    // CMS-specific: Add sendToEmail if userEmail is available
    const userEmail = 'nik@luxurymarket.com'; // Placeholder; replace with actual user email if available
    if (userEmail) formData.append('sendToEmail', userEmail);

    return formData;
  };

  // Column Mapping
  const handleMappingConfirm = useCallback((confirm: boolean) => {
    if (!confirm || selectedColumn === null) {
      resetMappingModal();
      return;
    }
    const newMapping = { ...columnMapping };
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key as keyof ColumnMapping] === selectedColumn) {
        newMapping[key as keyof ColumnMapping] = null;
      }
    });
    if (selectedField) {
      newMapping[selectedField as keyof ColumnMapping] = selectedColumn;
    }
    setColumnMapping(newMapping);
    resetMappingModal();
  }, [selectedColumn, selectedField, columnMapping]);

  const openMappingModal = useCallback((columnIndex: number) => {
    setSelectedColumn(columnIndex);
    const currentField = Object.keys(columnMapping).find(key => columnMapping[key as keyof ColumnMapping] === columnIndex);
    setSelectedField(currentField || getDefaultField());
    setIsMappingModalOpen(true);
  }, [columnMapping]);

  const resetMappingModal = () => {
    setIsMappingModalOpen(false);
    setSelectedColumn(null);
    setSelectedField('');
  };

  const getDefaultField = (): string => {
    if (columnMapping.style === null) return 'style';
    if (columnMapping.brand === null) return 'brand';
    if (columnMapping.category === null) return 'category';
    if (columnMapping.colorName === null) return 'colorName';
    return '';
  };

  // Computed Values
  const allRequiredSelected = REQUIRED_COLUMNS.every(col => columnMapping[col] !== null);
  const missingRequired = REQUIRED_COLUMNS.filter(col => columnMapping[col] === null);
  const mappedColumns = Object.entries(columnMapping)
    .filter(([_, index]) => index !== null)
    .map(([col, index]) => `${col.replace(/([A-Z])/g, ' $1').trim()}: ${excelData.headers[index as number] || `Column ${index! + 1}`}`);

  // Render with CMS Styling
  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={4} align="stretch">
        <ControlSection
          isLoading={isLoadingFile}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          canSubmit={excelData.rows.length > 0 && allRequiredSelected}
          rowCount={excelData.rows.length}
          missingRequired={missingRequired}
          mappedColumns={mappedColumns}
        />
        <ManualBrandSection
          isVisible={excelData.rows.length > 0 && columnMapping.brand === null}
          manualBrand={manualBrand}
          setManualBrand={setManualBrand}
          onApply={applyManualBrand}
          isLoading={isLoadingFile}
        />
        <DataTableSection
          isLoading={isLoadingFile}
          excelData={excelData}
          columnMapping={columnMapping}
          onColumnClick={openMappingModal}
          isManualBrand={columnMapping.brand !== null && excelData.headers[columnMapping.brand] === 'BRAND (Manual)'}
        />
        <MappingModal
          isOpen={isMappingModalOpen}
          onClose={() => handleMappingConfirm(false)}
          selectedColumn={selectedColumn}
          headers={excelData.headers}
          selectedField={selectedField}
          setSelectedField={setSelectedField}
          onConfirm={() => handleMappingConfirm(true)}
          allColumns={ALL_COLUMNS}
          optionalMappings={OPTIONAL_COLUMNS.join(', ')}
        />
        <HeaderSelectionModal
          isOpen={isHeaderModalOpen}
          onClose={() => setIsHeaderModalOpen(false)}
          previewRows={previewRows}
          onRowSelect={handleRowSelect}
        />
        <ConfirmHeaderModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          selectedRowIndex={selectedRowIndex}
          previewRows={previewRows}
          onConfirm={confirmHeaderSelect}
        />
      </VStack>
    </Container>
  );
};

// Sub-components with CMS Styling
interface ControlSectionProps {
  isLoading: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  rowCount: number;
  missingRequired: string[];
  mappedColumns: string[];
}

const ControlSection: React.FC<ControlSectionProps> = ({
  isLoading,
  onFileChange,
  onSubmit,
  canSubmit,
  rowCount,
  missingRequired,
  mappedColumns,
}) => (
  <HStack spacing={2} align="flex-end" wrap="wrap">
    <FormControl w="xl">
      <Input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileChange}
        disabled={isLoading}
        bg="white"
        color="black"
        borderColor="gray.300"
        _hover={{ borderColor: 'blue.500' }}
        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 2px blue.200' }}
      />
    </FormControl>
    <Button
      colorScheme="blue"
      onClick={onSubmit}
      isDisabled={!canSubmit || isLoading}
      isLoading={isLoading}
    >
      Submit
    </Button>
    {rowCount > 0 && (
      <VStack align="start" spacing={0}>
        {missingRequired.length > 0 ? (
          <VStack align="start" spacing={0} flexDirection="column-reverse">
            {missingRequired.map(col => (
              <Text key={col} fontSize="sm" color="red.500">{col}</Text>
            ))}
            <Text fontSize="sm" color="red.500">Missing:</Text>
          </VStack>
        ) : (
          <VStack align="start" spacing={0} flexDirection="column-reverse">
            {mappedColumns.map((columnMapping, index) => (
              <Text key={index} fontSize="sm" color="blue.600">{columnMapping}</Text>
            ))}
            <Text fontSize="sm" color="blue.600">Mapped:</Text>
          </VStack>
        )}
        <Text fontSize="sm" color="gray.600">Rows: {rowCount}</Text>
      </VStack>
    )}
    {isLoading && <Text color="gray.600">Processing...</Text>}
  </HStack>
);

interface ManualBrandSectionProps {
  isVisible: boolean;
  manualBrand: string;
  setManualBrand: (value: string) => void;
  onApply: () => void;
  isLoading: boolean;
}

const ManualBrandSection: React.FC<ManualBrandSectionProps> = ({
  isVisible,
  manualBrand,
  setManualBrand,
  onApply,
  isLoading,
}) => (
  <>
    {isVisible && (
      <HStack spacing={2}>
        <FormControl w="sm">
          <Input
            placeholder="Add Brand for All Rows"
            value={manualBrand}
            onChange={(e) => setManualBrand(e.target.value)}
            disabled={isLoading}
            bg="white"
            color="black"
            borderColor="gray.300"
            _hover={{ borderColor: 'blue.500' }}
            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 2px blue.200' }}
          />
        </FormControl>
        <Button
          colorScheme="orange"
          onClick={onApply}
          isDisabled={!manualBrand || isLoading}
        >
          Apply
        </Button>
      </HStack>
    )}
    <Box borderBottomWidth="1px" borderColor="gray.200" my={2} />
  </>
);

interface DataTableSectionProps {
  isLoading: boolean;
  excelData: ExcelData;
  columnMapping: ColumnMapping;
  onColumnClick: (columnIndex: number) => void;
  isManualBrand: boolean;
}

const DataTableSection: React.FC<DataTableSectionProps> = ({
  isLoading,
  excelData,
  columnMapping,
  onColumnClick,
  isManualBrand,
}) => (
  <>
    {excelData.rows.length > 0 && (
      <Box flex="1" overflowY="auto" maxH="60vh" borderWidth="1px" borderRadius="md" p={4} borderColor="gray.200" bg="white">
        {isLoading ? (
          <VStack justify="center" h="full">
            <Spinner size="lg" color="blue.500" />
            <Text color="gray.600">Loading table data...</Text>
          </VStack>
        ) : (
          <ExcelDataTableMemo
            excelData={excelData}
            columnMapping={columnMapping}
            onColumnClick={onColumnClick}
            isManualBrand={isManualBrand}
          />
        )}
      </Box>
    )}
  </>
);

interface MappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedColumn: number | null;
  headers: string[];
  selectedField: string;
  setSelectedField: (value: string) => void;
  onConfirm: () => void;
  allColumns: readonly string[];
  optionalMappings: string;
}

const MappingModal: React.FC<MappingModalProps> = ({
  isOpen,
  onClose,
  selectedColumn,
  headers,
  selectedField,
  setSelectedField,
  onConfirm,
  allColumns,
  optionalMappings,
}) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <ModalOverlay />
    <ModalContent bg="white" color="black">
      <ModalHeader>Map Column</ModalHeader>
      <ModalBody>
        <Text>
          Map "{selectedColumn !== null ? headers[selectedColumn] || `Column ${selectedColumn + 1}` : 'Select a column'}" to:
        </Text>
        <Select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          mt={2}
          bg="white"
          color="black"
          borderColor="gray.300"
          _hover={{ borderColor: 'blue.500' }}
          _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 2px blue.200' }}
        >
          <option value="">None</option>
          {allColumns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </Select>
        <Text fontSize="sm" color="gray.600" mt={2}>Optional mappings: {optionalMappings}</Text>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="blue" mr={3} onClick={onConfirm}>
          Confirm
        </Button>
        <Button variant="outline" borderColor="gray.300" onClick={onClose} _hover={{ bg: 'gray.100' }}>
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

interface HeaderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewRows: any[];
  onRowSelect: (rowIndex: number) => void;
}

const HeaderSelectionModal: React.FC<HeaderSelectionModalProps> = ({
  isOpen,
  onClose,
  previewRows,
  onRowSelect,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size="xl">
    <ModalOverlay />
    <ModalContent alignSelf="left" ml={4} mt={16} bg="white" color="black">
      <ModalHeader>Select Header Row (Click a row) - {previewRows.length} Rows</ModalHeader>
      <ModalBody maxH="60vh" overflowY="auto">
        <Table size="sm" colorScheme="gray">
          <Tbody>
            {previewRows.map((row, rowIndex) => (
              <Tr key={rowIndex} onClick={() => onRowSelect(rowIndex)} cursor="pointer" _hover={{ bg: 'blue.50' }}>
                {row.map((cell: any, cellIndex: number) => (
                  <Td key={cellIndex} py={2} px={3}>{getDisplayValue(cell)}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ModalBody>
      <ModalFooter>
        <Button size="sm" variant="outline" borderColor="gray.300" onClick={onClose} _hover={{ bg: 'gray.100' }}>
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

interface ConfirmHeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRowIndex: number | null;
  previewRows: any[];
  onConfirm: () => void;
}

const ConfirmHeaderModal: React.FC<ConfirmHeaderModalProps> = ({
  isOpen,
  onClose,
  selectedRowIndex,
  previewRows,
  onConfirm,
}) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <ModalOverlay />
    <ModalContent bg="white" color="black">
      <ModalHeader>Confirm Header Selection</ModalHeader>
      <ModalBody>
        <Text>Use row {selectedRowIndex !== null ? selectedRowIndex + 1 : ''} as header?</Text>
        {selectedRowIndex !== null && <Text mt={2} color="gray.600">{previewRows[selectedRowIndex].join(', ')}</Text>}
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="blue" mr={3} onClick={onConfirm}>
          Confirm
        </Button>
        <Button variant="outline" borderColor="gray.300" onClick={onClose} _hover={{ bg: 'gray.100' }}>
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

export const Route = createFileRoute('/google-serp-cms')({
  component: CMSGoogleSerpForm,
});