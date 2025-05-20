import React, { useState, useCallback, useEffect } from 'react';
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
import ExcelDataTable, { ExcelData, ColumnMapping } from '../components/ExcelDataTable.tsx';
import useCustomToast from '../hooks/useCustomToast';

// Constants
const REQUIRED_COLUMNS = ['style', 'brand'] as const;
const OPTIONAL_COLUMNS = ['category', 'color', 'image'] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;
const SERVER_URL = 'https://backend-dev.iconluxury.group';
const MAX_ROWS = 1000;
const HEADER_LABELS_URL = 'https://iconluxury.group/static_settings/header_labels.json';

// Types for Header Labels Configuration
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

const normalizeHeader = (header: string): string => {
  return String(header || '').toUpperCase().trim().replace(/\s+/g, '');
};

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
    image: null,
    category: null,
    color: null,
  });
  const [manualBrand, setManualBrand] = useState<string>('');
  const [headerConfig, setHeaderConfig] = useState<HeaderLabelsConfig | null>(null);

  const showToast = useCustomToast();

  // Fetch Header Labels Configuration
  useEffect(() => {
    const fetchHeaderConfig = async () => {
      try {
        const response = await fetch(HEADER_LABELS_URL);
        if (!response.ok) throw new Error(`Failed to fetch header labels: ${response.status}`);
        const config: HeaderLabelsConfig = await response.json();
        setHeaderConfig(config);
      } catch (error) {
        showToast('Configuration Error', 'Failed to load header labels configuration', 'error');
        console.error(error);
      }
    };
    fetchHeaderConfig();
  }, [showToast]);

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
    setColumnMapping({ style: null, brand: null, image: null, category: null, color: null });
    setManualBrand('');
    setIsLoadingFile(true);

    try {
      const data = await readFile(selectedFile);
      const workbook = XLSX.read(data, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: '', raw: true });
      const preview = jsonData.slice(0, MAX_ROWS);
      setPreviewRows(preview);

      const autoHeaderIndex = headerConfig ? detectHeaderRow(preview, headerConfig) : null;
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
  }, [showToast, headerConfig]);

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsBinaryString(file);
    });
  };

  // Detect Header Row
  const detectHeaderRow = (rows: any[], config: HeaderLabelsConfig): number | null => {
    const { columns, max_rows_to_scan, min_match_threshold } = config;
    let bestRowIndex: number | null = null;
    let highestScore = 0;

    for (let i = 0; i < Math.min(max_rows_to_scan, rows.length); i++) {
      const rowValues = (rows[i] as any[]).map(cell => normalizeHeader(cell));
      let matchScore = 0;
      let totalPossibleMatches = ALL_COLUMNS.length;

      ALL_COLUMNS.forEach((col) => {
        const colConfig = columns[col as keyof typeof columns];
        const { names, patterns } = colConfig;

        const hasMatch = rowValues.some((value) =>
          names.some((name) => normalizeHeader(name) === value) ||
          patterns.some((pattern) => new RegExp(pattern).test(value))
        );

        if (hasMatch) {
          matchScore += col === 'style' || col === 'brand' ? 1.5 : 1; // Weight required columns higher
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

  const processHeaderSelection = (index: number, rows: any[]) => {
    const headers = rows[index] as string[];
    const newRows = rows.slice(index + 1).map(row => ({ row: row as any[] }));
    const newMapping = headerConfig ? autoMapColumns(headers, headerConfig) : { style: null, brand: null, image: null, category: null, color: null };
    setExcelData({ headers, rows: newRows });
    setColumnMapping(newMapping);
    setHeaderRowIndex(index);
  };

  // Auto Map Columns
  const autoMapColumns = (headers: string[], config: HeaderLabelsConfig): ColumnMapping => {
    const mapping: ColumnMapping = { style: null, brand: null, image: null, category: null, color: null };
    const { columns } = config;

    headers.forEach((header, index) => {
      const normalizedHeader = normalizeHeader(header);

      ALL_COLUMNS.forEach((col) => {
        const colConfig = columns[col as keyof typeof columns];
        const { names, patterns } = colConfig;

        const isMatch =
          names.some((name) => normalizeHeader(name) === normalizedHeader) ||
          patterns.some((pattern) => new RegExp(pattern).test(normalizedHeader));

        if (isMatch && mapping[col] === null) {
          mapping[col] = index;
        }
      });
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
    if (!manualBrand || columnMapping.brand !== null || !headerConfig?.manual_brand.allow_manual) return;
    const newHeaders = [...excelData.headers, 'BRAND (Manual)'];
    const newRows = excelData.rows.map(row => ({ row: [...row.row, manualBrand] }));
    setExcelData({ headers: newHeaders, rows: newRows });
    setColumnMapping(prev => ({ ...prev, brand: newHeaders.length - 1 }));
  }, [manualBrand, columnMapping.brand, excelData, headerConfig]);

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
    const imageCol = mappingToColumn('image', '');
    const colorCol = mappingToColumn('color', '');
    const categoryCol = mappingToColumn('category', '');

    if (imageCol) formData.append('imageColumnImage', imageCol);
    formData.append('searchColImage', styleCol);

    if (manualBrand && manualBrand.trim() !== '' && headerConfig?.manual_brand.allow_manual) {
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
    if (columnMapping.color === null) return 'color';
    if (columnMapping.image === null) return 'image';
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
          isVisible={excelData.rows.length > 0 && columnMapping.brand === null && headerConfig?.manual_brand.allow_manual}
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

// Sub-components remain unchanged (ControlSection, ManualBrandSection, etc.)
// ... (Include the rest of the sub-components as in the original code)

// Export
export const Route = createFileRoute('/google-serp-cms')({
  component: CMSGoogleSerpForm,
});

export default CMSGoogleSerpForm;