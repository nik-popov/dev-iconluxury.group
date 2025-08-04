import React, { useState, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Flex,
  IconButton,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useToast,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { FiFolder, FiFile, FiDownload, FiCopy, FiTrash2, FiUpload, FiArrowUp, FiArrowDown, FiRefreshCw, FiFileText, FiSearch } from 'react-icons/fi';
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel } from 'react-icons/fa';
import { debounce } from 'lodash';

// API Configuration
const API_BASE_URL = 'https://api.iconluxury.today/api/v1';
const STORAGE_TYPE = 's3';
const DEFAULT_EXPIRES_IN = 900; // 15 minutes
const FIXED_PATH = 'public/image/ecommerce/direct/';
const PAGE_SIZE = 50; // 50 items per page

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
  totalCount: number;
  nextContinuationToken: string | null;
}

// API Functions
async function fetchJsonStore(
  prefix: string,
  storageType: string = STORAGE_TYPE,
  page: number = 1,
  sortBy: 'name' | 'size' | 'lastModified' = 'lastModified',
  sortDirection: 'asc' | 'desc' = 'desc',
  pageSize: number = PAGE_SIZE
): Promise<S3ListResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/${storageType}/json-store`);
    url.searchParams.append('prefix', prefix);
    url.searchParams.append('sortBy', sortBy);
    url.searchParams.append('sortDirection', sortDirection);
    url.searchParams.append('pageSize', pageSize.toString());
    url.searchParams.append('page', page.toString());

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = `${storageType.toUpperCase()} JSON store not found.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied to ${storageType.toUpperCase()} JSON store.`;
      } else if (response.status === 503) {
        errorMessage = 'Service temporarily unavailable.';
      }
      throw new Error(`Failed to fetch JSON store: ${errorMessage}`);
    }
    const data: S3ListResponse = await response.json();
    return {
      objects: data.objects.map((item) => ({
        ...item,
        lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
      })),
      totalCount: data.totalCount || 0,
      nextContinuationToken: data.nextContinuationToken,
    };
  } catch (error: any) {
    const message = error.message?.includes('CORS')
      ? `CORS error: Ensure the server allows requests from this origin.`
      : error.message || `Network error fetching ${storageType.toUpperCase()} JSON store`;
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

    const url = new URL(`${API_BASE_URL}/${storageType}/upload`);
    url.searchParams.append('path', path);

    const response = await fetch(url, {
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
  storageType: string = STORAGE_TYPE,
  batchSize: number = 50
): Promise<void> {
  try {
    const batches: string[][] = [];
    for (let i = 0; i < paths.length; i += batchSize) {
      batches.push(paths.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const response = await fetch(`${API_BASE_URL}/${storageType}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: batch }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText || response.statusText;
        if (response.status === 403) {
          errorMessage = `Access denied to delete from ${storageType.toUpperCase()}.`;
        }
        throw new Error(`Failed to delete objects: ${errorMessage}`);
      }
    }
  } catch (error: any) {
    throw new Error(`Deletion failed: ${error.message || 'Network error'}`);
  }
}

