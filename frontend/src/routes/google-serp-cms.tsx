import React, { useState, useCallback, useMemo } from 'react'; // Added useMemo
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
import ExcelDataTable, { ExcelData, ColumnMapping } from '../components/ExcelDataTable';
import useCustomToast from '../hooks/useCustomToast';

// Constants
const REQUIRED_COLUMNS = ['style', 'brand'] as const;
const OPTIONAL_COLUMNS = ['category', 'colorName', 'readImage', 'imageAdd'] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;
// const TARGET_HEADERS = ['BRAND', 'STYLE'] as const; // Not used, can be removed
const SERVER_URL = 'https://backend-dev.iconluxury.group';
const MAX_ROWS = 1000;

// Types
type ToastFunction = (title: string, description: string, status: 'error' | 'warning' | 'success') => void;

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

// const ExcelDataTableMemo = React.memo(ExcelDataTable); // Not used, can be removed

// Main Component
const CMSGoogleSerpForm: React.FC = () => {
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
    imageAdd: null,
    readImage: null,
    category: null,
    colorName: null,
  });
  const [manualBrand, setManualBrand] = useState<string>('');
  const [manualBrandInfo, setManualBrandInfo] = useState<{ value: string; insertIndex: number } | null>(null);
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
    setColumnMapping({ style: null, brand: null, imageAdd: null, readImage: null, category: null, colorName: null });
    setManualBrand('');
    setManualBrandInfo(null); // Reset manual brand info when a new file is loaded
    setHeaderRowIndex(null); // Reset header row index
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
      } else {
        setIsHeaderModalOpen(true);
      }
    } catch (error) {
      showToast('File Processing Error', error instanceof Error ? error.message : 'Unknown error', 'error');
      setFile(null);
    } finally {
      setIsLoadingFile(false);
    }
  }, [showToast]); // processHeaderSelection is not directly used here, but implicitly via effects

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

  const autoMapColumns = useCallback((headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      style: null, brand: null, imageAdd: null, readImage: null, category: null, colorName: null,
    };
    const patterns = {
      style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))$/i,
      brand: /^(brand|brand\s*name|manufacturer|label)$/i,
      category: /^(category|type|product\s*type|group)$/i,
      colorName: /^(color|colour|color\s*name|shade)$/i,
    };
    headers.forEach((header, index) => {
      const normalizedHeader = String(header ?? '').trim().toUpperCase();
      if (!normalizedHeader) return;
      if (patterns.style.test(normalizedHeader) && mapping.style === null) mapping.style = index;
      else if (patterns.brand.test(normalizedHeader) && mapping.brand === null) mapping.brand = index;
      else if (patterns.category.test(normalizedHeader) && mapping.category === null) mapping.category = index;
      else if (patterns.colorName.test(normalizedHeader) && mapping.colorName === null) mapping.colorName = index;
    });
    return mapping;
  }, []);

  const processHeaderSelection = useCallback((index: number, rowsToProcess: (string | number | boolean | null)[][]) => {
    const headers = rowsToProcess[index].map(cell => String(cell ?? ''));
    const newExcelRows = rowsToProcess.slice(index + 1).map(row => ({ row }));
    const newMapping = autoMapColumns(headers);
    setExcelData({ headers, rows: newExcelRows });
    setColumnMapping(newMapping);
    setHeaderRowIndex(index);
    setManualBrandInfo(null); // Reset if header selection changes column structure
  }, [autoMapColumns]);


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
  }, [selectedRowIndex, previewRows, processHeaderSelection]);

  // Manual Brand
  const applyManualBrand = useCallback(() => {
    if (!manualBrand.trim() || columnMapping.brand !== null) {
      showToast('Manual Brand Error', 'Cannot apply manual brand. Ensure no brand column is mapped and a non-empty brand is entered.', 'warning');
      return;
    }

    const styleIndex = columnMapping.style;
    const insertIndex = styleIndex !== null ? styleIndex + 1 : excelData.headers.length > 0 ? 0 : 0; // Insert at beginning if no style or no headers

    const newHeaders = [
      ...excelData.headers.slice(0, insertIndex),
      'BRAND (Manual)',
      ...excelData.headers.slice(insertIndex),
    ];

    const newRows = excelData.rows.map(row => ({
      row: [
        ...row.row.slice(0, insertIndex),
        manualBrand.trim(),
        ...row.row.slice(insertIndex),
      ],
    }));

    const newMapping: ColumnMapping = { ...columnMapping, brand: insertIndex };
    Object.keys(columnMapping).forEach(keyStr => {
      const key = keyStr as keyof ColumnMapping;
      if (key === 'brand') return; // Already handled

      let originalMappedIndex = columnMapping[key];
      if (originalMappedIndex !== null && originalMappedIndex >= insertIndex) {
        newMapping[key] = originalMappedIndex + 1;
      }
    });

    setExcelData({ headers: newHeaders, rows: newRows });
    setColumnMapping(newMapping);
    setManualBrandInfo({ value: manualBrand.trim(), insertIndex });
    // setManualBrand(''); // Optionally clear input
    showToast('Success', 'Manual brand applied.', 'success');
  }, [manualBrand, columnMapping, excelData, showToast]);


  const validateForm = useCallback((): boolean => {
    // Check if brand is provided either through mapping or manual input/application
    const isBrandProvided =
      columnMapping.brand !== null ||
      (manualBrandInfo !== null) ||
      (manualBrand.trim() !== '' && columnMapping.brand === null); // Allows typing without apply if no column mapped

    const tempMappingForValidation = { ...columnMapping };
    if (!isBrandProvided) {
        // Temporarily consider brand as unmapped for this check if not provided by any means
    } else {
        // If brand is provided one way or another, consider it "mapped" for validation
        if(tempMappingForValidation.brand === null) tempMappingForValidation.brand = 0; // Dummy value to pass validation
    }

    const missingRequired = REQUIRED_COLUMNS.filter(col => tempMappingForValidation[col] === null);

    if (!isBrandProvided && REQUIRED_COLUMNS.includes('brand')) {
        if(!missingRequired.includes('brand')) missingRequired.push('brand');
    }


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
  }, [columnMapping, manualBrand, manualBrandInfo, file, headerRowIndex, showToast]);


  const prepareFormData = useCallback((): FormData | null => {
    if (!file) {
        showToast('Error', 'No file selected for submission.', 'error');
        return null;
    }
    if (headerRowIndex === null || headerRowIndex < 0) {
        showToast('Error', 'Invalid header row index for submission.', 'error');
        return null;
    }

    const formData = new FormData();
    formData.append('fileUploadImage', file);

    const getOriginalColumnLetter = (
      fieldKey: keyof ColumnMapping,
      currentDisplayMapping: ColumnMapping,
      appliedInfo: { value: string; insertIndex: number } | null
    ): string => {
      let displayIndex = currentDisplayMapping[fieldKey];
      if (displayIndex === null) return '';

      let originalIndex = displayIndex;
      if (appliedInfo && fieldKey !== 'brand') { // If manual brand was applied AND this is not the brand field itself
        if (displayIndex > appliedInfo.insertIndex) {
          originalIndex = displayIndex - 1;
        }
      }
      return indexToColumnLetter(originalIndex);
    };

    const styleCol = getOriginalColumnLetter('style', columnMapping, manualBrandInfo);
    const imageAddCol = getOriginalColumnLetter('imageAdd', columnMapping, manualBrandInfo);
    const readImageCol = getOriginalColumnLetter('readImage', columnMapping, manualBrandInfo);
    const colorCol = getOriginalColumnLetter('colorName', columnMapping, manualBrandInfo);
    const categoryCol = getOriginalColumnLetter('category', columnMapping, manualBrandInfo);

    const imageColumnImage = readImageCol || imageAddCol;
    if (imageColumnImage) formData.append('imageColumnImage', imageColumnImage);
    formData.append('searchColImage', styleCol);

    // Brand logic
    if (manualBrandInfo) { // 1. "Apply" button was used
        formData.append('brandColImage', 'MANUAL');
        formData.append('manualBrand', manualBrandInfo.value);
    } else if (manualBrand.trim() !== '' && columnMapping.brand === null) { // 2. Typed in input, no "Apply", no brand column mapped
        formData.append('brandColImage', 'MANUAL');
        formData.append('manualBrand', manualBrand.trim());
    } else if (columnMapping.brand !== null) { // 3. Brand column is mapped
        const brandColLetter = getOriginalColumnLetter('brand', columnMapping, manualBrandInfo); // manualBrandInfo will be null here
        if (brandColLetter) {
            formData.append('brandColImage', brandColLetter);
        } else {
             showToast('Error', 'Brand column is mapped but failed to resolve to a column letter.', 'error');
             return null; // Critical error
        }
    } else { // 4. No brand provided
        showToast('Error', 'Brand column must be mapped or a manual brand must be provided.', 'error');
        return null; // Critical error
    }

    if (colorCol) formData.append('ColorColImage', colorCol);
    if (categoryCol) formData.append('CategoryColImage', categoryCol);
    formData.append('header_index', String(headerRowIndex + 1));

    const userEmail = 'nik@luxurymarket.com'; // Consider making this dynamic or configurable
    if (userEmail) formData.append('sendToEmail', userEmail);

    return formData;
  }, [file, headerRowIndex, columnMapping, manualBrand, manualBrandInfo, showToast]);


  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    const formData = prepareFormData();
    if (!formData) return; // prepareFormData will show toast on error

    setIsLoadingFile(true);
    try {
      const response = await fetch(`${SERVER_URL}/submitImage`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      await response.json(); // Assuming backend sends JSON response
      showToast('Success', 'Form submitted successfully', 'success');
      setTimeout(() => {
        window.location.reload(); // Or reset form state for SPA behavior
      }, 1000);
    } catch (error) {
      showToast('Submission Error', error instanceof Error ? error.message : 'Unknown error during submission', 'error');
    } finally {
      setIsLoadingFile(false);
    }
  }, [validateForm, prepareFormData, showToast]); // Removed direct state dependencies as they are handled by validateForm/prepareFormData

  // Column Mapping
  const handleMappingConfirm = useCallback((confirm: boolean) => {
    if (!confirm || selectedColumn === null) {
      resetMappingModal();
      return;
    }
    const newMapping = { ...columnMapping };
    // Unmap any existing field pointing to this column
    (Object.keys(newMapping) as Array<keyof ColumnMapping>).forEach(key => {
      if (newMapping[key] === selectedColumn) {
        newMapping[key] = null;
      }
    });
    // Map the new field, if any
    if (selectedField) {
      newMapping[selectedField as keyof ColumnMapping] = selectedColumn;
    }
    setColumnMapping(newMapping);
    if (selectedField === 'brand' && newMapping.brand !== null) { // If brand column is re-mapped, clear manual brand info
        setManualBrandInfo(null);
        setManualBrand('');
    }
    resetMappingModal();
  }, [selectedColumn, selectedField, columnMapping]);

  const openMappingModal = useCallback((columnIndex: number) => {
    setSelectedColumn(columnIndex);
    const currentField = (Object.entries(columnMapping) as Array<[keyof ColumnMapping, number | null]>).find(
        ([_, value]) => value === columnIndex
      )?.[0] || getDefaultField();
    setSelectedField(currentField);
    setIsMappingModalOpen(true);
  }, [columnMapping]); // getDefaultField is stable if defined outside or memoized

  const resetMappingModal = () => {
    setIsMappingModalOpen(false);
    setSelectedColumn(null);
    setSelectedField('');
  };

  const getDefaultField = useCallback((): string => { // Memoize if complex, simple enough here
    if (columnMapping.style === null) return 'style';
    if (columnMapping.brand === null) return 'brand';
    // Optional fields last
    if (columnMapping.category === null) return 'category';
    if (columnMapping.colorName === null) return 'colorName';
    if (columnMapping.imageAdd === null) return 'imageAdd';
    if (columnMapping.readImage === null) return 'readImage';
    return '';
  },[columnMapping]);

  // Computed Values for display
  const allRequiredSelectedForDisplay = useMemo(() => {
    const brandProvided = columnMapping.brand !== null || manualBrandInfo !== null || (manualBrand.trim() !== '' && columnMapping.brand === null);
    const styleProvided = columnMapping.style !== null;
    return brandProvided && styleProvided;
  }, [columnMapping, manualBrandInfo, manualBrand]);

  const missingRequiredForDisplay = useMemo(() => {
    const missing: string[] = [];
    if (columnMapping.style === null) missing.push('style');
    if (columnMapping.brand === null && !manualBrandInfo && manualBrand.trim() === '') missing.push('brand');
    return missing;
  }, [columnMapping, manualBrandInfo, manualBrand]);

  const mappedColumnsForDisplay = useMemo(() =>
    Object.entries(columnMapping)
    .filter(([_, index]) => index !== null)
    .map(([col, index]) => {
        const headerName = excelData.headers[index as number] || `Column ${index! + 1}`;
        return `${col.replace(/([A-Z])/g, ' $1').trim()}: ${headerName}`;
    }), [columnMapping, excelData.headers]);


  // Render
  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={4} align="stretch">
        <ControlSection
          isLoading={isLoadingFile}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          canSubmit={excelData.rows.length > 0 && allRequiredSelectedForDisplay}
          rowCount={excelData.rows.length}
          missingRequired={missingRequiredForDisplay}
          mappedColumns={mappedColumnsForDisplay}
        />
        <ManualBrandSection
          isVisible={excelData.rows.length > 0 && columnMapping.brand === null && !manualBrandInfo}
          manualBrand={manualBrand}
          setManualBrand={setManualBrand}
          onApply={applyManualBrand}
          isLoading={isLoadingFile}
        />
        {manualBrandInfo && excelData.rows.length > 0 && (
            <Text fontSize="sm" color="green.600" fontWeight="bold">
                Manual Brand Applied: "{manualBrandInfo.value}" (will override mapped brand column if any was selected)
            </Text>
        )}
        <DataTableSection
          isLoading={isLoadingFile}
          excelData={excelData}
          columnMapping={columnMapping}
          onColumnClick={openMappingModal}
          isManualBrand={manualBrandInfo !== null || (excelData.headers[columnMapping.brand!] === 'BRAND (Manual)')}
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
      Submit
    </Button>
    {rowCount > 0 && (
      <VStack align="start" spacing={0}>
        {missingRequired.length > 0 ? (
          <VStack align="start" spacing={0} flexDirection="column-reverse">
            {missingRequired.map(col => (
              <Text key={col} fontSize="sm" color="red.500">{col}</Text>
            ))}
            <Text fontSize="sm" color="red.500">Missing Required:</Text>
          </VStack>
        ) : (
          <Text fontSize="sm" color="green.600">All required fields covered.</Text>
        )}
         <VStack align="start" spacing={0} flexDirection="column-reverse" mt={missingRequired.length > 0 ? 2 : 0}>
            {mappedColumns.map((columnMapping, index) => (
              <Text key={index} fontSize="sm" color="blue.600">{columnMapping}</Text>
            ))}
            {mappedColumns.length > 0 && <Text fontSize="sm" color="blue.600">Mapped Fields:</Text>}
          </VStack>
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
            placeholder="Add Brand for All Rows (Optional)"
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
          isDisabled={!manualBrand.trim() || isLoading}
        >
          Apply Manual Brand
        </Button>
      </HStack>
    )}
    {/* <Box borderBottomWidth="1px" borderColor="gray.200" my={2} />  // Removed if not visually needed */}
  </>
);

interface DataTableSectionProps {
  isLoading: boolean;
  excelData: ExcelData;
  columnMapping: ColumnMapping;
  onColumnClick: (index: number) => void;
  isManualBrand?: boolean;
}

const DataTableSection: React.FC<DataTableSectionProps> = ({
  isLoading,
  excelData,
  columnMapping,
  onColumnClick,
  isManualBrand, // Pass this to ExcelDataTable if it uses it
}) => (
  <>
    {excelData.rows.length > 0 && (
      <Box flex="1" overflowY="auto" maxH="60vh" borderWidth="1px" borderRadius="md" p={4} borderColor="gray.200" bg="white">
        {isLoading && !excelData.headers.length ? ( // Show spinner only if truly loading initial table
          <VStack justify="center" h="full">
            <Spinner size="lg" color="green.500" />
            <Text color="gray.600">Loading table data...</Text>
          </VStack>
        ) : (
         <ExcelDataTable
            excelData={excelData}
            columnMapping={columnMapping}
            onColumnClick={onColumnClick}
            isManualBrand={isManualBrand} // Pass down the prop
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
          <option value="">None (Unmap)</option>
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
        {selectedRowIndex !== null && previewRows[selectedRowIndex] && (
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
