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

// Mock custom hook for toast (since useCustomToast is not provided)
const useCustomToast = () => {
  return (title: string, description: string, status: 'error' | 'warning' | 'success') => {
    alert(`${title}: ${description} (${status})`);
  };
};

// Mock ExcelDataTable component
const ExcelDataTable = ({ excelData, columnMapping, onColumnClick }: { excelData: ExcelData; columnMapping: ColumnMapping; onColumnClick: (index: number) => void }) => (
  <Table size="sm" colorScheme="gray">
    <Tbody>
      {excelData.headers.map((header, index) => (
        <Tr key={index} onClick={() => onColumnClick(index)} cursor="pointer">
          <Td>{header}</Td>
          <Td>{Object.keys(columnMapping).find(key => columnMapping[key as keyof ColumnMapping] === index) || 'None'}</Td>
        </Tr>
      ))}
    </Tbody>
  </Table>
);

// Constants
const REQUIRED_COLUMNS = ['style', 'brand'] as const;
const OPTIONAL_COLUMNS = ['category', 'colorName', 'imageAdd', 'readImage'] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;
const SERVER_URL = 'https://backend-dev.iconluxury.group';
const MAX_ROWS = 1000;

// Types
type ToastFunction = (title: string, description: string, status: 'error' | 'warning' | 'success') => void;
type ExcelData = { headers: string[]; rows: { row: (string | number | boolean | null)[] }[] };
type ColumnMapping = { style: number | null; brand: number | null; category: number | null; colorName: number | null; imageAdd: number | null; readImage: number | null };

