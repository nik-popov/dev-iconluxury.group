import React, { useState, useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Divider,
  Flex,
  Input,
  Select,
  useToast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  IconButton,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Image,
  useDisclosure,
  Textarea,
  SimpleGrid,
  Tooltip,
  Checkbox,
} from '@chakra-ui/react';
import {
  FiFolder,
  FiFile,
  FiDownload,
  FiChevronRight,
  FiChevronDown,
  FiArrowUp,
  FiArrowDown,
  FiCopy,
  FiInfo,
  FiGrid,
  FiList,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiUpload,
} from 'react-icons/fi';
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFile } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import ExcelDataTable, { ExcelData } from '../../components/ExcelDataTable.tsx';

// API Configuration
const API_BASE_URL = 'https://api.iconluxury.group/api/v1';
const DEFAULT_EXPIRES_IN = 900; // 15 minutes
const STORAGE_TYPE = 's3'; // Toggle between 's3' and 'r2'

// Interfaces
interface S3Object {
  type: 'folder' | 'file';
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
  count?: number;
}

interface S3ListResponse {
  objects: S3Object[];
  hasMore: boolean;
  nextContinuationToken: string | null;
}

// API Functions
async function listObjects(
  prefix: string,
  page: number,
  pageSize = 10,
  continuationToken: string | null = null,
  storageType: string = STORAGE_TYPE
): Promise<S3ListResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/${storageType}/list`);
    url.searchParams.append('prefix', prefix);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('pageSize', pageSize.toString());
    if (continuationToken) {
      url.searchParams.append('continuation_token', continuationToken);
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = `${storageType.toUpperCase()} list endpoint not found.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied to ${storageType.toUpperCase()} bucket.`;
      } else if (response.status === 503) {
        errorMessage = 'Service temporarily unavailable.';
      }
      throw new Error(`Failed to list objects: ${errorMessage}`);
    }
    const data: S3ListResponse = await response.json();
    return {
      objects: data.objects.map((item) => ({
        ...item,
        lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
      })),
      hasMore: data.hasMore,
      nextContinuationToken: data.nextContinuationToken,
    };
  } catch (error: any) {
    const message = error.message?.includes('CORS')
      ? `CORS error: Ensure the server allows requests from this origin.`
      : error.message || `Network error fetching ${storageType.toUpperCase()} objects`;
    throw new Error(message);
  }
}

async function getSignedUrl(
  key: string,
  expiresIn: number = DEFAULT_EXPIRES_IN,
  storageType: string = STORAGE_TYPE
): Promise<string> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/${storageType}/sign?key=${encodeURIComponent(key)}&expires_in=${expiresIn}`
    );
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = `${storageType.toUpperCase()} sign endpoint not found.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied to generate signed URL.`;
      }
      throw new Error(`Failed to get signed URL: ${errorMessage}`);
    }
    const data = await response.json();
    return data.signedUrl;
  } catch (error: any) {
    throw new Error(`Failed to get signed URL: ${error.message || 'Network error'}`);
  }
}

async function uploadFile(
  file: File,
  path: string,
  storageType: string = STORAGE_TYPE
): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch(`${API_BASE_URL}/${storageType}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 403) {
        errorMessage = `Access denied to upload to ${storageType.toUpperCase()}.`;
      }
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message || 'Network error'}`);
  }
}

async function deleteObjects(
  paths: string[],
  storageType: string = STORAGE_TYPE
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/${storageType}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 403) {
        errorMessage = `Access denied to delete from ${storageType.toUpperCase()}.`;
      }
      throw new Error(`Failed to delete objects: ${errorMessage}`);
    }
  } catch (error: any) {
    throw new Error(`Deletion failed: ${error.message || 'Network error'}`);
  }
}

async function getFileContent(
  key: string,
  fileType: string,
  storageType: string = STORAGE_TYPE
): Promise<string | ArrayBuffer> {
  const url = await getSignedUrl(key, DEFAULT_EXPIRES_IN, storageType);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch file content');
  return fileType === 'excel' ? response.arrayBuffer() : response.text();
}