async function exportToCsv(
  prefix: string,
  storageType: string = STORAGE_TYPE
): Promise<string> {
  try {
    const url = new URL(`${API_BASE_URL}/${storageType}/export-csv`);
    url.searchParams.append('prefix', prefix);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = `${storageType.toUpperCase()} export-csv endpoint not found.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied to export CSV.`;
      }
      throw new Error(`Failed to export CSV: ${errorMessage}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    return downloadUrl;
  } catch (error: any) {
    throw new Error(`Export CSV failed: ${error.message || 'Network error'}`);
  }
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
    default:
      return <FiFile />;
  }
};

const truncateName = (name: string, maxLength: number = 30) => {
  if (name.length <= maxLength) return name;
  const start = name.slice(0, Math.floor(maxLength / 2));
  const end = name.slice(-Math.floor(maxLength / 2));
  return `${start}...${end}`;
};

// FileList Component
interface FileListProps {
  objects: S3Object[];
  isFetching: boolean;
  onDownload: (key: string) => void;
  onCopyUrl: (key: string) => void;
  onDelete: (path: string) => void;
  sortConfig: { key: 'name' | 'size' | 'lastModified'; direction: 'asc' | 'desc' };
  onSort: (key: 'name' | 'size' | 'lastModified') => void;
}

const FileList: React.FC<FileListProps> = React.memo(
  ({ objects, isFetching, onDownload, onCopyUrl, onDelete, sortConfig, onSort }) => {
    const getSortIcon = (key: 'name' | 'size' | 'lastModified') => {
      if (sortConfig.key === key) {
        return sortConfig.direction === 'asc' ? <FiArrowUp /> : <FiArrowDown />;
      }
      return null;
    };

    return (
      <VStack spacing={2} align="stretch">
        <Flex p={1} borderRadius="md" bg="gray.100">
          <Box flex="2" cursor="pointer" onClick={() => onSort('name')}>
            <HStack>
              <Text fontWeight="bold" fontSize="sm">Name</Text>
              {getSortIcon('name')}
            </HStack>
          </Box>
          <Box flex="1" cursor="pointer" onClick={() => onSort('size')}>
            <HStack>
              <Text fontWeight="bold" fontSize="sm">Size</Text>
              {getSortIcon('size')}
            </HStack>
          </Box>
          <Box flex="1" cursor="pointer" onClick={() => onSort('lastModified')}>
            <HStack>
              <Text fontWeight="bold" fontSize="sm">Modified</Text>
              {getSortIcon('lastModified')}
            </HStack>
          </Box>
          <Box flex="1" textAlign="right">
            <Text fontWeight="bold" fontSize="sm">Actions</Text>
          </Box>
        </Flex>
        {objects.map((obj, index) => (
          <Box
            key={`${obj.path}-${index}`}
            p={2}
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            bg="white"
            cursor="pointer"
            _hover={{ bg: 'gray.50' }}
          >
            <Flex justify="space-between" align="center">
              <HStack align="center" gap={1} flex="2">
                {obj.type === 'folder' ? <FiFolder size={16} /> : getFileIcon(obj.name)}
                <Box>
                  <Text fontWeight="medium" color="gray.800" fontSize="sm">
                    {truncateName(obj.name, 30)}
                  </Text>
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
                </Box>
              </HStack>
              <Box flex="1">
                <Text fontSize="xs" color="gray.500">
                  {obj.size ? (obj.size / 1024).toFixed(2) : '-'} KB
                </Text>
              </Box>
              <Box flex="1">
                <Text fontSize="xs" color="gray.500">
                  {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '-'}
                </Text>
              </Box>
              <HStack flex="1" justify="flex-end" spacing={1}>
                {obj.type === 'file' && (
                  <>
                    <IconButton
                      aria-label="Download"
                      icon={<FiDownload size={14} />}
                      size="xs"
                      colorScheme="blue"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(obj.path);
                      }}
                      isDisabled={isFetching}
                    />
                    <IconButton
                      aria-label="Copy URL"
                      icon={<FiCopy size={14} />}
                      size="xs"
                      colorScheme="gray"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyUrl(obj.path);
                      }}
                      isDisabled={isFetching}
                    />
                  </>
                )}
                <IconButton
                  aria-label="Delete"
                  icon={<FiTrash2 size={14} />}
                  size="xs"
                  colorScheme="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(obj.path);
                  }}
                  isDisabled={isFetching}
                />
              </HStack>
            </Flex>
          </Box>
        ))}
      </VStack>
    );
  }
);

// Main Component
function FileExplorer() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [currentPath] = useState(FIXED_PATH);
  const [isDragging, setIsDragging] = useState(false);
  const [deletePaths, setDeletePaths] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'size' | 'lastModified';
    direction: 'asc' | 'desc';
  }>({ key: 'lastModified', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signedUrlCache = useRef(new Map<string, { url: string; expires: number }>()).current;

  const debouncedInvalidate = debounce((queryKey: any) => {
    queryClient.invalidateQueries({ queryKey });
  }, 500);

  const { data, isFetching, error: listError } = useQuery<S3ListResponse, Error>({
    queryKey: ['objects', currentPath, STORAGE_TYPE, currentPage, sortConfig.key, sortConfig.direction],
    queryFn: () =>
      fetchJsonStore(
        currentPath,
        STORAGE_TYPE,
        currentPage,
        sortConfig.key,
        sortConfig.direction,
        PAGE_SIZE
      ),
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Filter objects based on search query
  const filteredObjects = data?.objects.filter((obj) =>
    obj.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSort = (key: 'name' | 'size' | 'lastModified') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page on sort
    queryClient.invalidateQueries({ queryKey: ['objects', currentPath, STORAGE_TYPE] });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    setSearchQuery('');
    queryClient.invalidateQueries({ queryKey: ['objects', currentPath, STORAGE_TYPE] });
  };

  const uploadMutation = useMutation({
    mutationFn: ({ file, path }: { file: File; path: string }) =>
      uploadFile(file, path, STORAGE_TYPE),
    onSuccess: () => {
      debouncedInvalidate(['objects', currentPath, STORAGE_TYPE]);
      toast({
        title: 'Upload Successful',
        description: 'File uploaded successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Unable to upload file.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteObjects(paths, STORAGE_TYPE),
    onMutate: async (paths) => {
      await queryClient.cancelQueries({ queryKey: ['objects', currentPath, STORAGE_TYPE] });
      const previousObjects = queryClient.getQueryData<S3ListResponse>([
        'objects',
        currentPath,
        STORAGE_TYPE,
        currentPage,
        sortConfig.key,
        sortConfig.direction,
      ]);
      queryClient.setQueryData<S3ListResponse>(
        ['objects', currentPath, STORAGE_TYPE, currentPage, sortConfig.key, sortConfig.direction],
        (old) => {
          if (!old) return { objects: [], totalCount: 0, nextContinuationToken: null };
          return {
            ...old,
            objects: old.objects.filter((obj) => !paths.includes(obj.path)),
            totalCount: old.totalCount - paths.length,
          };
        }
      );
      return { previousObjects };
    },
    onSuccess: () => {
      debouncedInvalidate(['objects', currentPath, STORAGE_TYPE]);
      setDeletePaths([]);
      toast({
        title: 'Deletion Successful',
        description: `Successfully deleted ${deletePaths.length} item${deletePaths.length > 1 ? 's' : ''}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error: any, _paths, context: any) => {
      queryClient.setQueryData(
        ['objects', currentPath, STORAGE_TYPE, currentPage, sortConfig.key, sortConfig.direction],
        context.previousObjects
      );
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Unable to delete item(s).',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: () => exportToCsv(currentPath, STORAGE_TYPE),
    onSuccess: (downloadUrl) => {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'file_list.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast({
        title: 'Export Successful',
        description: 'CSV file downloaded successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Export Failed',
        description: error.message || 'Unable to export CSV.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleDownload = async (key: string) => {
    try {
      const cached = signedUrlCache.get(key);
      const now = Date.now();
      if (cached && cached.expires > now) {
        window.open(cached.url, '_blank');
        return;
      }

      const url = await getSignedUrl(key, DEFAULT_EXPIRES_IN, STORAGE_TYPE);
      signedUrlCache.set(key, { url, expires: now + DEFAULT_EXPIRES_IN * 1000 });
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
      const cached = signedUrlCache.get(key);
      const now = Date.now();
      if (cached && cached.expires > now) {
        await navigator.clipboard.writeText(cached.url);
        toast({
          title: 'URL Copied',
          description: 'Public URL copied to clipboard',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const url = await getSignedUrl(key, DEFAULT_EXPIRES_IN, STORAGE_TYPE);
      signedUrlCache.set(key, { url, expires: now + DEFAULT_EXPIRES_IN * 1000 });
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

  const handleDelete = (paths: string | string[]) => {
    const pathsArray = Array.isArray(paths) ? paths : [paths];
    setDeletePaths(pathsArray);
    onDeleteOpen();
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

    files.reduce((promise, file) => {
      return promise.then(() => {
        const uploadPath = `${currentPath}${file.name}`;
        return uploadMutation.mutateAsync({ file, path: uploadPath });
      });
    }, Promise.resolve());
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

    files.reduce((promise, file) => {
      return promise.then(() => {
        const uploadPath = `${currentPath}${file.name}`;
        return uploadMutation.mutateAsync({ file, path: uploadPath });
      });
    }, Promise.resolve());

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Pagination rendering
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxPagesToShow = 5;
    const pages: (number | string)[] = [];
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <Flex justify="center" mt={4} align="center" gap={2}>
        <Button
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          isDisabled={currentPage === 1 || isFetching}
        >
          Previous
        </Button>
        {pages.map((page, index) => {
          if (typeof page === 'number') {
            return (
              <Button
                key={page}
                size="sm"
                colorScheme={currentPage === page ? 'blue' : 'gray'}
                onClick={() => handlePageChange(page)}
                isDisabled={isFetching}
              >
                {page}
              </Button>
            );
          }
          return (
            <Text key={`ellipsis-${index}`} mx={2}>
              {page}
            </Text>
          );
        })}
        <Button
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages || isFetching}
        >
          Next
        </Button>
      </Flex>
    );
  };

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
    <Container maxW="full" color="gray.800" py={6}>
      <Flex align="center" justify="space-between" flexWrap="wrap" gap={4} mb={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">
            Files (public/image/ecommerce/direct/)
          </Text>
        </Box>
        <HStack spacing={4}>
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.500" />
            </InputLeftElement>
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
              borderRadius="md"
            />
          </InputGroup>
          <IconButton
            aria-label="Refresh List"
            icon={<FiRefreshCw />}
            size="sm"
            colorScheme="gray"
            onClick={handleRefresh}
            isLoading={isFetching}
          />
          <Text fontSize="sm">Refresh</Text>
          <IconButton
            aria-label="Upload Files"
            icon={<FiUpload />}
            size="sm"
            colorScheme="blue"
            onClick={handleUploadClick}
            isLoading={uploadMutation.isPending}
          />
          <Text fontSize="sm">Upload</Text>
          <IconButton
            aria-label="Export to CSV"
            icon={<FiFileText />}
            size="sm"
            colorScheme="green"
            onClick={() => exportCsvMutation.mutate()}
            isLoading={exportCsvMutation.isPending}
          />
          <Text fontSize="sm">Export to CSV</Text>
        </HStack>
      </Flex>

      <Box
        ref={dropRef}
        p={6}
        mt={4}
        mb={4}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'green.500' : 'gray.300'}
        bg={isDragging ? 'green.100' : 'gray.100'}
        borderRadius="lg"
        minH="80px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="all 0.2s"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <HStack spacing={4} align="center">
          <Text fontSize="md" fontWeight="medium" color={isDragging ? 'green.600' : 'gray.600'}>
            {isDragging ? 'Drop files here to upload' : 'Drag and drop files'}
          </Text>
          {uploadMutation.isPending && (
            <Text fontSize="sm" color="blue.500">
              Uploading {uploadMutation.variables?.file.name || 'files'}...
            </Text>
          )}
        </HStack>
      </Box>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        multiple
      />

      <Box>
        <FileList
          objects={filteredObjects}
          isFetching={isFetching}
          onDownload={handleDownload}
          onCopyUrl={handleCopyUrl}
          onDelete={handleDelete}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
        {filteredObjects.length === 0 && !isFetching && (
          <Text fontSize="sm" color="gray.500" mt={4}>
            {searchQuery ? 'No items match your search' : 'No items in this directory'}
          </Text>
        )}
        {isFetching && <Text fontSize="sm" color="gray.500" mt={4}>Loading...</Text>}
      </Box>

      {/* Pagination Section */}
      {renderPagination()}
      {/* End Pagination Section */}

      {/* Modal Section */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete {deletePaths.length} item
              {deletePaths.length > 1 ? 's' : ''}? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                if (deletePaths.length > 0) {
                  deleteMutation.mutate(deletePaths);
                }
                onDeleteClose();
              }}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* End Modal Section */}
    </Container>
  );
}

export const Route = createFileRoute('/_layout/dropship/')({
  component: FileExplorer,
});

export default FileExplorer;