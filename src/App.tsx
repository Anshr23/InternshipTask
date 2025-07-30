import ArtworkTable from './ArtworkTable'; // Adjust path if your file is in a different directory

// Import PrimeReact styles (you might have these in your index.css or similar)
import 'primereact/resources/themes/saga-blue/theme.css'; // Choose your theme
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css'; // For flex utilities

function App() {
    return (
        <div className="App">
            <h1 className="text-center">DataTable</h1>
            <div className="container mx-auto p-4"> {/* Using primeflex for centering and padding */}
                <ArtworkTable />
            </div>
        </div>
    );
}

export default App;