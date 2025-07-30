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

    const onDataTableSelectionChange = (e: { value: Artwork[] }) => {
        const currentArtworksIds = new Set(artworks.map(item => item.id));

        const updatedGlobalSelectedArtworks = selectedArtworks.filter(
            item => !currentArtworksIds.has(item.id)
        );
        
        const newlySelectedOnPage = e.value; 

        const finalSelectedArtworks = [
            ...updatedGlobalSelectedArtworks,
            ...newlySelectedOnPage
        ];

        setSelectedArtworks(finalSelectedArtworks);
    };
    
    const selectedArtworkIds = new Set(selectedArtworks.map(a => a.id));

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

    const applyRowsPerPageAndSelect = async () => {
        const totalToSelect = tempRows || 0;

        if (totalToSelect <= 0) {
            setSelectedArtworks([]); 
            op.current?.hide();
            return;
        }

        setLoading(true);
        const newSelectedItems: Artwork[] = []; 

        try {
            let selectedCount = 0;
            let currentPage = 1;
            const maxPages = Math.ceil(totalRecords / API_PAGE_SIZE);

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
                        selectionMode="checkbox" 
                        selection={selectedArtworks}
                        onSelectionChange={onDataTableSelectionChange} 
                        rowClassName={(rowData) => selectedArtworkIds.has(rowData.id) ? 'p-highlight' : ''}
                    >
                        {/* checkbox column */}
                        <Column
                            selectionMode="multiple" 
                            header={selectionHeaderTemplate}
                            headerStyle={{ width: '120px' }} 
                            style={{ width: '120px' }}
                            frozen
                        />
                        {/* Code column */}
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
                    
                    {selectedArtworks.length > 0 && (
                        <div className="mt-3 p-3 border-1 surface-border border-round">
                            
                            <Button 
                                label="Clear All Selections" 
                                className="ml-3" 
                                size="small"
                                severity="secondary"
                                onClick={() => setSelectedArtworks([])} 
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ArtworkTable;