// Helper Functions
const getDisplayValue = (
  cellValue: string | number | boolean | Date | null | undefined | { error?: string; result?: any; text?: string; hyperlink?: string }
): string => {
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

// Main Component
const OfferUploadForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData>({ headers: [], rows: [] });
  const [previewRows, setPreviewRows] = useState<(string | number | boolean | null)[][]>([]);
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
    category: null,
    colorName: null,
    imageAdd: null,
    readImage: null,
  });
  const [manualBrand, setManualBrand] = useState<string>('');

  const showToast: ToastFunction = useCustomToast();

  // File Handling
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      showToast('File Error', 'No file selected', 'error');
      return;
    }

    if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type)) {
      showToast('File Error', 'Please upload an Excel file (.xlsx or .xls)', 'error');
      return;
    }

    setFile(selectedFile);
    setExcelData({ headers: [], rows: [] });
    setColumnMapping({ style: null, brand: null, category: null, colorName: null, imageAdd: null, readImage: null });
    setManualBrand('');
    setIsLoadingFile(true);

    try {
      const data = await readFile(selectedFile);
      const workbook = XLSX.read(data, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) throw new Error('No worksheet found in the Excel file');
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: '' });
      if (jsonData.length === 0) throw new Error('Excel file is empty');
      const preview = jsonData.slice(0, MAX_ROWS) as (string | number | boolean | null)[][];
      setPreviewRows(preview);

      const autoHeaderIndex = detectHeaderRow(preview);
      if (autoHeaderIndex !== null) {
        processHeaderSelection(autoHeaderIndex, preview);
        const headers = preview[autoHeaderIndex].map(cell => String(cell ?? ''));
        setColumnMapping(autoMapColumns(headers));
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
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('File size exceeds 10MB'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsBinaryString(file);
    });
  };

  const detectHeaderRow = (rows: (string | number | boolean | null)[][]): number | null => {
    const patterns = {
      style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))$/i,
      brand: /^(brand|brand\s*name|manufacturer|label)$/i,
    };

    const MAX_SEARCH_ROWS = 50;

    for (let i = 0; i < Math.min(MAX_SEARCH_ROWS, rows.length); i++) {
      const rowValues = rows[i]
        .map(cell => String(cell ?? '').trim())
        .filter(value => value !== '');
      if (rowValues.length < 2) continue;

      let styleMatch = false;
      for (const value of rowValues) {
        if (patterns.style.test(String(value ?? '').trim())) {
          styleMatch = true;
          break;
        }
      }

      if (styleMatch) return i;
    }

    return null;
  };

  const processHeaderSelection = (index: number, rows: (string | number | boolean | null)[][]) => {
    const headers = rows[index].map(cell => String(cell ?? ''));
    const newRows = rows.slice(index + 1).map(row => ({ row }));
    setExcelData({ headers, rows: newRows });
    setHeaderRowIndex(index);
  };

  const autoMapColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      style: null,
      brand: null,
      category: null,
      colorName: null,
      imageAdd: null,
      readImage: null,
    };

    const patterns = {
      style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))$/i,
      brand: /^(brand|brand\s*name|manufacturer|label)$/i,
      category: /^(category|type|product\s*type|group)$/i,
      colorName: /^(color|colour|color\s*name|shade)$/i,
      imageAdd: /^(image|image\s*add|photo|picture)$/i,
      readImage: /^(read\s*image|image\s*url|image\s*link)$/i,
    };

    const matchedColumns = new Set<number>();

    headers.forEach((header, index) => {
      const normalizedHeader = String(header ?? '').trim().toUpperCase();
      if (!normalizedHeader) return;

      if (patterns.style.test(normalizedHeader) && mapping.style === null) {
        mapping.style = index;
        matchedColumns.add(index);
      } else if (patterns.brand.test(normalizedHeader) && mapping.brand === null && !matchedColumns.has(index)) {
        mapping.brand = index;
        matchedColumns.add(index);
      } else if (patterns.category.test(normalizedHeader) && mapping.category === null && !matchedColumns.has(index)) {
        mapping.category = index;
        matchedColumns.add(index);
      } else if (patterns.colorName.test(normalizedHeader) && mapping.colorName === null && !matchedColumns.has(index)) {
        mapping.colorName = index;
        matchedColumns.add(index);
      } else if (patterns.imageAdd.test(normalizedHeader) && mapping.imageAdd === null && !matchedColumns.has(index)) {
        mapping.imageAdd = index;
        matchedColumns.add(index);
      } else if (patterns.readImage.test(normalizedHeader) && mapping.readImage === null && !matchedColumns.has(index)) {
        mapping.readImage = index;
        matchedColumns.add(index);
      }
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
    const headers = previewRows[selectedRowIndex].map(cell => String(cell ?? ''));
    setColumnMapping(autoMapColumns(headers));
    setIsHeaderModalOpen(false);
    setIsConfirmModalOpen(false);
  }, [selectedRowIndex, previewRows]);

  // Manual Brand
  const applyManualBrand = useCallback(() => {
    if (!manualBrand || columnMapping.brand !== null) {
      showToast('Manual Brand Error', 'Cannot apply manual brand.', 'warning');
      return;
    }

    const styleIndex = columnMapping.style;
    const insertIndex = styleIndex !== null ? styleIndex + 1 : 0;

    const newHeaders = [
      ...excelData.headers.slice(0, insertIndex),
      'BRAND (Manual)',
      ...excelData.headers.slice(insertIndex),
    ];

    const newRows = excelData.rows.map(row => ({
      row: [
        ...row.row.slice(0, insertIndex),
        manualBrand,
        ...row.row.slice(insertIndex),
      ],
    }));

    const newMapping: ColumnMapping = { ...columnMapping, brand: insertIndex };
    Object.keys(newMapping).forEach(key => {
      const index = newMapping[key as keyof ColumnMapping];
      if (index !== null && index >= insertIndex && key !== 'brand') {
        newMapping[key as keyof ColumnMapping] = index + 1;
      }
    });

    setExcelData({ headers: newHeaders, rows: newRows });
    setColumnMapping(newMapping);
  }, [manualBrand, columnMapping, excelData, showToast]);

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      await response.json();
      showToast('Success', 'Offer uploaded successfully', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      showToast('Submission Error', error instanceof Error ? error.message : 'Unknown error', 'error');
    } finally {
      setIsLoadingFile(false);
    }
  }, [file, headerRowIndex, columnMapping, manualBrand, showToast]);

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
    if (!file) throw new Error('No file selected');
    if (headerRowIndex === null || headerRowIndex < 0) throw new Error('Invalid header row index');

    const formData = new FormData();
    formData.append('fileUploadImage', file);

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
    formData.append('header_index', String(headerRowIndex + 1));

    const userEmail = 'nik@luxurymarket.com';
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
    const currentField = Object.entries(columnMapping).find(([_, value]) => value === columnIndex)?.[0] || getDefaultField();
    setSelectedField(currentField);
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
    if (columnMapping.imageAdd === null) return 'imageAdd';
    if (columnMapping.readImage === null) return 'readImage';
    return '';
  };

  // Computed Values
  const allRequiredSelected = REQUIRED_COLUMNS.every(col => columnMapping[col] !== null);
  const missingRequired = REQUIRED_COLUMNS.filter(col => columnMapping[col] === null);
  const mappedColumns = Object.entries(columnMapping)
    .filter(([_, index]) => index !== null)
    .map(([col, index]) => `${col.replace(/([A-Z])/g, ' $1').trim()}: ${excelData.headers[index as number] || `Column ${index! + 1}`}`);

  // Render
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