// Utility Functions
const getFileIcon = (name: string) => {
  const extension = (name.split('.').pop()?.toLowerCase() || '');
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <FaFileImage />;
    case 'pdf':
      return <FaFilePdf />;
    case 'doc':
    case 'docx':
      return <FaFileWord />;
    case 'xls':
    case 'xlsx':
    case 'xlsm':
      return <FaFileExcel />;
    case 'log':
      return <FiFile />;
    default:
      return <FiFile />;
  }
};

const getFileType = (name: string) => {
  const extension = (name.split('.').pop()?.toLowerCase() || '');
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
  if (['txt', 'json', 'md', 'log'].includes(extension)) return 'text';
  if (['xlsx', 'xlsm'].includes(extension)) return 'excel';
  if (extension === 'pdf') return 'pdf';
  return 'unsupported';
};

const truncateName = (name: string, maxLength: number = 20) => {
  if (name.length <= maxLength) return name;
  const start = name.slice(0, Math.floor(maxLength / 2));
  const end = name.slice(-Math.floor(maxLength / 2));
  return `${start}...${end}`;
};

// Resize Handle Component
const ResizeHandle = ({ onResize, side = 'left' }: { onResize: (newWidth: number) => void; side?: 'left' | 'right' }) => {
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = handleRef.current?.parentElement?.offsetWidth || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = side === 'left' ? startX - moveEvent.clientX : moveEvent.clientX - startX;
      const newWidth = side === 'left' ? startWidth + delta : startWidth - delta;
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.8;
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onResize(constrainedWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Box
      ref={handleRef}
      w="6px"
      bg="gray.300"
      cursor="col-resize"
      _hover={{ bg: 'gray.400' }}
      onMouseDown={handleMouseDown}
      position="absolute"
      top="0"
      bottom="0"
      {...(side === 'left' ? { left: '-3px' } : { right: '-3px' })}
    />
  );
};

