import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Paginator } from 'primereact/paginator';
import './ArtworkTable.css'; 

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
    
    // Store only selected IDs for efficiency instead of full objects
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    const op = useRef<OverlayPanel>(null);
    const [tempRows, setTempRows] = useState<number | null>(null);
    const [bulkSelectLoading, setBulkSelectLoading] = useState<boolean>(false);

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

    // Convert selected IDs to Artwork objects for current page display
    const selectedArtworks = artworks.filter(artwork => selectedIds.has(artwork.id));

    const onDataTableSelectionChange = (e: { value: Artwork[] }) => {
        const currentPageArtworkIds = new Set(artworks.map(item => item.id));
        
        // Remove current page items from selection
        const updatedSelectedIds = new Set([...selectedIds].filter(id => !currentPageArtworkIds.has(id)));
        
        // Add newly selected items from current page
        e.value.forEach(artwork => updatedSelectedIds.add(artwork.id));
        
        setSelectedIds(updatedSelectedIds);
    };

    const codeBodyTemplate = (rowData: Artwork) => {
        return (
            <div className="flex align-items-center gap-2">
                <span>{rowData.api_link}</span>
            </div>
        );
    };

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

    // Efficient bulk selection using parallel requests and optimized data handling
    const applyRowsPerPageAndSelect = async () => {
        const totalToSelect = tempRows || 0;

        if (totalToSelect <= 0) {
            setSelectedIds(new Set());
            op.current?.hide();
            return;
        }

        setBulkSelectLoading(true);
        
        try {
            const maxPages = Math.ceil(totalToSelect / API_PAGE_SIZE);
            const pagesToFetch = Math.min(maxPages, Math.ceil(totalRecords / API_PAGE_SIZE));
            
            // Create array of page numbers to fetch
            const pageNumbers = Array.from({ length: pagesToFetch }, (_, i) => i + 1);
            
            // Fetch multiple pages in parallel (with concurrency limit)
            const CONCURRENT_REQUESTS = 3; // Limit concurrent requests to avoid overwhelming the API
            const newSelectedIds = new Set<number>();
            let selectedCount = 0;

            for (let i = 0; i < pageNumbers.length; i += CONCURRENT_REQUESTS) {
                if (selectedCount >= totalToSelect) break;
                
                const batch = pageNumbers.slice(i, i + CONCURRENT_REQUESTS);
                const batchPromises = batch.map(pageNum => 
                    fetch(`https://api.artic.edu/api/v1/artworks?page=${pageNum}`)
                        .then(response => response.json())
                );

                const batchResults = await Promise.all(batchPromises);
                
                for (const data of batchResults) {
                    if (selectedCount >= totalToSelect) break;
                    
                    for (const item of data.data) {
                        if (selectedCount >= totalToSelect) break;
                        newSelectedIds.add(item.id);
                        selectedCount++;
                    }
                }
            }
            
            setSelectedIds(newSelectedIds);
        } catch (error) {
            console.error("Error fetching data for bulk selection:", error);
        } finally {
            setBulkSelectLoading(false);
        }

        // Reset to first page to show selection
        setFirst(0);
        op.current?.hide();
    };

    // Optimized select all on current page
    const selectAllCurrentPage = () => {
        const currentPageIds = new Set(artworks.map(item => item.id));
        const updatedSelectedIds = new Set([...selectedIds, ...currentPageIds]);
        setSelectedIds(updatedSelectedIds);
    };

    // Optimized deselect all on current page
    const deselectAllCurrentPage = () => {
        const currentPageIds = new Set(artworks.map(item => item.id));
        const updatedSelectedIds = new Set([...selectedIds].filter(id => !currentPageIds.has(id)));
        setSelectedIds(updatedSelectedIds);
    };

    return (
        <div className="card">
            <OverlayPanel ref={op} showCloseIcon closeOnEscape className="custom-overlay-panel">
                <div className="flex flex-column gap-2" style={{ minWidth: '250px' }}>
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
                        label="Apply Bulk Selection" 
                        onClick={applyRowsPerPageAndSelect} 
                        className="mt-2" 
                        loading={bulkSelectLoading}
                        disabled={bulkSelectLoading || loading}
                    />
                    <div className="flex gap-2">
                        <Button 
                            label="Select Page" 
                            onClick={selectAllCurrentPage}
                            className="p-button-sm p-button-outlined"
                            size="small"
                        />
                        <Button 
                            label="Deselect Page" 
                            onClick={deselectAllCurrentPage}
                            className="p-button-sm p-button-outlined"
                            size="small"
                        />
                    </div>
                    <small className="text-500">
                        Currently selected: {selectedIds.size} rows
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
                        selectionMode="checkbox" 
                        selection={selectedArtworks}
                        onSelectionChange={onDataTableSelectionChange} 
                        rowClassName={(rowData) => selectedIds.has(rowData.id) ? 'p-highlight' : ''}
                    >
                        <Column
                            selectionMode="multiple" 
                            header={selectionHeaderTemplate}
                            headerStyle={{ width: '120px' }} 
                            style={{ width: '120px' }}
                            frozen
                        />
                        <Column
                            header="Code"
                            body={codeBodyTemplate} 
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
                    
                    {selectedIds.size > 0 && (
                        <div className="mt-3 p-3 border-1 surface-border border-round">
                            <div className="flex align-items-center gap-3">
                                <span><strong>Selected: {selectedIds.size} artwork(s)</strong></span>
                                <Button 
                                    label="Clear All Selections" 
                                    size="small"
                                    severity="secondary"
                                    onClick={() => setSelectedIds(new Set())}
                                />
                                {bulkSelectLoading && (
                                    <div className="flex align-items-center gap-2">
                                        <ProgressSpinner style={{ width: '20px', height: '20px' }} />
                                        <span className="text-sm">Loading selections...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ArtworkTable;