// Sub-components
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
        aria-label="Upload Excel file"
      />
    </FormControl>
    <Button
      colorScheme="blue"
      onClick={onSubmit}
      isDisabled={!canSubmit || isLoading}
      isLoading={isLoading}
    >
      Submit Offer
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
            aria-label="Enter manual brand"
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
  onColumnClick: (index: number) => void;
}

const DataTableSection: React.FC<DataTableSectionProps> = ({
  isLoading,
  excelData,
  columnMapping,
  onColumnClick,
}) => (
  <>
    {excelData.rows.length > 0 && (
      <Box flex="1" overflowY="auto" maxH="60vh" borderWidth="1px" borderRadius="md" p={4} borderColor="gray.200" bg="white">
        {isLoading ? (
          <VStack justify="center" h="full">
            <Spinner size="lg" color="green.500" />
            <Text color="gray.600">Loading table data...</Text>
          </VStack>
        ) : (
          <ExcelDataTable
            excelData={excelData}
            columnMapping={columnMapping}
            onColumnClick={onColumnClick}
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
          aria-label="Select column mapping"
        >
          <option value="">None</option>
          {allColumns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </Select>
        <Text fontSize="sm" color="gray.600" mt={2}>Optional mappings: {optionalMappings}</Text>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="blue" mr={3} onClick={onConfirm} aria-label="Confirm column mapping">
          Confirm
        </Button>
        <Button variant="outline" borderColor="gray.300" onClick={onClose} _hover={{ bg: 'gray.100' }} aria-label="Cancel column mapping">
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

interface HeaderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewRows: (string | number | boolean | null)[][];
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
        <Table size="sm" colorScheme="gray" aria-label="Preview rows for header selection">
          <Tbody>
            {previewRows.map((row, rowIndex) => (
              <Tr
                key={rowIndex}
                onClick={() => onRowSelect(rowIndex)}
                cursor="pointer"
                _hover={{ bg: 'blue.50' }}
                role="button"
                aria-label={`Select row ${rowIndex + 1} as header`}
              >
                {row.map((cell, cellIndex) => (
                  <Td key={cellIndex} py={2} px={3}>{getDisplayValue(cell)}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ModalBody>
      <ModalFooter>
        <Button size="sm" variant="outline" borderColor="gray.300" onClick={onClose} _hover={{ bg: 'gray.100' }} aria-label="Cancel header selection">
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
  previewRows: (string | number | boolean | null)[][];
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
        {selectedRowIndex !== null && (
          <Text mt={2} color="gray.600">{previewRows[selectedRowIndex].map(cell => getDisplayValue(cell)).join(', ')}</Text>
        )}
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="blue" mr={3} onClick={onConfirm} aria-label="Confirm header selection">
          Confirm
        </Button>
        <Button variant="outline" borderColor="gray.300" onClick={onClose} _hover={{ bg: 'gray.100' }} aria-label="Cancel header confirmation">
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

// Export
export const Route = createFileRoute('/_layout/submit-form/offer')({
  component: OfferUploadForm,
});

export default OfferUploadForm;