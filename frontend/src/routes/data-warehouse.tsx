import {
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  HStack,
  Input,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import type React from "react"
import { useCallback, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import useCustomToast from "../hooks/useCustomToast"

// Types and constants
const SERVER_URL = "https://external.iconluxury.group"
const MAX_PREVIEW_ROWS = 10
const MAX_FILE_SIZE_MB = 10

type ColumnType = "style" | "msrp" | "brand" | "category" | "colorName"
type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = Record<
  ColumnType | "readImage" | "imageAdd",
  number | null
>
type ToastFn = (
  title: string,
  description: string,
  status: "error" | "warning" | "success",
) => void

// Helper functions
const getDisplayValue = (value: any): string => {
  if (value == null) return ""
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === "object") {
    if (value.error) return value.error
    if (value.result !== undefined) return getDisplayValue(value.result)
    if (value.text) return value.text
    if (value.link) return value.text || value.link
    return JSON.stringify(value)
  }
  return String(value)
}

const indexToColumnLetter = (index: number): string => {
  let column = ""
  let temp = index
  while (temp >= 0) {
    column = String.fromCharCode((temp % 26) + 65) + column
    temp = Math.floor(temp / 26) - 1
  }
  return column
}

const detectHeaderRow = (rows: CellValue[][]): number => {
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
  }
  let bestIndex = 0
  let maxNonEmpty = 0
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i]
      .map((c) => String(c ?? "").trim())
      .filter((v) => v !== "")
    const nonEmpty = rowValues.length
    if (nonEmpty < 2) continue
    const hasMatch = rowValues.some((v) =>
      Object.values(patterns).some((p) => p.test(v)),
    )
    if (hasMatch || nonEmpty > maxNonEmpty) {
      bestIndex = i
      maxNonEmpty = nonEmpty
      if (hasMatch) break
    }
  }
  return bestIndex
}

const getColumnPreview = (
  index: number | null,
  rows: CellValue[][],
): string => {
  if (index === null || index < 0 || index >= rows[0]?.length)
    return "No values"
  const values = rows
    .map((r) => getDisplayValue(r[index]))
    .filter((v) => v.trim() !== "")
    .slice(0, 3)
  return values.length > 0 ? values.join(", ") : "No values"
}

const autoMapColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    style: null,
    msrp: null,
    brand: null,
    category: null,
    colorName: null,
    readImage: null,
    imageAdd: null,
  }
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    category: /^(category|type|product\s*type|group)/i,
    colorName: /^(color|colour\s*$|color\s*name|colour\s*name)/i,
  }
  headers.forEach((header, index) => {
    const h = header.trim().toUpperCase()
    if (!h) return
    if (patterns.style.test(h) && mapping.style === null) mapping.style = index
    else if (patterns.msrp.test(h) && mapping.msrp === null)
      mapping.msrp = index
    else if (patterns.brand.test(h) && mapping.brand === null)
      mapping.brand = index
    else if (patterns.category.test(h) && mapping.category === null)
      mapping.category = index
    else if (patterns.colorName.test(h) && mapping.colorName === null)
      mapping.colorName = index
  })
  return mapping
}

const getColumnMappingEntries = (
  mapping: ColumnMapping,
): [keyof ColumnMapping, number | null][] =>
  Object.entries(mapping) as [keyof ColumnMapping, number | null][]

