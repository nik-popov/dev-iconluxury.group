import React, { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Text,
  Button,
  VStack,
  HStack,
  Box,
  Input,
  FormControl,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Checkbox,
  Tooltip,
  Badge,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { createFileRoute } from '@tanstack/react-router';
import * as XLSX from 'xlsx';
import useCustomToast from '../hooks/useCustomToast';

// Constants
type ColumnType = 'style' | 'brand' | 'category' | 'colorName' | 'readImage' | 'imageAdd';
const REQUIRED_COLUMNS: ColumnType[] = ['style', 'brand'];
const OPTIONAL_COLUMNS: ColumnType[] = ['category', 'colorName', 'readImage', 'imageAdd'];
const ALL_COLUMNS: ColumnType[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
const SERVER_URL = 'https://backend-dev.iconluxury.group';
const MAX_PREVIEW_ROWS = 10;
const MAX_FILE_SIZE_MB = 10;

// Types
type CellValue = string | number | boolean | null;
type ExcelData = { headers: string[]; rows: CellValue[][] };
type ColumnMapping = Record<typeof ALL_COLUMNS[number], number | null>;
type ToastFunction = (title: string, description: string, status: 'error' | 'warning' | 'success') => void;

// Helper Functions (unchanged for brevity)
const getDisplayValue = (value: any): string => {
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') {
    if (value.error) return value.error;
    if (value.result !== undefined) return getDisplayValue(value.result);
    if (value.text) return value.text;
    if (value.link) return value.text || value.link;
    return JSON.stringify(value);
  }
  return String(value);
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

const detectHeaderRow = (rows: CellValue[][]): number => {
  const patterns = {
    style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
  };
  let bestIndex = 0;
  let maxNonEmptyCells = 0;
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i]
      .map(cell => String(cell ?? '').trim())
      .filter(value => value !== '') as string[];
    const nonEmptyCount = rowValues.length;
    if (nonEmptyCount < 2) continue;
    const hasHeaderMatch = rowValues.some((value: string) => patterns.style.test(value) || patterns.brand.test(value));
    if (hasHeaderMatch || nonEmptyCount > maxNonEmptyCells) {
      bestIndex = i;
      maxNonEmptyCells = nonEmptyCount;
      if (hasHeaderMatch) break;
    }
  }
  return bestIndex;
};

const autoMapColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    style: null,
    brand: null,
    imageAdd: null,
    readImage: null,
    category: null,
    colorName: null,
  };
  const patterns = {
    style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    category: /^(category|type|product\s*type|group)/i,
    colorName: /^(color|colour\s*$|color\s*name|colour\s*name)/i,
  };
  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toUpperCase();
    if (!normalizedHeader) return;
    if (patterns.style.test(normalizedHeader) && mapping.style === null) mapping.style = index;
    else if (patterns.brand.test(normalizedHeader) && mapping.brand === null) mapping.brand = index;
    else if (patterns.category.test(normalizedHeader) && mapping.category === null) mapping.category = index;
    else if (patterns.colorName.test(normalizedHeader) && mapping.colorName === null) mapping.colorName = index;
  });
  return mapping;
};

const getColumnMappingEntries = (mapping: ColumnMapping): [keyof ColumnMapping, number | null][] =>
  Object.entries(mapping) as [keyof ColumnMapping, number | null][];