// Sub-Components
interface FileListProps {
  objects: S3Object[];
  viewMode: 'list' | 'grid';
  selectedFile: S3Object | null;
  sortField: 'name' | 'size' | 'lastModified' | 'count';
  sortOrder: 'asc' | 'desc';
  expandedFolders: string[];
  isFetching: boolean;
  selectedPaths: string[];
  onFolderClick: (path: string) => void;
  onFileClick: (obj: S3Object, action: 'details' | 'select') => void;
  onSort: (field: 'name' | 'size' | 'lastModified' | 'count') => void;
  onDownload: (key: string) => void;
  onCopyUrl: (key: string) => void;
  onSelectPath: (path: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  objects,
  viewMode,
  selectedFile,
  sortField,
  sortOrder,
  expandedFolders,
  isFetching,
  selectedPaths,
  onFolderClick,
  onFileClick,
  onSort,
  onDownload,
  onCopyUrl,
  onSelectPath,
}) => {
  return (
    <>
      {viewMode === 'list' && (
        <Flex bg="gray.100" p={2} borderRadius="md" mb={2}>
          <Box flex="0.5">
            <Checkbox
              isChecked={objects.length > 0 && objects.every((obj) => selectedPaths.includes(obj.path))}
              onChange={(e) => {
                objects.forEach((obj) => onSelectPath(obj.path));
              }}
              isDisabled={isFetching}
            />
          </Box>
          <Box flex="2" cursor="pointer" onClick={() => onSort('name')}>
            <HStack>
              <Text fontWeight="bold">Name</Text>
              {sortField === 'name' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
            </HStack>
          </Box>
          <Box flex="1" cursor="pointer" onClick={() => onSort('count')}>
            <HStack>
              <Text fontWeight="bold">Count</Text>
              {sortField === 'count' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
            </HStack>
          </Box>
          <Box flex="1" cursor="pointer" onClick={() => onSort('size')}>
            <HStack>
              <Text fontWeight="bold">Size</Text>
              {sortField === 'size' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
            </HStack>
          </Box>
          <Box flex="1" cursor="pointer" onClick={() => onSort('lastModified')}>
            <HStack>
              <Text fontWeight="bold">Modified</Text>
              {sortField === 'lastModified' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
            </HStack>
          </Box>
          <Box flex="1" textAlign="right">
            <Text fontWeight="bold">Actions</Text>
          </Box>
        </Flex>
      )}
      {viewMode === 'list' ? (
        <VStack spacing={4} align="stretch">
          {objects.map((obj, index) => (
            <Box
              key={`${obj.path}-${index}`}
              p={4}
              borderWidth="1px"
              borderRadius="lg"
              borderColor={selectedFile?.path === obj.path ? 'green.500' : 'gray.200'}
              bg={selectedFile?.path === obj.path ? 'green.50' : 'white'}
              cursor="pointer"
              _hover={{
                bg: selectedFile?.path === obj.path ? 'green.50' : 'gray.50',
              }}
              onClick={() => (obj.type === 'folder' ? onFolderClick(obj.path) : onFileClick(obj, 'select'))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  obj.type === 'folder' ? onFolderClick(obj.path) : onFileClick(obj, 'select');
                }
              }}
            >
              <Flex justify="space-between" align="center">
                <HStack flex="0.5">
                  <Checkbox
                    isChecked={selectedPaths.includes(obj.path)}
                    onChange={() => onSelectPath(obj.path)}
                    isDisabled={isFetching}
                  />
                </HStack>
                <Flex align="center" gap={2} flex="2">
                  {obj.type === 'folder' && (
                    <IconButton
                      aria-label={expandedFolders.includes(obj.path) ? 'Collapse' : 'Expand'}
                      icon={expandedFolders.includes(obj.path) ? <FiChevronDown /> : <FiChevronRight />}
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFolderClick(obj.path);
                      }}
                    />
                  )}
                  {obj.type === 'folder' ? <FiFolder /> : getFileIcon(obj.name)}
                  <Box>
                    <Text fontWeight="medium" color="gray.800">
                      {truncateName(obj.name, 30)}
                    </Text>
                    {obj.type === 'file' && (
                      <>
                        <Text fontSize="sm" color="gray.500">
                          Size: {obj.size ? (obj.size / 1024).toFixed(2) : '0'} KB
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          Modified: {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '-'}
                        </Text>
                      </>
                    )}
                  </Box>
                </Flex>
                <Box flex="1">
                  <Text fontSize="sm" color="gray.500">{obj.count ?? '-'}</Text>
                </Box>
                <Box flex="1">
                  <Text fontSize="sm" color="gray.500">
                    {obj.size ? (obj.size / 1024).toFixed(2) : '-'} KB
                  </Text>
                </Box>
                <Box flex="1">
                  <Text fontSize="sm" color="gray.500">
                    {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '-'}
                  </Text>
                </Box>
                <HStack flex="1" justify="flex-end">
                  {obj.type === 'file' && (
                    <>
                      <Tooltip label="Details">
                        <IconButton
                          aria-label="Details"
                          icon={<FiInfo />}
                          size="sm"
                          colorScheme="purple"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileClick(obj, 'details');
                          }}
                          isDisabled={isFetching}
                        />
                      </Tooltip>
                      <Tooltip label="Download">
                        <IconButton
                          aria-label="Download"
                          icon={<FiDownload />}
                          size="sm"
                          colorScheme="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(obj.path);
                          }}
                          isDisabled={isFetching}
                        />
                      </Tooltip>
                      <Tooltip label="Copy URL">
                        <IconButton
                          aria-label="Copy URL"
                          icon={<FiCopy />}
                          size="sm"
                          colorScheme="gray"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyUrl(obj.path);
                          }}
                          isDisabled={isFetching}
                        />
                      </Tooltip>
                    </>
                  )}
                </HStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
          {objects.map((obj, index) => (
            <Box
              key={`${obj.path}-${index}`}
              p={4}
              borderWidth="1px"
              borderRadius="lg"
              borderColor={selectedFile?.path === obj.path ? 'green.500' : 'gray.200'}
              bg={selectedFile?.path === obj.path ? 'green.50' : 'white'}
              cursor="pointer"
              _hover={{
                bg: selectedFile?.path === obj.path ? 'green.50' : 'gray.50',
              }}
              onClick={() => (obj.type === 'folder' ? onFolderClick(obj.path) : onFileClick(obj, 'select'))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  obj.type === 'folder' ? onFolderClick(obj.path) : onFileClick(obj, 'select');
                }
              }}
            >
              <VStack align="start" spacing={2}>
                <HStack w="100%" justify="space-between">
                  <HStack>
                    {obj.type === 'folder' ? <FiFolder /> : getFileIcon(obj.name)}
                    <Text fontWeight="medium" color="gray.800" maxW="150px">
                      {truncateName(obj.name, 20)}
                    </Text>
                  </HStack>
                  <Checkbox
                    isChecked={selectedPaths.includes(obj.path)}
                    onChange={() => onSelectPath(obj.path)}
                    isDisabled={isFetching}
                  />
                </HStack>
                {obj.type === 'file' && (
                  <>
                    <Text fontSize="xs" color="gray.500">
                      Size: {obj.size ? (obj.size / 1024).toFixed(2) : '0'} KB
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Modified: {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '-'}
                    </Text>
                  </>
                )}
                {obj.type === 'folder' && (
                  <Text fontSize="xs" color="gray.500">
                    Items: {obj.count ?? '-'}
                  </Text>
                )}
                {obj.type === 'file' && (
                  <HStack>
                    <Tooltip label="Details">
                      <IconButton
                        aria-label="Details"
                        icon={<FiInfo />}
                        size="sm"
                        colorScheme="purple"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileClick(obj, 'details');
                        }}
                        isDisabled={isFetching}
                      />
                    </Tooltip>
                    <Tooltip label="Download">
                      <IconButton
                        aria-label="Download"
                        icon={<FiDownload />}
                        size="sm"
                        colorScheme="blue"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(obj.path);
                        }}
                        isDisabled={isFetching}
                      />
                    </Tooltip>
                  </HStack>
                )}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </>
  );
};

