import ArtworkTable from './ArtworkTable';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

function App() {
    return (
        <div className="App">
            <h1 className="text-center">DataTable</h1>
            <div className="container mx-auto p-4">
                <ArtworkTable />
            </div>
        </div>
    );
}

export default App;