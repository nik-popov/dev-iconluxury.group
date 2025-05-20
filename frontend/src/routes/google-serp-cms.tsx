import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
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
  Tooltip,
} from '@chakra-ui/react';
import { createFileRoute } from '@tanstack/react-router';
import * as XLSX from 'xlsx';
import ExcelDataTable, { ExcelData, ColumnMapping as ExcelDataTableColumnMapping } from '../components/ExcelDataTable';
import useCustomToast from '../hooks/useCustomToast';

// Constants
const REQUIRED_COLUMNS = ['style', 'brand'] as const;
const OPTIONAL_COLUMNS = ['category', 'color', 'image'] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;
const SERVER_URL = 'https://backend-dev.iconluxury.group';
const MAX_ROWS = 1000;
const HEADER_LABELS_URL = 'https://iconluxury.group/static_settings/header_labels.json';

// Types
interface ColumnMapping {
  style: number | null;
  brand: number | null;
  category: number | null;
  color: number | null;
  image: number | null;
}

interface HeaderConfig {
  names: string[];
  patterns: string[];
}

interface HeaderLabelsConfig {
  columns: {
    style: HeaderConfig;
    brand: HeaderConfig;
    color: HeaderConfig;
    category: HeaderConfig;
    image: HeaderConfig;
  };
  manual_brand: {
    default: string | null;
    allow_manual: boolean;
  };
  max_rows_to_scan: number;
  min_match_threshold: number;
}

interface State {
  file: File | null;
  isLoadingFile: boolean;
  excelData: ExcelData;
  previewRows: (string | number | boolean | null)[][];
  isHeaderModalOpen: boolean;
  isConfirmModalOpen: boolean;
  isMappingModalOpen: boolean;
  selectedRowIndex: number | null;
  selectedColumn: number | null;
  selectedField: string;
  headerRowIndex: number | null;
  columnMapping: ColumnMapping;
  manualBrand: string;
  headerConfig: HeaderLabelsConfig | null;
}

type Action =
  | { type: 'SET_FILE'; payload: File | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EXCEL_DATA'; payload: ExcelData }
  | { type: 'SET_PREVIEW_ROWS'; payload: (string | number | boolean | null)[][] }
  | { type: 'SET_HEADER_MODAL'; payload: boolean }
  | { type: 'SET_CONFIRM_MODAL'; payload: boolean }
  | { type: 'SET_MAPPING_MODAL'; payload: boolean }
  | { type: 'SET_SELECTED_ROW'; payload: number | null }
  | { type: 'SET_SELECTED_COLUMN'; payload: number | null }
  | { type: 'SET_SELECTED_FIELD'; payload: string }
  | { type: 'SET_HEADER_ROW_INDEX'; payload: number | null }
  | { type: 'SET_COLUMN_MAPPING'; payload: ColumnMapping }
  | { type: 'SET_MANUAL_BRAND'; payload: string }
  | { type: 'SET_HEADER_CONFIG'; payload: HeaderLabelsConfig | null };

const initialState: State = {
  file: null,
  isLoadingFile: false,
  excelData: { headers: [], rows: [] },
  previewRows: [],
  isHeaderModalOpen: false,
  isConfirmModalOpen: false,
  isMappingModalOpen: false,
  selectedRowIndex: null,
  selectedColumn: null,
  selectedField: '',
  headerRowIndex: null,
  columnMapping: { style: null, brand: null, category: null, color: null, image: null },
  manualBrand: '',
  headerConfig: null,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, file: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoadingFile: action.payload };
    case 'SET_EXCEL_DATA':
      return { ...state, excelData: action.payload };
    case 'SET_PREVIEW_ROWS':
      return { ...state, previewRows: action.payload };
    case 'SET_HEADER_MODAL':
      return { ...state, isHeaderModalOpen: action.payload };
    case 'SET_CONFIRM_MODAL':
      return { ...state, isConfirmModalOpen: action.payload };
    case 'SET_MAPPING_MODAL':
      return { ...state, isMappingModalOpen: action.payload };
    case 'SET_SELECTED_ROW':
      return { ...state, selectedRowIndex: action.payload };
    case 'SET_SELECTED_COLUMN':
      return { ...state, selectedColumn: action.payload };
    case 'SET_SELECTED_FIELD':
      return { ...state, selectedField: action.payload };
    case 'SET_HEADER_ROW_INDEX':
      return { ...state, headerRowIndex: action.payload };
    case 'SET_COLUMN_MAPPING':
      return { ...state, columnMapping: action.payload };
    case 'SET_MANUAL_BRAND':
      return { ...state, manualBrand: action.payload };
    case 'SET_HEADER_CONFIG':
      return { ...state, headerConfig: action.payload };
    default:
      return state;
  }
};

