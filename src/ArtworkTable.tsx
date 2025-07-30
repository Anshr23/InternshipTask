import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Paginator } from 'primereact/paginator';
import './ArtworkTable.css'; // Import custom styles for the ArtworkTable

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
    
    // selectedArtworks stores the full Artwork objects that are selected
    // as required by DataTable's 'selection' prop for selectionMode="checkbox"
    const [selectedArtworks, setSelectedArtworks] = useState<Artwork[]>([]);
    
    const op = useRef<OverlayPanel>(null);
    const [tempRows, setTempRows] = useState<number | null>(null);

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

    const onPageChange = (event: PaginatorPageState) => {
        setFirst(event.first);
    };

    // Selection Logic for DataTable's Built-in Checkboxes
    // The DataTable's onSelectionChange will give you the updated array of selected items (on current page)
    const onDataTableSelectionChange = (e: { value: Artwork[] }) => {
        // This maintains selection across all pages by merging current page selection with global selection
        
        // Create a Set of IDs from existing selected items to track global selection
        const globalSelectedIds = new Set(selectedArtworks.map(item => item.id));

        // Get IDs of artworks currently displayed on this page
        const currentArtworksIds = new Set(artworks.map(item => item.id));

        // Remove all artworks from the current page from the global selection first
        const updatedGlobalSelectedArtworks = selectedArtworks.filter(
            item => !currentArtworksIds.has(item.id)
        );

        // Add the newly selected items from the current page
        const newlySelectedOnPage = e.value; // These are the selected ones from the current page

        const finalSelectedArtworks = [
            ...updatedGlobalSelectedArtworks,
            ...newlySelectedOnPage
        ];

        setSelectedArtworks(finalSelectedArtworks);
    };
    
    // Helper to get selected Artwork IDs (for display and highlighting)
    const selectedArtworkIds = new Set(selectedArtworks.map(a => a.id));

    // Body template for Code column content
    const codeBodyTemplate = (rowData: Artwork) => {
        return (
            <div className="flex align-items-center gap-2">
                <span>{rowData.api_link}</span>
            </div>
        );
    };

    // Custom header template with only the dropdown arrow (no "Select" text)
    const selectionHeaderTemplate = () => {
        return (
            <div className="flex align-items-center justify-content-center">
                
                <Button
                    type="button"
                    icon="pi pi-chevron-down"
                    onClick={(e) => op.current?.toggle(e)}
                    className="p-button-text p-button-sm"
                />
                <span>&nbsp;&nbsp;</span>
            </div>
        );
    };

    // Apply bulk selection across multiple pages
    const applyRowsPerPageAndSelect = async () => {
        const totalToSelect = tempRows || 0;

        if (totalToSelect <= 0) {
            setSelectedArtworks([]); // Clear all
            op.current?.hide();
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
        op.current?.hide();
    };

    return (
        <div className="card">
            <OverlayPanel ref={op} showCloseIcon closeOnEscape className="custom-overlay-panel">
                <div className="flex flex-column gap-2" style={{ minWidth: '200px' }}>
                    <label htmlFor="rowsToSelect">Select number of rows:</label>
                    <InputNumber
                        id="rowsToSelect"
                        onValueChange={(e) => setTempRows(e.value || null)}
                        mode="decimal"
                        min={0}
                        max={Math.min(totalRecords, 1000)}
                        placeholder="Enter number of rows"
                        value={tempRows}
                        showButtons={false}
                    />
                    <Button 
                        label="Apply Selection" 
                        onClick={applyRowsPerPageAndSelect} 
                        className="mt-2" 
                        loading={loading}
                        disabled={loading}
                    />
                    <small className="text-500">
                        Currently selected: {selectedArtworks.length} rows
                    </small>
                </div>
            </OverlayPanel>

            {loading && artworks.length === 0 ? (
                <div className="flex justify-content-center align-items-center" style={{ height: '300px' }}>
                    <ProgressSpinner />
                </div>
            ) : (
                <>
                    <DataTable
                        value={artworks}
                        dataKey="id"
                        lazy
                        paginator={false}
                        first={first}
                        rows={API_PAGE_SIZE}
                        totalRecords={totalRecords}
                        emptyMessage="No artworks found."
                        loading={loading}
                        selectionMode="checkbox" // Crucial for built-in checkboxes
                        selection={selectedArtworks} // Provide the full selected objects
                        onSelectionChange={onDataTableSelectionChange} // Handle DataTable's selection changes
                        rowClassName={(rowData) => selectedArtworkIds.has(rowData.id) ? 'p-highlight' : ''} // Row highlighting
                    >
                        {/* Built-in checkbox column with custom header (no "Select" text) */}
                        <Column
                            selectionMode="multiple" // This column defines the checkbox selection
                            header={selectionHeaderTemplate} // Custom header with only dropdown button
                            headerStyle={{ width: '120px' }} // Adjust width for header content
                            style={{ width: '120px' }}
                            frozen // Keep it visible on scroll
                        />
                        {/* Code column */}
                        <Column
                            header="Code"
                            body={codeBodyTemplate} // Display the code/link
                            style={{ width: '150px', minWidth: '150px' }}
                        />
                        <Column 
                            field="title" 
                            header="Name" 
                            style={{ width: '45%' }}
                        />
                        <Column 
                            field="artwork_type_title" 
                            header="Category" 
                            style={{ width: '35%' }}
                        />
                    </DataTable>
                    
                    <Paginator
                        first={first}
                        rows={API_PAGE_SIZE}
                        totalRecords={totalRecords}
                        onPageChange={onPageChange}
                    />
                    
                    {selectedArtworks.length > 0 && (
                        <div className="mt-3 p-3 border-1 surface-border border-round">
                            {/* <strong>Selected: {selectedArtworks.length} artwork(s)</strong> */}
                            <Button 
                                label="Clear All Selections" 
                                className="ml-3" 
                                size="small"
                                severity="secondary"
                                onClick={() => setSelectedArtworks([])} // Clear the array
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ArtworkTable;