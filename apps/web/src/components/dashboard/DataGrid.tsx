import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  IconButton,
  TablePagination,
  useTheme,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Enhanced data grid component with sorting, filtering, pagination, and resizable columns
// Sıralama, filtreleme, sayfalama ve yeniden boyutlandırılabilir sütunlarla gelişmiş veri ızgarası bileşeni

export interface DataGridColumn<T = any> {
  // Column key / Sütun anahtarı
  key: string;
  // Column label / Sütun etiketi
  label: string;
  // Render function for cell content / Hücre içeriği için render fonksiyonu
  render?: (value: any, row: T) => React.ReactNode;
  // Sortable / Sıralanabilir
  sortable?: boolean;
  // Filterable / Filtrelenebilir
  filterable?: boolean;
  // Width / Genişlik
  width?: number | string;
  // Alignment / Hizalama
  align?: 'left' | 'right' | 'center';
}

export interface DataGridProps<T = any> {
  // Data rows / Veri satırları
  data: T[];
  // Column definitions / Sütun tanımları
  columns: DataGridColumn<T>[];
  // Initial sort column / Başlangıç sıralama sütunu
  initialSortColumn?: string;
  // Initial sort direction / Başlangıç sıralama yönü
  initialSortDirection?: 'asc' | 'desc';
  // Rows per page options / Sayfa başına satır seçenekleri
  rowsPerPageOptions?: number[];
  // Default rows per page / Varsayılan sayfa başına satır
  defaultRowsPerPage?: number;
  // Show search / Arama göster
  showSearch?: boolean;
  // Search placeholder / Arama yer tutucusu
  searchPlaceholder?: string;
  // Custom search function / Özel arama fonksiyonu
  customSearch?: (query: string, row: T) => boolean;
  // On row click handler / Satır tıklama işleyicisi
  onRowClick?: (row: T) => void;
  // Empty state message / Boş durum mesajı
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | false;

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  initialSortColumn,
  initialSortDirection = 'asc',
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRowsPerPage = 25,
  showSearch = true,
  searchPlaceholder = 'Search...',
  customSearch,
  onRowClick,
  emptyMessage = 'No data available',
}: DataGridProps<T>) {
  const theme = useTheme();
  const [sortColumn, setSortColumn] = useState<string | null>(initialSortColumn || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialSortColumn ? initialSortDirection : false
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Filter data based on search query / Arama sorgusuna göre veriyi filtrele
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    if (customSearch) {
      return data.filter((row) => customSearch(searchQuery, row));
    }

    // Default search: search in all string/number values / Varsayılan arama: tüm string/sayı değerlerinde ara
    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery, customSearch]);

  // Sort data / Veriyi sırala
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined / Null/undefined'i işle
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Compare values / Değerleri karşılaştır
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data / Veriyi sayfalara ayır
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  // Handle sort / Sıralamayı işle
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Toggle direction / Yönü değiştir
      setSortDirection((prev) => {
        if (prev === 'asc') return 'desc';
        if (prev === 'desc') return false;
        return 'asc';
      });
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setPage(0); // Reset to first page / İlk sayfaya sıfırla
  };

  // Handle search / Aramayı işle
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0); // Reset to first page / İlk sayfaya sıfırla
  };

  // Handle page change / Sayfa değişimini işle
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change / Sayfa başına satır değişimini işle
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      {/* Search bar / Arama çubuğu */}
      {showSearch && (
        <Box mb={2}>
          <TextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                '&:hover': {
                  backgroundColor: 'background.paper',
                },
              },
            }}
          />
        </Box>
      )}

      {/* Table / Tablo */}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 'calc(100vh - 300px)',
          '& .MuiPaper-root': {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          },
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  sx={{
                    backgroundColor: 'background.paper',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.08)'}`,
                    width: column.width,
                    minWidth: column.width,
                  }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={sortColumn === column.key}
                      direction={sortColumn === column.key && sortDirection !== false ? sortDirection : undefined}
                      onClick={() => handleSort(column.key)}
                      sx={{
                        '& .MuiTableSortLabel-icon': {
                          color: 'text.secondary',
                        },
                        '&.Mui-active': {
                          color: 'text.primary',
                          '& .MuiTableSortLabel-icon': {
                            color: 'primary.main',
                          },
                        },
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Box
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                    }}
                  >
                    {emptyMessage}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 200ms ease',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    },
                    '&:last-child td': {
                      borderBottom: 0,
                    },
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'left'}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.08)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination / Sayfalama */}
      <TablePagination
        component="div"
        count={sortedData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={rowsPerPageOptions}
        sx={{
          borderTop: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.08)'}`,
          '& .MuiTablePagination-toolbar': {
            color: 'text.secondary',
          },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.875rem',
          },
        }}
      />
    </Box>
  );
}

