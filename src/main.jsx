import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