interface PreviewPanelProps {
  selectedFile: S3Object | null;
  previewUrl: string;
  previewContent: string | ExcelData;
  onCopyContent: (content: string) => void;
  onCopyUrl: (key: string) => void;
  onDownload: (key: string) => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  selectedFile,
  previewUrl,
  previewContent,
  onCopyContent,
  onCopyUrl,
  onDownload,
}) => {
  if (!selectedFile) {
    return <Text fontSize="sm" color="gray.500">Select a file to preview</Text>;
  }

  const fileType = getFileType(selectedFile.name);

  return (
    <VStack align="stretch" spacing={2}>
      {fileType === 'image' && (
        <Image
          src={previewUrl}
          alt={selectedFile.name}
          maxW="100%"
          maxH="50vh"
          objectFit="contain"
          objectPosition="center"
        />
      )}
      {fileType === 'text' && typeof previewContent === 'string' && (
        <Textarea
          value={previewContent}
          isReadOnly
          resize="none"
          h="50vh"
          fontFamily="mono"
          fontSize="sm"
        />
      )}
      {fileType === 'excel' && typeof previewContent !== 'string' && (
        <Box maxH="50vh" overflowY="auto">
          <ExcelDataTable excelData={previewContent} />
        </Box>
      )}
      {fileType === 'pdf' && (
        <iframe src={previewUrl} title={selectedFile.name} style={{ width: '100%', height: '50vh' }} />
      )}
      {fileType === 'unsupported' && (
        <Text>
          Preview not available for this file type.{' '}
          <Button size="sm" colorScheme="blue" onClick={() => onDownload(selectedFile.path)}>
            Download
          </Button>
        </Text>
      )}
      <HStack justify="flex-end">
        {fileType === 'text' && typeof previewContent === 'string' && (
          <Tooltip label="Copy Preview Content">
            <Button
              size="sm"
              colorScheme="gray"
              leftIcon={<FiCopy />}
              onClick={() => onCopyContent(previewContent)}
            >
              Copy
            </Button>
          </Tooltip>
        )}
        {previewUrl && (
          <Tooltip label="Copy Source URL">
            <Button
              size="sm"
              colorScheme="gray"
              leftIcon={<FiCopy />}
              onClick={() => onCopyUrl(selectedFile.path)}
            >
              Copy URL
            </Button>
          </Tooltip>
        )}
      </HStack>
    </VStack>
  );
};