// Main component
const DataWarehouseForm: React.FC = () => {
  const [step, setStep] = useState<"upload" | "map" | "submit">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    rows: [],
  })
  const [rawData, setRawData] = useState<CellValue[][]>([])
  const [headerIndex, setHeaderIndex] = useState(0)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    style: null,
    msrp: null,
    brand: null,
    category: null,
    colorName: null,
    readImage: null,
    imageAdd: null,
  })
  const [isNewDistro, setIsNewDistro] = useState(false)
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD")
  const showToast: ToastFn = useCustomToast()

  const REQUIRED_COLUMNS: ColumnType[] = ["style", "msrp"]
  const OPTIONAL_COLUMNS: ColumnType[] = ["brand", "category", "colorName"]
  const ALL_COLUMNS: ColumnType[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (!selectedFile) {
        showToast("File Error", "No file selected", "error")
        return
      }
      if (
        ![
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ].includes(selectedFile.type)
      ) {
        showToast(
          "File Error",
          "Please upload an Excel file (.xlsx or .xls)",
          "error",
        )
        return
      }
      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(
          "File Error",
          `File size exceeds ${MAX_FILE_SIZE_MB}MB`,
          "error",
        )
        return
      }
      setFile(selectedFile)
      setIsLoading(true)
      try {
        const data = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!worksheet) throw new Error("No worksheet found")
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
          defval: "",
        })
        if (jsonData.length === 0) throw new Error("Excel file is empty")
        setRawData(jsonData as CellValue[][])
        const detectedHeaderIndex = detectHeaderRow(jsonData as CellValue[][])
        setHeaderIndex(detectedHeaderIndex)
        const headers = (jsonData[detectedHeaderIndex] as any[]).map((cell) =>
          String(cell ?? ""),
        )
        const rows = jsonData.slice(detectedHeaderIndex + 1) as CellValue[][]
        setExcelData({ headers, rows })
        setColumnMapping(autoMapColumns(headers))
        setStep("map")
      } catch (error) {
        showToast(
          "File Processing Error",
          error instanceof Error ? error.message : "Unknown error",
          "error",
        )
        setFile(null)
      } finally {
        setIsLoading(false)
      }
    },
    [showToast],
  )

  const handleHeaderChange = useCallback(
    (newHeaderIndex: number) => {
      if (newHeaderIndex < 0 || newHeaderIndex >= rawData.length) return
      setHeaderIndex(newHeaderIndex)
      const headers = rawData[newHeaderIndex].map((cell) => String(cell ?? ""))
      const rows = rawData.slice(newHeaderIndex + 1) as CellValue[][]
      setExcelData({ headers, rows })
      setColumnMapping(autoMapColumns(headers))
    },
    [rawData],
  )

  const handleColumnMap = useCallback(
    (index: number, field: string) => {
      if (field && !ALL_COLUMNS.includes(field as ColumnType)) return
      setColumnMapping((prev) => {
        const newMapping = { ...prev }
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (
            newMapping[key] === index &&
            key !== "readImage" &&
            key !== "imageAdd"
          ) {
            newMapping[key] = null
          }
        })
        if (field && ALL_COLUMNS.includes(field as ColumnType)) {
          newMapping[field as keyof ColumnMapping] = index
        }
        return newMapping
      })
    },
    [ALL_COLUMNS],
  )

  const handleClearMapping = useCallback((index: number) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev }
      ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
        if (
          newMapping[key] === index &&
          key !== "readImage" &&
          key !== "imageAdd"
        ) {
          newMapping[key] = null
        }
      })
      return newMapping
    })
  }, [])

  const validateForm = useMemo(() => {
    const missing = REQUIRED_COLUMNS.filter(
      (col) => columnMapping[col] === null,
    )
    return {
      isValid: missing.length === 0 && file && excelData.rows.length > 0,
      missing,
    }
  }, [columnMapping, file, excelData.rows.length, REQUIRED_COLUMNS])

  const handleSubmit = useCallback(async () => {
    if (!validateForm.isValid) {
      showToast(
        "Validation Error",
        `Missing required columns: ${validateForm.missing.join(", ")}`,
        "warning",
      )
      return
    }
    setIsLoading(true)
    const formData = new FormData()
    formData.append("fileUploadImage", file!)
    formData.append("searchColImage", indexToColumnLetter(columnMapping.style!))
    formData.append("msrpColImage", indexToColumnLetter(columnMapping.msrp!))
    if (columnMapping.brand !== null) {
      formData.append("brandColImage", indexToColumnLetter(columnMapping.brand))
    }
    if (columnMapping.colorName !== null) {
      formData.append(
        "ColorColImage",
        indexToColumnLetter(columnMapping.colorName),
      )
    }
    if (columnMapping.category !== null) {
      formData.append(
        "CategoryColImage",
        indexToColumnLetter(columnMapping.category),
      )
    }
    formData.append("header_index", String(headerIndex + 1))
    formData.append("sendToEmail", "nik@luxurymarket.com")
    formData.append("isNewDistro", String(isNewDistro))
    formData.append("currency", currency)
    try {
      const response = await fetch(`${SERVER_URL}/datawarehouse`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || response.statusText)
      }
      showToast("Success", "Form submitted successfully", "success")
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      showToast(
        "Submission Error",
        error instanceof Error ? error.message : "Failed to submit",
        "error",
      )
      setStep("map")
    } finally {
      setIsLoading(false)
    }
  }, [
    validateForm,
    file,
    columnMapping,
    headerIndex,
    isNewDistro,
    currency,
    showToast,
  ])

  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={6} align="stretch">
        <HStack
          justify="space-between"
          bg="gray.50"
          p={2}
          borderRadius="md"
          align="center"
        >
          <HStack spacing={4}>
            {["Upload", "Map", "Submit"].map((s, i) => (
              <Text
                key={s}
                fontWeight={step === s.toLowerCase() ? "bold" : "normal"}
                color={step === s.toLowerCase() ? "teal.500" : "gray.500"}
                cursor={
                  i < ["upload", "map", "submit"].indexOf(step)
                    ? "pointer"
                    : "default"
                }
                onClick={() => {
                  if (i < ["upload", "map", "submit"].indexOf(step))
                    setStep(s.toLowerCase() as typeof step)
                }}
              >
                {i + 1}. {s}
              </Text>
            ))}
          </HStack>
          {step !== "upload" && (
            <HStack>
              <Button
                onClick={() =>
                  setStep(
                    ["upload", "map", "submit"][
                      ["upload", "map", "submit"].indexOf(step) - 1
                    ] as typeof step,
                  )
                }
                variant="outline"
                colorScheme="gray"
                size="sm"
              >
                Back
              </Button>
              {step !== "submit" && (
                <Button
                  colorScheme="teal"
                  onClick={() =>
                    setStep(
                      ["map", "submit"][
                        ["upload", "map"].indexOf(step)
                      ] as typeof step,
                    )
                  }
                  size="sm"
                  isDisabled={step === "map" && !validateForm.isValid}
                >
                  Next: {["Map", "Submit"][["upload", "map"].indexOf(step)]}
                </Button>
              )}
              {step === "submit" && (
                <Button
                  colorScheme="teal"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  size="sm"
                >
                  Submit
                </Button>
              )}
            </HStack>
          )}
        </HStack>

        {step === "upload" && (
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Upload Excel File for Data Warehouse Scrape
            </Text>
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
            <Box fontSize="sm" lineHeight="short">
              <Text fontWeight="bold" mb={2}>
                Required Fields
              </Text>
              <Text>Style: Used to query database</Text>
              <Text>MSRP: Target column for msrp</Text>
              <Text fontWeight="bold" mt={4} mb={2}>
                Optional Fields (Excluded from Search Context)
              </Text>
              <Text>Brand</Text>
              <Text>Category</Text>
              <Text>Color Name</Text>
            </Box>
          </VStack>
        )}

        {step === "map" && (
          <VStack spacing={4} align="stretch">
            <HStack>
              <Text>Select Header Row:</Text>
              <Select
                value={headerIndex}
                onChange={(e) => handleHeaderChange(Number(e.target.value))}
                w="150px"
              >
                {rawData.slice(0, 10).map((_, index) => (
                  <option key={index} value={index}>
                    Row {index + 1} {index === headerIndex ? "(Selected)" : ""}
                  </option>
                ))}
              </Select>
            </HStack>
            {!validateForm.isValid && (
              <Text color="red.500" fontSize="sm" fontWeight="medium">
                Missing required columns: {validateForm.missing.join(", ")}.
                Please map all required columns.
              </Text>
            )}
            <VStack
              spacing={4}
              align="stretch"
              bg="gray.50"
              p={4}
              borderRadius="md"
            >
              <Text fontWeight="bold">Required Columns</Text>
              {REQUIRED_COLUMNS.map((field) => (
                <HStack key={field} spacing={2} align="center">
                  <Text w="150px">{field}:</Text>
                  <Select
                    value={
                      columnMapping[field] !== null ? columnMapping[field]! : ""
                    }
                    onChange={(e) =>
                      handleColumnMap(Number(e.target.value), field)
                    }
                    placeholder="Unmapped"
                    flex="1"
                  >
                    <option value="">Unmapped</option>
                    {excelData.headers.map((header, index) => (
                      <option
                        key={index}
                        value={index}
                        disabled={
                          Object.values(columnMapping).includes(index) &&
                          columnMapping[field] !== index
                        }
                      >
                        {header || `Column ${indexToColumnLetter(index)}`}
                      </option>
                    ))}
                  </Select>
                  {columnMapping[field] !== null && (
                    <Button
                      size="sm"
                      onClick={() => handleClearMapping(columnMapping[field]!)}
                    >
                      Clear
                    </Button>
                  )}
                  <Box w="200px" fontSize="sm" color="gray.600" isTruncated>
                    {getColumnPreview(columnMapping[field], excelData.rows)}
                  </Box>
                </HStack>
              ))}
              <Text fontWeight="bold" mt={4}>
                Optional Columns
              </Text>
              {OPTIONAL_COLUMNS.map((field) => (
                <HStack key={field} spacing={2} align="center">
                  <Text w="150px">{field}:</Text>
                  <Select
                    value={
                      columnMapping[field] !== null ? columnMapping[field]! : ""
                    }
                    onChange={(e) =>
                      handleColumnMap(Number(e.target.value), field)
                    }
                    placeholder="Unmapped"
                    flex="1"
                  >
                    <option value="">Unmapped</option>
                    {excelData.headers.map((header, index) => (
                      <option
                        key={index}
                        value={index}
                        disabled={
                          Object.values(columnMapping).includes(index) &&
                          columnMapping[field] !== index
                        }
                      >
                        {header || `Column ${indexToColumnLetter(index)}`}
                      </option>
                    ))}
                  </Select>
                  {columnMapping[field] !== null && (
                    <Button
                      size="sm"
                      onClick={() => handleClearMapping(columnMapping[field]!)}
                    >
                      Clear
                    </Button>
                  )}
                  <Box w="200px" fontSize="sm" color="gray.600" isTruncated>
                    {getColumnPreview(columnMapping[field], excelData.rows)}
                  </Box>
                </HStack>
              ))}
            </VStack>
            <Box
              overflowX="auto"
              maxH="40vh"
              borderWidth="1px"
              borderRadius="md"
              p={2}
            >
              <Table size="sm">
                <Thead>
                  <Tr>
                    {excelData.headers.map((header, index) => (
                      <Th
                        key={index}
                        bg="gray.100"
                        position="sticky"
                        top={0}
                        border={
                          Object.values(columnMapping).includes(index)
                            ? "2px solid green"
                            : undefined
                        }
                      >
                        {header || `Column ${indexToColumnLetter(index)}`}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {excelData.rows
                    .slice(0, MAX_PREVIEW_ROWS)
                    .map((row, rowIndex) => (
                      <Tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <Td key={cellIndex} maxW="200px" isTruncated>
                            {getDisplayValue(cell)}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                </Tbody>
              </Table>
            </Box>
          </VStack>
        )}

        {step === "submit" && (
          <VStack spacing={4} align="stretch">
            <VStack align="start" spacing={4}>
              <Text>Rows: {excelData.rows.length}</Text>
              <FormControl>
                <Checkbox
                  colorScheme="teal"
                  size="lg"
                  isChecked={isNewDistro}
                  onChange={(e) => setIsNewDistro(e.target.checked)}
                >
                  Output as New Distro
                </Checkbox>
                <Text fontSize="sm" color="gray.600" mt={2} pl={8}>
                  If not selected, results will be populated into the uploaded
                  file.
                </Text>
              </FormControl>
              <HStack>
                <Text>Currency:</Text>
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "EUR")}
                  w="100px"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </HStack>
              <Text>Mapped Columns:</Text>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Field</Th>
                    <Th>Column</Th>
                    <Th>Preview</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {getColumnMappingEntries(columnMapping)
                    .filter(
                      ([col, idx]) =>
                        idx !== null &&
                        col !== "readImage" &&
                        col !== "imageAdd",
                    )
                    .map(([col, idx]) => (
                      <Tr key={col}>
                        <Td>{col}</Td>
                        <Td>
                          {excelData.headers[idx!] ||
                            `Column ${indexToColumnLetter(idx!)}`}
                        </Td>
                        <Td>{getColumnPreview(idx, excelData.rows)}</Td>
                      </Tr>
                    ))}
                </Tbody>
              </Table>
            </VStack>
            <Box
              overflowX="auto"
              maxH="40vh"
              borderWidth="1px"
              borderRadius="md"
              p={2}
            >
              <Table size="sm">
                <Thead>
                  <Tr>
                    {excelData.headers.map((header, index) => (
                      <Th
                        key={index}
                        bg="gray.100"
                        position="sticky"
                        top={0}
                        border={
                          Object.values(columnMapping).includes(index)
                            ? "2px solid green"
                            : undefined
                        }
                      >
                        {header || `Column ${indexToColumnLetter(index)}`}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {excelData.rows
                    .slice(0, MAX_PREVIEW_ROWS)
                    .map((row, rowIndex) => (
                      <Tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <Td key={cellIndex} maxW="200px" isTruncated>
                            {getDisplayValue(cell)}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                </Tbody>
              </Table>
            </Box>
          </VStack>
        )}
      </VStack>
    </Container>
  )
}

export const Route = createFileRoute("/data-warehouse")({
  component: DataWarehouseForm,
})

export default DataWarehouseForm