// Helper Functions
const getDisplayValue = (cellValue: string | number | boolean | Date | null | undefined): string => {
  if (cellValue == null) return '';
  if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    return String(cellValue);
  }
  if (cellValue instanceof Date) return cellValue.toLocaleString();
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

const normalizeHeader = (header: string | number | null): string => {
  return String(header || '').toUpperCase().trim().replace(/\s+/g, '');
};

const adaptColumnMapping = (mapping: ColumnMapping): ExcelDataTableColumnMapping => ({
  style: mapping.style,
  brand: mapping.brand,
  category: mapping.category,
  colorName: mapping.color,
  imageAdd: mapping.image,
  readImage: mapping.image,
});

// Main Component
const CMSGoogleSerpForm: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const showToast = useCustomToast();

  const excelDataMemo = useMemo(() => state.excelData, [state.excelData]);
  const columnMappingMemo = useMemo(() => adaptColumnMapping(state.columnMapping), [state.columnMapping]);

  useEffect(() => {
    const fetchHeaderConfig = async () => {
      try {
        const response = await fetch(HEADER_LABELS_URL);
        if (!response.ok) throw new Error(`Failed to fetch header labels: ${response.status}`);
        const config: HeaderLabelsConfig = await response.json();
        dispatch({ type: 'SET_HEADER_CONFIG', payload: config });
      } catch (error) {
        showToast('Configuration Error', 'Failed to load header labels configuration', 'error');
        console.error(error);
      }
    };
    fetchHeaderConfig();
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

  const detectHeaderRow = (rows: (string | number | boolean | null)[][], config: HeaderLabelsConfig): number | null => {
    const { columns, max_rows_to_scan, min_match_threshold } = config;
    let bestRowIndex: number | null = null;
    let highestScore = 0;

    for (let i = 0; i < Math.min(max_rows_to_scan, rows.length); i++) {
      const rowValues = rows[i].map(cell => normalizeHeader(cell?.toString() || ''));
      if (rowValues.every(cell => cell === '')) continue;
      let matchScore = 0;
      let totalPossibleMatches = ALL_COLUMNS.length;

      ALL_COLUMNS.forEach((col) => {
        const colConfig = columns[col as keyof typeof columns];
        const { names, patterns } = colConfig;

        const hasMatch = rowValues.some((value) =>
          value !== '' &&
          (names.some((name) => normalizeHeader(name) === value) ||
            patterns.some((pattern) => new RegExp(pattern, 'i').test(value)))
        );

        if (hasMatch) {
          matchScore += col === 'style' || col === 'brand' ? 1.5 : 1;
        }
      });

      const rowScore = matchScore / totalPossibleMatches;
      if (rowScore >= min_match_threshold && rowScore > highestScore) {
        highestScore = rowScore;
        bestRowIndex = i;
      }
    }

    return bestRowIndex;
  };

  const autoMapColumns = (headers: string[], config: HeaderLabelsConfig): ColumnMapping => {
    const mapping: ColumnMapping = { style: null, brand: null, category: null, color: null, image: null };
    const { columns } = config;

    headers.forEach((header, index) => {
      const normalizedHeader = normalizeHeader(header);

      ALL_COLUMNS.forEach((col) => {
        const colConfig = columns[col as keyof typeof columns];
        const { names, patterns } = colConfig;

        const isMatch =
          names.some((name) => normalizeHeader(name) === normalizedHeader) ||
          patterns.some((pattern) => new RegExp(pattern, 'i').test(normalizedHeader));

        if (isMatch && mapping[col] === null) {
          mapping[col] = index;
        }
      });
    });

    return mapping;
  };

  const processHeaderSelection = (index: number, rows: (string | number | boolean | null)[][]) => {
    const headers = rows[index] as string[];
    const newRows = rows.slice(index + 1).map(row => ({ row: row as (string | number | boolean | null)[] }));
    const newMapping = state.headerConfig ? autoMapColumns(headers, state.headerConfig) : { style: null, brand: null, category: null, color: null, image: null };
    dispatch({ type: 'SET_EXCEL_DATA', payload: { headers, rows: newRows } });
    dispatch({ type: 'SET_COLUMN_MAPPING', payload: newMapping });
    dispatch({ type: 'SET_HEADER_ROW_INDEX', payload: index });
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      showToast('File Error', 'No file selected', 'error');
      return;
    }

    if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type)) {
      showToast('File Error', 'Invalid file type. Please upload an Excel file (.xlsx or .xls)', 'error');
      return;
    }

    dispatch({ type: 'SET_FILE', payload: selectedFile });
    dispatch({ type: 'SET_EXCEL_DATA', payload: { headers: [], rows: [] } });
    dispatch({ type: 'SET_COLUMN_MAPPING', payload: { style: null, brand: null, category: null, color: null, image: null } });
    dispatch({ type: 'SET_MANUAL_BRAND', payload: '' });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const data = await readFile(selectedFile);
      const workbook = XLSX.read(data, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) throw new Error('No worksheet found in the Excel file');
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: '' });
      if (jsonData.length === 0) throw new Error('Excel file is empty');
      const preview = jsonData.slice(0, MAX_ROWS) as (string | number | boolean | null)[][];
      dispatch({ type: 'SET_PREVIEW_ROWS', payload: preview });

      if (!state.headerConfig) throw new Error('Header configuration not loaded');
      const autoHeaderIndex = detectHeaderRow(preview, state.headerConfig);
      if (autoHeaderIndex !== null) {
        processHeaderSelection(autoHeaderIndex, preview);
      } else {
        dispatch({ type: 'SET_HEADER_MODAL', payload: true });
      }
    } catch (error) {
      showToast('File Processing Error', error instanceof Error ? error.message : 'Failed to process the Excel file', 'error');
      dispatch({ type: 'SET_FILE', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [showToast, state.headerConfig]);

  const handleRowSelect = useCallback((rowIndex: number) => {
    dispatch({ type: 'SET_SELECTED_ROW', payload: rowIndex });
    dispatch({ type: 'SET_CONFIRM_MODAL', payload: true });
  }, []);

  const confirmHeaderSelect = useCallback(() => {
    if (state.selectedRowIndex === null) return;
    processHeaderSelection(state.selectedRowIndex, state.previewRows);
    dispatch({ type: 'SET_HEADER_MODAL', payload: false });
    dispatch({ type: 'SET_CONFIRM_MODAL', payload: false });
  }, [state.selectedRowIndex, state.previewRows]);

  const applyManualBrand = useCallback(() => {
    if (!state.manualBrand || state.columnMapping.brand !== null || !state.headerConfig?.manual_brand.allow_manual) {
      showToast('Manual Brand Error', 'Cannot apply manual brand. Ensure it is enabled and no brand column is mapped.', 'warning');
      return;
    }
    const newHeaders = [...state.excelData.headers, 'BRAND (Manual)'];
    const newRows = state.excelData.rows.map(row => ({ row: [...row.row, state.manualBrand] }));
    dispatch({ type: 'SET_EXCEL_DATA', payload: { headers: newHeaders, rows: newRows } });
    dispatch({ type: 'SET_COLUMN_MAPPING', payload: { ...state.columnMapping, brand: newHeaders.length - 1 } });
  }, [state.manualBrand, state.columnMapping, state.excelData, state.headerConfig, showToast]);

  const validateForm = (): boolean => {
    const missingRequired = REQUIRED_COLUMNS.filter(col => state.columnMapping[col] === null);
    if (missingRequired.length > 0) {
      showToast('Validation Error', `Missing required columns: ${missingRequired.join(', ')}`, 'warning');
      return false;
    }
    if (!state.file) {
      showToast('Validation Error', 'No file selected', 'error');
      return false;
    }
    if (state.headerRowIndex === null) {
      showToast('Validation Error', 'Header row not selected', 'error');
      return false;
    }
    return true;
  };

  const prepareFormData = (): FormData => {
    if (!state.file) throw new Error('No file selected');
    if (state.headerRowIndex === null || state.headerRowIndex < 0) throw new Error('Invalid header row index');

    const formData = new FormData();
    formData.append('fileUploadImage', state.file);

    const mappingToColumn = (key: keyof ColumnMapping, defaultVal: string) =>
      state.columnMapping[key] !== null ? indexToColumnLetter(state.columnMapping[key]!) : defaultVal;

    const styleCol = mappingToColumn('style', 'A');
    const brandCol = mappingToColumn('brand', 'B');
    const imageCol = mappingToColumn('image', '');
    const colorCol = mappingToColumn('color', '');
    const categoryCol = mappingToColumn('category', '');

    if (imageCol) formData.append('imageColumnImage', imageCol);
    formData.append('searchColImage', styleCol);

    if (state.manualBrand && state.manualBrand.trim() !== '' && state.headerConfig?.manual_brand.allow_manual) {
      formData.append('brandColImage', 'MANUAL');
      formData.append('manualBrand', state.manualBrand);
    } else if (state.columnMapping.brand !== null) {
      formData.append('brandColImage', brandCol);
    } else {
      throw new Error('Brand column must be mapped or manual brand provided');
    }

    if (colorCol) formData.append('ColorColImage', colorCol);
    if (categoryCol) formData.append('CategoryColImage', categoryCol);
    formData.append('header_index', String(state.headerRowIndex + 1));

    const userEmail = 'nik@luxurymarket.com';
    if (userEmail) formData.append('sendToEmail', userEmail);

    return formData;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    dispatch({ type: 'SET_LOADING', payload: true });
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
      showToast('Success', 'Form submitted successfully', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      showToast('Submission Error', error instanceof Error ? error.message : 'Failed to submit the form', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [showToast]);

  const openMappingModal = useCallback((columnIndex: number) => {
    dispatch({ type: 'SET_SELECTED_COLUMN', payload: columnIndex });
    const currentField = Object.keys(state.columnMapping).find(key => state.columnMapping[key as keyof ColumnMapping] === columnIndex);
    dispatch({ type: 'SET_SELECTED_FIELD', payload: currentField || getDefaultField() });
    dispatch({ type: 'SET_MAPPING_MODAL', payload: true });
  }, [state.columnMapping]);

  const resetMappingModal = () => {
    dispatch({ type: 'SET_MAPPING_MODAL', payload: false });
    dispatch({ type: 'SET_SELECTED_COLUMN', payload: null });
    dispatch({ type: 'SET_SELECTED_FIELD', payload: '' });
  };

  const getDefaultField = (): string => {
    if (state.columnMapping.style === null) return 'style';
    if (state.columnMapping.brand === null) return 'brand';
    if (state.columnMapping.category === null) return 'category';
    if (state.columnMapping.color === null) return 'color';
    if (state.columnMapping.image === null) return 'image';
    return '';
  };

  const handleMappingConfirm = useCallback((confirm: boolean) => {
    if (!confirm || state.selectedColumn === null) {
      resetMappingModal();
      return;
    }
    const newMapping = { ...state.columnMapping };
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key as keyof ColumnMapping] === state.selectedColumn) {
        newMapping[key as keyof ColumnMapping] = null;
      }
    });
    if (state.selectedField) {
      newMapping[state.selectedField as keyof ColumnMapping] = state.selectedColumn;
    }
    dispatch({ type: 'SET_COLUMN_MAPPING', payload: newMapping });
    resetMappingModal();
  }, [state.selectedColumn, state.selectedField, state.columnMapping]);

  const allRequiredSelected = REQUIRED_COLUMNS.every(col => state.columnMapping[col] !== null);
  const missingRequired = REQUIRED_COLUMNS.filter(col => state.columnMapping[col] === null);
  const mappedColumns = Object.entries(state.columnMapping)
    .filter(([_, index]) => index !== null)
    .map(([col, index]) => `${col.replace(/([A-Z])/g, ' $1').trim()}: ${state.excelData.headers[index as number] || `Column ${index! + 1}`}`);

  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={4} align="stretch">
        <ControlSection
          isLoading={state.isLoadingFile}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          canSubmit={state.excelData.rows.length > 0 && allRequiredSelected}
          rowCount={state.excelData.rows.length}
          missingRequired={missingRequired}
          mappedColumns={mappedColumns}
        />
        <ManualBrandSection
          isVisible={state.excelData.rows.length > 0 && state.columnMapping.brand === null && state.headerConfig?.manual_brand.allow_manual}
          manualBrand={state.manualBrand}
          setManualBrand={(value) => dispatch({ type: 'SET_MANUAL_BRAND', payload: value })}
          onApply={applyManualBrand}
          isLoading={state.isLoadingFile}
        />
        <DataTableSection
          isLoading={state.isLoadingFile}
          excelData={excelDataMemo}
          columnMapping={columnMappingMemo}
          onColumnClick={openMappingModal}
          isManualBrand={state.columnMapping.brand !== null && state.excelData.headers[state.columnMapping.brand] === 'BRAND (Manual)'}
        />
        <MappingModal
          isOpen={state.isMappingModalOpen}
          onClose={() => handleMappingConfirm(false)}
          selectedColumn={state.selectedColumn}
          headers={state.excelData.headers}
          selectedField={state.selectedField}
          setSelectedField={(value) => dispatch({ type: 'SET_SELECTED_FIELD', payload: value })}
          onConfirm={() => handleMappingConfirm(true)}
          allColumns={ALL_COLUMNS}
          optionalMappings={OPTIONAL_COLUMNS.join(', ')}
        />
        <HeaderSelectionModal
          isOpen={state.isHeaderModalOpen}
          onClose={() => dispatch({ type: 'SET_HEADER_MODAL', payload: false })}
          previewRows={state.previewRows}
          onRowSelect={handleRowSelect}
        />
        <ConfirmHeaderModal
          isOpen={state.isConfirmModalOpen}
          onClose={() => dispatch({ type: 'SET_CONFIRM_MODAL', payload: false })}
          selectedRowIndex={state.selectedRowIndex}
          previewRows={state.previewRows}
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
  <HStack spacing={4} align="flex-start" wrap="wrap">
    <FormControl maxW="400px">
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
    <Tooltip label={canSubmit ? 'Submit the form' : 'Complete required fields to submit'}>
      <Button
        colorScheme="blue"
        onClick={onSubmit}
        isDisabled={!canSubmit || isLoading}
        isLoading={isLoading}
      >
        Submit
      </Button>
    </Tooltip>
    {rowCount > 0 && (
      <VStack align="start" spacing={1}>
        <Text fontSize="sm" color="gray.600">Rows: {rowCount}</Text>
        {missingRequired.length > 0 ? (
          <Box>
            <Text fontSize="sm" color="red.500" fontWeight="bold">Missing Required Columns:</Text>
            {missingRequired.map(col => (
              <Text key={col} fontSize="sm" color="red.500">• {col}</Text>
            ))}
          </Box>
        ) : (
          <Box>
            <Text fontSize="sm" color="blue.600" fontWeight="bold">Mapped Columns:</Text>
            {mappedColumns.map((columnMapping, index) => (
              <Text key={index} fontSize="sm" color="blue.600">• {columnMapping}</Text>
            ))}
          </Box>
        )}
      </VStack>
    )}
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
        <FormControl maxW="sm">
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
        <Tooltip label={manualBrand ? 'Apply manual brand to all rows' : 'Enter a brand to apply'}>
          <Button
            colorScheme="orange"
            onClick={onApply}
            isDisabled={!manualBrand || isLoading}
          >
            Apply
          </Button>
        </Tooltip>
      </HStack>
    )}
    <Box borderBottomWidth="1px" borderColor="gray.200" my={2} />
  </>
);

interface DataTableSectionProps {
  isLoading: boolean;
  excelData: ExcelData;
  columnMapping: ExcelDataTableColumnMapping;
  onColumnClick: (index: number) => void;
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
            <Spinner size="lg" color="green.500" />
            <Text color="gray.600">Loading table data...</Text>
          </VStack>
        ) : (
          <ExcelDataTable
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
export const Route = createFileRoute('/google-serp-cms')({
  component: CMSGoogleSerpForm,
});

export default CMSGoogleSerpForm;