import React, { useState, useEffect, useRef, useCallback } from 'react';

// Define interfaces
interface PaginatorPageState {
    first: number;
    rows: number;
    page: number;
    pageCount: number;
}

interface Artwork {
    id: number;
    api_link: string;
    title: string;
    artwork_type_title: string;
}

const ArtworkTable: React.FC = () => {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [first, setFirst] = useState<number>(0);
    const [selectedArtworks, setSelectedArtworks] = useState<Artwork[]>([]);
    
    // State for custom overlay panel
    const [showOverlay, setShowOverlay] = useState<boolean>(false);
    const [tempRows, setTempRows] = useState<number | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const API_PAGE_SIZE = 12;

    // Fetch data for current page only
    const fetchData = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${page}`);
            const data = await response.json();
            const mappedData: Artwork[] = data.data.map((item: any) => ({
                id: item.id,
                api_link: item.id.toString(),
                title: item.title,
                artwork_type_title: item.artwork_type_title || 'N/A',
            }));

            setArtworks(mappedData);
            setTotalRecords(data.pagination.total);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const apiPage = Math.floor(first / API_PAGE_SIZE) + 1;
        fetchData(apiPage);
    }, [first, fetchData]);

    // Handle clicks outside the overlay to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
                setShowOverlay(false);
            }
        };

        if (showOverlay) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showOverlay]);

    const onPageChange = (event: { first: number; rows: number; page: number; pageCount: number; }) => {
        setFirst(event.first);
    };

    // Handle individual checkbox selection
    const handleCheckboxChange = (artwork: Artwork, isChecked: boolean) => {
        setSelectedArtworks(prevSelected => {
            if (isChecked) {
                // Add artwork if not already present
                if (!prevSelected.some(item => item.id === artwork.id)) {
                    return [...prevSelected, artwork];
                }
            } else {
                // Remove artwork
                return prevSelected.filter(item => item.id !== artwork.id);
            }
            return prevSelected;
        });
    };

    // Helper to get selected Artwork IDs (for display and highlighting)
    const selectedArtworkIds = new Set(selectedArtworks.map(a => a.id));

    // Apply bulk selection across multiple pages
    const applyRowsPerPageAndSelect = async () => {
        const totalToSelect = tempRows || 0;

        if (totalToSelect <= 0) {
            setSelectedArtworks([]); // Clear all
            setShowOverlay(false);
            return;
        }

        setLoading(true);
        const newSelectedItems: Artwork[] = []; // Store full objects

        try {
            let selectedCount = 0;
            let currentPage = 1;
            const maxPages = Math.ceil(totalRecords / API_PAGE_SIZE);

            // Fetch pages sequentially to get the required number of items
            while (selectedCount < totalToSelect && currentPage <= maxPages) {
                const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${currentPage}`);
                const data = await response.json();
                
                const fetchedArtworks: Artwork[] = data.data.map((item: any) => ({
                    id: item.id,
                    api_link: item.id.toString(),
                    title: item.title,
                    artwork_type_title: item.artwork_type_title || 'N/A',
                }));

                for (const artwork of fetchedArtworks) {
                    if (selectedCount < totalToSelect) {
                        newSelectedItems.push(artwork);
                        selectedCount++;
                    } else {
                        break;
                    }
                }
                currentPage++;
            }
            
            setSelectedArtworks(newSelectedItems);
        } catch (error) {
            console.error("Error fetching data for auto-selection:", error);
        } finally {
            setLoading(false);
        }

        // Reset to first page to show selection
        setFirst(0);
        setShowOverlay(false);
    };

    // Calculate current page for paginator display
    const currentPage = Math.floor(first / API_PAGE_SIZE);
    const pageCount = Math.ceil(totalRecords / API_PAGE_SIZE);

    return (
        <div className="p-4 bg-gray-100 min-h-screen font-sans">
            {/* Custom Overlay Panel */}
            {showOverlay && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div ref={overlayRef} className="bg-white p-6 rounded-lg shadow-xl relative min-w-[300px]">
                        <button 
                            onClick={() => setShowOverlay(false)} 
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold"
                            aria-label="Close"
                        >
                            &times; {/* HTML entity for a multiplication sign (cross) */}
                        </button>
                        <div className="flex flex-col gap-4">
                            <label htmlFor="rowsToSelect" className="text-lg font-semibold">Select number of rows:</label>
                            <input
                                id="rowsToSelect"
                                type="number"
                                onChange={(e) => setTempRows(e.target.value ? parseInt(e.target.value) : null)}
                                min={0}
                                max={Math.min(totalRecords, 1000)}
                                placeholder="Enter number of rows"
                                value={tempRows === null ? '' : tempRows}
                                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                onClick={applyRowsPerPageAndSelect} 
                                className={`mt-2 py-2 px-4 rounded-md text-white font-semibold ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                disabled={loading}
                            >
                                {loading ? 'Applying...' : 'Apply Selection'}
                            </button>
                            <small className="text-gray-600 text-sm">
                                Currently selected: {selectedArtworks.length} rows
                            </small>
                        </div>
                    </div>
                </div>
            )}

            {loading && artworks.length === 0 ? (
                <div className="flex justify-center items-center h-72">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                    <button
                                        type="button"
                                        onClick={() => setShowOverlay(true)}
                                        className="text-gray-500 hover:text-gray-900 focus:outline-none"
                                        aria-label="Toggle selection options"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                                    Code
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                                    Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                                    Category
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {artworks.map((artwork) => (
                                <tr key={artwork.id} className={selectedArtworkIds.has(artwork.id) ? 'bg-blue-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedArtworkIds.has(artwork.id)}
                                            onChange={(e) => handleCheckboxChange(artwork, e.target.checked)}
                                            className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out rounded"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {artwork.api_link}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {artwork.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {artwork.artwork_type_title}
                                    </td>
                                </tr>
                            ))}
                            {artworks.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No artworks found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    {/* Custom Paginator */}
                    <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => onPageChange({ first: first - API_PAGE_SIZE, rows: API_PAGE_SIZE, page: currentPage - 1, pageCount: pageCount })}
                                disabled={currentPage === 0}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => onPageChange({ first: first + API_PAGE_SIZE, rows: API_PAGE_SIZE, page: currentPage + 1, pageCount: pageCount })}
                                disabled={currentPage >= pageCount - 1}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{first + 1}</span> to <span className="font-medium">{Math.min(first + API_PAGE_SIZE, totalRecords)}</span> of{' '}
                                    <span className="font-medium">{totalRecords}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => onPageChange({ first: first - API_PAGE_SIZE, rows: API_PAGE_SIZE, page: currentPage - 1, pageCount: pageCount })}
                                        disabled={currentPage === 0}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {Array.from({ length: pageCount }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onPageChange({ first: i * API_PAGE_SIZE, rows: API_PAGE_SIZE, page: i, pageCount: pageCount })}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                currentPage === i
                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => onPageChange({ first: first + API_PAGE_SIZE, rows: API_PAGE_SIZE, page: currentPage + 1, pageCount: pageCount })}
                                        disabled={currentPage >= pageCount - 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </nav>
                    
                    {selectedArtworks.length > 0 && (
                        <div className="mt-3 p-3 border border-gray-200 rounded-md bg-white flex justify-end">
                            <button 
                                onClick={() => setSelectedArtworks([])} 
                                className="py-2 px-4 rounded-md text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300"
                            >
                                Clear All Selections
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ArtworkTable;