// Main Component
const CMSGoogleSerpForm: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'preview' | 'map' | 'submit'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData>({ headers: [], rows: [] });
  const [rawData, setRawData] = useState<CellValue[][]>([]);
  const [headerIndex, setHeaderIndex] = useState<number>(0);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    style: null,
    brand: null,
    imageAdd: null,
    readImage: null,
    category: null,
    colorName: null,
  });
  const [manualBrand, setManualBrand] = useState('');
  const [isManualBrandApplied, setIsManualBrandApplied] = useState(false);
  const [isIconDistro, setIsIconDistro] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = MAX_PREVIEW_ROWS;
  const showToast: ToastFunction = useCustomToast();

  // File Upload
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        showToast('File Error', 'No file selected', 'error');
        return;
      }
      if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type)) {
        showToast('File Error', 'Please upload an Excel file (.xlsx or .xls)', 'error');
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast('File Error', `File size exceeds ${MAX_FILE_SIZE_MB}MB`, 'error');
        return;
      }

      setFile(selectedFile);
      setIsLoading(true);
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) throw new Error('No worksheet found');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
        if (jsonData.length === 0) throw new Error('Excel file is empty');

        const detectedHeaderIndex = detectHeaderRow(jsonData as CellValue[][]);
        const patterns = {
          style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
          brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
        };
        const firstRow: string[] = (jsonData[0] as any[]).map(cell => String(cell ?? '').trim());
        if (detectedHeaderIndex === 0 && !firstRow.some(cell => patterns.style.test(cell) || patterns.brand.test(cell))) {
          showToast('Warning', 'No clear header row detected; using first row. Please verify in the Preview step.', 'warning');
        }
        setRawData(jsonData as CellValue[][]);
        if (jsonData.length <= detectedHeaderIndex || detectedHeaderIndex < 0) {
          showToast('File Error', 'Invalid header row detected. Please select a header row in the Preview step.', 'error');
          setHeaderIndex(0);
          setExcelData({ headers: [], rows: [] });
          setFile(null);
          setStep('upload');
          return;
        }
        setHeaderIndex(detectedHeaderIndex);
        const headers = (jsonData[detectedHeaderIndex] as any[]).map(cell => String(cell ?? ''));
        const rows = jsonData.slice(detectedHeaderIndex + 1).slice(0, MAX_PREVIEW_ROWS) as CellValue[][];
        setExcelData({ headers, rows });
        setColumnMapping(autoMapColumns(headers));
        setStep('preview');
      } catch (error) {
        showToast('File Processing Error', error instanceof Error ? error.message : 'Unknown error', 'error');
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  // Header Row Selection
  const handleHeaderChange = useCallback(
    (newHeaderIndex: number) => {
      if (newHeaderIndex < 0 || newHeaderIndex >= rawData.length) return;
      setHeaderIndex(newHeaderIndex);
      const headers = rawData[newHeaderIndex].map(cell => String(cell ?? ''));
      const rows = rawData.slice(newHeaderIndex + 1).slice(0, MAX_PREVIEW_ROWS) as CellValue[][];
      setExcelData({ headers, rows });
      setColumnMapping(autoMapColumns(headers));
      setIsManualBrandApplied(false);
      setManualBrand('');
      setPage(1);
    },
    [rawData]
  );

  // Column Mapping
  const handleColumnMap = useCallback(
    (index: number, field: string) => {
      if (field && !ALL_COLUMNS.includes(field as (typeof ALL_COLUMNS)[number])) return;
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        (Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach(key => {
          if (newMapping[key] === index) newMapping[key] = null;
        });
        if (field && ALL_COLUMNS.includes(field as (typeof ALL_COLUMNS)[number])) {
          newMapping[field as keyof ColumnMapping] = index;
          if (field === 'brand') {
            setManualBrand('');
            setIsManualBrandApplied(false);
          }
        }
        return newMapping;
      });
    },
    []
  );

  // Clear Mapping
  const handleClearMapping = useCallback(
    (index: number) => {
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        (Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach(key => {
          if (newMapping[key] === index) newMapping[key] = null;
        });
        return newMapping;
      });
    },
    []
  );

  // Manual Brand
  const applyManualBrand = useCallback(() => {
    if (!manualBrand.trim()) {
      showToast('Manual Brand Error', 'Please enter a non-empty brand name', 'warning');
      return;
    }
    setColumnMapping(prev => ({ ...prev, brand: null }));
    setExcelData(prev => {
      const newHeaders = [...prev.headers, 'BRAND (Manual)'];
      setColumnMapping(prevMapping => ({ ...prevMapping, brand: newHeaders.length - 1 }));
      setIsManualBrandApplied(true);
      return {
        headers: newHeaders,
        rows: prev.rows.map(row => [...row, manualBrand.trim()]),
      };
    });
    showToast('Success', `Manual brand "${manualBrand.trim()}" applied`, 'success');
    setManualBrand('');
  }, [manualBrand, showToast]);

  const removeManualBrand = useCallback(() => {
    setExcelData(prev => ({
      headers: prev.headers.filter(header => header !== 'BRAND (Manual)'),
      rows: prev.rows.map(row => row.slice(0, -1)),
    }));
    setColumnMapping(prev => ({ ...prev, brand: null }));
    setIsManualBrandApplied(false);
    showToast('Success', 'Manual brand removed', 'success');
  }, [showToast]);

  // Validation
  const validateForm = useMemo(() => {
    const missing = REQUIRED_COLUMNS.filter(
      col => columnMapping[col] === null && !(col === 'brand' && (manualBrand.trim() || isManualBrandApplied))
    );
    return {
      isValid: missing.length === 0 && file && excelData.rows.length > 0,
      missing,
    };
  }, [columnMapping, manualBrand, isManualBrandApplied, file, excelData.rows.length]);

  // Submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm.isValid) {
      showToast('Validation Error', `Missing required columns: ${validateForm.missing.join(', ')}`, 'warning');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('fileUploadImage', file!);
    formData.append('searchColImage', indexToColumnLetter(columnMapping.style!));
    if ((manualBrand.trim() || isManualBrandApplied) && columnMapping.brand === null) {
      formData.append('brandColImage', 'MANUAL');
      formData.append('manualBrand', manualBrand.trim() || (excelData.rows[0]?.[excelData.headers.length - 1] as string) || '');
    } else if (columnMapping.brand !== null) {
      formData.append('brandColImage', indexToColumnLetter(columnMapping.brand));
    }
    if (columnMapping.readImage || columnMapping.imageAdd) {
      formData.append('imageColumnImage', indexToColumnLetter(columnMapping.readImage || columnMapping.imageAdd!));
    }
    if (columnMapping.colorName) formData.append('ColorColImage', indexToColumnLetter(columnMapping.colorName));
    if (columnMapping.category) formData.append('CategoryColImage', indexToColumnLetter(columnMapping.category));
    formData.append('header_index', String(headerIndex + 1));
    formData.append('sendToEmail', 'nik@luxurymarket.com');
    formData.append('isIconDistro', String(isIconDistro));

    try {
      const response = await fetch(`${SERVER_URL}/submitImage`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server Response:', response.status, errorText); // Log status and response
        throw new Error(`Server error: ${errorText || response.statusText}`);
      }
      showToast('Success', 'Form submitted successfully', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Fetch Error:', error); // Log full error
      showToast('Submission Error', error instanceof Error ? error.message : 'Failed to submit', 'error');
      setStep('map');
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, file, columnMapping, manualBrand, isManualBrandApplied, headerIndex, isIconDistro, showToast, excelData]);

  // Render
  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={6} align="stretch">
        {/* Step Indicator */}
        <HStack justify="center" spacing={4} bg="gray.50" p={2} borderRadius="md">
          {['Upload', 'Preview', 'Map', 'Submit'].map((s, i) => (
            <Text
              key={s}
              fontWeight={step === s.toLowerCase() ? 'bold' : 'normal'}
              color={step === s.toLowerCase() ? 'blue.500' : 'gray.500'}
              cursor="pointer"
              onClick={() => {
                if (i < ['upload', 'preview', 'map', 'submit'].indexOf(step)) setStep(s.toLowerCase() as typeof step);
              }}
            >
              {i + 1}. {s}
            </Text>
          ))}
        </HStack>

        {/* Upload Step */}
        {step === 'upload' && (
          <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
            <Box flex="1">
              <Text fontSize="lg" fontWeight="bold" mb={4}>Upload Excel File</Text>
              <FormControl>
                <Tooltip label="Upload an Excel file (.xlsx or .xls) up to 10MB">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    bg="white"
                    borderColor="gray.300"
                    p={1}
                    aria-label="Upload Excel file"
                  />
                </Tooltip>
              </FormControl>
              {isLoading && <Spinner mt={4} />}
            </Box>
            <Box flex="1" fontSize="sm" lineHeight="short">
              <Text fontWeight="bold" mb={2}>Required Fields</Text>
              <Text>Style #: Unique identifier for the product (e.g., SKU, Item #)</Text>
              <Text>Brand: Manufacturer or designer name</Text>
              <Text fontWeight="bold" mt={4} mb={2}>Optional Fields</Text>
              <Text>Category: Product type or group</Text>
              <Text>Color Name: Color of the product</Text>
              <Text>Image Read: Column for existing image data</Text>
              <Text>Image Add: Column for new image data</Text>
            </Box>
          </Flex>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="bold">Preview Data</Text>
            <HStack>
              <Text>Header Row:</Text>
              <Select
                value={headerIndex}
                onChange={e => handleHeaderChange(Number(e.target.value))}
                w="100px"
                aria-label="Select header row"
              >
                {rawData.slice(0, 10).map((_, index) => (
                  <option key={index} value={index}>
                    Row {index + 1} {index === headerIndex ? '(Selected)' : ''}
                  </option>
                ))}
              </Select>
            </HStack>
            <Box overflowX="auto" maxH="60vh" borderWidth="1px" borderRadius="md" p={2}>
              <Table size="sm">
                <Thead>
                  <Tr>
                    {excelData.headers.map((header, index) => (
                      <Th
                        key={index}
                        bg="gray.100"
                        position="sticky"
                        top={0}
                        border={Object.values(columnMapping).includes(index) ? '2px solid green' : undefined}
                      >
                        {header || `Column ${indexToColumnLetter(index)}`}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {excelData.rows.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((row, rowIndex) => (
                    <Tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <Td
                          key={cellIndex}
                          maxW="200px"
                          isTruncated
                          bg={
                            (columnMapping.style === cellIndex || columnMapping.brand === cellIndex) && !cell
                              ? 'red.100'
                              : undefined
                          }
                        >
                          {getDisplayValue(cell)}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            <HStack>
              <Button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                isDisabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <Text>Page {page}</Text>
              <Button
                onClick={() => setPage(prev => prev + 1)}
                isDisabled={(page * rowsPerPage) >= excelData.rows.length}
                variant="outline"
              >
                Next
              </Button>
            </HStack>
            <HStack>
              <Button onClick={() => setStep('upload')} variant="outline">
                Back
              </Button>
              <Button colorScheme="blue" onClick={() => setStep('map')}>
                Next: Map Columns
              </Button>
            </HStack>
          </VStack>
        )}

        {/* Map Step */}
        {step === 'map' && (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="bold">Map Columns</Text>
            {!validateForm.isValid && (
              <Alert status="warning">
                <AlertIcon />
                <AlertTitle>Missing Required Columns:</AlertTitle>
                <AlertDescription>{validateForm.missing.join(', ')}</AlertDescription>
              </Alert>
            )}
            <Box w="full">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Excel Column</Th>
                    <Th>Map To</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {excelData.headers.map((header, index) => (
                    <Tr key={index}>
                      <Td>{header || `Column ${indexToColumnLetter(index)}`}</Td>
                      <Td>
                        <HStack>
                          <Tooltip label="Select the field this column represents">
                            <Select
                              value={getColumnMappingEntries(columnMapping).find(([, colIndex]) => colIndex === index)?.[0] || ''}
                              onChange={e => handleColumnMap(index, e.target.value)}
                              placeholder="Unmapped"
                              aria-label={`Map column ${header || indexToColumnLetter(index)}`}
                            >
                              <option value="">Unmapped</option>
                              {ALL_COLUMNS.map(col => (
                                <option key={col} value={col}>
                                  {col} {REQUIRED_COLUMNS.includes(col) ? '(Required)' : '(Optional)'}
                                </option>
                              ))}
                            </Select>
                          </Tooltip>
                          {getColumnMappingEntries(columnMapping).some(([, colIndex]) => colIndex === index) && (
                            <Tooltip label="Clear mapping">
                              <IconButton
                                aria-label="Clear mapping"
                                icon={<CloseIcon />}
                                size="sm"
                                onClick={() => handleClearMapping(index)}
                              />
                            </Tooltip>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            <FormControl>
              <HStack>
                <Tooltip label="Enter a brand to apply to all rows">
                  <Input
                    placeholder="Add Brand for All Rows (Optional)"
                    value={manualBrand}
                    onChange={e => setManualBrand(e.target.value)}
                    disabled={columnMapping.brand !== null}
                    aria-label="Manual brand input"
                  />
                </Tooltip>
                <Button
                  colorScheme="green"
                  onClick={applyManualBrand}
                  isDisabled={!manualBrand.trim() || columnMapping.brand !== null}
                >
                  Apply Manual Brand
                </Button>
                {isManualBrandApplied && (
                  <Button colorScheme="red" variant="outline" onClick={removeManualBrand}>
                    Remove Manual Brand
                  </Button>
                )}
              </HStack>
              {isManualBrandApplied && (
                <Badge colorScheme="green" mt={2}>
                  Manual Brand Column Applied
                </Badge>
              )}
            </FormControl>
            <HStack>
              <Button onClick={() => setStep('preview')} variant="outline">
                Back
              </Button>
              <Button colorScheme="blue" onClick={() => setStep('submit')} isDisabled={!validateForm.isValid}>
                Next: Submit
              </Button>
            </HStack>
          </VStack>
        )}

        {/* Submit Step */}
        {step === 'submit' && (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="bold">Review and Submit</Text>
            <VStack align="start">
              <Text>Rows: {excelData.rows.length}</Text>
              <Text>Mapped Columns:</Text>
              {getColumnMappingEntries(columnMapping)
                .filter(([, index]) => index !== null)
                .map(([col, index]) => (
                  <Text key={col} pl={4}>
                    - {col}: {excelData.headers[index!]}
                  </Text>
                ))}
              {isManualBrandApplied && <Text>Manual Brand: Applied to all rows</Text>}
              <Checkbox isChecked={isIconDistro} onChange={e => setIsIconDistro(e.target.checked)}>
                Output as Icon Distro
              </Checkbox>
            </VStack>
            <HStack>
              <Button onClick={() => setStep('map')} variant="outline">
                Back
              </Button>
              <Button colorScheme="blue" onClick={handleSubmit} isLoading={isLoading}>
                Submit
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>
    </Container>
  );
};

// Export
export const Route = createFileRoute('/google-serp-cms')({
  component: CMSGoogleSerpForm,
});

export default CMSGoogleSerpForm;