// Main Component
function FileExplorer() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen: isDetailsOpen, onOpen: onDetailsOpen, onClose: onDetailsClose } = useDisclosure();
  const [state, setState] = useState({
    currentPath: '',
    searchQuery: '',
    typeFilter: 'all' as 'all' | 'folder' | 'file',
    page: 1,
    sortField: 'name' as 'name' | 'size' | 'lastModified' | 'count',
    sortOrder: 'asc' as 'asc' | 'desc',
    viewMode: 'list' as 'list' | 'grid',
    isPreviewOpen: true,
    previewWidth: 500,
    detailsWidth: 600,
    storageType: STORAGE_TYPE,
  });
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewContent, setPreviewContent] = useState<string | ExcelData>('');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, error: listError } = useQuery<S3ListResponse, Error>({
    queryKey: ['objects', state.currentPath, state.page, continuationToken, state.storageType],
    queryFn: () => listObjects(state.currentPath, state.page, 10, continuationToken, state.storageType),
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, path }: { file: File; path: string }) =>
      uploadFile(file, path, state.storageType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects', state.currentPath] });
      toast({
        title: 'Upload Successful',
        description: 'File(s) uploaded successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Unable to upload file(s).',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteObjects(paths, state.storageType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects', state.currentPath] });
      setSelectedPaths([]);
      setSelectedFile(null);
      setPreviewUrl('');
      setPreviewContent('');
      toast({
        title: 'Deletion Successful',
        description: 'Selected items deleted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Unable to delete items.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  useEffect(() => {
    if (data?.objects) {
      setObjects((prev) => {
        const newObjects = state.page === 1 ? data.objects : [...prev, ...data.objects];
        return Array.from(new Map(newObjects.map((obj) => [obj.path, obj])).values());
      });
      setHasMore(data.hasMore);
      setContinuationToken(data.nextContinuationToken);
    }
  }, [data, state.page]);

  const handleFolderClick = (path: string) => {
    setExpandedFolders((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
    setState((prev) => ({ ...prev, currentPath: path, page: 1 }));
    setObjects([]);
    setContinuationToken(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setPreviewContent('');
    setSelectedPaths([]);
  };

  const handleFileClick = async (obj: S3Object, action: 'details' | 'select') => {
    setSelectedFile(obj);
    try {
      const url = await getSignedUrl(obj.path, DEFAULT_EXPIRES_IN, state.storageType);
      setPreviewUrl(url);
      if (action === 'details') {
        onDetailsOpen();
        return;
      }
      const fileType = getFileType(obj.name);
      if (fileType === 'text') {
        const content = await getFileContent(obj.path, fileType, state.storageType);
        setPreviewContent(content as string);
      } else if (fileType === 'excel') {
        const content = await getFileContent(obj.path, fileType, state.storageType);
        const workbook = XLSX.read(new Uint8Array(content as ArrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).map((row: any) => ({ row }));
        setPreviewContent({ headers, rows });
      } else {
        setPreviewContent('');
      }
    } catch (error: any) {
      toast({
        title: action === 'details' ? 'Details Failed' : 'Preview Failed',
        description: error.message || 'Unable to load file content',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    setState((prev) => ({ ...prev, currentPath: path, page: 1 }));
    setObjects([]);
    setContinuationToken(null);
    setExpandedFolders((prev) => prev.filter((p) => !p.startsWith(path) || p === path));
    setSelectedFile(null);
    setPreviewUrl('');
    setPreviewContent('');
    setSelectedPaths([]);
  };

  const handleGoBack = () => {
    const parentPath = state.currentPath.split('/').slice(0, -2).join('/') + '/';
    setState((prev) => ({ ...prev, currentPath: parentPath, page: 1 }));
    setObjects([]);
    setContinuationToken(null);
    setExpandedFolders((prev) => prev.filter((p) => !p.startsWith(parentPath) || p === parentPath));
    setSelectedFile(null);
    setPreviewUrl('');
    setPreviewContent('');
    setSelectedPaths([]);
  };

  const handleDownload = async (key: string) => {
    try {
      const url = await getSignedUrl(key, DEFAULT_EXPIRES_IN, state.storageType);
      window.open(url, '_blank');
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Unable to generate download URL',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCopyUrl = async (key: string) => {
    try {
      const url = await getSignedUrl(key, DEFAULT_EXPIRES_IN, state.storageType);
      await navigator.clipboard.writeText(url);
      toast({
        title: 'URL Copied',
        description: 'Public URL copied to clipboard',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Copy Failed',
        description: error.message || 'Unable to copy URL',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Content Copied',
        description: 'Preview content copied to clipboard',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Copy Failed',
        description: error.message || 'Unable to copy content',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLoadMore = () => {
    if (hasMore) {
      setState((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handleSort = (field: 'name' | 'size' | 'lastModified' | 'count') => {
    setState((prev) => ({
      ...prev,
      sortField: field,
      sortOrder: prev.sortField === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectPath = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedPaths.length === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select items to delete.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    deleteMutation.mutate(selectedPaths);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if leaving the drop area entirely
    if (e.relatedTarget && !dropRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'No valid files were dropped.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    files.forEach((file) => {
      const uploadPath = `${state.currentPath}${file.name}`;
      uploadMutation.mutate({ file, path: uploadPath });
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'No files were selected.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    files.forEach((file) => {
      const uploadPath = `${state.currentPath}${file.name}`;
      uploadMutation.mutate({ file, path: uploadPath });
    });

    // Reset the input to allow re-selecting the same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const breadcrumbs = () => {
    const parts = state.currentPath.split('/').filter((p) => p);
    return [
      { name: 'Home', path: '' },
      ...parts.map((part, index) => ({
        name: part,
        path: parts.slice(0, index + 1).join('/') + '/',
      })),
    ];
  };

  const filteredObjects = objects
    .filter((obj) => {
      const matchesSearch = obj.name.toLowerCase().includes(state.searchQuery.toLowerCase());
      const matchesType = state.typeFilter === 'all' || obj.type === state.typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      let comparison = 0;
      if (state.sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (state.sortField === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      } else if (state.sortField === 'lastModified') {
        comparison = (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0);
      } else if (state.sortField === 'count') {
        comparison = (a.count || 0) - (b.count || 0);
      }
      return state.sortOrder === 'asc' ? comparison : -comparison;
    });

  if (listError) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text color="red.500">{listError.message}</Text>
        <Button mt={4} colorScheme="blue" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="full" bg="white" color="gray.800" py={6}>
      <Flex align="center" justify="space-between" flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">
            File Explorer ({state.storageType.toUpperCase()})
          </Text>
          <Text fontSize="sm" color="gray.600">
            Browse, upload, and manage files in {state.storageType.toUpperCase()} storage
          </Text>
        </Box>
        <HStack>
          <Tooltip label="Upload Files">
            <IconButton
              aria-label="Upload Files"
              icon={<FiUpload />}
              size="sm"
              colorScheme="blue"
              onClick={handleUploadClick}
              isLoading={uploadMutation.isLoading}
            />
          </Tooltip>
          <Tooltip label={state.isPreviewOpen ? 'Hide Preview' : 'Show Preview'}>
            <IconButton
              aria-label={state.isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
              icon={state.isPreviewOpen ? <FiEyeOff /> : <FiEye />}
              size="sm"
              colorScheme={state.isPreviewOpen ? 'green' : 'gray'}
              onClick={() => setState((prev) => ({ ...prev, isPreviewOpen: !prev.isPreviewOpen }))}
            />
          </Tooltip>
          <IconButton
            aria-label="List View"
            icon={<FiList />}
            size="sm"
            colorScheme={state.viewMode === 'list' ? 'green' : 'gray'}
            onClick={() => setState((prev) => ({ ...prev, viewMode: 'list' }))}
          />
          <IconButton
            aria-label="Grid View"
            icon={<FiGrid />}
            size="sm"
            colorScheme={state.viewMode === 'grid' ? 'green' : 'gray'}
            onClick={() => setState((prev) => ({ ...prev, viewMode: 'grid' }))}
          />
          {state.currentPath && (
            <Button size="sm" variant="outline" colorScheme="green" onClick={handleGoBack}>
              Back
            </Button>
          )}
          <Tooltip label="Delete Selected">
            <IconButton
              aria-label="Delete Selected"
              icon={<FiTrash2 />}
              size="sm"
              colorScheme="red"
              onClick={handleDeleteSelected}
              isDisabled={selectedPaths.length === 0 || isFetching}
            />
          </Tooltip>
        </HStack>
      </Flex>

      <Box my={4}>
        <Breadcrumb separator={<FiChevronRight color="gray.500" />}>
          {breadcrumbs().map((crumb, index) => (
            <BreadcrumbItem
              key={crumb.path}
              isCurrentPage={index === breadcrumbs().length - 1}
            >
              <BreadcrumbLink
                onClick={() => handleBreadcrumbClick(crumb.path)}
                color="green.500"
              >
                {crumb.name || 'Home'}
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      </Box>

      <Divider my="4" borderColor="gray.200" />

      <Box
        ref={dropRef}
        p={6}
        mb={4}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'green.500' : 'gray.300'}
        bg={isDragging ? 'green.100' : 'gray.100'}
        borderRadius="lg"
        minH="100px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="all 0.2s"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <VStack spacing={2}>
          <FiUpload size="32px" color={isDragging ? 'green.500' : 'gray.500'} />
          <Text fontSize="md" fontWeight="medium" color={isDragging ? 'green.600' : 'gray.600'}>
            {isDragging
              ? 'Drop files here to upload'
              : `Drag and drop files or click the upload button to add to ${state.currentPath || 'root'}`}
          </Text>
          {uploadMutation.isLoading && (
            <Text fontSize="sm" color="blue.500">
              Uploading {uploadMutation.variables?.file.name || 'files'}...
            </Text>
          )}
        </VStack>
      </Box>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        multiple
      />

      <Flex
        gap={6}
        justify={state.viewMode === 'grid' ? 'flex-start' : 'space-between'}
        align="stretch"
        wrap="wrap"
      >
        <Box
          flex={state.viewMode === 'grid' ? '0 0 40%' : '1'}
          minW={{ base: '100%', md: state.viewMode === 'grid' ? '40%' : '40%' }}
          maxW={state.viewMode === 'grid' ? { base: '100%', md: '50%' } : 'none'}
          maxH="70vh"
          overflowY="auto"
          overflowX="auto"
          pr={state.isPreviewOpen ? 0 : 4}
        >
          <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={4}>
            <Input
              placeholder="Search Files/Folders..."
              value={state.searchQuery}
              onChange={(e) => setState((prev) => ({ ...prev, searchQuery: e.target.value }))}
              w={{ base: '100%', md: '250px' }}
              borderColor="green.300"
              _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px green.500' }}
              bg="white"
              color="gray.800"
            />
            <Select
              value={state.typeFilter}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  typeFilter: e.target.value as 'all' | 'folder' | 'file',
                }))
              }
              w={{ base: '100%', md: '200px' }}
              borderColor="green.300"
              _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px green.500' }}
              bg="white"
              color="gray.700"
            >
              <option value="all">All</option>
              <option value="folder">Folders</option>
              <option value="file">Files</option>
            </Select>
            <Select
              value={state.storageType}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  storageType: e.target.value as 's3' | 'r2',
                  page: 1,
                }))
              }
              w={{ base: '100%', md: '150px' }}
              borderColor="green.300"
              _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px green.500' }}
              bg="white"
              color="gray.700"
            >
              <option value="s3">S3</option>
              <option value="r2">R2</option>
            </Select>
          </Flex>

          <FileList
            objects={filteredObjects}
            viewMode={state.viewMode}
            selectedFile={selectedFile}
            sortField={state.sortField}
            sortOrder={state.sortOrder}
            expandedFolders={expandedFolders}
            isFetching={isFetching}
            selectedPaths={selectedPaths}
            onFolderClick={handleFolderClick}
            onFileClick={handleFileClick}
            onSort={handleSort}
            onDownload={handleDownload}
            onCopyUrl={handleCopyUrl}
            onSelectPath={handleSelectPath}
          />

          {filteredObjects.length === 0 && !isFetching && (
            <Text fontSize="sm" color="gray.500" mt={4}>
              No items match your criteria
            </Text>
          )}
          {isFetching && <Text fontSize="sm" color="gray.500" mt={4}>Loading...</Text>}
          {!isFetching && hasMore && filteredObjects.length > 0 && (
            <Button
              colorScheme="green"
              size="sm"
              onClick={handleLoadMore}
              mt={4}
              alignSelf="center"
              isDisabled={isFetching}
            >
              Load More
            </Button>
          )}
        </Box>

        {state.isPreviewOpen && (
          <Box
            w={{ base: '100%', md: `${state.previewWidth}px` }}
            p={4}
            borderLeft={{ md: '1px solid' }}
            borderColor="gray.200"
            position="sticky"
            top="0"
            alignSelf="flex-start"
            maxH="70vh"
            overflowY="auto"
            pos="relative"
            flex={state.viewMode === 'grid' ? '1' : '0 0 auto'}
          >
            <ResizeHandle onResize={(width) => setState((prev) => ({ ...prev, previewWidth: width }))} />
            <Text fontWeight="bold" mb={2}>
              Preview
            </Text>
            <PreviewPanel
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              previewContent={previewContent}
              onCopyContent={handleCopyContent}
              onCopyUrl={handleCopyUrl}
              onDownload={handleDownload}
            />
          </Box>
        )}
      </Flex>

      <Modal isOpen={isDetailsOpen} onClose={onDetailsClose}>
        <ModalOverlay />
        <ModalContent w={`${state.detailsWidth}px`} maxW="80vw" pos="relative">
          <ResizeHandle
            onResize={(width) => setState((prev) => ({ ...prev, detailsWidth: width }))}
            side="right"
          />
          <ModalHeader>File/Folder Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="start" spacing={2}>
              <Text>
                <strong>Name:</strong> {selectedFile?.name}
              </Text>
              <Text>
                <strong>Path:</strong> {selectedFile?.path}
              </Text>
              <Text>
                <strong>Type:</strong> {selectedFile?.type}
              </Text>
              {selectedFile?.type === 'file' && (
                <>
                  <Text>
                    <strong>Size:</strong> {selectedFile.size ? (selectedFile.size / 1024).toFixed(2) : '0'} KB
                  </Text>
                  <Text>
                    <strong>Modified:</strong>{' '}
                    {selectedFile.lastModified ? new Date(selectedFile.lastModified).toLocaleString() : '-'}
                  </Text>
                </>
              )}
              {selectedFile?.type === 'folder' && (
                <Text>
                  <strong>Item Count:</strong> {selectedFile.count ?? 'Unknown'}
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onDetailsClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export const Route = createFileRoute('/_layout/explore')({
  component: FileExplorer,
});

export default FileExplorer;